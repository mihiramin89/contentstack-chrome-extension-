var currentTab = null;
var messageDiv = null;
var timer = null;

function doSomethingAfterwards(response) {
    if (response.success) {
        var form = document.getElementById("login_screen");
        form.style.display = 'none';
        document.getElementById("menu").style.display = "block";
        showMessage('success', response.message);
    } else {
        showMessage('error', response.error);
        console.error(response.error);
    }
    showLogInAndOutLabel(response.success);
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

function logoutAccount() {
    console.log("logging out...");
    turnOff();
    chrome.runtime.sendMessage({ from: "menu", action: "logout" }, function(response) {
        if (response.success) {
            var loginDiv = document.getElementById("logout-item");
            loginDiv.innerHTML = "Login";
            loginDiv.id = "login-item";
            loginDiv.onclick = showLoginForm;
            console.log(response.message);
            document.getElementById("myonoffswitch").disabled = true;
            showMessage('success', response.message);
        } else {
            showMessage('error', response.error);
            console.error(response.error);
        }
    });

}

function showLoginForm() {
    document.getElementById("menu").style.display = 'none';
    document.getElementById("login_screen").style.display = "block";
    document.getElementById("password").value = '';
    document.getElementById("username").value = '';
    document.getElementById("sendcredentials").addEventListener('click', sendCredentials);
    document.getElementById("cancel").addEventListener('click', cancelLogin);
}

function cancelLogin() {
    document.getElementById("menu").style.display = 'block';
    document.getElementById("login_screen").style.display = 'none';
    document.getElementById("password").value = '';
    document.getElementById("username").value = '';
}

function sendCredentials() {
    var username = document.getElementById("username").value;
    var pswd = document.getElementById("password").value;
    if (username && pswd) {
        console.log("logging in...");
        chrome.runtime.sendMessage({ from: "menu", action: "login", "email": username, "password": pswd }, doSomethingAfterwards);
    }

}

function showLogInAndOutLabel(showLogout) {
    var login;
    if (showLogout) {
        loginDiv = document.getElementById("login-item");
        if (loginDiv !== null && loginDiv !== undefined) {
            loginDiv.innerHTML = "Logout";
            loginDiv.id = "logout-item";
            loginDiv.onclick = logoutAccount;
            document.getElementById("myonoffswitch").disabled = false;
        }
    } else {
        loginDiv = document.getElementById("logout-item");
        if (loginDiv !== null && loginDiv !== undefined) {
            loginDiv.innerHTML = "Login";
            loginDiv.id = "login-item";
            loginDiv.onclick = showLoginForm;
            document.getElementById("myonoffswitch").disabled = true;
        }

    }
}

function checkValue() {
    var isOn = document.getElementById("myonoffswitch").checked;
    if (isOn) {
        turnOn();
    } else {
        turnOff();
    }
}

function turnOn() {
    console.log("enabling ...");
    var tabid;
    if (currentTab !== null && currentTab !== undefined) {
        tabid = currentTab.id;
    }
    chrome.runtime.sendMessage({ from: "menu", action: "enable", tabID: tabid }, function(response) {
        if (response.success) {
            document.getElementById("myonoffswitch").checked = true;
        } else {
            showMessage('error', response.error);
            console.error(response.error);
        }
    });
}

function turnOff() {
    console.log("disabling ...");
    var tabid;
    if (currentTab !== null && currentTab !== undefined) {
        tabid = currentTab.id;
    }
    chrome.runtime.sendMessage({ from: "menu", action: "disable", "tabID": tabid }, function(response) {
        if (response.success) {
            document.getElementById("myonoffswitch").checked = false;
        } else {
            showMessage('error', response.error);
            console.error(response.error);
        }
    });
}

function determineOnOffLabel(tabs) {
    if (tabs !== undefined && tabs !== null) {
        currentTab = tabs[0];
        chrome.storage.local.get("contentstackTabs", function(response) {
            if (response.contentstackTabs !== null && response.contentstackTabs !== undefined) {
                if (currentTab.url == response.contentstackTabs.url) {
                    document.getElementById("myonoffswitch").checked = response.contentstackTabs.enabled;
                }
            }
        });
    }
}

function init() {
    document.getElementById("login-item").onclick = showLoginForm;
    document.getElementById("myonoffswitch").onclick = checkValue;
    document.getElementById("myonoffswitch").checked = false; //default to be off. 
    messageDiv = document.getElementById("message");
    chrome.storage.local.get("contentstackLoggedIn", function(response) {
        console.log("is user logged in? " + response.contentstackLoggedIn);
        var isUserLoggedIn = response.contentstackLoggedIn;
        showLogInAndOutLabel(isUserLoggedIn);
    });
    var query = { active: true, currentWindow: true };
    chrome.tabs.query(query, determineOnOffLabel);
}

document.addEventListener('DOMContentLoaded', function() {
    init();
});