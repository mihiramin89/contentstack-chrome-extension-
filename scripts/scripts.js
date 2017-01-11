var cur;
var no = [document.body, document.documentElement, document];

init();

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