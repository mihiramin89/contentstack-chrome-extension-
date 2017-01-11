var stacktimer = null;

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