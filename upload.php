<?php
// upload.php v1.2 - Загрузка видео с улучшенными ответами
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $uploadDir = __DIR__ . '/uploads/';
    
    // Создаём директорию uploads, если её нет
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }
    
    // Проверяем, передан ли файл
    if (!isset($_FILES['videoFile'])) {
        header('Content-Type: application/json');
        echo json_encode(["success" => false, "message" => "Нет файла для загрузки"]);
        exit();
    }
    
    $file = $_FILES['videoFile'];
    
    // Проверяем ошибки загрузки
    if ($file['error'] !== UPLOAD_ERR_OK) {
        header('Content-Type: application/json');
        $errorMessages = [
            UPLOAD_ERR_INI_SIZE => 'Файл превышает максимальный размер',
            UPLOAD_ERR_FORM_SIZE => 'Файл превышает максимальный размер формы',
            UPLOAD_ERR_PARTIAL => 'Файл загружен частично',
            UPLOAD_ERR_NO_FILE => 'Файл не был загружен',
            UPLOAD_ERR_NO_TMP_DIR => 'Отсутствует временная папка',
            UPLOAD_ERR_CANT_WRITE => 'Ошибка записи файла на диск',
            UPLOAD_ERR_EXTENSION => 'Загрузка файла остановлена расширением'
        ];
        $message = isset($errorMessages[$file['error']]) ? $errorMessages[$file['error']] : 'Неизвестная ошибка загрузки';
        echo json_encode(["success" => false, "message" => $message]);
        exit();
    }
    
    $fileName = basename($file['name']);
    $filePath = $uploadDir . $fileName;
    
    // Проверяем расширение файла
    $allowedExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'];
    $fileExtension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
    
    if (!in_array($fileExtension, $allowedExtensions)) {
        header('Content-Type: application/json');
        echo json_encode(["success" => false, "message" => "Недопустимый формат файла. Разрешены: " . implode(', ', $allowedExtensions)]);
        exit();
    }
    
    // Проверяем, не существует ли уже файл с таким именем
    if (file_exists($filePath)) {
        header('Content-Type: application/json');
        echo json_encode(["success" => false, "message" => "Файл с таким именем уже существует"]);
        exit();
    }
    
    // Перемещаем загруженный файл в папку uploads
    if (move_uploaded_file($file['tmp_name'], $filePath)) {
        // Получаем дополнительные данные из POST-запроса
        $title       = isset($_POST['title'])       ? trim($_POST['title'])       : pathinfo($fileName, PATHINFO_FILENAME);
        $description = isset($_POST['description']) ? trim($_POST['description']) : 'Описание отсутствует';
        $series      = isset($_POST['series'])      ? trim($_POST['series'])      : 'Неизвестно';
        $seasons     = isset($_POST['seasons'])     ? trim($_POST['seasons'])     : 'Неизвестно';
        $status      = isset($_POST['status'])      ? trim($_POST['status'])      : 'Неизвестно';
        $country     = isset($_POST['country'])     ? trim($_POST['country'])     : 'Неизвестно';
        $genre       = isset($_POST['genre'])       ? trim($_POST['genre'])       : 'Неизвестно';
        $link        = isset($_POST['link'])        ? trim($_POST['link'])        : '#';
        
        // Валидация обязательных полей
        if (empty($title) || empty($description)) {
            // Удаляем загруженный файл при ошибке валидации
            unlink($filePath);
            header('Content-Type: application/json');
            echo json_encode(["success" => false, "message" => "Название и описание обязательны для заполнения"]);
            exit();
        }
        
        // Файл для хранения метаданных видео
        $metadataFile = __DIR__ . '/videos.json';
        
        if (file_exists($metadataFile)) {
            $existingData = json_decode(file_get_contents($metadataFile), true);
            if (!is_array($existingData)) {
                $existingData = [];
            }
        } else {
            $existingData = [];
        }
        
        // Формируем новый массив метаданных для загруженного видео
        $newVideoData = [
            'filename'    => $fileName,
            'title'       => $title,
            'description' => $description,
            'series'      => $series,
            'seasons'     => $seasons,
            'status'      => $status,
            'country'     => $country,
            'genre'       => $genre,
            'link'        => $link
        ];
        
        $existingData[] = $newVideoData;
        
        // Сохраняем обновлённый список метаданных в videos.json
        if (file_put_contents($metadataFile, json_encode($existingData))) {
            header('Content-Type: application/json');
            echo json_encode([
                "success" => true, 
                "message" => "Видео успешно загружено",
                "data" => $newVideoData,
                "total_videos" => count($existingData)
            ]);
        } else {
            // Удаляем файл если не удалось сохранить метаданные
            unlink($filePath);
            header('Content-Type: application/json');
            echo json_encode(["success" => false, "message" => "Ошибка сохранения метаданных"]);
        }
    } else {
        header('Content-Type: application/json');
        echo json_encode(["success" => false, "message" => "Ошибка загрузки файла на сервер"]);
    }
} else {
    header('Content-Type: application/json');
    echo json_encode(["success" => false, "message" => "Метод не поддерживается"]);
}
?>