//IO
var socket = io();

//Key events
var keys=[];
keyPressed=function(){socket.emit("key press", keyCode);};
keyReleased=function(){socket.emit("key release", keyCode);};

function mousePressed() {
    socket.emit("click", {x:mouseX, y:mouseY})
}

var setup = function() {
    createCanvas(document.body.clientWidth, window.innerHeight);
}

socket.emit("new player");
socket.on("state", function(items){
    background(255, 255, 255);
    for (var id in items["players"]) {
        var player = items["players"][id];
        renderPlayer(player);
    }
    for (var id in items["bullets"]) {
        var bullet = items["bullets"][id];
        renderBullet(bullet);
    }
});

var renderPlayer = function(instance) {
    noStroke();
    fill(0, 0, 0);
    rect(instance.x,instance.y,instance.width,instance.height);
}

var renderBullet = function(instance) {
    noStroke();
    fill(255,0,0);
    rect(instance.x,instance.y,3,3);
}