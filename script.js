// script.js

// Глобальні змінні
let diaryData = [];
let availableTags = []; // Тут зберігаємо список тегів для синхронізації
let currentlyEditing = null; // { dayIndex, entryIndex, id }

// --- Селектори ---
const themeButtons = [document.getElementById('themeBtn'), document.getElementById('themeBtnSticky')];
const historyButtons = [document.getElementById('historyBtn'), document.getElementById('historyBtnSticky')];
const homeButtons = [document.getElementById('homeBtn'), document.getElementById('homeBtnSticky')];
const statsButtons = [document.getElementById('statsBtn'), document.getElementById('statsBtnSticky')];

const sectionHome = document.querySelector('main'); // Або додайте id="homeSection" в HTML
const sectionHistory = document.getElementById('historySection');
const sectionStats = document.getElementById('statsSection');

const diaryListContainer = document.getElementById('diaryListContainer');
const filterDateInput = document.getElementById('filterDate');
const filterTagsContainer = document.getElementById('filterTags'); // Контейнер фільтрів
const clearFiltersBtn = document.getElementById('clearFiltersBtn');
const filterMoodSelect = document.getElementById('filterMood');
const moodChartCanvas = document.getElementById('averageMoodChart');
let myMoodChart;

// Селектори модального вікна
const modalOverlay = document.getElementById('modalOverlay');
const editModal = document.getElementById('editModal');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const editForm = document.getElementById('editForm');
const modalTitle = document.getElementById('modalTitle');
const modalText = document.getElementById('modalText');
const modalMoodSlider = document.getElementById('modalMoodSlider');
const modalMoodValue = document.getElementById('modalMoodValue');
const modalTagsContainer = document.getElementById('modalTagsContainer'); // Контейнер тегів у модалці
const newTagInput = document.getElementById('newTagInput');
const addNewTagBtn = document.getElementById('addNewTagBtn');
const modalDeleteBtn = document.getElementById('modalDeleteBtn');
const addEntryBtn = document.getElementById('addEntryBtn');

// --- 1. ЗАВАНТАЖЕННЯ ДАНИХ ---

// Завантаження записів
async function loadDiaryEntries() {
    try {
        const response = await authFetch('/entries');
        if (response && response.ok) {
            const rawEntries = await response.json();

            // Групуємо по датах
            const grouped = {};
            rawEntries.forEach(entry => {
                let dateStr = entry.date;
                if (typeof dateStr === 'string') dateStr = dateStr.split('T')[0];

                if (!grouped[dateStr]) grouped[dateStr] = [];
                grouped[dateStr].push({
                    id: entry.id,
                    title: entry.title,
                    text: entry.text,
                    mood: entry.mood,
                    tags: entry.tags || []
                });
            });

            diaryData = Object.keys(grouped).map(date => ({
                date: date,
                entries: grouped[date]
            })).sort((a, b) => new Date(b.date) - new Date(a.date));

            applyFilters();
        } else if (response && response.status === 401) {
            window.location.href = 'auth.html';
        }
    } catch (err) {
        console.error("Помилка завантаження записів:", err);
    }
}

// Завантаження ТЕГІВ (Спільне джерело для фільтру і модалки)
async function loadTags() {
    try {
        const response = await authFetch('/tags');
        if (response && response.ok) {
            availableTags = await response.json(); // Оновлюємо глобальний список
            populateTagFilters(); // Оновлюємо фільтри на сторінці
        }
    } catch (err) {
        console.error("Помилка завантаження тегів:", err);
    }
}

// --- 2. ВІДОБРАЖЕННЯ ТЕГІВ ---

// Допоміжна функція створення HTML чекбокса
function createTagCheckbox(tag, isChecked, idPrefix) {
    const wrapper = document.createElement('div');
    wrapper.className = 'filter-tag-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = tag;
    checkbox.id = `${idPrefix}-${tag}`;
    checkbox.className = 'tag-checkbox';
    checkbox.checked = isChecked;

    const label = document.createElement('label');
    label.htmlFor = `${idPrefix}-${tag}`;
    label.textContent = tag;

    wrapper.appendChild(checkbox);
    wrapper.appendChild(label);
    return wrapper;
}

// Заповнення ФІЛЬТРІВ (на головній сторінці)
function populateTagFilters() {
    if (!filterTagsContainer) return;

    // Запам'ятовуємо, що було відмічено, щоб не збивати фільтр при оновленні
    const currentlyChecked = Array.from(filterTagsContainer.querySelectorAll('.tag-checkbox:checked')).map(cb => cb.value);

    filterTagsContainer.innerHTML = '';

    if (availableTags.length === 0) {
        filterTagsContainer.innerHTML = '<span style="color:#888; font-size: 0.9rem;">Тегів поки немає</span>';
        return;
    }

    availableTags.forEach(tag => {
        const isChecked = currentlyChecked.includes(tag);
        // Використовуємо префікс 'filter', щоб ID не конфліктували з модалкою
        const tagElement = createTagCheckbox(tag, isChecked, 'filter');
        filterTagsContainer.appendChild(tagElement);
    });
}

