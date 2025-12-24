<?php session_start(); ?>
<div class="create_container_master">
    <h4>Create New Klister</h4>
    <form class="createForm" autocomplete="off" onsubmit="createKlister(); return false;">
        
        <textarea name="text" placeholder="Paste your code or text here..." spellcheck="false"></textarea>

        <div class="createFormPropertyRow">
            <div class="createFormPropertyRowLeft">
                <label for="expiry">Expiration:</label>
            </div>
            <div class="createFormPropertyRowRight">
                <select name="expiry" id="expiry">
                    <option value="1800">30 Minutes</option>
                    <option value="3600">1 Hour</option>
                    <option value="21600">6 Hours</option>
                    <option value="43200">12 Hours</option>
                    <option value="86400">1 Day</option>
                    <option value="259200">3 Days</option>
                    <option value="604800">7 Days</option>
                </select>
            </div>
        </div>

        <div class="createFormPropertyRow">
            <div class="createFormPropertyRowLeft">
                <label for="reqPass">Password (Optional):</label>
            </div>
            <div class="createFormPropertyRowRight">
                <input type="password" id="reqPass" name="reqPass" placeholder="Enter a password to encrypt">
            </div>
        </div>

        <div class="createFormSubmitWrapper">
            <input type="submit" value="Create Secure Klister">
        </div>
        
    </form>
</div>
