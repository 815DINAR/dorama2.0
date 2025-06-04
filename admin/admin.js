// admin.js v1.2 (Debug) - Управление видео с детальной отладкой
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Админ-панель загружена');
    
    const uploadForm = document.getElementById('uploadForm');
    const loadVideosBtn = document.getElementById('loadVideosBtn');
    const deleteAllBtn = document.getElementById('deleteAllBtn');
    const videosList = document.getElementById('videosList');
    const videosStatus = document.getElementById('videosStatus');
    const confirmModal = document.getElementById('confirmModal');
    const confirmYes = document.getElementById('confirmYes');
    const confirmNo = document.getElementById('confirmNo');
    const confirmText = document.getElementById('confirmText');
    
    let currentVideos = [];
    let pendingAction = null;

    // Функция показа статуса
    function showStatus(message, type = 'info') {
        console.log(`📢 Статус [${type}]: ${message}`);
        videosStatus.innerHTML = `<span class="${type}">📢 ${message}</span>`;
    }

    // Функция показа модального окна подтверждения
    function showConfirmModal(message, action) {
        console.log('🔔 Показываем модальное окно:', message);
        console.log('🎯 Получено действие:', typeof action);
        console.log('📝 Действие функция?', typeof action === 'function');
        
        confirmText.textContent = message;
        pendingAction = action;
        
        console.log('💾 pendingAction установлен:', typeof pendingAction);
        console.log('🔍 pendingAction === action:', pendingAction === action);
        
        confirmModal.classList.add('show');
        console.log('✅ Модальное окно должно быть видно');
        console.log('🎪 Классы модального окна:', confirmModal.className);
    }

    // Функция скрытия модального окна
    function hideConfirmModal() {
        console.log('❌ Скрываем модальное окно');
        console.log('🔍 pendingAction перед очисткой:', typeof pendingAction);
        confirmModal.classList.remove('show');
        // НЕ очищаем pendingAction здесь сразу - делаем это после использования
        console.log('🎪 Модальное окно скрыто');
    }

    // Загрузка видео
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('📤 Начинаем загрузку видео');
        
        const file = document.getElementById('videoFile').files[0];
        const title = document.getElementById('videoTitle').value;
        const description = document.getElementById('videoDescription').value;
        const series = document.getElementById('videoSeries').value;
        const seasons = document.getElementById('videoSeasons').value;
        const status = document.getElementById('videoStatus').value;
        const country = document.getElementById('videoCountry').value;
        const genre = document.getElementById('videoGenre').value;
        const link = document.getElementById('videoLink').value;
        
        if (!file || !title || !description || !series || !seasons || !status || !country || !genre || !link) {
            alert('Заполните все поля');
            return;
        }
        
        const formData = new FormData();
        formData.append('videoFile', file);
        formData.append('title', title);
        formData.append('description', description);
        formData.append('series', series);
        formData.append('seasons', seasons);
        formData.append('status', status);
        formData.append('country', country);
        formData.append('genre', genre);
        formData.append('link', link);
        
        try {
            showStatus('Загружаем видео...', 'info');
            const response = await fetch('../upload.php', {
                method: 'POST',
                body: formData
            });
            
            console.log('📡 Ответ сервера на загрузку:', response.status);
            
            if (!response.ok) {
                throw new Error('Ошибка загрузки видео');
            }
            
            const result = await response.json();
            console.log('📋 Результат загрузки:', result);
            
            if (result.success) {
                showStatus('Видео успешно загружено!', 'success');
                uploadForm.reset();
                loadVideosList(); // Обновляем список
            } else {
                throw new Error(result.message || 'Неизвестная ошибка');
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки:', error);
            showStatus(`Ошибка: ${error.message}`, 'error');
        }
    });

    // Загрузка списка видео
    async function loadVideosList() {
        console.log('📥 Загружаем список видео...');
        try {
            showStatus('Загружаем список видео...', 'info');
            const response = await fetch('../get_videos.php');
            
            console.log('📡 Ответ get_videos.php:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            currentVideos = await response.json();
            console.log('📋 Загруженные видео:', currentVideos);
            
            displayVideosList();
            showStatus(`Загружено ${currentVideos.length} видео`, 'success');
            
        } catch (error) {
            console.error('❌ Ошибка загрузки списка:', error);
            showStatus(`Ошибка загрузки: ${error.message}`, 'error');
            videosList.innerHTML = '';
        }
    }

    // Отображение списка видео
    function displayVideosList() {
        console.log(`🎬 Отображаем ${currentVideos.length} видео`);
        
        if (currentVideos.length === 0) {
            videosList.innerHTML = '<div class="video-item"><p>📭 Видео не найдено</p></div>';
            return;
        }

        const videosHTML = currentVideos.map((video, index) => {
            console.log(`📹 Создаем элемент для видео ${index}:`, video.title);
            return `
                <div class="video-item">
                    <h4>🎬 ${video.title}</h4>
                    <div class="video-details">
                        <span><strong>Серии:</strong> ${video.series}</span>
                        <span><strong>Сезоны:</strong> ${video.seasons}</span>
                        <span><strong>Статус:</strong> ${video.status}</span>
                        <span><strong>Страна:</strong> ${video.country}</span>
                        <span><strong>Жанр:</strong> ${video.genre}</span>
                    </div>
                    <div class="filename">📁 ${video.filename}</div>
                    <div class="video-actions">
                        <button class="btn-danger btn-small" onclick="window.confirmDeleteVideo(${index})">
                            🗑️ Удалить видео
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        videosList.innerHTML = videosHTML;
        console.log('✅ HTML списка видео установлен');
    }

    // Подтверждение удаления одного видео
    window.confirmDeleteVideo = function(index) {
        console.log(`🗑️ Вызвана функция confirmDeleteVideo для индекса: ${index}`);
        console.log('📋 Текущие видео:', currentVideos);
        
        if (!currentVideos[index]) {
            console.error('❌ Видео с индексом', index, 'не найдено');
            alert('Ошибка: видео не найдено');
            return;
        }
        
        const video = currentVideos[index];
        console.log('🎬 Видео для удаления:', video);
        console.log('📁 Имя файла для удаления:', video.filename);
        
        // Сохраняем filename в замыкании
        const filenameToDelete = video.filename;
        const titleToDelete = video.title;
        
        const deleteAction = () => {
            console.log('🔥 Выполняем удаление видео:', filenameToDelete);
            deleteVideo(filenameToDelete);
        };
        
        console.log('💾 Создаем действие удаления для:', filenameToDelete);
        console.log('🎯 Функция deleteAction создана:', typeof deleteAction);
        
        showConfirmModal(
            `Удалить видео "${titleToDelete}"? Файл и данные будут удалены безвозвратно.`,
            deleteAction
        );
    };

    // Удаление одного видео
    async function deleteVideo(filename) {
        console.log('🗑️ Начинаем удаление видео:', filename);
        
        try {
            showStatus('Удаляем видео...', 'info');
            
            const requestData = { 
                action: 'delete_single',
                filename: filename 
            };
            
            console.log('📤 Отправляем запрос на удаление:', requestData);
            
            const response = await fetch('../delete_video.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            });

            console.log('📡 Ответ delete_video.php:', response.status);
            console.log('📋 Response OK:', response.ok);
            
            const resultText = await response.text();
            console.log('📄 Сырой ответ сервера:', resultText);
            
            let result;
            try {
                result = JSON.parse(resultText);
                console.log('📋 Парсенный результат:', result);
            } catch (parseError) {
                console.error('❌ Ошибка парсинга JSON:', parseError);
                throw new Error('Сервер вернул некорректный JSON: ' + resultText.substring(0, 100));
            }
            
            if (result.success) {
                showStatus('Видео успешно удалено!', 'success');
                console.log('✅ Видео удалено, обновляем список');
                loadVideosList(); // Обновляем список
            } else {
                throw new Error(result.message || 'Ошибка удаления');
            }
        } catch (error) {
            console.error('❌ Ошибка удаления:', error);
            showStatus(`Ошибка удаления: ${error.message}`, 'error');
        }
    }

    // Удаление всех видео
    async function deleteAllVideos() {
        console.log('💥 Начинаем удаление всех видео');
        
        try {
            showStatus('Удаляем все видео...', 'info');
            
            const response = await fetch('../delete_video.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ action: 'delete_all' })
            });

            console.log('📡 Ответ на удаление всех:', response.status);
            
            const result = await response.json();
            console.log('📋 Результат удаления всех:', result);
            
            if (result.success) {
                showStatus('Все видео успешно удалены!', 'success');
                currentVideos = [];
                displayVideosList();
            } else {
                throw new Error(result.message || 'Ошибка удаления');
            }
        } catch (error) {
            console.error('❌ Ошибка удаления всех видео:', error);
            showStatus(`Ошибка удаления: ${error.message}`, 'error');
        }
    }

    // Обработчики событий
    loadVideosBtn.addEventListener('click', () => {
        console.log('🔄 Нажата кнопка обновления списка');
        loadVideosList();
    });
    
    deleteAllBtn.addEventListener('click', () => {
        console.log('💥 Нажата кнопка удаления всех видео');
        
        if (currentVideos.length === 0) {
            alert('Нет видео для удаления');
            return;
        }
        
        showConfirmModal(
            `Удалить ВСЕ ${currentVideos.length} видео? Все файлы и данные будут удалены безвозвратно!`,
            deleteAllVideos
        );
    });

    confirmYes.addEventListener('click', () => {
        console.log('✅ Нажата кнопка подтверждения');
        console.log('🔍 pendingAction тип:', typeof pendingAction);
        console.log('🔍 pendingAction значение:', pendingAction);
        console.log('📝 pendingAction функция?', typeof pendingAction === 'function');
        
        hideConfirmModal();
        
        if (pendingAction && typeof pendingAction === 'function') {
            console.log('🔥 Выполняем отложенное действие');
            try {
                const actionToExecute = pendingAction;
                pendingAction = null; // Очищаем после копирования
                actionToExecute();
                console.log('✅ Действие выполнено успешно');
            } catch (error) {
                console.error('❌ Ошибка при выполнении действия:', error);
            }
        } else {
            console.warn('⚠️ Нет отложенного действия для выполнения');
            console.warn('⚠️ pendingAction:', pendingAction);
            pendingAction = null; // Очищаем в любом случае
        }
    });

    confirmNo.addEventListener('click', () => {
        console.log('❌ Нажата кнопка отмены');
        hideConfirmModal();
        pendingAction = null; // Очищаем действие при отмене
        console.log('🗑️ pendingAction очищен');
    });

    // Закрытие модального окна при клике вне него
    confirmModal.addEventListener('click', (e) => {
        if (e.target === confirmModal) {
            console.log('❌ Клик вне модального окна');
            hideConfirmModal();
            pendingAction = null; // Очищаем действие при клике вне модального окна
            console.log('🗑️ pendingAction очищен');
        }
    });

    // Проверяем доступность всех элементов
    console.log('🔍 Проверяем элементы DOM:');
    console.log('uploadForm:', !!uploadForm);
    console.log('loadVideosBtn:', !!loadVideosBtn);
    console.log('deleteAllBtn:', !!deleteAllBtn);
    console.log('videosList:', !!videosList);
    console.log('videosStatus:', !!videosStatus);
    console.log('confirmModal:', !!confirmModal);

    // Загружаем список при старте
    showStatus('Готов к работе! Нажмите "Обновить список" для просмотра видео.', 'info');
    console.log('🎉 Админ-панель полностью инициализирована');
});