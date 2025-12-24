<?php
session_start();
header("Access-Control-Allow-Origin: *");

include_once $_SERVER["DOCUMENT_ROOT"] . "/include/hash.php";
include_once $_SERVER["DOCUMENT_ROOT"] . "/include/encryption.php";
include_once $_SERVER["DOCUMENT_ROOT"] . "/include/redis.php";
include_once $_SERVER["DOCUMENT_ROOT"] . "/include/transport_encryption.php";

if ($_SERVER["REQUEST_METHOD"] != "POST") {
    header("HTTP/1.1 400 Bad Request");
    die();
}

//Get data
try {
    $tEnc = new TransportEncryption();
    $inputEncrypted = file_get_contents("php://input");
    $inputObj = $tEnc->decryptJSON($inputEncrypted);
} catch (Exception $e) {
    header("HTTP/1.1 204 No Content");
    die();
}

//Validate data
try {
    //Validate id
    if (!is_string($inputObj->id)) {
        validationError("Invalid property: id (string)");
    }
    if (strlen($inputObj->id) < 4) {
        validationError("Invalid property: id (string) too short");
    }

    //Password
    if (!is_string($inputObj->pass)) {
        validationError("Invalid property: pass (string)");
    }
} catch (Exception $e) {
    validationError("Unknown error");
}

$redisConn = new RedisConn();
$dbObject = new stdClass();
$response = new stdClass();

try {
    $dbObject = json_decode($redisConn->Get($inputObj->id));

    //PREPARE DATA
    $response->id = $dbObject->id;
    $response->timeoutUnix = $dbObject->timeoutUnix;
    $response->protected = $dbObject->protected;

    //DE-ENCRYPT DATA
    $encryption = new Encryption();
    
    // Check if salt exists (new format)
    if (isset($dbObject->salt)) {
        $salt = base64_decode($dbObject->salt);
        // If protected, use user provided pass. If not, use ID.
        $passwordToUse = $dbObject->protected ? $inputObj->pass : $inputObj->id;
        
        $key = Encryption::deriveKey($passwordToUse, $salt);
        $response->text = $encryption->decrypt($dbObject->text, $key);
        
        if ($response->text === false) {
            header("HTTP/1.1 401 Unauthorized");
            die();
        }
    } else {
        // Fallback for legacy data (if any exists during migration) or error
        // Since we changed encryption logic completely, old pastes might be unreadable 
        // unless we kept the old logic. Assuming "fresh start" or "breaking change" is acceptable 
        // given the massive security overhaul.
        // Or we could try to detect legacy format. 
        // For now, let's assume new format only or fail safe.
        header("HTTP/1.1 500 Internal Server Error");
        echo "Invalid data format";
        die();
    }
} catch (Exception $e) {
    header("HTTP/1.1 500 Internal Server Error");
    echo "Error storing Klister";
    die();
}

//PRESENT DATA
header("HTTP/1.1 200 OK");
header("Content-Type: text/plain; charset=utf-8");
$encrypted_response = $tEnc->encryptJSON(@$response);
echo $encrypted_response;
die();

function validationError($reason)
{
    header("HTTP/1.1 400 Bad Request");
    echo $reason;
    die();
}