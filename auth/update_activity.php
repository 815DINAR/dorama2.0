<?php
// update_activity.php v1.0 - Обновление активности пользователя
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

if (!$input || !isset($input['user_id']) || !isset($input['session_id'])) {
    echo json_encode(['success' => false, 'message' => 'Неверные данные запроса']);
    exit;
}

try {
    $userId = strval($input['user_id']);
    $sessionId = $input['session_id'];
    $lastActivity = $input['last_activity'] ?? date('Y-m-d H:i:s');
    
    $usersData = loadUsersData();
    
    if (!isset($usersData[$userId])) {
        throw new Exception('Пользователь не найден');
    }
    
    // Находим и обновляем активную сессию
    $sessionFound = false;
    foreach ($usersData[$userId]['sessions'] as &$session) {
        if ($session['session_id'] === $sessionId && !$session['logout_time']) {
            $session['last_activity'] = $lastActivity;
            
            // Обновляем продолжительность сессии
            $loginTime = strtotime($session['login_time']);
            $currentTime = strtotime($lastActivity);
            $session['duration_seconds'] = $currentTime - $loginTime;
            
            $sessionFound = true;
            break;
        }
    }
    
    if (!$sessionFound) {
        throw new Exception('Активная сессия не найдена');
    }
    
    // Обновляем время последней активности пользователя
    $usersData[$userId]['last_activity'] = $lastActivity;
    
    if (!saveUsersData($usersData)) {
        throw new Exception('Ошибка сохранения данных');
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Активность обновлена',
        'last_activity' => $lastActivity
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>