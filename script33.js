// script10.js v6.2 - Исправлены все проблемы с производительностью
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Запуск приложения DoramaShorts v6.0...');
  
  // Сначала проверяем авторизацию
  const authSuccess = await window.telegramAuth.init();
  
  if (!authSuccess) {
    console.error('❌ Авторизация не удалась, приложение не будет запущено');
    return;
  }
  
  console.log('✅ Авторизация успешна, запускаем основное приложение');
  
  // Получаем данные пользователя для восстановления состояния
  const userData = await window.telegramAuth.getUserData();
  if (userData) {
    console.log('📊 Данные пользователя загружены:', userData);
  }
  
  // Элементы DOM
  const videoPlayer = document.getElementById('currentVideo');
  const videoTitle = document.getElementById('videoTitle');
  const videoSeries = document.getElementById('videoSeries');
  const videoSeasons = document.getElementById('videoSeasons');
  const videoStatus = document.getElementById('videoStatus');
  const videoCountry = document.getElementById('videoCountry');
  const videoGenre = document.getElementById('videoGenre');
  const likeButton = document.getElementById('likeButton');
  const dislikeButton = document.getElementById('dislikeButton');
  const favoriteButton = document.getElementById('favoriteButton');
  const descriptionButton = document.getElementById('descriptionButton');
  const descriptionModal = document.getElementById('descriptionModal');
  const modalClose = document.getElementById('modalClose');
  const modalTitle = document.getElementById('modalTitle');
  const modalDescription = document.getElementById('modalDescription');
  
  // Элементы вкладок
  const mainTab = document.getElementById('mainTab');
  const favoritesTab = document.getElementById('favoritesTab');
  const mainContent = document.getElementById('mainContent');
  const favoritesContent = document.getElementById('favoritesContent');
  const favoritesList = document.getElementById('favoritesList');
  const favoritesEmpty = document.getElementById('favoritesEmpty');

  let videos = [];
  let videoOrder = [];
  let currentOrderIndex = 0;
  let userFavorites = userData?.favorites || [];
  let userLikes = userData?.likes || [];
  let userDislikes = userData?.dislikes || [];
  let currentTab = 'main';

  console.log('🚀 Начинаем инициализацию приложения...');
  console.log('📊 Начальное состояние пользователя:', {
    favorites: userFavorites.length,
    likes: userLikes.length,
    dislikes: userDislikes.length
  });
  
  // Функция переключения вкладок
  function switchTab(tabName) {
    currentTab = tabName;
    
    if (tabName === 'main') {
      mainTab.classList.add('active');
      favoritesTab.classList.remove('active');
      mainContent.classList.add('active');
      favoritesContent.classList.remove('active');
      
      // Возобновляем видео при возврате на главную БЕЗ ПЕРЕЗАГРУЗКИ
      if (videoPlayer) {
        // Проверяем, есть ли источник видео
        if (videoPlayer.src) {
          videoPlayer.play().catch(error => {
            console.error('❌ Ошибка воспроизведения видео:', error);
          });
        } else {
          // Если источника нет, загружаем текущее видео
          loadVideo();
        }
      }
    } else if (tabName === 'favorites') {
      mainTab.classList.remove('active');
      favoritesTab.classList.add('active');
      mainContent.classList.remove('active');
      favoritesContent.classList.add('active');
      
      // Ставим видео на паузу на вкладке избранное
      if (videoPlayer && !videoPlayer.paused) {
        videoPlayer.pause();
      }
      
      // Обновляем список избранного
      updateFavoritesList();
    }
  }
  
  // Обработчики кликов по вкладкам - улучшенная отзывчивость
  if (mainTab) {
    // Обработка всех типов событий для лучшей отзывчивости
    const handleMainTab = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (currentTab !== 'main') {
        switchTab('main');
      }
    };
    
    mainTab.addEventListener('click', handleMainTab);
    mainTab.addEventListener('touchstart', (e) => {
      e.preventDefault();
      handleMainTab(e);
    }, { passive: false });
    
    // Визуальная обратная связь
    mainTab.addEventListener('touchstart', () => {
      mainTab.style.transform = 'scale(0.95)';
    });
    mainTab.addEventListener('touchend', () => {
      mainTab.style.transform = 'scale(1)';
    });
  }
  
  if (favoritesTab) {
    // Обработка всех типов событий для лучшей отзывчивости
    const handleFavoritesTab = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (currentTab !== 'favorites') {
        switchTab('favorites');
      }
    };
    
    favoritesTab.addEventListener('click', handleFavoritesTab);
    favoritesTab.addEventListener('touchstart', (e) => {
      e.preventDefault();
      handleFavoritesTab(e);
    }, { passive: false });
    
    // Визуальная обратная связь
    favoritesTab.addEventListener('touchstart', () => {
      favoritesTab.style.transform = 'scale(0.95)';
    });
    favoritesTab.addEventListener('touchend', () => {
      favoritesTab.style.transform = 'scale(1)';
    });
  }
  
  // Функция обновления списка избранного
  async function updateFavoritesList() {
    // Загружаем актуальные данные
    const freshUserData = await window.telegramAuth.getUserData();
    if (freshUserData) {
      userFavorites = freshUserData.favorites || [];
    }
    
    // Фильтруем видео, которые есть в избранном
    const favoriteVideos = videos.filter(video => 
      userFavorites.includes(video.filename)
    );
    
    if (favoriteVideos.length === 0) {
      favoritesEmpty.style.display = 'flex';
      favoritesList.style.display = 'none';
      favoritesList.classList.remove('has-items');
    } else {
      favoritesEmpty.style.display = 'none';
      favoritesList.style.display = 'flex';
      favoritesList.classList.add('has-items');
      
      // Очищаем список и добавляем карточки
      favoritesList.innerHTML = '';
      
      favoriteVideos.forEach(video => {
        const card = createFavoriteCard(video);
        favoritesList.appendChild(card);
      });
    }
  }
  
  // Функция создания карточки избранного видео
  function createFavoriteCard(video) {
    const card = document.createElement('div');
    card.className = 'favorite-card';
    card.setAttribute('data-video-filename', video.filename);
    
    // SVG заглушка вместо видео превью
    const thumbnail = document.createElement('div');
    thumbnail.className = 'favorite-card-thumbnail';
    
    // SVG иконка видео вместо превью
    thumbnail.innerHTML = `
      <svg width="100%" height="100%" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="80" height="80" rx="8" fill="#1a1a1a"/>
        <circle cx="40" cy="40" r="25" fill="#333"/>
        <path d="M35 30L50 40L35 50V30Z" fill="#666"/>
      </svg>
    `;
    
    // Информация о видео
    const info = document.createElement('div');
    info.className = 'favorite-card-info';
    
    const title = document.createElement('div');
    title.className = 'favorite-card-title';
    title.textContent = video.title || 'Без названия';
    
    const genre = document.createElement('div');
    genre.className = 'favorite-card-genre';
    genre.textContent = video.genre || 'Неизвестно';
    
    info.appendChild(title);
    info.appendChild(genre);
    
    // Кнопка удаления из избранного
    const removeBtn = document.createElement('button');
    removeBtn.className = 'favorite-card-remove';
    removeBtn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
      </svg>
    `;
    
    // Обработчик клика на карточку - МГНОВЕННАЯ РЕАКЦИЯ
    const handleCardClick = (e) => {
      if (!e.target.closest('.favorite-card-remove')) {
        // Находим индекс видео
        const videoIndex = videos.findIndex(v => v.filename === video.filename);
        if (videoIndex !== -1) {
          // Переключаемся на главную вкладку
          switchTab('main');
          // Устанавливаем нужный индекс БЕЗ ПЕРЕЗАГРУЗКИ
          const orderIndex = videoOrder.indexOf(videoIndex);
          if (orderIndex !== -1) {
            currentOrderIndex = orderIndex;
          } else {
            // Если видео не в текущем порядке, добавляем его
            currentOrderIndex = 0;
            videoOrder.unshift(videoIndex);
          }
          // Загружаем видео только если оно отличается от текущего
          const currentVideoId = likeButton?.getAttribute('data-video-id');
          if (currentVideoId !== video.filename) {
            loadVideo();
          }
        }
      }
    };
    
    // Добавляем обработчики для быстрой реакции
    card.addEventListener('click', handleCardClick);
    card.addEventListener('touchstart', (e) => {
      e.stopPropagation();
      if (!e.target.closest('.favorite-card-remove')) {
        card.style.transform = 'scale(0.98)';
        card.style.opacity = '0.8';
      }
    }, { passive: true });
    
    card.addEventListener('touchend', (e) => {
      e.stopPropagation();
      card.style.transform = 'scale(1)';
      card.style.opacity = '1';
      handleCardClick(e);
    }, { passive: false });
    
    // Обработчик удаления из избранного
    removeBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      
      // Удаляем из избранного
      userFavorites = userFavorites.filter(id => id !== video.filename);
      updateButtonStates(video.filename);
      
      // Отправляем на сервер
      const success = await window.telegramAuth.toggleFavorite(video.filename);
      if (!success) {
        // Если ошибка, возвращаем обратно
        userFavorites.push(video.filename);
        updateButtonStates(video.filename);
      } else {
        // Анимация удаления
        card.style.transform = 'translateX(-100%)';
        card.style.opacity = '0';
        setTimeout(() => {
          updateFavoritesList();
        }, 300);
      }
    });
    
    // Предотвращаем случайные действия на кнопке удаления
    removeBtn.addEventListener('touchstart', (e) => {
      e.stopPropagation();
    });
    
    // Собираем карточку
    card.appendChild(thumbnail);
    card.appendChild(info);
    card.appendChild(removeBtn);
    
    return card;
  }
  
  // Универсальная функция настройки кнопок с pointer events - УПРОЩЕННАЯ
  function setupButtonWithPointerEvents(button, handler) {
    if (!button) return;
    
    // Простой обработчик без блокировок
    const handleClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Визуальная обратная связь
      button.style.transform = 'scale(0.95)';
      setTimeout(() => {
        button.style.transform = 'scale(1)';
      }, 100);
      
      // Вызываем обработчик
      handler(e);
    };
    
    // Используем только один тип события
    button.addEventListener('click', handleClick);
    button.addEventListener('touchend', (e) => {
      e.preventDefault();
      handleClick(e);
    });
    
    // Предотвращаем выделение текста
    button.addEventListener('selectstart', (e) => e.preventDefault());
    
    // Предотвращаем контекстное меню
    button.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  
  // Функция перемешивания массива индексов
  function shuffleVideos() {
    videoOrder = videos.map((_, index) => index);
    for (let i = videoOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [videoOrder[i], videoOrder[j]] = [videoOrder[j], videoOrder[i]];
    }
    currentOrderIndex = 0;
    console.log('🔀 Видео перемешаны, порядок:', videoOrder);
  }

  // Функция загрузки списка видео с сервера
  async function fetchVideos() {
    console.log('📥 Начинаем загрузку видео...');
    try {
      const response = await fetch('get_videos.php');
      console.log('📡 Ответ сервера:', response);
      
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      
      const rawText = await response.text();
      console.log('📄 Сырой ответ сервера (первые 500 символов):', rawText.substring(0, 500));
      
      try {
        videos = JSON.parse(rawText);
        console.log('✅ JSON успешно распарсен');
        console.log('📺 Количество видео:', videos.length);
        
        if (videos.length > 0) {
          shuffleVideos();
          loadVideo();
          updateFavoritesList(); // Обновляем список избранного
        } else {
          console.warn('⚠️ Массив видео пустой');
        }
      } catch (parseError) {
        console.error('❌ Ошибка парсинга JSON:', parseError);
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки видео:', error);
    }
  }

  // Функция обновления состояния кнопок
  function updateButtonStates(videoId) {
    console.log('🔄 updateButtonStates вызван для:', videoId);
    
    if (!videoId) {
      console.error('❌ videoId не передан!');
      return;
    }
    
    // Обновляем кнопку лайка
    if (likeButton) {
      const isLiked = userLikes.includes(videoId);
      likeButton.classList.toggle('active', isLiked);
      likeButton.setAttribute('data-video-id', videoId);
      
      const likeIcon = likeButton.querySelector('.like-icon');
      if (likeIcon) {
        likeIcon.src = isLiked ? 'svg/like-active.svg' : 'svg/like.svg';
      }
    }
    
    // Обновляем кнопку дизлайка
    if (dislikeButton) {
      const isDisliked = userDislikes.includes(videoId);
      dislikeButton.classList.toggle('active', isDisliked);
      dislikeButton.setAttribute('data-video-id', videoId);
      
      const dislikeIcon = dislikeButton.querySelector('.dislike-icon');
      if (dislikeIcon) {
        dislikeIcon.src = isDisliked ? 'svg/dislike-active.svg' : 'svg/dislike.svg';
      }
    }
    
    // Обновляем кнопку избранного
    if (favoriteButton) {
      const isFavorite = userFavorites.includes(videoId);
      favoriteButton.classList.toggle('active', isFavorite);
      favoriteButton.setAttribute('data-video-id', videoId);
      
      const favoriteIcon = favoriteButton.querySelector('.favorite-icon');
      if (favoriteIcon) {
        // ОБНОВЛЕННЫЕ ИКОНКИ ИЗБРАННОГО с временной меткой для сброса кэша
        const timestamp = Date.now();
        favoriteIcon.src = isFavorite ? `svg/favorites-active.svg?t=${timestamp}` : `svg/favorites.svg?t=${timestamp}`;
      }
    }
  }

  // Функция плавного переключения видео
  async function loadVideo() {
    if (videos.length === 0) {
      console.warn('⚠️ Нет видео для загрузки');
      return;
    }
    
    const idx = videoOrder[currentOrderIndex];
    const videoData = videos[idx];
    console.log(`🎬 Загружаем видео ${currentOrderIndex + 1}/${videoOrder.length}, индекс: ${idx}`);
    
    if (videoData) {
      const newSrc = `uploads/${encodeURIComponent(videoData.filename)}`;
      console.log('📁 Путь к видео:', newSrc);
      
      // Генерируем уникальный ID для видео (используем filename)
      const videoId = videoData.filename;
      
      // Сразу обновляем состояние кнопок БЕЗ ЗАДЕРЖКИ
      updateButtonStates(videoId);

      // Плавное затемнение основного видео ТОЛЬКО если меняется источник
      if (videoPlayer.src !== newSrc) {
        videoPlayer.style.opacity = 0;
        setTimeout(() => {
          videoPlayer.src = newSrc;
          videoPlayer.load();
          
          // Воспроизводим только если на главной вкладке
          if (currentTab === 'main') {
            videoPlayer.play().then(() => {
              console.log('✅ Видео запущено успешно');
            }).catch(error => {
              console.error('❌ Ошибка воспроизведения видео:', error);
            });
          }
          
          videoPlayer.style.opacity = 1;
        }, 100);
      } else {
        // Если видео то же самое, просто воспроизводим
        if (currentTab === 'main' && videoPlayer.paused) {
          videoPlayer.play();
        }
      }

      // Обновление информации о видео
      videoTitle.textContent = videoData.title || 'Без названия';
      videoGenre.textContent = `${videoData.genre || 'Неизвестно'}`;
    }
  }

  // Функции переключения видео
  function nextVideo() {
    console.log('⏭️ Следующее видео');
    currentOrderIndex++;
    if (currentOrderIndex >= videoOrder.length) {
      console.log('🔄 Достигнут конец списка, перемешиваем заново');
      shuffleVideos();
    }
    loadVideo();
  }

  function previousVideo() {
    console.log('⏮️ Предыдущее видео');
    currentOrderIndex--;
    if (currentOrderIndex < 0) {
      currentOrderIndex = videoOrder.length - 1;
    }
    loadVideo();
  }

  // Функция показа модального окна с описанием (БЕЗ поля "Ссылка")
  function showDescription() {
    console.log('📖 Функция showDescription вызвана');
    
    if (videos.length === 0) {
      console.warn('⚠️ Нет видео для показа описания');
      return;
    }
    
    const idx = videoOrder[currentOrderIndex];
    const videoData = videos[idx];
    
    if (videoData) {
      const title = videoData.title || 'Без названия';
      const description = videoData.description || 'Описание отсутствует';
      const series = videoData.series || 'Неизвестно';
      const seasons = videoData.seasons || 'Неизвестно';
      const status = videoData.status || 'Неизвестно';
      const country = videoData.country || 'Неизвестно';
      const genre = videoData.genre || 'Неизвестно';
      // Удалено поле link
      
      const fullDescription = `${description}

📊 Подробная информация:
• Серии: ${series}
• Сезоны: ${seasons}  
• Статус: ${status}
• Страна: ${country}
• Жанр: ${genre}`;
      
      if (modalTitle) {
        modalTitle.textContent = title;
      }
      
      if (modalDescription) {
        modalDescription.textContent = fullDescription;
      }
      
      if (descriptionModal) {
        descriptionModal.classList.add('show');
        console.log('✅ Модальное окно показано');
      }
    }
  }

  // Функция скрытия модального окна
  function hideDescription() {
    console.log('❌ Закрываем модальное окно описания');
    if (descriptionModal) {
      descriptionModal.classList.remove('show');
    }
  }

  // Настройка кнопки лайка - ИСПРАВЛЕННАЯ ЛОГИКА
  setupButtonWithPointerEvents(likeButton, (e) => {
    const videoId = likeButton.getAttribute('data-video-id');
    if (!videoId) {
      console.error('❌ Video ID отсутствует!');
      return;
    }
    
    console.log('👍 Обработка лайка для:', videoId);
    
    const isCurrentlyLiked = userLikes.includes(videoId);
    const wasDisliked = userDislikes.includes(videoId);
    
    // МГНОВЕННОЕ обновление UI
    if (isCurrentlyLiked) {
      // Убираем лайк
      userLikes = userLikes.filter(id => id !== videoId);
    } else {
      // Ставим лайк
      userLikes.push(videoId);
      // Убираем дизлайк если был
      if (wasDisliked) {
        userDislikes = userDislikes.filter(id => id !== videoId);
      }
    }
    updateButtonStates(videoId);
    
    // Отправляем ВСЕ изменения на сервер
    const actions = [];
    
    if (isCurrentlyLiked) {
      // Если убираем лайк
      actions.push(window.telegramAuth.updateReaction('remove_like', videoId));
    } else {
      // Если ставим лайк
      actions.push(window.telegramAuth.updateReaction('add_like', videoId));
      // И убираем дизлайк если был
      if (wasDisliked) {
        actions.push(window.telegramAuth.updateReaction('remove_dislike', videoId));
      }
    }
    
    // Выполняем все действия
    Promise.all(actions).then(results => {
      const allSuccess = results.every(success => success === true);
      if (!allSuccess) {
        // Откатываем изменения при ошибке
        if (isCurrentlyLiked) {
          userLikes.push(videoId);
        } else {
          userLikes = userLikes.filter(id => id !== videoId);
          if (wasDisliked) {
            userDislikes.push(videoId);
          }
        }
        updateButtonStates(videoId);
        console.error('❌ Не удалось обновить реакции на сервере');
      }
    });
  });

  // Настройка кнопки дизлайка - ИСПРАВЛЕННАЯ ЛОГИКА
  setupButtonWithPointerEvents(dislikeButton, (e) => {
    const videoId = dislikeButton.getAttribute('data-video-id');
    if (!videoId) {
      console.error('❌ Video ID отсутствует!');
      return;
    }
    
    console.log('👎 Обработка дизлайка для:', videoId);
    
    const isCurrentlyDisliked = userDislikes.includes(videoId);
    const wasLiked = userLikes.includes(videoId);
    
    // МГНОВЕННОЕ обновление UI
    if (isCurrentlyDisliked) {
      // Убираем дизлайк
      userDislikes = userDislikes.filter(id => id !== videoId);
    } else {
      // Ставим дизлайк
      userDislikes.push(videoId);
      // Убираем лайк если был
      if (wasLiked) {
        userLikes = userLikes.filter(id => id !== videoId);
      }
    }
    updateButtonStates(videoId);
    
    // Отправляем ВСЕ изменения на сервер
    const actions = [];
    
    if (isCurrentlyDisliked) {
      // Если убираем дизлайк
      actions.push(window.telegramAuth.updateReaction('remove_dislike', videoId));
    } else {
      // Если ставим дизлайк
      actions.push(window.telegramAuth.updateReaction('add_dislike', videoId));
      // И убираем лайк если был
      if (wasLiked) {
        actions.push(window.telegramAuth.updateReaction('remove_like', videoId));
      }
    }
    
    // Выполняем все действия
    Promise.all(actions).then(results => {
      const allSuccess = results.every(success => success === true);
      if (!allSuccess) {
        // Откатываем изменения при ошибке
        if (isCurrentlyDisliked) {
          userDislikes.push(videoId);
        } else {
          userDislikes = userDislikes.filter(id => id !== videoId);
          if (wasLiked) {
            userLikes.push(videoId);
          }
        }
        updateButtonStates(videoId);
        console.error('❌ Не удалось обновить реакции на сервере');
      }
    });
  });

  // Настройка кнопки избранного - МГНОВЕННАЯ РЕАКЦИЯ
  setupButtonWithPointerEvents(favoriteButton, (e) => {
    const videoId = favoriteButton.getAttribute('data-video-id');
    if (!videoId) {
      console.error('❌ Video ID отсутствует!');
      return;
    }
    
    console.log('⭐ Обработка избранного для:', videoId);
    
    const isFavorite = userFavorites.includes(videoId);
    
    // МГНОВЕННОЕ обновление UI
    if (isFavorite) {
      userFavorites = userFavorites.filter(id => id !== videoId);
    } else {
      userFavorites.push(videoId);
    }
    updateButtonStates(videoId);
    
    // Отправляем на сервер асинхронно БЕЗ ОЖИДАНИЯ
    window.telegramAuth.toggleFavorite(videoId).then(success => {
      if (!success) {
        // Если ошибка, откатываем изменения
        if (isFavorite) {
          userFavorites.push(videoId);
        } else {
          userFavorites = userFavorites.filter(id => id !== videoId);
        }
        updateButtonStates(videoId);
        console.error('❌ Не удалось обновить избранное на сервере');
      }
    });
    
    // Обновляем список избранного если мы на этой вкладке
    if (currentTab === 'favorites') {
      setTimeout(() => updateFavoritesList(), 300);
    }
  });

  // Обработчики для модального окна описания
  if (descriptionButton) {
    // ИКОНКА ОПИСАНИЯ находится в svg/d.svg
    descriptionButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('📖 Нажата кнопка описания');
      showDescription();
    });
    
    // Дополнительные обработчики для touch устройств
    descriptionButton.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showDescription();
    });
  }

  if (modalClose) {
    modalClose.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      hideDescription();
    });
    
    modalClose.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();
      hideDescription();
    });
  }

  if (descriptionModal) {
    descriptionModal.addEventListener('click', (e) => {
      if (e.target === descriptionModal) {
        hideDescription();
      }
    });
  }

  // Обработчик клика по контейнеру видео для паузы/воспроизведения
  const videoContainer = document.querySelector('.video-container');
  if (videoContainer) {
    const handleVideoInteraction = (e) => {
      // Игнорируем клики на элементах управления
      if (e.target.tagName.toLowerCase() === 'a' || 
          e.target.tagName.toLowerCase() === 'button' ||
          e.target.closest('button') || 
          e.target.closest('.action-buttons') ||
          e.target.closest('.description-modal') ||
          e.target.closest('.bottom-panel') ||
          e.target.closest('.favorites-container')) {
        return;
      }
      
      // Только для главной вкладки
      if (currentTab === 'main' && videoPlayer) {
        if (videoPlayer.paused) {
          videoPlayer.play();
        } else {
          videoPlayer.pause();
        }
      }
    };
    
    videoContainer.addEventListener('click', handleVideoInteraction);
    
    // Touch обработчики для мобильных
    let touchStartTime = 0;
    let touchStartTarget = null;
    
    videoContainer.addEventListener('touchstart', (e) => {
      touchStartTime = Date.now();
      touchStartTarget = e.target;
    });
    
    videoContainer.addEventListener('touchend', (e) => {
      const touchDuration = Date.now() - touchStartTime;
      if (touchDuration < 500 && touchStartTarget === e.target) {
        e.preventDefault();
        handleVideoInteraction(e);
      }
    });
  }

  // Обработчики свайпов для переключения видео (ИСПРАВЛЕН БАГ СО СВАЙПОМ НАЗАД)
  let touchStartY = 0;
  let touchStartX = 0;
  let touchEndY = 0;
  let touchEndX = 0;
  let isSwiping = false;
  
  if (videoPlayer) {
    videoPlayer.addEventListener('touchstart', (e) => {
      // Только на главной вкладке
      if (currentTab !== 'main') return;
      
      touchStartY = e.changedTouches[0].screenY;
      touchStartX = e.changedTouches[0].screenX;
      isSwiping = false;
    }, { passive: true });
    
    videoPlayer.addEventListener('touchmove', (e) => {
      if (currentTab !== 'main') return;
      
      // Определяем, что это свайп, а не случайное касание
      const deltaY = Math.abs(e.changedTouches[0].screenY - touchStartY);
      const deltaX = Math.abs(e.changedTouches[0].screenX - touchStartX);
      
      if (deltaY > 10 || deltaX > 10) {
        isSwiping = true;
      }
      
      // Предотвращаем закрытие приложения при свайпе вниз
      if (deltaY > deltaX && e.changedTouches[0].screenY > touchStartY) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, { passive: false });
    
    videoPlayer.addEventListener('touchend', (e) => {
      if (!isSwiping || currentTab !== 'main') return;
      
      touchEndY = e.changedTouches[0].screenY;
      touchEndX = e.changedTouches[0].screenX;
      
      const deltaY = touchEndY - touchStartY;
      const deltaX = touchEndX - touchStartX;
      
      // Проверяем, что свайп вертикальный, а не горизонтальный
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        // Свайп вверх - следующее видео
        if (deltaY < -50) {
          e.preventDefault();
          e.stopPropagation();
          nextVideo();
        }
        // Свайп вниз - предыдущее видео (ИСПРАВЛЕНО)
        else if (deltaY > 50) {
          e.preventDefault();
          e.stopPropagation();
          previousVideo();
        }
      }
    }, { passive: false });
    
    // Предотвращаем стандартное поведение Telegram при свайпе
    videoPlayer.addEventListener('touchcancel', (e) => {
      isSwiping = false;
    });
  }
  
  // Также предотвращаем закрытие при свайпе на контейнере
  if (videoContainer) {
    videoContainer.addEventListener('touchmove', (e) => {
      const touch = e.changedTouches[0];
      const deltaY = touch.screenY - touchStartY;
      
      // Если свайп вниз и мы в начале страницы, предотвращаем закрытие
      if (deltaY > 0 && window.scrollY === 0) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, { passive: false });
  }

  // Обработчик колеса мыши
  let wheelTimeout = null;
  if (videoContainer) {
    videoContainer.addEventListener('wheel', (e) => {
      // Только на главной вкладке
      if (currentTab !== 'main') return;
      
      e.preventDefault();
      if (wheelTimeout) return;
      if (e.deltaY > 0) {
        nextVideo();
      } else if (e.deltaY < 0) {
        previousVideo();
      }
      wheelTimeout = setTimeout(() => {
        wheelTimeout = null;
      }, 1000);
    });
  }

  // Настраиваем основной video элемент
  if (videoPlayer) {
    videoPlayer.muted = false;
  }

  // Запускаем приложение
  await fetchVideos();

  // Автоматический запуск видео
  if (videoPlayer && currentTab === 'main') {
    videoPlayer.play().catch(error => {
      console.error('❌ Ошибка автозапуска видео:', error);
    });
  }

  // Периодическая синхронизация данных (каждые 30 секунд)
  setInterval(async () => {
    try {
      const freshUserData = await window.telegramAuth.getUserData();
      if (freshUserData) {
        userFavorites = freshUserData.favorites || [];
        userLikes = freshUserData.likes || [];
        userDislikes = freshUserData.dislikes || [];
        
        // Обновляем UI только если видео совпадает
        const currentVideoId = likeButton?.getAttribute('data-video-id');
        if (currentVideoId) {
          updateButtonStates(currentVideoId);
        }
        
        // Обновляем список избранного если мы на этой вкладке
        if (currentTab === 'favorites') {
          updateFavoritesList();
        }
        
        console.log('🔄 Автоматическая синхронизация выполнена');
      }
    } catch (error) {
      console.error('❌ Ошибка автоматической синхронизации:', error);
    }
  }, 30000); // 30 секунд

  console.log('🎉 Приложение полностью инициализировано!');
  console.log('📱 Используются pointer events для лучшей совместимости');
  console.log('🔄 Включена автоматическая синхронизация данных');
  console.log('⭐ Добавлена вкладка "Избранное" с улучшенной отзывчивостью');
});