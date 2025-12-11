document.addEventListener('DOMContentLoaded', async () => {

    // 1. ПЕРЕВІРКА АВТОРИЗАЦІЇ
    const currentUser = getCurrentUser();
    if (!currentUser) {
        window.location.href = 'auth.html';
        return;
    }

    // Відобразити ім'я користувача
    document.getElementById('userNameDisplay').textContent = currentUser.Name || currentUser.Email;

    // 2. ЗАВАНТАЖЕННЯ ЗАПИСІВ
    const entriesList = document.getElementById('entriesList');

    async function loadAndRenderEntries() {
        try {
            const entries = await getEntries(currentUser.UserID);
            entriesList.innerHTML = ''; // Очистити список

            if (entries.length === 0) {
                entriesList.innerHTML = '<p>Поки що записів немає. Створіть перший!</p>';
                return;
            }

            entries.forEach(entry => {
                const card = createEntryCard(entry);
                entriesList.appendChild(card);
            });

        } catch (err) {
            console.error(err);
            entriesList.innerHTML = '<p style="color:red">Помилка завантаження даних</p>';
        }
    }

    // Допоміжна функція створення HTML картки
    function createEntryCard(entry) {
        const div = document.createElement('div');
        div.className = 'entry-card';

        // Форматуємо дату (зрізаємо час)
        const dateStr = new Date(entry.Date).toLocaleDateString('uk-UA');

        // Колір залежно від настрою
        const moodColor = entry.MoodLevel >= 7 ? '#d4edda' : (entry.MoodLevel <= 4 ? '#f8d7da' : '#fff3cd');

        div.style.borderLeft = `5px solid ${moodColor}`;

        div.innerHTML = `
            <div class="card-header">
                <span class="date">${dateStr}</span>
                <span class="mood-badge">Настрій: ${entry.MoodLevel}/10</span>
            </div>
            <h3>${entry.Title || 'Без заголовка'}</h3>
            <p class="text-preview">${entry.Text}</p>
            <div class="tags-container">
                ${entry.Tags ? entry.Tags.split(',').map(tag => `<span class="tag">#${tag.trim()}</span>`).join('') : ''}
            </div>
        `;
        return div;
    }

    // Запускаємо завантаження
    loadAndRenderEntries();


    // 3. ЛОГІКА МОДАЛЬНОГО ВІКНА
    const modal = document.getElementById('entryModal');
    const btnOpen = document.getElementById('addEntryBtn');
    const btnClose = document.querySelector('.close-btn');

    btnOpen.onclick = () => modal.style.display = "block";
    btnClose.onclick = () => modal.style.display = "none";
    window.onclick = (event) => {
        if (event.target == modal) modal.style.display = "none";
    }

    // Встановити сьогоднішню дату в інпут
    document.getElementById('entryDate').valueAsDate = new Date();


    // 4. ДОДАВАННЯ НОВОГО ЗАПИСУ
    const form = document.getElementById('entryForm');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('entryTitle').value;
        const text = document.getElementById('entryText').value;
        const date = document.getElementById('entryDate').value;
        const mood = document.getElementById('entryMood').value;
        const tagsInput = document.getElementById('entryTags').value;

        try {
            // КРОК А: Обробка тегів
            // Ми беремо рядок "Спорт, Робота", розбиваємо на масив і для кожного слова
            // запитуємо у сервера його ID (створюємо новий або беремо існуючий)
            let tagIds = [];
            if (tagsInput.trim()) {
                const tagNames = tagsInput.split(',').map(t => t.trim()).filter(t => t);

                // Це Promise.all, щоб зробити запити паралельно (швидше)
                tagIds = await Promise.all(tagNames.map(async name => {
                    return await createOrGetTag(currentUser.UserID, name);
                }));
            }

            // КРОК Б: Збереження самого запису
            await addEntry({
                userId: currentUser.UserID,
                date: date,
                title: title,
                text: text,
                moodLevel: parseInt(mood),
                tags: tagIds // передаємо масив ID, наприклад [10, 15]
            });

            // КРОК В: Оновлення інтерфейсу
            modal.style.display = "none";
            form.reset();
            document.getElementById('entryDate').valueAsDate = new Date(); // скинути дату на сьогодні
            await loadAndRenderEntries(); // Перезавантажити список

        } catch (err) {
            alert('Помилка: ' + err.message);
        }
    });
});