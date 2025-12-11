require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sql, connectToDb } = require('./db');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;

// Middleware
app.use(cors());
app.use(express.json());

// --- МІДЛВАР: ПЕРЕВІРКА ТОКЕНА ---
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

// ================= API МАРШРУТИ =================

// --- 1. АВТОРИЗАЦІЯ ---

// ЛОГІН
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const pool = await connectToDb();
        const result = await pool.request()
            .input('Email', sql.NVarChar, email)
            .query('SELECT UserID, Name, Email, PasswordHash, IsAdmin, Theme FROM dbo.[User] WHERE Email = @Email');

        const user = result.recordset[0];

        if (!user) return res.status(401).json({ message: 'Користувача не знайдено' });

        // Валідація пароля (з trim для надійності)
        const dbPassword = user.PasswordHash.trim();
        const clientPassword = password.trim();

        if (dbPassword !== clientPassword) {
            return res.status(401).json({ message: 'Невірний пароль' });
        }

        const token = jwt.sign(
            { id: user.UserID, isAdmin: user.IsAdmin },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            isAdmin: user.IsAdmin,
            theme: user.Theme,
            name: user.Name
        });
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message);
    }
});

// РЕЄСТРАЦІЯ
app.post('/api/auth/register', async (req, res) => {
    const { email, password } = req.body;
    const name = email.split('@')[0];

    try {
        const pool = await connectToDb();
        const check = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT * FROM dbo.[User] WHERE Email = @email');

        if (check.recordset.length > 0) {
            return res.status(400).json({ message: 'Email вже зареєстрований' });
        }

        await pool.request()
            .input('Name', sql.NVarChar, name)
            .input('Email', sql.NVarChar, email)
            .input('PasswordHash', sql.NVarChar, password)
            .query('INSERT INTO dbo.[User] (Name, Email, PasswordHash, IsAdmin, Theme) VALUES (@Name, @Email, @PasswordHash, 0, \'light\')');

        res.status(201).json({ message: 'Користувача створено' });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// --- 2. КОРИСТУВАЧІ (Для Адмінки) ---

// ОТРИМАТИ ВСІХ КОРИСТУВАЧІВ (Для пошуку в адмінці)
app.get('/api/users', authenticateToken, async (req, res) => {
    // Тільки адмін може бачити список
    if (!req.user.isAdmin) return res.sendStatus(403);

    try {
        const pool = await connectToDb();
        const result = await pool.request().query('SELECT UserID, Name, Email FROM dbo.[User]');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// ОНОВИТИ ТЕМУ
app.put('/api/users/theme', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { theme } = req.body;
    try {
        const pool = await connectToDb();
        await pool.request()
            .input('uid', sql.Int, userId)
            .input('theme', sql.NVarChar, theme)
            .query('UPDATE dbo.[User] SET Theme = @theme WHERE UserID = @uid');
        res.json({ message: 'Тему оновлено' });
    } catch (err) {
        res.status(500).send(err.message);
    }
});


// --- 3. ЗАПИСИ (ENTRIES) ---

// 3. ОТРИМАТИ ЗАПИСИ
// Ми вказуємо два шляхи: один для звичайного юзера, другий для адміна з ID
app.get(['/api/entries', '/api/entries/:userId'], authenticateToken, async (req, res) => {
    let targetUserId = req.user.id;

    // Перевіряємо, чи прийшов параметр через URL (:userId)
    if (req.user.isAdmin && req.params.userId) {
        targetUserId = req.params.userId;
    }
    // На всяк випадок залишаємо перевірку через body (для сумісності)
    else if (req.user.isAdmin && req.body.userId) {
        targetUserId = req.body.userId;
    }

    try {
        const pool = await connectToDb();

        const result = await pool.request()
            .input('UserID', sql.Int, targetUserId) // Використовуємо targetUserId
            .query(`
                SELECT
                    e.EntryID as id,
                    e.Date as date, 
                    e.Title as title, 
                    e.Text as text, 
                    e.MoodLevel as mood,
                    STRING_AGG(t.Name, ', ') AS tagsList
                FROM dbo.Entry e
                    LEFT JOIN dbo.EntryTag et ON e.EntryID = et.EntryID
                    LEFT JOIN dbo.Tag t ON et.TagID = t.TagID
                WHERE e.UserID = @UserID
                GROUP BY e.EntryID, e.Date, e.Title, e.Text, e.MoodLevel
                ORDER BY e.Date DESC
            `);

        const formattedEntries = result.recordset.map(entry => ({
            id: entry.id,
            date: entry.date,
            title: entry.title,
            text: entry.text,
            mood: entry.mood,
            tags: entry.tagsList ? entry.tagsList.split(', ') : []
        }));

        res.json(formattedEntries);
    } catch (err) {
        console.error(err); // Логуємо помилку в консоль сервера
        res.status(500).send(err.message);
    }
});

// СТВОРИТИ ЗАПИС
app.post('/api/entries', authenticateToken, async (req, res) => {
    let targetUserId = req.user.id;

    // Якщо Адмін створює запис і передав userId в тілі запиту
    if (req.user.isAdmin && req.body.userId) {
        targetUserId = req.body.userId;
    }

    const { date, title, text, mood, tags } = req.body;

    const pool = await connectToDb();
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        // 1. Створення запису
        const entryRes = await new sql.Request(transaction)
            .input('uid', sql.Int, targetUserId)
            .input('d', sql.Date, date)
            .input('t', sql.NVarChar, title)
            .input('txt', sql.NVarChar, text)
            .input('m', sql.Int, mood)
            .query('INSERT INTO dbo.Entry (UserID, Date, Title, Text, MoodLevel) OUTPUT INSERTED.EntryID VALUES (@uid, @d, @t, @txt, @m)');

        const entryId = entryRes.recordset[0].EntryID;

        // 2. Додавання тегів
        if (tags && Array.isArray(tags) && tags.length > 0) {
            for (const tagName of tags) {
                const cleanTag = tagName.trim();
                if (!cleanTag) continue;

                // Знайти або створити тег
                let tagRes = await new sql.Request(transaction)
                    .input('uid', sql.Int, targetUserId)
                    .input('nm', sql.NVarChar, cleanTag)
                    .query('SELECT TagID FROM dbo.Tag WHERE UserID = @uid AND Name = @nm');

                let tagId;
                if (tagRes.recordset.length > 0) {
                    tagId = tagRes.recordset[0].TagID;
                } else {
                    let newTag = await new sql.Request(transaction)
                        .input('uid', sql.Int, targetUserId)
                        .input('nm', sql.NVarChar, cleanTag)
                        .query('INSERT INTO dbo.Tag (UserID, Name) OUTPUT INSERTED.TagID VALUES (@uid, @nm)');
                    tagId = newTag.recordset[0].TagID;
                }

                await new sql.Request(transaction)
                    .input('eid', sql.Int, entryId)
                    .input('tid', sql.Int, tagId)
                    .query('INSERT INTO dbo.EntryTag (EntryID, TagID) VALUES (@eid, @tid)');
            }
        }

        await transaction.commit();
        res.status(201).json({ message: 'Створено', id: entryId });
    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error(err);
        res.status(500).send(err.message);
    }
});

// РЕДАГУВАТИ ЗАПИС
app.put('/api/entries/:id', authenticateToken, async (req, res) => {
    const entryId = req.params.id;
    const { title, text, mood, tags, date, userId } = req.body;

    let targetUserId = req.user.id;
    if (req.user.isAdmin && userId) {
        targetUserId = userId;
    }

    const pool = await connectToDb();
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        // 1. Перевірка власності (для адміна перевірка м'якша або targetUserId)
        const check = await new sql.Request(transaction)
            .input('eid', sql.Int, entryId)
            .query('SELECT UserID FROM dbo.Entry WHERE EntryID = @eid');

        if (check.recordset.length === 0) throw new Error('Запис не знайдено');

        // Якщо це не адмін і ID власника не співпадає
        if (!req.user.isAdmin && check.recordset[0].UserID !== req.user.id) {
            throw new Error('Доступ заборонено');
        }

        // Оновлюємо targetUserId на реального власника запису, щоб теги не дублювалися в іншого юзера
        targetUserId = check.recordset[0].UserID;

        // 2. Оновлення даних
        let query = 'UPDATE dbo.Entry SET Title = @t, Text = @txt, MoodLevel = @m';
        if (date) query += ', Date = @d';
        query += ' WHERE EntryID = @eid';

        const updateReq = new sql.Request(transaction)
            .input('t', sql.NVarChar, title)
            .input('txt', sql.NVarChar, text)
            .input('m', sql.Int, mood)
            .input('eid', sql.Int, entryId);
        if (date) updateReq.input('d', sql.Date, date);

        await updateReq.query(query);

        // 3. Оновлення тегів
        await new sql.Request(transaction)
            .input('eid', sql.Int, entryId)
            .query('DELETE FROM dbo.EntryTag WHERE EntryID = @eid');

        if (tags && Array.isArray(tags) && tags.length > 0) {
            for (const tagName of tags) {
                const cleanTag = tagName.trim();
                if (!cleanTag) continue;

                let tagRes = await new sql.Request(transaction)
                    .input('uid', sql.Int, targetUserId)
                    .input('nm', sql.NVarChar, cleanTag)
                    .query('SELECT TagID FROM dbo.Tag WHERE UserID = @uid AND Name = @nm');

                let tagId;
                if (tagRes.recordset.length > 0) tagId = tagRes.recordset[0].TagID;
                else {
                    let newTag = await new sql.Request(transaction)
                        .input('uid', sql.Int, targetUserId)
                        .input('nm', sql.NVarChar, cleanTag)
                        .query('INSERT INTO dbo.Tag (UserID, Name) OUTPUT INSERTED.TagID VALUES (@uid, @nm)');
                    tagId = newTag.recordset[0].TagID;
                }

                await new sql.Request(transaction)
                    .input('eid', sql.Int, entryId).input('tid', sql.Int, tagId)
                    .query('INSERT INTO dbo.EntryTag (EntryID, TagID) VALUES (@eid, @tid)');
            }
        }

        await transaction.commit();
        res.json({ message: 'Оновлено успішно' });
    } catch (err) {
        if (transaction) await transaction.rollback();
        res.status(500).send(err.message);
    }
});

// ВИДАЛИТИ ЗАПИС
app.delete('/api/entries/:id', authenticateToken, async (req, res) => {
    const entryId = req.params.id;
    try {
        const pool = await connectToDb();

        // Якщо Адмін - видаляє будь-який запис, якщо Юзер - тільки свій
        let query = 'DELETE FROM dbo.Entry WHERE EntryID = @eid';
        if (!req.user.isAdmin) {
            query += ' AND UserID = @uid';
        }

        const reqDel = pool.request().input('eid', sql.Int, entryId);
        if (!req.user.isAdmin) reqDel.input('uid', sql.Int, req.user.id);

        await reqDel.query(query);
        res.json({ message: 'Видалено' });
    } catch (err) {
        res.status(500).send(err.message);
    }
});


// --- 4. РЕКОМЕНДАЦІЇ ---
app.get('/api/recommendations', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    try {
        const pool = await connectToDb();
        const result = await pool.request()
            .input('uid', sql.Int, userId)
            .query(`
                SELECT 
                    t.Name, 
                    AVG(CAST(e.MoodLevel AS FLOAT)) as AvgMood,
                    COUNT(e.EntryID) as UsageCount
                FROM dbo.Entry e
                JOIN dbo.EntryTag et ON e.EntryID = et.EntryID
                JOIN dbo.Tag t ON et.TagID = t.TagID
                WHERE e.UserID = @uid
                GROUP BY t.Name
                HAVING COUNT(e.EntryID) >= 2
                ORDER BY AvgMood DESC
            `);

        const stats = result.recordset;
        const recommendations = [];

        if (stats.length === 0) {
            return res.json([{ type: 'neutral', text: "Поки що недостатньо даних для аналізу." }]);
        }

        const bestTags = stats.filter(s => s.AvgMood >= 7.5);
        const worstTags = stats.filter(s => s.AvgMood <= 4.5);

        if (bestTags.length > 0) {
            const topNames = bestTags.slice(0, 3).map(t => t.Name).join(', ');
            recommendations.push({ type: 'positive', text: `Ви почуваєтесь чудово, коли займаєтесь цим: ${topNames}.` });
        }
        if (worstTags.length > 0) {
            const badNames = worstTags.slice(0, 3).map(t => t.Name).join(', ');
            recommendations.push({ type: 'negative', text: `Ці речі можуть псувати настрій: ${badNames}.` });
        }
        if (recommendations.length === 0) {
            recommendations.push({ type: 'neutral', text: "Ваш настрій стабільний." });
        }

        res.json(recommendations);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// 8. СПІЛЬНІ ТЕГИ (АДМІН)

// Отримати всі спільні теги (UserID IS NULL)
app.get('/api/tags/common', authenticateToken, async (req, res) => {
    try {
        const pool = await connectToDb();
        const result = await pool.request()
            .query('SELECT TagID, Name FROM dbo.Tag WHERE UserID IS NULL ORDER BY Name');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Додати спільний тег
app.post('/api/tags/common', authenticateToken, async (req, res) => {
    // Тільки адмін може додавати спільні теги
    if (!req.user.isAdmin) return res.status(403).json({ message: "Тільки для адмінів" });

    const { name } = req.body;
    try {
        const pool = await connectToDb();

        // Перевірка на дублікат серед спільних
        const check = await pool.request()
            .input('nm', sql.NVarChar, name)
            .query('SELECT TagID FROM dbo.Tag WHERE UserID IS NULL AND Name = @nm');

        if (check.recordset.length > 0) {
            return res.status(400).json({ message: "Такий спільний тег вже існує" });
        }

        // UserID = NULL означає "Спільний"
        await pool.request()
            .input('nm', sql.NVarChar, name)
            .query('INSERT INTO dbo.Tag (UserID, Name) VALUES (NULL, @nm)');

        res.json({ message: 'Спільний тег додано' });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Видалити тег (будь-який, за ID)
app.delete('/api/tags/:id', authenticateToken, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ message: "Тільки для адмінів" });

    const tagId = req.params.id;
    try {
        const pool = await connectToDb();
        // Видалення тегу. Завдяки ON DELETE CASCADE у базі, зв'язки в EntryTag видаляться самі.
        await pool.request()
            .input('id', sql.Int, tagId)
            .query('DELETE FROM dbo.Tag WHERE TagID = @id');

        res.json({ message: 'Тег видалено' });
    } catch (err) {
        res.status(500).send(err.message);
    }
});
// 9. ОТРИМАТИ ВСІ ДОСТУПНІ ТЕГИ (Свої + Спільні)
app.get('/api/tags', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    try {
        const pool = await connectToDb();
        const result = await pool.request()
            .input('uid', sql.Int, userId)
            .query(`
                SELECT DISTINCT Name 
                FROM dbo.Tag 
                WHERE UserID = @uid OR UserID IS NULL 
                ORDER BY Name
            `);

        // Повертаємо просто масив рядків: ["робота", "спорт", "свято"]
        const tags = result.recordset.map(row => row.Name);
        res.json(tags);
    } catch (err) {
        res.status(500).send(err.message);
    }
});
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});