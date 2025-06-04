<?php
// update_user_data.php v1.0 - Обновление данных пользователя (избранное, лайки)
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

define('USERS_DATA_FILE', __DIR__ . '/users_data.json');

// Функция загрузки данных пользователей
function loadUsersData() {
    if (file_exists(USERS_DATA_FILE)) {
        $data = json_decode(file_get_contents(USERS_DATA_FILE), true);
        return is_array($data) ? $data : [];
    }
    return [];
}

// Функция сохранения данных пользователей
function saveUsersData($data) {
    return file_put_contents(USERS_DATA_FILE, json_encode($data, JSON_PRETTY_PRINT)) !== false;
}

// Основная логика
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Метод не поддерживается']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['user_id']) || !isset($input['action'])) {
    echo json_encode(['success' => false, 'message' => 'Неверные данные запроса']);
    exit;
}

try {
    $userId = strval($input['user_id']);
    $action = $input['action'];
    $videoId = $input['video_id'] ?? null;
    
    $usersData = loadUsersData();
    
    if (!isset($usersData[$userId])) {
        throw new Exception('Пользователь не найден');
    }
    
    switch ($action) {
        case 'toggle_favorite':
            if (!$videoId) {
                throw new Exception('ID видео не передан');
            }
            
            $favorites = &$usersData[$userId]['favorites'];
            $index = array_search($videoId, $favorites);
            
            if ($index !== false) {
                // Удаляем из избранного
                array_splice($favorites, $index, 1);
                $message = 'Удалено из избранного';
            } else {
                // Добавляем в избранное
                $favorites[] = $videoId;
                $message = 'Добавлено в избранное';
            }
            break;
            
        case 'add_like':
            if (!$videoId) {
                throw new Exception('ID видео не передан');
            }
            
            $likes = &$usersData[$userId]['likes'];
            $dislikes = &$usersData[$userId]['dislikes'];
            
            // Удаляем из дизлайков если есть
            $dislikeIndex = array_search($videoId, $dislikes);
            if ($dislikeIndex !== false) {
                array_splice($dislikes, $dislikeIndex, 1);
            }
            
            // Добавляем в лайки если еще нет
            if (!in_array($videoId, $likes)) {
                $likes[] = $videoId;
            }
            
            $message = 'Лайк добавлен';
            break;
            
        case 'add_dislike':
            if (!$videoId) {
                throw new Exception('ID видео не передан');
            }
            
            $likes = &$usersData[$userId]['likes'];
            $dislikes = &$usersData[$userId]['dislikes'];
            
            // Удаляем из лайков если есть
            $likeIndex = array_search($videoId, $likes);
            if ($likeIndex !== false) {
                array_splice($likes, $likeIndex, 1);
            }
            
            // Добавляем в дизлайки если еще нет
            if (!in_array($videoId, $dislikes)) {
                $dislikes[] = $videoId;
            }
            
            $message = 'Дизлайк добавлен';
            break;
            
        case 'remove_like':
            if (!$videoId) {
                throw new Exception('ID видео не передан');
            }
            
            $likes = &$usersData[$userId]['likes'];
            $index = array_search($videoId, $likes);
            
            if ($index !== false) {
                array_splice($likes, $index, 1);
                $message = 'Лайк удален';
            } else {
                $message = 'Лайк не найден';
            }
            break;
            
        case 'remove_dislike':
            if (!$videoId) {
                throw new Exception('ID видео не передан');
            }
            
            $dislikes = &$usersData[$userId]['dislikes'];
            $index = array_search($videoId, $dislikes);
            
            if ($index !== false) {
                array_splice($dislikes, $index, 1);
                $message = 'Дизлайк удален';
            } else {
                $message = 'Дизлайк не найден';
            }
            break;
            
        default:
            throw new Exception('Неизвестное действие: ' . $action);
    }
    
    // Обновляем время последнего изменения
    $usersData[$userId]['last_modified'] = date('Y-m-d H:i:s');
    
    if (!saveUsersData($usersData)) {
        throw new Exception('Ошибка сохранения данных');
    }
    
    echo json_encode([
        'success' => true,
        'message' => $message,
        'user_data' => [
            'favorites' => $usersData[$userId]['favorites'],
            'likes' => $usersData[$userId]['likes'],
            'dislikes' => $usersData[$userId]['dislikes']
        ]
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>