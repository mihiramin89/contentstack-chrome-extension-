var cur;

var divExists = document.getElementById("highlight");
if(divExists === null){
    var overlaydiv = document.createElement("div");
    overlaydiv.id = "highlight";
    document.body.appendChild(overlaydiv);
    var hoverDiv = document.createElement("div");
    hoverDiv.className = "hoverBox";
    var internalDiv = document.createElement("div");
    internalDiv.className = "hoverBox-internal";
    overlaydiv.appendChild(internalDiv);
    overlaydiv.appendChild(hoverDiv);
}

var no = [document.body, document.documentElement, document];

document.body.addEventListener("mousemove", function(e) {

    var overlay = document.getElementById("highlight");
    var hoverBox = document.getElementsByClassName("hoverBox")[0];
    var hoverText = document.getElementsByClassName("hoverBox-internal")[0];
    if (e.target === cur) {
        return;
    }

    if (~no.indexOf(e.target)) {
        cur = null;
        overlay.style.display = 'none';
        hoverBox.style.display = 'none';
        return;
    }

    var target = e.target;
    var offsetTop = target.getBoundingClientRect().top + window.pageYOffset;
    var offsetLeft = target.getBoundingClientRect().left + window.pageXOffset;
    var width = target.clientWidth;
    var height = target.clientHeight;

    cur = e.target;

    overlay.style.top = offsetTop + "px";
    overlay.style.left = offsetLeft + "px";
    overlay.style.width = width + "px";
    overlay.style.height = height + "px";


    var tagInfo = e.target.nodeName.toLowerCase();
    var targetClassName = e.target.className;
    var targetID = e.target.id;
    if(targetClassName !== null && targetClassName !== undefined && targetClassName !== ""){
        tagInfo += "." + targetClassName;
    }
    if(targetID !== null && targetID !== undefined && targetID !== "") {
        tagInfo += "#" + targetID;
    }
    
    hoverBox.innerHTML = tagInfo;

});