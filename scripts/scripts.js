var cur;
var no = [document.body, document.documentElement, document];
var authToken = null;
var stackData = [];
var storedAllStacks = false;
var editURL = null;
var hoverHTML = null;
var timer = null;
var stacktimer = null;
var isInspectionSuspended = false;
init();

function generateHTMLDivs() {
    var overlaydiv = document.createElement("div");
    overlaydiv.id = "contentstack-highlight";
    document.body.appendChild(overlaydiv);

    var hoverDiv = document.createElement("div");
    hoverDiv.id = "contentstack-hoverBox";
    hoverDiv.title = "click div to see information about the revision";
    overlaydiv.appendChild(hoverDiv);

    var hoverbuttons = document.createElement("div");
    hoverbuttons.id = "contentstack-hoverbox-icons";

    var spacerDiv = document.createElement('span');
    spacerDiv.className = "spacer";

    var closeDiv = addImgButton("/img/Close.svg", "close hoverbox", closeHoverBox);
    hoverbuttons.appendChild(closeDiv);
    hoverbuttons.appendChild(spacerDiv);
    var gotoDiv = addImgButton("/img/GoToArrow.svg", "click on div to jump to revision inside contentstack.built.io", openRevision);
    hoverbuttons.appendChild(gotoDiv);
    hoverDiv.appendChild(hoverbuttons);

    overlaydiv.addEventListener('click', function() {
        //ISSUE: hoverHTML not flushed out until after the click. maybe delay the hover box?
        showHover(hoverDiv, hoverbuttons, this);
    });
}

function showHover(parent, childNode, overlay) {
    if (hoverHTML !== null) {
        isInspectionSuspended = true;
        parent.insertBefore(hoverHTML, childNode);
        parent.style.animationName = "fadein"
        parent.style.animationDuration = "0.2s";
        parent.style.animationDirection = "ease-in";
        parent.style.display = 'block';

        parent.style.top = overlay.offsetHeight - 5 + "px";
        parent.style.left = (overlay.offsetWidth / 4) + "px";

        //set button location:
        childNode.style.top = parent.style.top + parent.style.height + "px";
    }
}

function addImgButton(url, title, onclick) {
    var imgDiv = document.createElement("img");
    imgDiv.className = "hoverButtons";
    imgDiv.src = chrome.extension.getURL(url);
    imgDiv.title = title;
    imgDiv.addEventListener('click', function() {
        event.stopPropagation();
        onclick();
    });
    return imgDiv;
}

function init() {
    authToken = null;
    stackData = [];
    storedAllStacks = false;
    var divExists = document.getElementById("contentstack-highlight");
    if (divExists === null) {
        generateHTMLDivs();

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
        closeHoverBox(arg); //call just to make sure hover box is closed.
    }
    var overlay = document.getElementById("contentstack-highlight");
    if (overlay !== null) {
        overlay.style.display = 'none';
    }
    isInspectionSuspended = true;
}

function startInspection(e) {
    if (e.target.clientWidth === 0 && e.target.clientHeight === 0) {
        return;
    }
    if (e.target.id === "contentstack-highlight") {
        return;
    }

    if (!isInspectionSuspended && authToken) {
        var overlay = document.getElementById("contentstack-highlight");
        var hoverBox = document.getElementById("contentstack-hoverBox");
        if (e.target === cur) {
            return;
        }

        if (~no.indexOf(e.target) || e.target.id === "contentstack-message") {
            cur = null;
            overlay.style.display = 'none';
            hoverBox.style.display = 'none';
            return;
        }

        if (!storedAllStacks) {
            return; //still gathering stack data. do nothing.
        }
        cur = e.target;

        var entry_id;
        entry_id = findEntryID(cur);

        //set header information.
        if (stackData.current_stack && entry_id.contentTypeID && entry_id.entryId) {

            //only set hoverbox if we are in contentstack part of site.
            overlay.style.top = (cur.getBoundingClientRect().top + window.pageYOffset) + "px";
            overlay.style.left = (cur.getBoundingClientRect().left + window.pageXOffset) + "px";
            overlay.style.width = (cur.clientWidth) + "px";
            overlay.style.height = (cur.clientHeight) + "px";

            var headerInfo = [];
            headerInfo.push({ 'key': 'Accept', 'value': 'application/json' });
            headerInfo.push({ 'key': 'api_key', 'value': stackData.current_stack.api_key });
            headerInfo.push({ 'key': 'authtoken', 'value': authToken });

            // request = 'https://api.contentstack.io/v3/content_types/'+entry_id.contentTypeID+'/entries/'+entry_id.entryId;
            request = 'https://api.contentstack.io/v3/content_types/' + entry_id.contentTypeID + '/entries/' + entry_id.entryId;

            //TODO: make asynchronous.
            sendRequest(headerInfo, request, true, function(response) {
                var entry = response.entry;
                if (entry !== null && entry !== undefined) {
                    var version = response.entry._version;
                    var updatedBy = response.entry.updated_by;
                    var updatedAt = response.entry.updated_at;
                    setHoverEffect(response);
                    overlay.style.display = 'block';
                }
            });
        } else {
            console.error("Cannot grab information or not supported by contentstack.");
            //showMessage("error", "Not a Contentstack generated DOM element or Contentstack website does not support extension. See https://github.com/mihiramin89/contentstack-element-revision-chrome-extension for more information.");
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
    var xhr = new XMLHttpRequest();
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
        grabEnvironments(stack, collaborators);
        //console.log("DEBUG: grabbing environments for stack " + stack.name);
    });

    //TODO: create timer to wait to execute this code until stackData.length = response.stack.length
    // want to have all stacks so we can find current stack. 
    stacktimer = window.setInterval(function() {
        if (stackData.length === response.stacks.length) {
            var current_stack_info = getCurrentStackKey(stackData);
            stackData["current_stack"] = current_stack_info.current_stack;
            clearTimeout(stacktimer);
            stacktimer = null;
            storedAllStacks = true;
        }
    }, 300);

}

function grabEnvironments(stack, collaborators) {
    var headerInfo = [];
    headerInfo.push({ 'key': 'Accept', 'value': 'application/json' });
    headerInfo.push({ 'key': 'api_key', 'value': stack.api_key });
    headerInfo.push({ 'key': 'authtoken', 'value': authToken });
    var request = 'https://api.contentstack.io/v3/environments';

    var resultEnvironments = [];
    // TODO: make asynchronous calls
    sendRequest(headerInfo, request, true, function(response) {
        response.environments.forEach(function(environment) {
            resultEnvironments.push({ "name": environment.name, "uid": environment.uid, "url": environment.urls[0].url });
        });
        stackData.push({ "name": stack.name, "api_key": stack.api_key, "collaborators": collaborators, "environments": resultEnvironments });
        console.log("DEBUG: Stack data length:  " + stackData.length);
        console.log("-----> " + stack.name);
        // return resultEnvironments;
    });
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

function openRevision() {
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