// Кнопки Теми
const themeButtons = [document.getElementById('themeBtn'), document.getElementById('themeBtnSticky')];
themeButtons.forEach(btn => {
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
const filterDateInput = document.getElementById('filterDate');
const filterTagsContainer = document.getElementById('filterTags');
const clearFiltersBtn = document.getElementById('clearFiltersBtn');
const filterMoodSelect = document.getElementById('filterMood');

// ▼▼▼ НОВІ СЕЛЕКТОРИ ДЛЯ СТАТИСТИКИ ▼▼▼
const statsButtons = [document.getElementById('statsBtn'), document.getElementById('statsBtnSticky')];
const statsSection = document.getElementById('statsSection');
const moodChartCanvas = document.getElementById('averageMoodChart');
let myMoodChart; // Глобальна змінна для зберігання діаграми
// ▲▲▲ КІНЕЦЬ НОВИХ СЕЛЕКТОРІВ ▲▲▲

// Селектори модального вікна
const modalOverlay = document.getElementById('modalOverlay');
const editModal = document.getElementById('editModal');
// ... (всі інші селектори модального вікна) ...
const modalCloseBtn = document.getElementById('modalCloseBtn');
const editForm = document.getElementById('editForm');
const modalTitle = document.getElementById('modalTitle');
const modalText = document.getElementById('modalText');
const modalMoodSlider = document.getElementById('modalMoodSlider');
const modalMoodValue = document.getElementById('modalMoodValue');
const modalTagsContainer = document.getElementById('modalTagsContainer');
const newTagInput = document.getElementById('newTagInput');
const addNewTagBtn = document.getElementById('addNewTagBtn');
const modalDeleteBtn = document.getElementById('modalDeleteBtn');
const modalConfirmBtn = document.getElementById('modalConfirmBtn');

let currentlyEditing = null;

const diaryData = [
    { date: '2025-10-28', entries: [
            {title: 'Ранкова медитація', mood: 7, text: 'Сьогодні почав день з медитації. Відчуваю себе дуже розслаблено та щасливо.', tags: ['здоров\'я', 'релакс', 'радість']},
            {title: 'Сніданок', mood: 8, text: 'Приготував смачний сніданок, яйця та тости з авокадо.', tags: ['їжа', 'здоров\'я']}
        ]},
    { date: '2025-10-27', entries: [
            {title: 'Прогулянка парком', mood: 6, text: 'Пройшовся парком, подивився на дерева, насолоджувався свіжим повітрям.', tags: ['спорт', 'природа', 'сум']},
            {title: 'Тривожний сон', mood: 3, text: 'Погано спав, відчував тривожність.', tags: ['сон', 'тривожність', 'страх']}
        ]},
    // Додамо трохи більше даних для тестів
    { date: '2025-10-01', entries: [{title: 'Початок місяця', mood: 8, text: '...', tags: ['робота']}]},
    { date: '2025-08-15', entries: [{title: 'Відпустка', mood: 10, text: '...', tags: ['відпочинок']}]},
    { date: '2024-11-10', entries: [{title: 'Старий запис', mood: 5, text: '...', tags: ['рефлексія']}]}
];

// --- Функції Модального вікна ---
// ... (getAllUniqueTags, createTagCheckbox, populateModalTags) ...
// ... (openModal, closeModal, addNewTag, handleFormSubmit, handleDelete) ...
function getAllUniqueTags() {
    const allTags = new Set();
    diaryData.forEach(day => {
        day.entries.forEach(entry => {
            entry.tags.forEach(tag => allTags.add(tag));
        });
    });
    ['тривожність', 'сум', 'радість', 'розгубленість', 'страх', 'їжа', 'тренування', 'хороший сон'].forEach(tag => allTags.add(tag));
    return allTags;
}
function createTagCheckbox(tag, isChecked = false) {
    const tagWrapper = document.createElement('div');
    tagWrapper.className = 'filter-tag-item';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = tag;
    checkbox.id = `modal-tag-${tag}`;
    checkbox.className = 'tag-checkbox';
    checkbox.checked = isChecked;
    const label = document.createElement('label');
    label.htmlFor = `modal-tag-${tag}`;
    label.textContent = tag;
    tagWrapper.appendChild(checkbox);
    tagWrapper.appendChild(label);
    return tagWrapper;
}
function populateModalTags(currentEntryTags = []) {
    modalTagsContainer.innerHTML = '';
    const allTags = getAllUniqueTags();
    allTags.forEach(tag => {
        const isChecked = currentEntryTags.includes(tag);
        const checkboxItem = createTagCheckbox(tag, isChecked);
        modalTagsContainer.appendChild(checkboxItem);
    });
}
function openModal(dayIndex, entryIndex) {
    currentlyEditing = { dayIndex, entryIndex };
    const entry = diaryData[dayIndex].entries[entryIndex];
    modalTitle.value = entry.title;
    modalText.value = entry.text;
    modalMoodSlider.value = entry.mood;
    modalMoodValue.textContent = entry.mood;
    populateModalTags(entry.tags);
    modalOverlay.style.display = 'block';
    editModal.style.display = 'block';
}
function closeModal() {
    modalOverlay.style.display = 'none';
    editModal.style.display = 'none';
    currentlyEditing = null;
    newTagInput.value = '';
}
function addNewTag() {
    const newTag = newTagInput.value.trim().toLowerCase();
    if (newTag) {
        const exists = document.getElementById(`modal-tag-${newTag}`);
        if (!exists) {
            const checkboxItem = createTagCheckbox(newTag, true);
            modalTagsContainer.appendChild(checkboxItem);
        } else {
            document.getElementById(`modal-tag-${newTag}`).checked = true;
        }
        newTagInput.value = '';
    }
}
function handleFormSubmit(event) {
    event.preventDefault();
    if (!currentlyEditing) return;
    const { dayIndex, entryIndex } = currentlyEditing;
    const newTags = [];
    modalTagsContainer.querySelectorAll('.tag-checkbox:checked').forEach(checkbox => {
        newTags.push(checkbox.value);
    });
    const updatedEntry = {
        title: modalTitle.value,
        mood: parseInt(modalMoodSlider.value, 10),
        text: modalText.value,
        tags: newTags
    };
    diaryData[dayIndex].entries[entryIndex] = updatedEntry;
    closeModal();
    applyFilters();
}
function handleDelete() {
    if (!currentlyEditing) return;
    const { dayIndex, entryIndex } = currentlyEditing;
    if (confirm('Ви впевнені, що хочете видалити цей запис?')) {
        diaryData[dayIndex].entries.splice(entryIndex, 1);
        if (diaryData[dayIndex].entries.length === 0) {
            diaryData.splice(dayIndex, 1);
        }
        closeModal();
        applyFilters();
    }
}


// --- Функції Фільтрів та Історії ---
function populateTagFilters() {
    if (!filterTagsContainer || filterTagsContainer.children.length > 0) return;
    const allTags = getAllUniqueTags();

    allTags.forEach(tag => {
        const tagWrapper = document.createElement('div');
        tagWrapper.className = 'filter-tag-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = tag;
        checkbox.id = `tag-${tag}`;
        checkbox.className = 'tag-checkbox';

        const label = document.createElement('label');
        label.htmlFor = `tag-${tag}`;
        label.textContent = tag;

        tagWrapper.appendChild(checkbox);
        tagWrapper.appendChild(label);
        filterTagsContainer.appendChild(tagWrapper);
    });
}

function applyFilters() {
    const dateFilter = filterDateInput ? filterDateInput.value : '';
    const moodFilter = filterMoodSelect ? filterMoodSelect.value : '';

    const selectedTags = [];
    if (filterTagsContainer) {
        const checkedBoxes = document.querySelectorAll('#filterTags .tag-checkbox:checked');
        checkedBoxes.forEach(box => selectedTags.push(box.value));
    }
    renderHistory(dateFilter, selectedTags, moodFilter);
}

function renderHistory(dateFilter = '', tagsFilter = [], moodFilter = '') {
    if (!diaryListContainer) return;
    diaryListContainer.innerHTML = '';

    let indexedData = diaryData.map((day, dayIndex) => ({
        ...day,
        dayIndex,
        entries: day.entries.map((entry, entryIndex) => ({
            ...entry,
            entryIndex
        }))
    }));

    let filteredData = indexedData;
    if (dateFilter) {
        filteredData = filteredData.filter(day => day.date === dateFilter);
    }

    if (tagsFilter.length > 0 || moodFilter) {
        filteredData = filteredData.map(day => {

            const filteredEntries = day.entries.filter(entry => {
                const moodMatch = !moodFilter || entry.mood === parseInt(moodFilter, 10);
                const tagMatch = tagsFilter.length === 0 || entry.tags.some(tag => tagsFilter.includes(tag));
                return moodMatch && tagMatch;
            });

            return { ...day, entries: filteredEntries };
        });
    }

    let entriesFound = false;
    filteredData.forEach(day => {
        if(day.entries && day.entries.length > 0){
            entriesFound = true;
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
                edit.addEventListener('click', () => {
                    openModal(day.dayIndex, entry.entryIndex);
                });
                card.appendChild(title);
                card.appendChild(info);
                card.appendChild(tagsDiv);
                card.appendChild(edit);
                dateGroup.appendChild(card);
            });
            diaryListContainer.appendChild(dateGroup);
        }
    });
    if (!entriesFound) {
        diaryListContainer.innerHTML = '<p style="text-align: center;">Записів за вашими критеріями не знайдено.</p>';
    }
}




