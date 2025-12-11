// api.js
const API_URL = 'http://localhost:5000/api';

// --- ФУНКЦІЇ АВТОРИЗАЦІЇ ---

// Реєстрація
async function registerUser(email, password) {
    const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'Помилка реєстрації');
    }
    return data;
}

// Вхід
async function loginUser(email, password) {
    const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'Невірний логін або пароль');
    }
    return data; // Повертає { token, isAdmin, theme, ... }
}

// Функція збереження даних користувача (Token + Theme)
function saveUser(data) {
    localStorage.setItem('token', data.token);

    // Зберігаємо об'єкт налаштувань користувача
    const userSettings = {
        name: data.name,
        isAdmin: data.isAdmin,
        theme: data.theme || 'light'
    };
    localStorage.setItem('user', JSON.stringify(userSettings));
}

// --- НОВА ФУНКЦІЯ: Оновлення теми ---
async function updateUserTheme(themeName) {
    const token = localStorage.getItem('token');
    if (!token) return;

    // 1. Відправляємо на сервер
    try {
        await fetch(`${API_URL}/users/theme`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ theme: themeName })
        });

        // 2. Оновлюємо localStorage
        const userDataString = localStorage.getItem('user');
        if (userDataString) {
            const user = JSON.parse(userDataString);
            user.theme = themeName;
            localStorage.setItem('user', JSON.stringify(user));
        }
    } catch (err) {
        console.error("Помилка збереження теми:", err);
    }
}

// Універсальна функція для захищених запитів (використовується в script.js)
async function authFetch(url, options = {}) {
    const token = localStorage.getItem('token');

    if (!token) {
        // Якщо токена немає - викидаємо на логін
        window.location.href = 'auth.html';
        return;
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
    };

    // Якщо URL не повний (наприклад "/entries"), додаємо базовий API_URL
    const fullUrl = url.startsWith('http') ? url : `${API_URL}${url}`;

    return fetch(fullUrl, { ...options, headers });
}

// Отримання рекомендацій
async function getRecommendations() {
    const response = await authFetch('/recommendations');
    if (response && response.ok) {
        return await response.json();
    }
    return [];
}

// Отримати список усіх доступних тегів
async function getAvailableTags() {
    const response = await authFetch('/tags');
    if (response && response.ok) {
        return await response.json();
    }
    return [];
}