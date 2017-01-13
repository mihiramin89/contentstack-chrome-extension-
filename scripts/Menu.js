var currentTab = null;
var messageDiv = null;
var timer = null;
var shouldLoadLogin = false;

function UpdateLoginMenuItem(response) {
    if (response.success) {
        window.close();
    } else {
        showMessage('error', response.error);
        console.error(response.error);
    }
}

function showMessage(className, message) {
    messageDiv.className = className;
    messageDiv.innerText = message;
    messageDiv.style.display = 'block';
    timer = window.setTimeout(function() {
        messageDiv.className = '';
        clearTimeout(timer);
        timer = null;
    }, 3000);
}

function sendCredentials() {
    var username = document.getElementById("username").value;
    var pswd = document.getElementById("password").value;
    if (username && pswd) {
        console.log("logging in...");
        chrome.runtime.sendMessage({ from: "menu", action: "login", "email": username, "password": pswd, "tabid": currentTab.id, "url": currentTab.url }, UpdateLoginMenuItem);
    }
}

function grabCurrentTab(tabs) {
    currentTab = tabs[0];
}

function init() {
    document.getElementById("password").value = '';
    document.getElementById("username").value = '';
    document.getElementById("sendcredentials").addEventListener('click', sendCredentials);
    messageDiv = document.getElementById("message");
}

document.addEventListener('DOMContentLoaded', function() {
    var query = { active: true, currentWindow: true };
    chrome.tabs.query(query, grabCurrentTab);

    chrome.storage.local.get("contentstackLoggedIn", function(response) {
        console.log("is user logged in? " + response.contentstackLoggedIn);
        shouldLoadLogin = response.contentstackLoggedIn;
        //alert(isUserLoggedIn);
        if (shouldLoadLogin) {
            //don't initialize and send back to background to background to toggle state.
            chrome.runtime.sendMessage({ from: "menu", action: "toggle", "url": currentTab.url, "tabid": currentTab.id }, function(response) {
                //window.close();
            });
            window.close();
        }
    });
});

window.addEventListener('load', function(event) {
    console.log("loading page...");
    if (!shouldLoadLogin) {
        init();
    }
})