// Заповнення МОДАЛЬНОГО ВІКНА (при створенні/редагуванні)
function populateModalTags(currentEntryTags = []) {
    modalTagsContainer.innerHTML = '';

    // 1. Спочатку показуємо всі теги, які ми знаємо (з сервера)
    // Перетворюємо tags у Set для швидкого пошуку
    const activeTagsSet = new Set(currentEntryTags.map(t => t.trim()));
    const knownTagsSet = new Set(availableTags);

    availableTags.forEach(tag => {
        const isChecked = activeTagsSet.has(tag);
        const tagElement = createTagCheckbox(tag, isChecked, 'modal');
        modalTagsContainer.appendChild(tagElement);
    });

    // 2. Якщо у запису є теги, яких немає в загальному списку (рідкісний випадок, але можливий)
    activeTagsSet.forEach(tag => {
        if (!knownTagsSet.has(tag)) {
            const tagElement = createTagCheckbox(tag, true, 'modal');
            modalTagsContainer.appendChild(tagElement);
        }
    });
}

// --- 3. ЛОГІКА МОДАЛЬНОГО ВІКНА ---

function openModal(dayIndex, entryIndex) {
    currentlyEditing = { dayIndex, entryIndex };
    const entry = diaryData[dayIndex].entries[entryIndex];

    modalTitle.value = entry.title;
    modalText.value = entry.text;
    modalMoodSlider.value = entry.mood;
    modalMoodValue.textContent = entry.mood;

    // Заповнюємо теги, передаючи теги поточного запису
    populateModalTags(entry.tags);

    if(modalDeleteBtn) modalDeleteBtn.style.display = 'inline-block';
    modalOverlay.style.display = 'block';
    editModal.style.display = 'block';
}

function openNewEntryModal() {
    currentlyEditing = null;

    modalTitle.value = '';
    modalText.value = '';
    modalMoodSlider.value = 5;
    modalMoodValue.textContent = 5;

    // Заповнюємо теги (поточних тегів немає -> передаємо пустий масив)
    populateModalTags([]);

    if(modalDeleteBtn) modalDeleteBtn.style.display = 'none';
    modalOverlay.style.display = 'block';
    editModal.style.display = 'block';
}

function closeModal() {
    modalOverlay.style.display = 'none';
    editModal.style.display = 'none';
    currentlyEditing = null;
    newTagInput.value = '';
}

// Додавання НОВОГО тегу прямо в модалці
function addNewTag() {
    const newTag = newTagInput.value.trim().toLowerCase();
    if (newTag) {
        // Перевіряємо, чи такий тег вже є у списку в модалці
        const existingCheckbox = document.getElementById(`modal-${newTag}`);

        if (existingCheckbox) {
            existingCheckbox.checked = true; // Просто відмічаємо існуючий
        } else {
            // Додаємо новий чекбокс візуально
            const checkboxItem = createTagCheckbox(newTag, true, 'modal');
            modalTagsContainer.appendChild(checkboxItem);
        }
        newTagInput.value = '';
    }
}

