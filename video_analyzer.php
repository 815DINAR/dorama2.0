<?php
// video_analyzer.php - Анализ и рекомендации по оптимизации видео
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    echo json_encode(["success" => false, "message" => "Метод не поддерживается"]);
    exit();
}

$uploadsDir = __DIR__ . '/uploads/';
$results = [];

// Проверяем наличие папки uploads
if (!is_dir($uploadsDir)) {
    echo json_encode(["success" => false, "message" => "Папка uploads не найдена"]);
    exit();
}

// Получаем список всех видео файлов
$videoFiles = glob($uploadsDir . '*.{mp4,avi,mov,webm,mkv}', GLOB_BRACE);

if (empty($videoFiles)) {
    echo json_encode(["success" => true, "message" => "Видео файлы не найдены", "files" => []]);
    exit();
}

foreach ($videoFiles as $filePath) {
    $filename = basename($filePath);
    $fileSize = filesize($filePath);
    $fileSizeMB = round($fileSize / (1024 * 1024), 2);
    
    $analysis = [
        'filename' => $filename,
        'size_bytes' => $fileSize,
        'size_mb' => $fileSizeMB,
        'recommendations' => [],
        'status' => 'good'
    ];
    
    // Анализ размера файла
    if ($fileSizeMB > 50) {
        $analysis['recommendations'][] = "Файл очень большой ({$fileSizeMB} МБ). Рекомендуется сжать до 10-25 МБ";
        $analysis['status'] = 'warning';
    } elseif ($fileSizeMB > 25) {
        $analysis['recommendations'][] = "Файл большой ({$fileSizeMB} МБ). Можно сжать для быстрой загрузки";
        $analysis['status'] = 'warning';
    } elseif ($fileSizeMB < 5) {
        $analysis['recommendations'][] = "Отличный размер файла ({$fileSizeMB} МБ) для быстрой загрузки";
    }
    
    // Проверка расширения
    $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    if ($extension !== 'mp4') {
        $analysis['recommendations'][] = "Рекомендуется конвертировать в MP4 для лучшей совместимости";
        $analysis['status'] = 'warning';
    }
    
    // Дополнительная информация о файле (если доступна через ffprobe)
    if (function_exists('shell_exec') && shell_exec('which ffprobe') !== null) {
        $command = "ffprobe -v quiet -print_format json -show_format -show_streams " . escapeshellarg($filePath) . " 2>/dev/null";
        $output = shell_exec($command);
        
        if ($output) {
            $videoInfo = json_decode($output, true);
            
            if (isset($videoInfo['streams'])) {
                foreach ($videoInfo['streams'] as $stream) {
                    if ($stream['codec_type'] === 'video') {
                        $width = $stream['width'] ?? 0;
                        $height = $stream['height'] ?? 0;
                        $bitrate = $stream['bit_rate'] ?? 0;
                        
                        $analysis['video_info'] = [
                            'width' => $width,
                            'height' => $height,
                            'codec' => $stream['codec_name'] ?? 'unknown',
                            'bitrate' => $bitrate ? round($bitrate / 1000000, 1) . ' Mbps' : 'unknown'
                        ];
                        
                        // Анализ разрешения
                        if ($width > 1920 || $height > 1080) {
                            $analysis['recommendations'][] = "Разрешение {$width}x{$height} слишком высокое. Рекомендуется 1080p или 720p";
                            $analysis['status'] = 'warning';
                        }
                        
                        // Анализ битрейта
                        if ($bitrate > 8000000) { // > 8 Mbps
                            $analysis['recommendations'][] = "Битрейт слишком высокий. Рекомендуется 2-6 Mbps";
                            $analysis['status'] = 'warning';
                        }
                        
                        break;
                    }
                }
            }
            
            // Анализ продолжительности
            if (isset($videoInfo['format']['duration'])) {
                $duration = floatval($videoInfo['format']['duration']);
                $durationMin = round($duration / 60, 1);
                
                $analysis['duration'] = [
                    'seconds' => round($duration, 1),
                    'minutes' => $durationMin
                ];
                
                if ($duration > 300) { // > 5 минут
                    $analysis['recommendations'][] = "Видео длинное ({$durationMin} мин). Рассмотрите разделение на части";
                    $analysis['status'] = 'warning';
                }
            }
        }
    } else {
        $analysis['note'] = 'FFprobe недоступен. Установите FFmpeg для детального анализа';
    }
    
    // Финальная оценка
    if (empty($analysis['recommendations'])) {
        $analysis['recommendations'][] = "Файл оптимизирован для веба";
        $analysis['status'] = 'excellent';
    }
    
    $results[] = $analysis;
}

// Подсчет общей статистики
$totalSize = array_sum(array_column($results, 'size_mb'));
$avgSize = round($totalSize / count($results), 2);

$statusCounts = array_count_values(array_column($results, 'status'));

echo json_encode([
    'success' => true,
    'total_files' => count($results),
    'total_size_mb' => round($totalSize, 2),
    'average_size_mb' => $avgSize,
    'status_summary' => $statusCounts,
    'files' => $results
]);
?>