var cur;

var overlaydiv = document.createElement("div");
overlaydiv.id = "highlight";
document.body.appendChild(overlaydiv);

var no = [document.body, document.documentElement, document];

document.body.addEventListener("mousemove", function(e) {

    var overlay = document.getElementById("highlight");
    if (e.target === cur) {
        return;
    }

    if (~no.indexOf(e.target)) {
        cur = null;
        overlay.style.display = 'none';
        return;
    }

    var target = e.target;
    var offsetTop = target.offsetTop;
    var offsetLeft = target.offsetLeft;
    var width = target.clientWidth;
    var height = target.clientHeight;

    cur = e.target;

    overlay.style.top = e.clientY + "px";
    overlay.style.left = e.clientX + "px";
    overlay.style.width = width + "px";
    overlay.style.height = height + "px";
});