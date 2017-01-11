var authToken = null;
var currentURL = null;
var tabArray = [];
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.from && message.from === "menu") {
        console.log("DEBUG: have authToken: " + authToken);
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
                    sendResponse({ "success": false, "error": "Enable: User not logged in." });
                }
                break;
            case "disable":
                if (authToken) {
                    disableExtension(message.tabID, sendResponse);
                } else {
                    sendResponse({ "success": false, "error": "Disable: User not logged in." });
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
    return true;
});

chrome.browserAction.onClicked.addListener(function(tab) { //Fired when User Clicks ICON
    if (!authToken) {
        currentURL = tab.url;
        launchMenu();

    }
});

function launchMenu() {
    tabArray.push({ "url": currentURL, "enabled": false });
    chrome.storage.local.set({ "contentstackTabs": tabArray }, function(response) {
        console.log("successfully stored tabs: ");
    });
    chrome.storage.local.get("contentstackLoggedIn", function(response) {
        console.log("user logged in? " + response.contentstackLoggedIn);
    });
    chrome.browserAction.setPopup({ "popup": "HTML/Menu.html" });
}

function enableExtension(tabid, sendResponse) {
    console.log("DEBUG: enabling extension... ");
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

    updateTabArray(currentURL, true);
    //chrome.storage.local.set({ "contentstackTabs": { "url": currentURL, "enabled": true } });
    sendResponse({ "success": true });
}

function updateTabArray(url, isEnabled) {
    for (var index = 0; index < tabArray.length; index++) {
        if (tabArray[index].url = url) {
            tabArray[index].enabled = isEnabled;
        }
    }
    chrome.storage.local.set({ "contentstackTabs": tabArray }, function() {
        console.log("successfully updated tabs: ");
    });
}

function executeScript(file, tabid, consoleMessage) {
    chrome.tabs.executeScript(tabid, {
        "file": file
    }, function() { // Execute your code
        console.log(consoleMessage); // Notification on Completion
    });
}

function disableExtension(tabid, sendResponse) {
    //chrome.tabs.reload(tabid);
    chrome.browserAction.setIcon({
        path: {
            "19": "img/badgeDis16.png",
            "38": "img/badgeDis32.png",
            "48": "img/badgeDis48.png"
        },
        tabId: tabid
    });
    sendMessageToScript("background", "suspendScript", function() {
        console.log("Disable: returned from sending suspendScript to script");
    });

    updateTabArray(currentURL, false);
    //chrome.storage.local.set({ "contentstackTabs": { "url": currentURL, "enabled": false } });
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
                chrome.storage.local.set({ 'contentstackLoggedIn': false }, function(response) {
                    console.log(response);
                });
                sendResponse({ "success": false, "error": "Oops: Invalid email/password." });
            } else {
                authToken = resp.user.authtoken;
                if (resp.user.email) {
                    chrome.storage.local.set({ 'contentstackLoggedIn': true });
                    sendResponse({ "success": true, "message": "Successfully logged!" });
                } else {
                    chrome.storage.local.set({ 'contentstackLoggedIn': false });
                    sendResponse({ "success": false, "error": "Oops: Invalid email/password." });
                }
            }
        }
    });

    xhr.open("POST", "https://api.contentstack.io/v3/user-session", true);
    xhr.setRequestHeader("content-type", "application/json");
    xhr.setRequestHeader("accept", "application/json");
    xhr.send(data);
}

function signoutUserSession(sendResponse) {
    console.log("DEBUG:  signing out user");
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
                sendMessageToScript("background", "suspendScript", function() {
                    console.log("Logout: returned from sending suspendScript to script");
                });
            }
        });
        xhr.open("DELETE", "https://api.contentstack.io/v3/user-session", true);
        xhr.setRequestHeader("accept", "application/json");
        xhr.setRequestHeader("authtoken", authToken);
        xhr.send();
    } else {
        sendResponse({ "success": false, "error": "user not signed in. cannot sign out" });
        chrome.storage.local.set({ 'contentstackLoggedIn': false });
    }

}

function sendMessageToScript(source, actionToExecute, callbackFunction) {

    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { from: source, action: actionToExecute }, function() {
            callbackFunction();
        });
    });
}

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.url === undefined && tab.url === currentURL) {
        //TODO: bug with infinite loop of refreshing.. need to figure out a way to remove script without reloading page.
        disableExtension(tabId, function() {});
        //need to sign out user and update localstore variables.
        chrome.storage.local.set({ 'contentstackLoggedIn': false });
        console.log("refreshing tabs");

    }
});