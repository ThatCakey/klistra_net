<?php session_start(); ?>

<div class="create_container_master">

    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h4 id="countdown" style="margin: 0;">Expires in...</h4>
        <span class="material-symbols-outlined" id="hiddenIcon" title="Encrypted & Password Protected">visibility_lock</span>
    </div>

    <form class="createForm" autocomplete="off">
        
        <textarea name="text" id="klisterarea" readonly placeholder="Loading content..."></textarea>

        <div class="createFormSubmitWrapper">
            <input type="button" value="Copy to Clipboard" onclick="copyToClipboard()">
        </div>

    </form>

</div>