// ЗБЕРЕЖЕННЯ ЗАПИСУ
async function handleFormSubmit(event) {
    event.preventDefault();

    // Збираємо відмічені теги
    const newTags = [];
    modalTagsContainer.querySelectorAll('.tag-checkbox:checked').forEach(checkbox => {
        newTags.push(checkbox.value);
    });

    const payload = {
        title: modalTitle.value,
        mood: parseInt(modalMoodSlider.value, 10),
        text: modalText.value,
        tags: newTags,
        date: new Date().toISOString().split('T')[0]
    };

    let url = '/entries';
    let method = 'POST';

    if (currentlyEditing) {
        const { dayIndex, entryIndex } = currentlyEditing;
        const entryId = diaryData[dayIndex].entries[entryIndex].id;
        url = `/entries/${entryId}`;
        method = 'PUT';
        payload.date = diaryData[dayIndex].date;
    }

    try {
        const response = await authFetch(url, {
            method: method,
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            closeModal();
            // Оновлюємо записи
            await loadDiaryEntries();
            // ВАЖЛИВО: Оновлюємо список доступних тегів (бо ми могли створити новий)
            await loadTags();
            loadAndShowRecommendations();
        } else {
            alert('Помилка збереження даних');
        }
    } catch (err) {
        console.error(err);
        alert('Помилка з\'єднання');
    }
}

async function handleDelete() {
    if (!currentlyEditing) return;
    const { dayIndex, entryIndex } = currentlyEditing;
    const entryId = diaryData[dayIndex].entries[entryIndex].id;

    if (confirm('Ви впевнені, що хочете видалити цей запис?')) {
        try {
            const response = await authFetch(`/entries/${entryId}`, { method: 'DELETE' });
            if (response.ok) {
                closeModal();
                await loadDiaryEntries();
                await loadTags(); // Оновлюємо теги (раптом видалили останній запис з унікальним тегом)
            } else {
                alert('Помилка видалення');
            }
        } catch (err) {
            console.error(err);
        }
    }
}

// --- 4. ФІЛЬТРАЦІЯ ІСТОРІЇ ---
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

    // Фільтр по даті
    if (dateFilter) {
        indexedData = indexedData.filter(day => day.date === dateFilter);
    }

    // Фільтр по тегах і настрою
    if (tagsFilter.length > 0 || moodFilter) {
        indexedData = indexedData.map(day => {
            const filteredEntries = day.entries.filter(entry => {
                const moodMatch = !moodFilter || entry.mood === parseInt(moodFilter, 10);
                const tagMatch = tagsFilter.length === 0 || entry.tags.some(tag => tagsFilter.includes(tag));
                return moodMatch && tagMatch;
            });
            return { ...day, entries: filteredEntries };
        });
    }

    let entriesFound = false;
    indexedData.forEach(day => {
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
                edit.innerHTML = '&#9998;';
                edit.addEventListener('click', () => openModal(day.dayIndex, entry.entryIndex));

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
        diaryListContainer.innerHTML = '<p style="text-align: center; color: #777;">Записів за вашими критеріями не знайдено.</p>';
    }
}

// --- ТЕМА ---
function applySavedTheme() {
    const userDataString = localStorage.getItem('user');
    if (userDataString) {
        const user = JSON.parse(userDataString);
        if (user.theme === 'dark') document.body.classList.add('dark');
        else document.body.classList.remove('dark');
    }
}
applySavedTheme();

themeButtons.forEach(btn => {
    if (btn) btn.addEventListener('click', async () => {
        document.body.classList.toggle('dark');
        const newTheme = document.body.classList.contains('dark') ? 'dark' : 'light';
        await updateUserTheme(newTheme);
    });
});
// --- ЛОГІКА СТАТИСТИКИ ---

/**
 * Розраховує середній настрій для записів між двома датами
 */
function calculateAverageMood(startDate, endDate) {
    let totalMood = 0;
    let moodCount = 0;

    // Скидаємо час, щоб порівнювати тільки дати
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    diaryData.forEach(day => {
        // day.date - це рядок "YYYY-MM-DD", перетворюємо в об'єкт Date
        const entryDate = new Date(day.date);

        if (entryDate >= startDate && entryDate <= endDate) {
            day.entries.forEach(entry => {
                // Переконуємось, що mood - це число
                const moodVal = parseInt(entry.mood, 10);
                if (!isNaN(moodVal)) {
                    totalMood += moodVal;
                    moodCount++;
                }
            });
        }
    });

    return moodCount === 0 ? 0 : (totalMood / moodCount);
}

/**
 * Готує дані та викликає рендер графіка
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

    // Дані для графіка
    const chartData = [
        avgWeek.toFixed(1),
        avgMonth.toFixed(1),
        avg3Months.toFixed(1),
        avgYear.toFixed(1)
    ];

    renderAverageMoodChart(chartData);
}

/**
 * Малює графік за допомогою Chart.js
 */
function renderAverageMoodChart(data) {
    if (!moodChartCanvas) return;

    const ctx = moodChartCanvas.getContext('2d');

    // Якщо графік вже існує - знищуємо його перед створенням нового
    // (це запобігає накладанню графіків один на одного)
    if (myMoodChart) {
        myMoodChart.destroy();
    }

    myMoodChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Тиждень', 'Місяць', '3 Місяці', 'Рік'],
            datasets: [{
                label: 'Середній настрій',
                data: data,
                backgroundColor: [
                    'rgba(170, 219, 163, 0.7)',
                    'rgba(122, 184, 122, 0.7)',
                    'rgba(75, 138, 75, 0.7)',
                    'rgba(46, 61, 42, 0.7)'
                ],
                borderColor: [
                    'rgba(170, 219, 163, 1)',
                    'rgba(122, 184, 122, 1)',
                    'rgba(75, 138, 75, 1)',
                    'rgba(46, 61, 42, 1)'
                ],
                borderWidth: 1,
                borderRadius: 5, // Заокруглені стовпчики
                maxBarThickness: 60
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // Важливо для мобільних!
            scales: {
                y: {
                    beginAtZero: true,
                    max: 10,
                    ticks: { color: document.body.classList.contains('dark') ? '#aadba3' : '#666' },
                    grid: { color: document.body.classList.contains('dark') ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }
                },
                x: {
                    ticks: { color: document.body.classList.contains('dark') ? '#aadba3' : '#666' },
                    grid: { display: false }
                }
            },
            plugins: {
                legend: { display: false },
                title: {
                    display: true,
                    text: 'Динаміка вашого настрою',
                    color: document.body.classList.contains('dark') ? '#aadba3' : '#2e3d2a',
                    font: { size: 16 }
                }
            }
        }
    });
}
// --- НАВІГАЦІЯ ---
function hideAllSections() {
    [sectionHome, sectionHistory, sectionStats].forEach(s => {
        if(s) { s.style.display = 'none'; s.style.opacity = 0; }
    });
}
function fadeIn(el) {
    if(el) { el.style.display = 'block'; setTimeout(() => el.style.opacity = 1, 50); }
}

