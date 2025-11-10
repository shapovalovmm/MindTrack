document.addEventListener('DOMContentLoaded', () => {

    // Елементи перемикання теми
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark');
        });
    }

    // Елементи перемикання форм
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const showLoginBtn = document.getElementById('showLoginBtn');
    const showRegisterBtn = document.getElementById('showRegisterBtn');

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

    // Елементи форм
    const regPassword = document.getElementById('regPassword');
    const regPasswordConfirm = document.getElementById('regPasswordConfirm');
    const registerError = document.getElementById('registerError');
    const loginError = document.getElementById('loginError');

    // Обробка відправки форми реєстрації
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault(); // Запобігаємо реальній відправці
            registerError.style.display = 'none'; // Ховаємо стару помилку

            if (regPassword.value !== regPasswordConfirm.value) {
                registerError.textContent = 'Паролі не співпадають!';
                registerError.style.display = 'block';
            } else {
                console.log('Реєстрація успішна');
                // Симуляція успішного входу: перехід на сторінку щоденника
                window.location.href = 'diary.html';
            }
        });
    }

    // Обробка відправки форми входу
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            loginError.style.display = 'none';

            console.log('Вхід успішний');
            // Симуляція успішного входу: перехід на сторінку щоденника
            window.location.href = 'diary.html';
        });
    }
});