// telegram-auth.js v3.0 - Модуль авторизации с настраиваемым временем загрузки

// НАСТРОЙКА ВРЕМЕНИ ПОКАЗА ЭКРАНА ЗАГРУЗКИ (в миллисекундах)
// Измените это значение для изменения времени показа splash screen
const LOADING_SCREEN_DURATION = 3500; // 3.5 секунды (можно менять от 3000 до 4000)
class TelegramAuth {
    constructor() {
        this.tg = window.Telegram?.WebApp;
        this.user = null;
        this.sessionId = null;
        this.lastActivityTime = Date.now();
        this.activityInterval = null;
        this.isAuthorized = false;
    }

    // Инициализация авторизации
    async init() {
        console.log('🔐 Инициализация Telegram авторизации...');
        
        if (!this.tg) {
            console.error('❌ Telegram WebApp API не доступен');
            this.showError('Приложение должно быть открыто через Telegram');
            return false;
        }

        // Расширяем приложение на весь экран
        this.tg.ready();
        this.tg.expand();

        // Получаем данные пользователя
        const initData = this.tg.initData;
        const initDataUnsafe = this.tg.initDataUnsafe;
        
        console.log('📱 Telegram WebApp готов');
        console.log('👤 InitDataUnsafe:', initDataUnsafe);

        if (initDataUnsafe.user) {
            this.user = {
                id: initDataUnsafe.user.id,
                username: initDataUnsafe.user.username || `user_${initDataUnsafe.user.id}`,
                first_name: initDataUnsafe.user.first_name || '',
                last_name: initDataUnsafe.user.last_name || '',
                language_code: initDataUnsafe.user.language_code || 'en',
                is_premium: initDataUnsafe.user.is_premium || false
            };

            console.log('✅ Данные пользователя получены:', this.user);

            // Авторизуем пользователя на сервере
            const authResult = await this.authorizeOnServer();
            
            if (authResult) {
                this.isAuthorized = true;
                this.startActivityTracking();
                this.updateUI();
                return true;
            }
        } else {
            console.error('❌ Не удалось получить данные пользователя');
            this.showError('Не удалось получить данные пользователя');
        }

        return false;
    }

    // Авторизация на сервере
    async authorizeOnServer() {
        try {
            const response = await fetch('auth/telegram_auth.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'login',
                    user: this.user,
                    init_data: this.tg.initData // Для проверки подписи на сервере
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('🔑 Результат авторизации:', result);

            if (result.success) {
                this.sessionId = result.session_id;
                this.showSuccess('Авторизация успешна!');
                return true;
            } else {
                throw new Error(result.message || 'Ошибка авторизации');
            }
        } catch (error) {
            console.error('❌ Ошибка авторизации:', error);
            this.showError(`Ошибка авторизации: ${error.message}`);
            return false;
        }
    }

    // Отслеживание активности пользователя
    startActivityTracking() {
        // Обновляем активность каждые 30 секунд
        this.activityInterval = setInterval(() => {
            this.updateActivity();
        }, 30000);

        // Отслеживаем события активности
        ['click', 'touchstart', 'scroll', 'keypress'].forEach(event => {
            document.addEventListener(event, () => {
                this.lastActivityTime = Date.now();
            });
        });

        // Обработчик закрытия приложения
        window.addEventListener('beforeunload', () => {
            this.logout();
        });

        // Для Telegram Web App
        if (this.tg) {
            this.tg.onEvent('viewportChanged', () => {
                this.lastActivityTime = Date.now();
            });

            // Обработчик кнопки "Назад"
            this.tg.BackButton.onClick(() => {
                this.logout();
            });
        }
    }

    // Обновление активности на сервере
    async updateActivity() {
        if (!this.sessionId) return;

        try {
            const response = await fetch('auth/update_activity.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: this.user.id,
                    session_id: this.sessionId,
                    last_activity: new Date().toISOString()
                })
            });

            const result = await response.json();
            console.log('📊 Активность обновлена:', result);
        } catch (error) {
            console.error('❌ Ошибка обновления активности:', error);
        }
    }

    // Выход/завершение сессии
    async logout() {
        if (!this.sessionId) return;

        try {
            const response = await fetch('auth/telegram_auth.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'logout',
                    user_id: this.user.id,
                    session_id: this.sessionId
                })
            });

            const result = await response.json();
            console.log('👋 Сессия завершена:', result);
        } catch (error) {
            console.error('❌ Ошибка завершения сессии:', error);
        }

        if (this.activityInterval) {
            clearInterval(this.activityInterval);
        }
    }

    // Получение данных пользователя с сервера
    async getUserData() {
        if (!this.user) return null;

        try {
            const response = await fetch(`auth/get_user_data.php?cachebuster=${Date.now()}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache',
                },
                body: JSON.stringify({
                    user_id: this.user.id
                })
            });

            const result = await response.json();
            if (result.success) {
                console.log('📊 Получены свежие данные пользователя');
                return result.user_data;
            }
        } catch (error) {
            console.error('❌ Ошибка получения данных пользователя:', error);
        }

        return null;
    }

    // Сохранение избранного
    async toggleFavorite(videoId) {
        if (!this.user) return false;

        try {
            const response = await fetch('auth/update_user_data.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: this.user.id,
                    action: 'toggle_favorite',
                    video_id: videoId
                })
            });

            const result = await response.json();
            return result.success;
        } catch (error) {
            console.error('❌ Ошибка обновления избранного:', error);
            return false;
        }
    }

    // Обновление реакций (лайк/дизлайк)
    async updateReaction(action, videoId) {
        if (!this.user) return false;

        try {
            const response = await fetch('auth/update_user_data.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: this.user.id,
                    action: action,
                    video_id: videoId
                })
            });

            const result = await response.json();
            if (result.success) {
                console.log('✅ Реакция обновлена:', action, videoId);
            }
            return result.success;
        } catch (error) {
            console.error('❌ Ошибка обновления реакции:', error);
            return false;
        }
    }

    // Обновление UI после авторизации
    updateUI() {
        const loadingIndicator = document.getElementById('loadingIndicator');
        const videoContainer = document.getElementById('videoContainer');

        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }

        if (videoContainer) {
            videoContainer.style.display = 'block';
        }
    }

    // Показ сообщений
    showError(message) {
        const loadingText = document.getElementById('loadingText');
        if (loadingText) {
            loadingText.textContent = `❌ ${message}`;
            loadingText.style.color = '#f44336';
        }
    }

    showSuccess(message) {
        const loadingText = document.getElementById('loadingText');
        if (loadingText) {
            loadingText.textContent = `✅ ${message}`;
            loadingText.style.color = '#4CAF50';
        }
    }

    // Проверка, авторизован ли пользователь
    isUserAuthorized() {
        return this.isAuthorized && this.user !== null;
    }

    // Получение ID пользователя
    getUserId() {
        return this.user?.id || null;
    }

    // Получение имени пользователя
    getUsername() {
        return this.user?.username || null;
    }
}

// Создаем глобальный экземпляр
window.telegramAuth = new TelegramAuth();