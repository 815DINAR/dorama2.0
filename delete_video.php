<?php
// delete_video.php v1.0 - Удаление видео
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(["success" => false, "message" => "Метод не поддерживается"]);
    exit();
}

// Получаем данные из POST запроса
$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['action'])) {
    echo json_encode(["success" => false, "message" => "Неверные данные запроса"]);
    exit();
}

$action = $input['action'];
$uploadsDir = __DIR__ . '/uploads/';
$metadataFile = __DIR__ . '/videos.json';

// Функция для безопасного удаления файла
function safeDeleteFile($filePath) {
    if (file_exists($filePath)) {
        return unlink($filePath);
    }
    return true; // Файл уже не существует
}

// Функция для загрузки метаданных
function loadMetadata($metadataFile) {
    if (file_exists($metadataFile)) {
        $data = json_decode(file_get_contents($metadataFile), true);
        return is_array($data) ? $data : [];
    }
    return [];
}

// Функция для сохранения метаданных
function saveMetadata($metadataFile, $data) {
    return file_put_contents($metadataFile, json_encode($data)) !== false;
}

try {
    if ($action === 'delete_single') {
        // Удаление одного видео
        if (!isset($input['filename'])) {
            throw new Exception("Не указан файл для удаления");
        }
        
        $filename = $input['filename'];
        $filePath = $uploadsDir . $filename;
        
        // Проверяем безопасность пути (защита от directory traversal)
        if (strpos($filename, '..') !== false || strpos($filename, '/') !== false || strpos($filename, '\\') !== false) {
            throw new Exception("Недопустимое имя файла");
        }
        
        // Загружаем метаданные
        $videos = loadMetadata($metadataFile);
        
        // Находим и удаляем видео из метаданных
        $videoFound = false;
        $updatedVideos = [];
        
        foreach ($videos as $video) {
            if ($video['filename'] !== $filename) {
                $updatedVideos[] = $video;
            } else {
                $videoFound = true;
            }
        }
        
        if (!$videoFound) {
            throw new Exception("Видео не найдено в базе данных");
        }
        
        // Удаляем файл
        if (!safeDeleteFile($filePath)) {
            throw new Exception("Ошибка удаления файла: $filename");
        }
        
        // Сохраняем обновленные метаданные
        if (!saveMetadata($metadataFile, $updatedVideos)) {
            throw new Exception("Ошибка обновления базы данных");
        }
        
        echo json_encode([
            "success" => true, 
            "message" => "Видео успешно удалено",
            "deleted_file" => $filename,
            "remaining_count" => count($updatedVideos)
        ]);
        
    } elseif ($action === 'delete_all') {
        // Удаление всех видео
        $videos = loadMetadata($metadataFile);
        $deletedCount = 0;
        $errors = [];
        
        // Удаляем все файлы
        foreach ($videos as $video) {
            $filePath = $uploadsDir . $video['filename'];
            if (safeDeleteFile($filePath)) {
                $deletedCount++;
            } else {
                $errors[] = $video['filename'];
            }
        }
        
        // Очищаем метаданные
        if (!saveMetadata($metadataFile, [])) {
            throw new Exception("Ошибка очистки базы данных");
        }
        
        // Удаляем папку uploads, если она пустая
        if (is_dir($uploadsDir) && count(scandir($uploadsDir)) == 2) { // . и ..
            rmdir($uploadsDir);
        }
        
        $message = "Удалено файлов: $deletedCount";
        if (!empty($errors)) {
            $message .= ". Ошибки при удалении: " . implode(', ', $errors);
        }
        
        echo json_encode([
            "success" => true,
            "message" => $message,
            "deleted_count" => $deletedCount,
            "errors" => $errors
        ]);
        
    } else {
        throw new Exception("Неизвестное действие: $action");
    }
    
} catch (Exception $e) {
    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}
?>