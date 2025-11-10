document.addEventListener('DOMContentLoaded', () => {

    // --- Логіка Теми (скопійовано з script.js) ---
    const themeButtons = [document.getElementById('themeBtnSticky')];
    themeButtons.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                document.body.classList.toggle('dark');
            });
        }
    });

    // --- Логіка Бургер-меню (скопійовано з script.js) ---
    const burgerMenu = document.getElementById('burgerMenu');
    const stickyMenu = document.getElementById('stickyMenu');
    const navLinksContainer = document.getElementById('stickyNavLinks');

    if (burgerMenu && stickyMenu && navLinksContainer) {
        burgerMenu.addEventListener('click', () => {
            stickyMenu.classList.toggle('nav-active');
        });

        // Закриваємо меню при натисканні на посилання (кнопку)
        navLinksContainer.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                stickyMenu.classList.remove('nav-active');
            }
        });
    }

    // --- Нова логіка для кнопок адмін-панелі ---
    const userSearchBtn = document.getElementById('userSearchBtn');
    const deleteDateBtn = document.getElementById('deleteDateBtn');

    if (userSearchBtn) {
        userSearchBtn.addEventListener('click', () => {
            const query = document.getElementById('userSearchInput').value;
            if (query) {
                console.log(`Пошук користувача: ${query}`);
                alert(`(Симуляція) Пошук користувача: ${query}`);
            } else {
                alert('Будь ласка, введіть запит для пошуку.');
            }
        });
    }

    if (deleteDateBtn) {
        deleteDateBtn.addEventListener('click', () => {
            const date = document.getElementById('deleteDateInput').value;
            if (date) {
                if (confirm(`Ви впевнені, що хочете видалити ВСІ записи за ${date}? Ця дія незворотня.`)) {
                    console.log(`Видалення записів за ${date}`);
                    alert(`(Симуляція) Видалення всіх записів за ${date}`);

                }
            } else {
                alert('Будь ласка, оберіть дату.');
            }
        });
    }
});