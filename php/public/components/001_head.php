<?php
session_start(); ?>
<?php function getRootUrl()
{
    $protocol =
        isset($_SERVER["HTTPS"]) && $_SERVER["HTTPS"] === "on"
            ? "https"
            : "http";
    $host = $_SERVER["HTTP_HOST"];
    return $protocol . "://" . $host . "/";
} ?>

<div class="head_container_master" id="head_container_master">
<a href="/">
    <h1>LibreKlistra</h1>
</a>
</div>
<button id="themeToggle" aria-label="Toggle theme" title="Toggle theme" onclick="toggleTheme()">🌗</button>
</div>