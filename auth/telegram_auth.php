<?php
// telegram_auth.php v1.0 - Серверная часть авторизации через Telegram
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Конфигурация
define('USERS_DATA_FILE', __DIR__ . '/users_data.json');
define('BOT_TOKEN', '7802352681:AAGmFrxHW70g8sO7sYh4vQZ1DjHkHNAzAWg'); // Замените на токен вашего бота

// Функция для проверки подписи данных от Telegram
function verifyTelegramData($auth_data) {
    $check_hash = $auth_data['hash'];
    unset($auth_data['hash']);
    
    $data_check_arr = [];
    foreach ($auth_data as $key => $value) {
        $data_check_arr[] = $key . '=' . $value;
    }
    sort($data_check_arr);
    $data_check_string = implode("\n", $data_check_arr);
    
    $secret_key = hash('sha256', BOT_TOKEN, true);
    $hash = hash_hmac('sha256', $data_check_string, $secret_key);
    
    return strcmp($hash, $check_hash) === 0;
}

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

// Функция генерации ID сессии
function generateSessionId() {
    return bin2hex(random_bytes(16));
}

// Основная логика
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Метод не поддерживается']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['action'])) {
    echo json_encode(['success' => false, 'message' => 'Неверные данные запроса']);
    exit;
}

$action = $input['action'];

try {
    switch ($action) {
        case 'login':
            // Проверяем наличие данных пользователя
            if (!isset($input['user']) || !isset($input['user']['id'])) {
                throw new Exception('Данные пользователя не переданы');
            }
            
            $user = $input['user'];
            $userId = strval($user['id']);
            $username = $user['username'] ?? 'user_' . $userId;
            
            // Загружаем существующие данные
            $usersData = loadUsersData();
            
            // Создаем новую сессию
            $sessionId = generateSessionId();
            $currentTime = date('Y-m-d H:i:s');
            
            $newSession = [
                'session_id' => $sessionId,
                'login_time' => $currentTime,
                'logout_time' => null,
                'duration_seconds' => 0,
                'last_activity' => $currentTime
            ];
            
            // Проверяем, существует ли пользователь
            if (isset($usersData[$userId])) {
                // Обновляем существующего пользователя
                $usersData[$userId]['sessions'][] = $newSession;
                $usersData[$userId]['last_login'] = $currentTime;
            } else {
                // Создаем нового пользователя
                $usersData[$userId] = [
                    'user_id' => $userId,
                    'username' => $username,
                    'first_name' => $user['first_name'] ?? '',
                    'last_name' => $user['last_name'] ?? '',
                    'language_code' => $user['language_code'] ?? 'en',
                    'is_premium' => $user['is_premium'] ?? false,
                    'first_login' => $currentTime,
                    'last_login' => $currentTime,
                    'sessions' => [$newSession],
                    'favorites' => [],
                    'likes' => [],
                    'dislikes' => []
                ];
            }
            
            // Сохраняем данные
            if (!saveUsersData($usersData)) {
                throw new Exception('Ошибка сохранения данных пользователя');
            }
            
            echo json_encode([
                'success' => true,
                'message' => 'Авторизация успешна',
                'session_id' => $sessionId,
                'user_data' => [
                    'id' => $userId,
                    'username' => $username,
                    'favorites' => $usersData[$userId]['favorites']
                ]
            ]);
            break;
            
        case 'logout':
            // Завершаем сессию
            if (!isset($input['user_id']) || !isset($input['session_id'])) {
                throw new Exception('Не переданы user_id или session_id');
            }
            
            $userId = strval($input['user_id']);
            $sessionId = $input['session_id'];
            
            $usersData = loadUsersData();
            
            if (!isset($usersData[$userId])) {
                throw new Exception('Пользователь не найден');
            }
            
            // Находим и обновляем сессию
            $sessionFound = false;
            foreach ($usersData[$userId]['sessions'] as &$session) {
                if ($session['session_id'] === $sessionId && !$session['logout_time']) {
                    $loginTime = strtotime($session['login_time']);
                    $currentTime = time();
                    $session['logout_time'] = date('Y-m-d H:i:s');
                    $session['duration_seconds'] = $currentTime - $loginTime;
                    $sessionFound = true;
                    break;
                }
            }
            
            if (!$sessionFound) {
                throw new Exception('Сессия не найдена');
            }
            
            saveUsersData($usersData);
            
            echo json_encode([
                'success' => true,
                'message' => 'Сессия завершена'
            ]);
            break;
            
        default:
            throw new Exception('Неизвестное действие: ' . $action);
    }
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>