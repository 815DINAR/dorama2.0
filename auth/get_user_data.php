<?php
// get_user_data.php v1.0 - Получение данных пользователя
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

// Основная логика
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Метод не поддерживается']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Неверные данные запроса']);
    exit;
}

try {
    $userId = strval($input['user_id']);
    $usersData = loadUsersData();
    
    if (!isset($usersData[$userId])) {
        // Пользователь не найден - возвращаем пустые данные
        echo json_encode([
            'success' => true,
            'user_data' => [
                'user_id' => $userId,
                'favorites' => [],
                'likes' => [],
                'dislikes' => [],
                'sessions_count' => 0,
                'total_time' => 0
            ]
        ]);
        exit;
    }
    
    $userData = $usersData[$userId];
    
    // Подсчитываем статистику сессий
    $sessionsCount = count($userData['sessions']);
    $totalTime = 0;
    $activeSessions = 0;
    
    foreach ($userData['sessions'] as $session) {
        if ($session['logout_time']) {
            $totalTime += $session['duration_seconds'];
        } else {
            $activeSessions++;
            // Для активных сессий считаем время до текущего момента
            $loginTime = strtotime($session['login_time']);
            $currentTime = time();
            $totalTime += ($currentTime - $loginTime);
        }
    }
    
    // Формируем ответ
    $responseData = [
        'user_id' => $userData['user_id'],
        'username' => $userData['username'],
        'first_name' => $userData['first_name'] ?? '',
        'last_name' => $userData['last_name'] ?? '',
        'favorites' => $userData['favorites'],
        'likes' => $userData['likes'],
        'dislikes' => $userData['dislikes'],
        'sessions_count' => $sessionsCount,
        'active_sessions' => $activeSessions,
        'total_time' => $totalTime,
        'first_login' => $userData['first_login'],
        'last_login' => $userData['last_login']
    ];
    
    echo json_encode([
        'success' => true,
        'user_data' => $responseData
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>