homeButtons.forEach(btn => btn.addEventListener('click', () => { hideAllSections(); fadeIn(sectionHome); }));
historyButtons.forEach(btn => btn.addEventListener('click', async () => {
    hideAllSections();
    await loadDiaryEntries();
    await loadTags(); // Оновлюємо теги при вході в історію
    fadeIn(sectionHistory);
}));
statsButtons.forEach(btn => btn.addEventListener('click', async () => {
    hideAllSections();
    // Спочатку переконуємось, що дані свіжі
    if (diaryData.length === 0) {
        await loadDiaryEntries();
    }
    // Тепер малюємо
    renderStatistics();
    fadeIn(sectionStats);
}));

if(addEntryBtn) addEntryBtn.addEventListener('click', openNewEntryModal);

// Елемент контейнера
const recommendationsContainer = document.getElementById('recommendationsContainer');

/**
 * Завантажує рекомендації з сервера і малює їх
 */
async function loadAndShowRecommendations() {
    if (!recommendationsContainer) return;

    try {
        const recommendations = await getRecommendations(); // Функція з api.js

        // Очищаємо попередні
        recommendationsContainer.innerHTML = '';

        if (recommendations && recommendations.length > 0) {
            recommendationsContainer.style.display = 'block';

            recommendations.forEach(rec => {
                const div = document.createElement('div');
                div.className = `rec-card ${rec.type}`; // positive, negative, neutral

                let icon = '💡'; // Дефолтна іконка
                if (rec.type === 'positive') icon = '🚀'; // Ракета для успіху
                if (rec.type === 'negative') icon = '⚠️'; // Знак уваги для негативу

                div.innerHTML = `
                    <div class="rec-icon">${icon}</div>
                    <div class="rec-text">${rec.text}</div>
                `;
                recommendationsContainer.appendChild(div);
            });
        } else {
            recommendationsContainer.style.display = 'none';
        }
    } catch (err) {
        console.error("Не вдалося завантажити рекомендації:", err);
    }
}

// --- ІНІЦІАЛІЗАЦІЯ ---
document.addEventListener('DOMContentLoaded', () => {
    if (diaryListContainer) {
        loadDiaryEntries();
        loadTags();
        loadAndShowRecommendations();
    }

    // Події модалки та фільтрів
    if (modalOverlay) {
        modalOverlay.addEventListener('click', closeModal);
        modalCloseBtn.addEventListener('click', closeModal);
        modalMoodSlider.addEventListener('input', () => modalMoodValue.textContent = modalMoodSlider.value);
        addNewTagBtn.addEventListener('click', addNewTag);
        newTagInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); addNewTag(); } });
        editForm.addEventListener('submit', handleFormSubmit);
        modalDeleteBtn.addEventListener('click', handleDelete);
    }

    if (filterDateInput && filterTagsContainer && clearFiltersBtn) {
        filterDateInput.addEventListener('change', applyFilters);
        filterMoodSelect.addEventListener('change', applyFilters);
        filterTagsContainer.addEventListener('change', (e) => { if (e.target.classList.contains('tag-checkbox')) applyFilters(); });
        clearFiltersBtn.addEventListener('click', () => {
            filterDateInput.value = '';
            filterMoodSelect.value = '';
            document.querySelectorAll('#filterTags .tag-checkbox:checked').forEach(cb => cb.checked = false);
            applyFilters();
        });
    }


});