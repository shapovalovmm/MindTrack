// auth.js
document.addEventListener('DOMContentLoaded', () => {

    // Елементи UI
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const showLoginBtn = document.getElementById('showLoginBtn');
    const showRegisterBtn = document.getElementById('showRegisterBtn');

    // Поля вводу
    const regEmail = document.getElementById('regEmail');
    const regPassword = document.getElementById('regPassword');
    const regPasswordConfirm = document.getElementById('regPasswordConfirm');
    const registerError = document.getElementById('registerError');

    const loginEmail = document.getElementById('loginEmail');
    const loginPassword = document.getElementById('loginPassword');
    const loginError = document.getElementById('loginError');

    // --- Логіка Теми ---
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark');
        });
    }

    // --- Перемикання форм ---
    if (showLoginBtn) {
        showLoginBtn.addEventListener('click', () => {
            loginForm.style.display = 'flex';
            registerForm.style.display = 'none';
        });
    }

    if (showRegisterBtn) {
        showRegisterBtn.addEventListener('click', () => {
            loginForm.style.display = 'none';
            registerForm.style.display = 'flex';
        });
    }

    // --- РЕЄСТРАЦІЯ ---
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            registerError.style.display = 'none';

            if (regPassword.value !== regPasswordConfirm.value) {
                registerError.textContent = 'Паролі не співпадають!';
                registerError.style.display = 'block';
                return;
            }

            try {
                // Викликаємо чисту функцію з api.js
                await registerUser(regEmail.value, regPassword.value);

                alert('Реєстрація успішна! Тепер увійдіть.');
                if(showLoginBtn) showLoginBtn.click();

            } catch (error) {
                registerError.textContent = error.message;
                registerError.style.display = 'block';
            }
        });
    }

    // --- ВХІД ---
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            loginError.style.display = 'none';

            try {
                // Викликаємо чисту функцію з api.js
                const userData = await loginUser(loginEmail.value, loginPassword.value);

                // Зберігаємо дані через функцію з api.js
                saveUser(userData);

                // Перенаправляємо
                if (userData.isAdmin) {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'diary.html';
                }

            } catch (error) {
                loginError.textContent = error.message;
                loginError.style.display = 'block';
            }
        });
    }
});