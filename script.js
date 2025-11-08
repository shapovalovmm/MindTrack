// Кнопки Теми
const themeButtons = [document.getElementById('themeBtn'), document.getElementById('themeBtnSticky')];
themeButtons.forEach(btn => {
    // Перевіряємо, чи кнопка існує (на випадок, якщо скрипт завантажиться на сторінці, де її немає)
    if (btn) {
        btn.addEventListener('click', () => {
            document.body.classList.toggle('dark');
        });
    }
});

// Отримуємо всі основні елементи
const historyButtons = [document.getElementById('historyBtn'), document.getElementById('historyBtnSticky')];
const homeButtons = [document.getElementById('homeBtn'), document.getElementById('homeBtnSticky')];
const historySection = document.getElementById('historySection');
const mainBlock = document.querySelector('main');
const diaryListContainer = document.getElementById('diaryListContainer');

// Дані щоденника
const diaryData = [
    { date: '2025-10-28', entries: [
            {title: 'Ранкова медитація', mood: 7, text: 'Сьогодні почав день з медитації. Відчуваю себе дуже розслаблено та щасливо.', tags: ['здоров\'я', 'релакс']},
            {title: 'Сніданок', mood: 8, text: 'Приготував смачний сніданок, яйця та тости з авокадо.', tags: ['їжа', 'здоров\'я']}
        ]},
    { date: '2025-10-27', entries: [
            {title: 'Прогулянка парком', mood: 6, text: 'Пройшовся парком, подивився на дерева, насолоджувався свіжим повітрям.', tags: ['спорт', 'природа']}
        ]}
];

// Функція рендеру історії
function renderHistory() {
    // Перевіряємо, чи існує контейнер, перш ніж вставляти в нього HTML
    if (!diaryListContainer) return;

    diaryListContainer.innerHTML = '';
    diaryData.forEach(day => {
        if(day.entries && day.entries.length > 0){
            const dateGroup = document.createElement('div');
            dateGroup.className = 'date-group';
            const dateTitle = document.createElement('div');
            dateTitle.className = 'date-title';
            dateTitle.textContent = day.date;
            dateGroup.appendChild(dateTitle);

            day.entries.forEach(entry => {
                const card = document.createElement('div');
                card.className = 'card';
                const title = document.createElement('div');
                title.className = 'card-title';
                title.textContent = entry.title;
                const info = document.createElement('div');
                info.className = 'card-info';
                info.textContent = `Настрій: ${entry.mood}/10 | ${entry.text}`;
                const tagsDiv = document.createElement('div');
                tagsDiv.className = 'card-tags';
                entry.tags.forEach(tag => {
                    const tagEl = document.createElement('span');
                    tagEl.className = 'tag';
                    tagEl.textContent = tag;
                    tagsDiv.appendChild(tagEl);
                });
                const edit = document.createElement('div');
                edit.className = 'card-edit';
                edit.textContent = '🖉';
                card.appendChild(title);
                card.appendChild(info);
                card.appendChild(tagsDiv);
                card.appendChild(edit);
                dateGroup.appendChild(card);
            });
            diaryListContainer.appendChild(dateGroup);
        }
    });
}

// Слухач для кнопок "Історія"
historyButtons.forEach(btn => {
    if (btn) {
        btn.addEventListener('click', () => {
            // Переконуємось, що елементи існують на сторінці
            if (mainBlock && historySection) {
                mainBlock.style.display = 'none';
                if (historySection.style.display !== 'block') {
                    renderHistory();
                    historySection.style.display = 'block';
                    setTimeout(() => { historySection.style.opacity = 1; }, 50);
                }
            }
        });
    }
});

// Слухач для кнопок "Головна"
homeButtons.forEach(btn => {
    if (btn) {
        btn.addEventListener('click', () => {
            if (mainBlock && historySection) {
                mainBlock.style.display = 'block';
                if (historySection.style.display === 'block') {
                    historySection.style.opacity = 0;
                    setTimeout(() => { historySection.style.display = 'none'; }, 500);
                }
            }
        });
    }
});

// Слухач для липкого меню
window.addEventListener('scroll', () => {
    const stickyMenu = document.getElementById('stickyMenu');
    if (stickyMenu) {
        if (window.innerWidth > 768) {
            if (window.scrollY > 100) {
                stickyMenu.classList.add('show');
            } else {
                stickyMenu.classList.remove('show');
            }
        } else {
            stickyMenu.classList.remove('show');
        }
    }
});

// Логіка бургер меню
const burgerMenu = document.getElementById('burgerMenu');
const stickyMenu = document.getElementById('stickyMenu');
const navLinksContainer = document.getElementById('stickyNavLinks');

if (burgerMenu && stickyMenu && navLinksContainer) {
    burgerMenu.addEventListener('click', () => {
        stickyMenu.classList.toggle('nav-active');
    });

    navLinksContainer.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            stickyMenu.classList.remove('nav-active');
        }
    });
}