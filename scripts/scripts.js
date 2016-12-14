var cur;
var no = [document.body, document.documentElement, document];
var authToken = null;
var stackData = [];
var editURL = null;
var hoverHTML = null;
var isInspectionSuspended = false;
init();

function init() {
    authToken = null;
    stackData = [];
    var divExists = document.getElementById("contentstack-highlight");
    if (divExists === null) {
        var overlaydiv = document.createElement("div");
        overlaydiv.id = "contentstack-highlight";
        document.body.appendChild(overlaydiv);

        var hoverDiv = document.createElement("div");
        hoverDiv.id = "contentstack-hoverBox";
        hoverDiv.title = "click div to see information about the revision";
        overlaydiv.appendChild(hoverDiv);

        var hoverbuttons = document.createElement("div");
        hoverbuttons.id = "contentstack-hoverbox-icons";
        var closeImg = document.createElement("img");
        closeImg.className = "hoverButtons";
        closeImg.src = chrome.extension.getURL("/img/Close.svg");
        closeImg.addEventListener('click', function(event) {
            event.stopPropagation();
            closeHoverBox();
        });
        var goToImg = document.createElement("img");
        goToImg.className = "hoverButtons";
        goToImg.src = chrome.extension.getURL("/img/GoToArrow.svg");
        goToImg.title = "click on div to jump to revision inside contentstack.built.io";
        goToImg.addEventListener('click', function() {
            event.stopPropagation();
            openRevision(editURL);
        });
        var spacerDiv = document.createElement('span');
        spacerDiv.className = "spacer";
        hoverbuttons.appendChild(closeImg);
        hoverbuttons.appendChild(spacerDiv);
        hoverbuttons.appendChild(goToImg);
        hoverDiv.appendChild(hoverbuttons);


        overlaydiv.addEventListener('click', function showHover() {
            if (hoverHTML !== null) {
                isInspectionSuspended = true;
                hoverDiv.insertBefore(hoverHTML, hoverbuttons);
                hoverDiv.style.animationName = "fadein"
                hoverDiv.style.animationDuration = "0.2s";
                hoverDiv.style.animationDirection = "ease-in";
                hoverDiv.style.display = 'block';

                hoverDiv.style.top = overlaydiv.offsetHeight - 5 + "px";
                hoverDiv.style.left = (overlaydiv.offsetWidth / 4) + "px";

                //set button location:
                hoverbuttons.style.top = hoverDiv.style.top + hoverDiv.style.height + "px";
            }
        });

        var messageDiv = document.createElement('div');
        messageDiv.id = "contentstack-message";
        document.body.appendChild(messageDiv);

    }

    chrome.runtime.sendMessage({ from: "script", action: "grabAuth" }, function(response) {
        if (response.success) {
            authToken = response.token;
            document.body.onmousemove = startInspection;

            var headerInfo = [];
            headerInfo.push({ 'key': 'Accept', 'value': 'application/json' });
            headerInfo.push({ 'key': 'authtoken', 'value': authToken });

            var request = 'https://api.contentstack.io/v3/stacks?include_collaborators=true&include_stack_variables=true';

            sendRequest(headerInfo, request, true, stackCallback);

        }
    });


    chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
        console.log("receiving message from background");
        if (message.from && message.from === "background") {
            switch (message.action) {
                case "suspendScript":
                    console.log("suspending script");
                    suspendInspection();
                    break;
            }
        }
    });
}

function closeHoverBox() {
    var hoverBox = document.getElementById("contentstack-hoverBox");
    hoverBox.style.display = 'none';
    document.getElementById("contentstack-entryInfo").remove();
    isInspectionSuspended = false;

}

function suspendInspection() {
    if (document.getElementById("contentstack-entryInfo") !== null) {
        closeHoverBox(); //call just to make sure hover box is closed.
    }
    var overlay = document.getElementById("contentstack-highlight");
    if (overlay !== null) {
        overlay.style.display = 'none';
    }
    isInspectionSuspended = true;
}

function startInspection(e) {
    if (!isInspectionSuspended && authToken) {
        var overlay = document.getElementById("contentstack-highlight");
        var hoverBox = document.getElementById("contentstack-hoverBox");
        if (e.target === cur) {
            return;
        }

        if (~no.indexOf(e.target) || e.target.id === "contentstack-message" || e.target.id === "contentstack-highlight") {
            cur = null;
            overlay.style.display = 'none';
            hoverBox.style.display = 'none';
            return;
        }

        cur = e.target;

        overlay.style.top = (cur.getBoundingClientRect().top + window.pageYOffset) + "px";
        overlay.style.left = (cur.getBoundingClientRect().left + window.pageXOffset) + "px";
        overlay.style.width = (cur.clientWidth) + "px";
        overlay.style.height = (cur.clientHeight) + "px";

        var entry_id;
        entry_id = findEntryID(cur);

        //set header information.
        if (stackData.current_stack && entry_id.contentTypeID && entry_id.entryId) {
            var headerInfo = [];
            headerInfo.push({ 'key': 'Accept', 'value': 'application/json' });
            headerInfo.push({ 'key': 'api_key', 'value': stackData.current_stack.api_key });
            headerInfo.push({ 'key': 'authtoken', 'value': authToken });

            // request = 'https://api.contentstack.io/v3/content_types/'+entry_id.contentTypeID+'/entries/'+entry_id.entryId;
            request = 'https://api.contentstack.io/v3/content_types/' + entry_id.contentTypeID + '/entries/' + entry_id.entryId;
            sendRequest(headerInfo, request, false, function(response) {
                var entry = response.entry;
                if (entry !== null && entry !== undefined) {
                    var version = response.entry._version;
                    var updatedBy = response.entry.updated_by;
                    var updatedAt = response.entry.updated_at;
                    setHoverEffect(response);
                }

            });
            overlay.style.display = 'block';
        } else {
            console.error("Cannot grab information or not supported by contentstack.");
            showMessage("error", "Not a Contentstack generated DOM element or Contentstack website does not support extension. See https://github.com/mihiramin89/contentstack-element-revision-chrome-extension for more information.");
        }
    }
}