/**
 * Розраховує середній настрій для записів між двома датами
 * @param {Date} startDate - Початкова дата
 * @param {Date} endDate - Кінцева дата
 * @returns {number} - Середній настрій (або 0)
 */
function calculateAverageMood(startDate, endDate) {
    let totalMood = 0;
    let moodCount = 0;

    // Встановлюємо час для коректного порівняння "включно"
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    diaryData.forEach(day => {
        // Розбираємо дату з рядка YYYY-MM-DD
        const [y, m, d] = day.date.split('-').map(Number);
        const entryDate = new Date(y, m - 1, d); // Місяці в Date() 0-індексовані

        if (entryDate >= startDate && entryDate <= endDate) {
            day.entries.forEach(entry => {
                totalMood += entry.mood;
                moodCount++;
            });
        }
    });

    return moodCount === 0 ? 0 : (totalMood / moodCount);
}

/**
 * Запускає розрахунки та відображає діаграму
 */
function renderStatistics() {
    const today = new Date();

    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 7);

    const monthAgo = new Date();
    monthAgo.setMonth(today.getMonth() - 1);

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(today.getMonth() - 3);

    const yearAgo = new Date();
    yearAgo.setFullYear(today.getFullYear() - 1);

    // Розраховуємо середні значення
    const avgWeek = calculateAverageMood(weekAgo, today);
    const avgMonth = calculateAverageMood(monthAgo, today);
    const avg3Months = calculateAverageMood(threeMonthsAgo, today);
    const avgYear = calculateAverageMood(yearAgo, today);

    // Зберігаємо дані в масив
    const chartData = [
        avgWeek.toFixed(1),
        avgMonth.toFixed(1),
        avg3Months.toFixed(1),
        avgYear.toFixed(1)
    ];

    // Рендеримо діаграму
    renderAverageMoodChart(chartData);
}

