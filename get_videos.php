<?php
$metadataFile = __DIR__ . '/videos.json';
if (file_exists($metadataFile)) {
    $videos = json_decode(file_get_contents($metadataFile), true);
    if (!is_array($videos)) {
        $videos = [];
    }
} else {
    $videos = [];
}
header('Content-Type: application/json');
$json = json_encode($videos);
if ($json === false) {
    echo json_encode(['error' => 'JSON encoding error']);
} else {
    echo $json;
}
?>