var authToken = null;
var currentURL = null;
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.from && message.from === "menu") {
        switch (message.action) {
            case "login":
                getUserSession(message.email, message.password, sendResponse);
                break;
            case "logout":
                signoutUserSession(sendResponse);
                break;
            case "enable":
                if (authToken) {
                    enableExtension(message.tabID, sendResponse);
                } else {
                    sendResponse({ "success": false, "error": "User not logged in." });
                }
                break;
            case "disable":
                if (authToken) {
                    disableExtension(message.tabID, sendResponse);
                } else {
                    sendResponse({ "success": false, "error": "User not logged in." });
                }
                break;
        }
    } else if (message.from && message.from === "script") {
        switch (message.action) {
            case "grabAuth":
                console.log("sending authtoken to script...");
                sendResponse({ "success": true, "token": authToken });
                break;
        }
    }
});

chrome.browserAction.onClicked.addListener(function(tab) { //Fired when User Clicks ICON
    if (!authToken) {
        currentURL = tab.url;
        launchMenu();

    }
});

function launchMenu() {
    chrome.storage.local.set({ "contentstackTabs": { "url": currentURL, "enabled": false } });
    chrome.storage.local.get("contentstackLoggedIn", function(response) {
        console.log("user logged in? " + response.contentstackLoggedIn);
    });
    chrome.browserAction.setPopup({ "popup": "HTML/Menu.html" });
}

function enableExtension(tabid, sendResponse) {
    chrome.browserAction.setIcon({
        path: {
            "19": "img/badge16.png",
            "38": "img/badge32.png",
            "48": "img/badge48.png"
        },
        tabId: tabid
    });
    chrome.tabs.insertCSS(tabid, {
        "file": "css/styles.css"
    }, function() {
        console.log("injecting CSS styles");
    });
    executeScript("scripts/jquery-3.1.1.min.js", tabid, "Injected jquery file ... ");
    executeScript("scripts/scripts.js", tabid, "Script Executed ... ");

    chrome.storage.local.set({ "contentstackTabs": { "url": currentURL, "enabled": true } });
    sendResponse({ "success": true });
}

function executeScript(file, tabid, consoleMessage) {
    chrome.tabs.executeScript(tabid, {
        "file": file
    }, function() { // Execute your code
        console.log(consoleMessage); // Notification on Completion
    });
}

function disableExtension(tabid, sendResponse) {
    chrome.tabs.reload(tabid);
    chrome.browserAction.setIcon({
        path: {
            "19": "img/badgeDis16.png",
            "38": "img/badgeDis32.png",
            "48": "img/badgeDis48.png"
        },
        tabId: tabid
    });
    chrome.storage.local.set({ "contentstackTabs": { "url": currentURL, "enabled": false } });
    sendResponse({ "success": true });
}

function isStackCollectionSet() {
    var collectionstored = false;
    var stacks = {};
    var xhr = new XMLHttpRequest();
    request = 'https://api.contentstack.io/v3/stacks?include_collaborators=false';
    return collectionstored;
}

function getUserSession(username, password, sendResponse) {
    var request = 'https://api.contentstack.io/v3/user-session';
    var data = JSON.stringify({
        "user": {
            "email": username,
            "password": password
        }
    });

    var xhr = new XMLHttpRequest();
    xhr.withCredentials = true;

    xhr.addEventListener("readystatechange", function() {
        if (this.readyState === 4) {
            var resp = JSON.parse(this.responseText);
            if (resp.error_code) {
                console.log(resp.error_message);
                chrome.storage.local.set({ 'contentstackLoggedIn': false });
                sendResponse({ "success": false, "error": "Invalid email/password" });
            } else {
                console.log(resp.notice);
                authToken = resp.user.authtoken;
                console.log("successfully grabbed " + resp.user.email + "'s auth token: " + authToken);
                if (resp.user.email) {
                    chrome.storage.local.set({ 'contentstackLoggedIn': true });
                    sendResponse({ "success": true });
                } else {
                    chrome.storage.local.set({ 'contentstackLoggedIn': false });
                    sendResponse({ "success": false, "error": "Invalid email/password" });
                }
            }
        }
    });

    xhr.open("POST", "https://api.contentstack.io/v3/user-session", false);
    xhr.setRequestHeader("content-type", "application/json");
    xhr.setRequestHeader("accept", "application/json");
    xhr.send(data);
}

function signoutUserSession(sendResponse) {
    if (authToken !== null && authToken !== undefined) {

        var xhr = new XMLHttpRequest();
        xhr.withCredentials = true;

        xhr.addEventListener("readystatechange", function() {
            if (this.readyState === 4) {
                console.log(this.responseText);
                var resp = JSON.parse(this.responseText);
                if (resp.notice) {
                    authToken = null;
                    sendResponse({ "success": true, "message": resp.notice });
                } else {
                    sendResponse({ "success": false, "error": resp.error_message });
                }
                chrome.storage.local.set({ 'contentstackLoggedIn': false });
            }
        });
        xhr.open("DELETE", "https://api.contentstack.io/v3/user-session", false);
        xhr.setRequestHeader("accept", "application/json");
        xhr.setRequestHeader("authtoken", authToken);
        xhr.send();
    } else {
        sendResponse({ "success": false, "error": "user not signed in. cannot sign out" });
        chrome.storage.local.set({ 'contentstackLoggedIn': false });
    }

}