/**
 * Створює або оновлює стовпчикову діаграму
 * @param {Array<number>} data - Масив з 4 середніми значеннями
 */
function renderAverageMoodChart(data) {
    if (!moodChartCanvas) return;
    const ctx = moodChartCanvas.getContext('2d');

    // Якщо діаграма вже існує, знищуємо її, щоб намалювати нову
    if (myMoodChart) {
        myMoodChart.destroy();
    }

    myMoodChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Останній тиждень', 'Останній місяць', 'Останні 3 місяці', 'Останній рік'],
            datasets: [{
                label: 'Середній настрій',
                data: data,
                backgroundColor: [
                    'rgba(170, 219, 163, 0.6)', // 7 days
                    'rgba(122, 184, 122, 0.6)', // 1 month
                    'rgba(75, 138, 75, 0.6)',   // 3 months
                    'rgba(46, 61, 42, 0.6)'    // 1 year
                ],
                borderColor: [
                    'rgba(170, 219, 163, 1)',
                    'rgba(122, 184, 122, 1)',
                    'rgba(75, 138, 75, 1)',
                    'rgba(46, 61, 42, 1)'
                ],
                borderWidth: 1,
                maxBarThickness: 70
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 10, // Шкала настрою від 1 до 10
                    title: {
                        display: true,
                        text: 'Рівень настрою'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false // Ховаємо легенду, оскільки у нас лише один набір даних
                },
                title: {
                    display: true,
                    text: 'Середній настрій за періодами',
                    font: {
                        size: 18
                    }
                }
            }
        }
    });
}

