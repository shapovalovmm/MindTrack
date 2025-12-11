document.addEventListener('DOMContentLoaded', () => {

    // --- Логіка Теми ---
    const themeBtn = document.getElementById('themeBtnSticky');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark');
        });
    }

    // --- Логіка Бургер-меню ---
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

    // --- ГЛОБАЛЬНІ ЗМІННІ ---
    let currentTargetUser = null; // Об'єкт користувача: { id, name, email }
    let currentEntries = [];      // Список записів поточного користувача
    let currentlyEditing = null;  // ID запису, який редагуємо (або null)

    // --- СЕЛЕКТОРИ ---
    const userSearchBtn = document.getElementById('userSearchBtn');
    const userSearchInput = document.getElementById('userSearchInput');
    const userManagementSection = document.getElementById('userManagementSection');
    const currentUserDisplay = document.getElementById('currentUserDisplay');
    const createEntryBtn = document.getElementById('createEntryBtn');
    const filterDateInput = document.getElementById('filterDateInput');
    const userEntryListContainer = document.getElementById('userEntryListContainer');

    // --- СЕЛЕКТОРИ МОДАЛКИ ---
    const modalOverlay = document.getElementById('modalOverlay');
    const editModal = document.getElementById('editModal');
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

    // --- ЛОГІКА ПОШУКУ КОРИСТУВАЧА ---
    userSearchBtn.addEventListener('click', async () => {
        const query = userSearchInput.value.trim();
        if (!query) return;

        try {
            // Запитуємо всіх користувачів (або зробіть ендпоінт пошуку на сервері)
            const response = await authFetch('/users'); // Припускаємо, що є такий ендпоінт для адміна
            if (!response.ok) throw new Error('Помилка пошуку');

            const users = await response.json();

            // Шукаємо по email або ID
            const foundUser = users.find(u =>
                u.Email.toLowerCase() === query.toLowerCase() ||
                u.UserID.toString() === query
            );

            if (foundUser) {
                // Зберігаємо дані про користувача
                currentTargetUser = {
                    id: foundUser.UserID,
                    email: foundUser.Email,
                    name: foundUser.Name
                };

                currentUserDisplay.textContent = `Керування записами для: ${foundUser.Email} (${foundUser.Name})`;
                userManagementSection.style.display = 'block';
                filterDateInput.value = '';

                // Завантажуємо записи цього юзера
                await loadUserEntries(currentTargetUser.id);
            } else {
                alert('Користувача не знайдено.');
                userManagementSection.style.display = 'none';
                currentTargetUser = null;
            }
        } catch (error) {
            console.error(error);
            alert('Помилка з\'єднання з сервером');
        }
    });

    // --- ЗАВАНТАЖЕННЯ ЗАПИСІВ ---
    async function loadUserEntries(userId) {
        try {
            // Використовуємо ендпоінт, який повертає записи по ID (GET /api/entries/:userId)
            const response = await authFetch(`/entries/${userId}`);
            if (!response.ok) throw new Error('Не вдалося завантажити записи');

            const rawEntries = await response.json();

            // Форматуємо дані (якщо сервер повертає raw SQL columns, приводимо до нашого формату)
            currentEntries = rawEntries.map(entry => ({
                id: entry.EntryID || entry.id,
                date: (entry.Date || entry.date).split('T')[0],
                title: entry.Title || entry.title,
                text: entry.Text || entry.text,
                mood: entry.MoodLevel || entry.mood,
                tags: entry.Tags ? entry.Tags.split(', ') : (Array.isArray(entry.tags) ? entry.tags : [])
            }));

            renderEntries();
        } catch (error) {
            console.error(error);
            userEntryListContainer.innerHTML = '<p>Помилка завантаження даних.</p>';
        }
    }

    // --- РЕНДЕРИНГ (Відображення) ---
    function renderEntries() {
        if (!userEntryListContainer) return;
        userEntryListContainer.innerHTML = '';

        let entriesToShow = currentEntries;

        // Фільтрація по даті (клієнтська)
        const dateFilter = filterDateInput.value;
        if (dateFilter) {
            entriesToShow = entriesToShow.filter(e => e.date === dateFilter);
        }

        // Групування по даті
        const grouped = {};
        entriesToShow.forEach(entry => {
            if (!grouped[entry.date]) grouped[entry.date] = [];
            grouped[entry.date].push(entry);
        });

        const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a));

        if (sortedDates.length === 0) {
            userEntryListContainer.innerHTML = '<p style="text-align: center;">Записів не знайдено.</p>';
            return;
        }

        sortedDates.forEach(date => {
            const dateGroup = document.createElement('div');
            dateGroup.className = 'date-group';

            const dateTitle = document.createElement('div');
            dateTitle.className = 'date-title';
            dateTitle.textContent = date;
            dateGroup.appendChild(dateTitle);

            grouped[date].forEach(entry => {
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
                    tagEl.textContent = tag.trim();
                    tagsDiv.appendChild(tagEl);
                });

                const edit = document.createElement('div');
                edit.className = 'card-edit';
                edit.innerHTML = '&#9998;'; // Олівець
                edit.addEventListener('click', () => openModal(entry));

                card.appendChild(title);
                card.appendChild(info);
                card.appendChild(tagsDiv);
                card.appendChild(edit);
                dateGroup.appendChild(card);
            });
            userEntryListContainer.appendChild(dateGroup);
        });
    }

    filterDateInput.addEventListener('change', renderEntries);

    createEntryBtn.addEventListener('click', () => {
        if (currentTargetUser) openModal(null); // null = Новий запис
    });


    // --- МОДАЛЬНЕ ВІКНО ---

    // Отримання унікальних тегів (з поточних завантажених записів)
    function getUniqueTags() {
        const tags = new Set(['робота', 'сім\'я', 'відпочинок', 'спорт']);
        currentEntries.forEach(e => e.tags.forEach(t => tags.add(t.trim())));
        return Array.from(tags);
    }

    function populateModalTags(selectedTags = []) {
        modalTagsContainer.innerHTML = '';
        const allTags = getUniqueTags();

        allTags.forEach(tag => {
            if(!tag) return;
            const wrapper = document.createElement('div');
            wrapper.className = 'filter-tag-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = tag;
            checkbox.id = `tag-${tag}`;
            checkbox.className = 'tag-checkbox';
            if (selectedTags.includes(tag)) checkbox.checked = true;

            const label = document.createElement('label');
            label.htmlFor = `tag-${tag}`;
            label.textContent = tag;

            wrapper.appendChild(checkbox);
            wrapper.appendChild(label);
            modalTagsContainer.appendChild(wrapper);
        });
    }

    function openModal(entry) {
        if (entry) {
            // Редагування
            currentlyEditing = entry.id;
            modalTitle.value = entry.title;
            modalText.value = entry.text;
            modalMoodSlider.value = entry.mood;
            modalMoodValue.textContent = entry.mood;
            populateModalTags(entry.tags);
            modalDeleteBtn.style.display = 'block';
        } else {
            // Створення
            currentlyEditing = null;
            modalTitle.value = '';
            modalText.value = '';
            modalMoodSlider.value = 5;
            modalMoodValue.textContent = 5;
            populateModalTags([]);
            modalDeleteBtn.style.display = 'none';
        }
        modalOverlay.style.display = 'block';
        editModal.style.display = 'block';
    }

    function closeModal() {
        modalOverlay.style.display = 'none';
        editModal.style.display = 'none';
    }

    // --- ЗБЕРЕЖЕННЯ (CREATE / UPDATE) ---
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const tags = [];
        modalTagsContainer.querySelectorAll('.tag-checkbox:checked').forEach(cb => tags.push(cb.value));

        const payload = {
            userId: currentTargetUser.id, // ВАЖЛИВО: Передаємо ID цільового юзера
            date: new Date().toISOString().split('T')[0],
            title: modalTitle.value,
            text: modalText.value,
            mood: parseInt(modalMoodSlider.value),
            tags: tags
        };

        try {
            let url = '/entries';
            let method = 'POST';

            if (currentlyEditing) {
                url = `/entries/${currentlyEditing}`;
                method = 'PUT';
                // При редагуванні дату не змінюємо, якщо не хочемо
            }

            // Викликаємо API
            const response = await authFetch(url, {
                method: method,
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                closeModal();
                await loadUserEntries(currentTargetUser.id); // Оновлюємо список
            } else {
                alert('Помилка збереження. Переконайтеся, що сервер дозволяє Адміну редагувати чужі записи.');
            }
        } catch (error) {
            console.error(error);
            alert('Помилка з\'єднання');
        }
    });

    // --- ВИДАЛЕННЯ ---
    modalDeleteBtn.addEventListener('click', async () => {
        if (!currentlyEditing) return;
        if (!confirm('Видалити цей запис?')) return;

        try {
            const response = await authFetch(`/entries/${currentlyEditing}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                closeModal();
                await loadUserEntries(currentTargetUser.id);
            } else {
                alert('Помилка видалення');
            }
        } catch (error) {
            console.error(error);
        }
    });

    // --- ІНШІ ОБРОБНИКИ ---
    modalOverlay.addEventListener('click', closeModal);
    modalCloseBtn.addEventListener('click', closeModal);
    modalMoodSlider.addEventListener('input', () => modalMoodValue.textContent = modalMoodSlider.value);

    addNewTagBtn.addEventListener('click', () => {
        const val = newTagInput.value.trim().toLowerCase();
        if(val) {
            const wrapper = document.createElement('div');
            wrapper.className = 'filter-tag-item';
            wrapper.innerHTML = `<input type="checkbox" class="tag-checkbox" value="${val}" checked id="new-${val}"><label for="new-${val}">${val}</label>`;
            modalTagsContainer.appendChild(wrapper);
            newTagInput.value = '';
        }
    });
    // --- ЛОГІКА СПІЛЬНИХ ТЕГІВ ---
    const commonTagInput = document.getElementById('commonTagInput');
    const addCommonTagBtn = document.getElementById('addCommonTagBtn');
    const commonTagsList = document.getElementById('commonTagsList');

    // 1. Завантажити і показати теги
    async function loadCommonTags() {
        if (!commonTagsList) return;
        commonTagsList.innerHTML = '<p>Завантаження...</p>';

        try {
            const response = await authFetch('/tags/common');
            if (!response.ok) throw new Error('Помилка завантаження тегів');

            const tags = await response.json();
            renderCommonTags(tags);
        } catch (err) {
            console.error(err);
            commonTagsList.innerHTML = '<p style="color:red">Не вдалося завантажити теги</p>';
        }
    }

    // 2. Рендер тегів (чіпси з хрестиком)
    function renderCommonTags(tags) {
        commonTagsList.innerHTML = '';
        if (tags.length === 0) {
            commonTagsList.innerHTML = '<p style="color:#777">Немає спільних тегів.</p>';
            return;
        }

        tags.forEach(tag => {
            const tagEl = document.createElement('div');
            tagEl.className = 'filter-tag-item';
            // Додаємо стиль, щоб відрізнити, що це тег для видалення
            tagEl.style.backgroundColor = '#e0e0e0';
            tagEl.style.cursor = 'default';

            tagEl.innerHTML = `
                <span>${tag.Name}</span>
                <span class="delete-tag-icon" style="margin-left:8px; cursor:pointer; color:#d9534f; font-weight:bold;">&times;</span>
            `;

            // Обробник видалення
            tagEl.querySelector('.delete-tag-icon').addEventListener('click', () => deleteCommonTag(tag.TagID, tag.Name));

            commonTagsList.appendChild(tagEl);
        });
    }

    // 3. Додати тег
    addCommonTagBtn.addEventListener('click', async () => {
        const name = commonTagInput.value.trim().toLowerCase();
        if (!name) return;

        try {
            const response = await authFetch('/tags/common', {
                method: 'POST',
                body: JSON.stringify({ name })
            });

            if (response.ok) {
                commonTagInput.value = '';
                loadCommonTags(); // Оновити список
            } else {
                const data = await response.json();
                alert(data.message || 'Помилка');
            }
        } catch (err) {
            console.error(err);
        }
    });

    // 4. Видалити тег
    async function deleteCommonTag(id, name) {
        if (!confirm(`Видалити спільний тег "${name}"? Це видалить його з усіх записів користувачів!`)) return;

        try {
            const response = await authFetch(`/tags/${id}`, { method: 'DELETE' });
            if (response.ok) {
                loadCommonTags();
            } else {
                alert('Помилка видалення');
            }
        } catch (err) {
            console.error(err);
        }
    }

    // Викликаємо при завантаженні сторінки
    loadCommonTags();
});