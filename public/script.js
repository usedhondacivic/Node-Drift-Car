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
    for(var i in instance.wheelTrails){
        for(var o=0; o<instance.wheelTrails[i].length; o++){
            if(o+1 < instance.wheelTrails[i].length){
                push();
                noStroke();
                fill(0, 0, 0, instance.wheelTrails[i][o][2]*5);
                translate(instance.wheelTrails[i][o][0], instance.wheelTrails[i][o][1]);
                rotate(instance.wheelTrails[i][o][3]);
                rect(-2.5, -1, 5, 2);
                noStroke();
                pop();
            }
        }
    }
    push();
        translate(instance.pos.x,instance.pos.y);
        rotate(instance.dir);
        noStroke();
        fill(instance.color[0],instance.color[1],instance.color[2]);
        rect(-15,-5,20,10);
    pop();
    strokeWeight(5);
    stroke(255,0,0);
    point(instance.corners.topRight.x, instance.corners.topRight.y);
    stroke(0,0,255);
    point(instance.corners.topLeft.x, instance.corners.topLeft.y);
    stroke(0,255,0);
    point(instance.corners.bottomRight.x, instance.corners.bottomRight.y);
    stroke(255, 255,0);
    point(instance.corners.bottomLeft.x, instance.corners.bottomLeft.y);
    //line(instance.corners.topRight.x, instance.corners.topRight.y, instance.corners.topLeft.x, instance.corners.topLeft.y);
}

var renderBullet = function(instance) {
    noStroke();
    fill(255,0,0);
    //rect(instance.x,instance.y,3,3);
}