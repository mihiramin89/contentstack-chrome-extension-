var authToken = null;
var currentURL = null;
var tabArray = [];
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.from && message.from === "menu") {
        switch (message.action) {
            case "login":
                getUserSession(message.email, message.password, message.url, message.tabid, sendResponse);
                break;
            case "toggle":
                console.log("toggling state");
                currentURL = message.url;
                if (!isTabEnabled(message.tabid)) {
                    enableExtension(message.tabid);
                } else {
                    disableExtension(message.tabid);
                }
                break;
        }
    } else if (message.from && message.from === "script") {
        switch (message.action) {
            case "grabAuth":
                if (authToken !== null) {
                    console.log("sending authtoken to script...");
                    sendResponse({ "success": true, "token": authToken });
                } else {
                    sendResponse({ "success": false, "error": "failed to grab authToken" });
                }

                break;
        }
    }
    return true;
});

chrome.contextMenus.onClicked.addListener(function(info, tab) {
    signoutUserSession(info, tab);
});

function enableExtension(tabid) {
    injectContentScript(tabid);
    updateTabArray(currentURL, true);
}

function injectContentScript(tabid) {
    chrome.browserAction.setIcon({
        path: {
            "16": "img/badge16.png",
            "32": "img/badge32.png",
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
    executeScript("scripts/global-variables.js", tabid, "Injected global variables ... ");
    executeScript("scripts/ui-elements.js", tabid, "Injected ui-elements ... ");
    executeScript("scripts/data-processor.js", tabid, "Injected data processing ... ");
    executeScript("scripts/scripts.js", tabid, "Script Executed ... ");
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

function isTabEnabled(tabid) {
    console.log("current tab: " + tabid);
    var isEnabled = null;
    for (var index = 0; index < tabArray.length; index++) {
        if (tabArray[index].id === tabid) {
            isEnabled = tabArray[index].enabled;
            break;
        }
    }
    if (isEnabled === null) {
        //not inside tab array, so add it. 
        tabArray.push({ "id": tabid, "url": currentURL, "enabled": false });
        isEnabled = false;
    }
    return isEnabled;
}

function executeScript(file, tabid, consoleMessage) {
    chrome.tabs.executeScript(tabid, {
        "file": file
    }, function() {
        console.log(consoleMessage);
    });
}

function disableExtension(tabid) {
    chrome.browserAction.setIcon({
        path: {
            "16": "img/badgeDis16.png",
            "32": "img/badgeDis32.png",
            "48": "img/badgeDis48.png"
        },
        tabId: tabid
    });
    sendMessageToScript("background", "suspendScript", function() {
        console.log("Disable: returned from sending suspendScript to script");
    });

    updateTabArray(currentURL, false);

}

function isStackCollectionSet() {
    var collectionstored = false;
    var stacks = {};
    var xhr = new XMLHttpRequest();
    request = 'https://api.contentstack.io/v3/stacks?include_collaborators=false';
    return collectionstored;
}

function getUserSession(username, password, url, tabid, sendResponse) {
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
                console.error(resp.error_message);
                chrome.storage.local.set({ 'contentstackLoggedIn': false }, function(response) {
                    console.log(response);
                });
                sendResponse({ "success": false, "error": "Oops: Invalid email/password." });
            } else {
                authToken = resp.user.authtoken;
                if (resp.user.email) {
                    console.log("grab user session: " + authToken);
                    chrome.storage.local.set({ 'contentstackLoggedIn': true });
                    sendResponse({ "success": true, "message": "Successfully logged!" });

                    // finish loggin user in by injecting contentscript and creating context menu.
                    currentURL = url;
                    tabArray.push({ "id": tabid, "url": currentURL, "enabled": true });
                    //create logout context menu item. 
                    chrome.contextMenus.create({ id: '1', title: "Logout of Contentstack", contexts: ['all'] }, function() {
                        console.log("added context item");
                    });
                    enableExtension(tabid);


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

function signoutUserSession(info, tab) {
    if (authToken !== null && authToken !== undefined) {

        var xhr = new XMLHttpRequest();
        xhr.withCredentials = true;

        xhr.addEventListener("readystatechange", function() {
            if (this.readyState === 4) {
                var resp = JSON.parse(this.responseText);
                if (resp.notice) {
                    authToken = null;
                } else {
                    console.error(resp.error_message);
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
        chrome.storage.local.set({ 'contentstackLoggedIn': false });
    }

    disableAllTabs();
    chrome.contextMenus.removeAll(function() {
        console.log("successfully removed logout menu item");
    });

}

function disableAllTabs() {
    for (var index = 0; index < tabArray.length; index++) {
        disableExtension(tabArray[index].id);
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
    //only trigger this for tabs that are enabled.
    var isEnabled = null;
    for (var index = 0; index < tabArray.length; index++) {
        if (tabArray[index].id === tabId) {
            isEnabled = tabArray[index].enabled;
            break;
        }
    }
    console.log("refreshing tab..restoring settings.");
    if (isEnabled === true) {
        injectContentScript(tabId);
    } else {
        //do nothing. isEnabled returned null;
    }
});

//update tab array if tab is moved. 
chrome.tabs.onMoved.addListener(function(tabId, moveInfo) {
    for (var index = 0; index < tabArray.length; index++) {
        if (tabArray[index].id === moveInfo.fromIndex) {
            tabArray[index].id = moveInfo.toIndex;
            break;
        }
    }
    chrome.storage.local.set({ "contentstackTabs": tabArray }, function() {
        console.log("successfully updated tabs: ");
    });
});

chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
    var newTabArray = [];
    for (var index = 0; index < tabArray.length; index++) {
        if (tabArray[index].id !== tabId) {
            newTabArray.push(tabArray[index]);
        }
    }
    console.log("removing tab from list");
    tabArray = newTabArray;
    chrome.storage.local.set({ "contentstackTabs": tabArray }, function() {
        console.log("successfully updated tabs: ");
    });
});