var editURL = null;
var hoverHTML = null;
var timer = null;


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

function closeHoverBox() {
    var hoverBox = document.getElementById("contentstack-hoverBox");
    hoverBox.style.display = 'none';
    document.getElementById("contentstack-entryInfo").remove();
    isInspectionSuspended = false;

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