function showMessage(className, message) {
    var messageDiv = document.getElementById("contentstack-message");
    messageDiv.className = className;
    messageDiv.innerText = message;
    messageDiv.style.display = 'block';
    timer = window.setTimeout(function() {
        messageDiv.className = '';
        clearTimeout(timer);
        timer = null;
    }, 3000);
}

function sendRequest(headerInfo, request, synchronous, onreadyStateChangeCallback) {
    xhr = new XMLHttpRequest();
    xhr.open("GET", request, synchronous);
    xhr.onreadystatechange = (function() {
        if (xhr.readyState == 4) {
            var resp = JSON.parse(xhr.responseText);
            onreadyStateChangeCallback(resp);
        }
    });
    headerInfo.forEach(function(item) {
        xhr.setRequestHeader(item.key, item.value);
    });
    xhr.send();
}

function stackCallback(response) {
    var stacks = response.stacks;

    stacks.forEach(function(stack) {
        var collaborators = grabCollaborators(stack.collaborators);
        grabEnvironments(stack, stackData, collaborators);
    });

    var current_stack_info = getCurrentStackKey(stackData);
    stackData["current_stack"] = current_stack_info.current_stack;
}

function getCurrentStackKey(stacks) {
    var tabURL = window.location.href;
    var foundURL = false;
    var stackKey;

    for (var i = 0; i < stacks.length; i++) {
        for (var j = 0; j < stacks[i].environments.length; j++) {
            var environment = stacks[i].environments[j];
            //ensure both urls end with '/' or not.
            if (tabURL.charAt(tabURL.length - 1) === '/' && environment.url.charAt(environment.url.length - 1) !== '/') {
                tabURL = tabURL.substr(0, tabURL.length - 1);
            } else if (tabURL.charAt(tabURL.length - 1) !== '/' && environment.url.charAt(environment.url.length - 1) === '/') {
                tabURL += '/';
            }
            if (tabURL === environment.url) {
                foundURL = true;
                break;
            }
        }
        if (foundURL) {
            stackKey = {
                "current_stack": {
                    "api_key": stacks[i].api_key,
                    "index": i
                }
            };
            break;
        }
    }
    return stackKey;
}

function grabEnvironments(stack, data, collaborators) {
    var headerInfo = [];
    headerInfo.push({ 'key': 'Accept', 'value': 'application/json' });
    headerInfo.push({ 'key': 'api_key', 'value': stack.api_key });
    headerInfo.push({ 'key': 'authtoken', 'value': authToken });
    var request = 'https://api.contentstack.io/v3/environments';

    var resultEnvironments = [];
    sendRequest(headerInfo, request, false, function(response) {
        response.environments.forEach(function(environment) {
            resultEnvironments.push({ "name": environment.name, "uid": environment.uid, "url": environment.urls[0].url });
        });
        return resultEnvironments;
    });
    data.push({ "name": stack.name, "api_key": stack.api_key, "collaborators": collaborators, "environments": resultEnvironments });

}

function grabCollaborators(collaborators) {
    var result = [];
    collaborators.forEach(function(user) {
        result.push({ "uid": user.uid, "email": user.email });
    });

    return result;
}

function setHoverEffect(response) {
    var index = stackData.current_stack.index;
    var updatedbyID = response.entry.updated_by;
    var updatedAt = new Date(response.entry.updated_at);
    var email;

    editURL = 'https://contentstack.built.io/#!/stack/' + stackData.current_stack.api_key + '/content-type/' + 'home' + '/en-us/entry/' + response.entry.uid + '/edit';

    for (var i = 0; i < stackData[index].collaborators.length; i++) {
        var collaborator = stackData[index].collaborators[i];
        if (updatedbyID === collaborator.uid) {
            email = collaborator.email;
            break;
        }
    }

    hoverHTML = document.createElement('div');
    hoverHTML.id = "contentstack-entryInfo";
    var innerText = '<span>Version: ' + response.entry._version + '</span><br /><span> Updated By: ' + email + ' </span><br /><span> Updated At: ' + updatedAt + '</span>';
    hoverHTML.innerHTML = innerText;
}

function openRevision(editURL) {
    if (editURL !== null) {
        window.open(editURL, "_blank");
    }
}

function findEntryID(element) {
    var result = {};
    var parent = element.parentNode;
    var node = parent.nodeName.toLowerCase();

    if (node !== "body") {
        while (node.toLowerCase() !== "section") {
            parent = parent.parentNode;
            node = parent.nodeName.toLowerCase();
            if (node === "body") {
                break; //don't go into infinite loop if we reach the body tag.'
            }
        }
    }

    if (parent.attributes.length > 1) {
        if (parent.attributes[0].name === "data-entry-id") {
            result = { "entryId": parent.attributes[0].value, "contentTypeID": parent.attributes[1].value };
        } else {
            result = { "entryId": parent.attributes[1].value, "contentTypeID": parent.attributes[0].value };
        }
    }
    return result;
}