// --- Навігація та Обробники подій ---

// Слухачі для кнопок "Історія" (ОНОВЛЕНО: ховає статистику)
historyButtons.forEach(btn => {
    if (btn) {
        btn.addEventListener('click', () => {
            if (mainBlock && historySection && statsSection) {
                mainBlock.style.display = 'none';
                statsSection.style.display = 'none'; // Ховаємо статистику
                if (historySection.style.display !== 'block') {
                    populateTagFilters();
                    applyFilters();
                    historySection.style.display = 'block';
                    setTimeout(() => { historySection.style.opacity = 1; }, 50);
                }
            }
        });
    }
});

// Слухачі для кнопок "Головна" (ОНОВЛЕНО: ховає історію та статистику)
homeButtons.forEach(btn => {
    if (btn) {
        btn.addEventListener('click', () => {
            if (mainBlock && historySection && statsSection) {
                statsSection.style.display = 'none'; // Ховаємо статистику
                mainBlock.style.display = 'block';
                if (historySection.style.display === 'block') {
                    historySection.style.opacity = 0;
                    setTimeout(() => { historySection.style.display = 'none'; }, 500);
                }
            }
        });
    }
});

// ▼▼▼ НОВІ СЛУХАЧІ ДЛЯ КНОПОК "СТАТИСТИКА" ▼▼▼
statsButtons.forEach(btn => {
    if (btn) {
        btn.addEventListener('click', () => {
            if (mainBlock && historySection && statsSection) {
                // Ховаємо інші секції
                mainBlock.style.display = 'none';
                if (historySection.style.display === 'block') {
                    historySection.style.opacity = 0;
                    setTimeout(() => { historySection.style.display = 'none'; }, 500);
                }

                // Показуємо статистику
                statsSection.style.display = 'block';
                // Запускаємо розрахунок та рендеринг діаграми
                renderStatistics();
            }
        });
    }
});

// Слухач для 'scroll' та логіка Бургер меню
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


// Слухачі для Фільтрів
if (filterDateInput && filterTagsContainer && clearFiltersBtn && filterMoodSelect) {

    filterDateInput.addEventListener('change', applyFilters);
    filterMoodSelect.addEventListener('change', applyFilters);

    filterTagsContainer.addEventListener('change', (e) => {
        if (e.target.classList.contains('tag-checkbox')) {
            applyFilters();
        }
    });

    clearFiltersBtn.addEventListener('click', () => {
        filterDateInput.value = '';
        filterMoodSelect.value = '';
        document.querySelectorAll('#filterTags .tag-checkbox:checked').forEach(cb => {
            cb.checked = false;
        });
        applyFilters();
    });
}

// Обробники для Модального вікна
if (modalOverlay) {
    modalOverlay.addEventListener('click', closeModal);
    modalCloseBtn.addEventListener('click', closeModal);

    modalMoodSlider.addEventListener('input', () => {
        modalMoodValue.textContent = modalMoodSlider.value;
    });

    addNewTagBtn.addEventListener('click', addNewTag);
    newTagInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addNewTag();
        }
    });

    editForm.addEventListener('submit', handleFormSubmit);
    modalDeleteBtn.addEventListener('click', handleDelete);
}