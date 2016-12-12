var currentTab = null;

function doSomethingAfterwards(response) {
    if (response.success) {
        var form = document.getElementById("login_screen");
        form.style.display = 'none';
        document.getElementById("menu").style.display = "block";
    } else {
        console.error(response.error);
    }
    showLogInAndOutLabel(response.success);
}

function logoutAccount() {
    console.log("logging out...");
    chrome.runtime.sendMessage({ from: "menu", action: "logout" }, function(response) {
        if (response.success) {
            var loginDiv = document.getElementById("logout-item");
            loginDiv.innerHTML = "Login";
            loginDiv.id = "login-item";
            loginDiv.onclick = showLoginForm;
            console.log(response.message);
        } else {
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
    console.log("show login or logout label");
    var login;
    if (showLogout) {
        loginDiv = document.getElementById("login-item");
        if (loginDiv !== null && loginDiv !== undefined) {
            loginDiv.innerHTML = "Logout";
            loginDiv.id = "logout-item";
            loginDiv.onclick = logoutAccount;
        }
    } else {
        loginDiv = document.getElementById("logout-item");
        if (loginDiv !== null && loginDiv !== undefined) {
            loginDiv.innerHTML = "Login";
            loginDiv.id = "login-item";
            loginDiv.onclick = showLoginForm;
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
            console.error(response.error);
        }
    });
}

function determineOnOffLabel(tabs) {
    console.log("determine on/off label");
    if (tabs !== undefined && tabs !== null) {
        currentTab = tabs[0];
        chrome.storage.local.get("contentstackTabs", function(response) {
            if (response.contentstackTabs !== null && response.contentstackTabs !== undefined) {
                console.log("current Tab: " + currentTab.url + "  -  " + response.contentstackTabs.url);
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