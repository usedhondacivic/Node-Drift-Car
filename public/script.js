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
                noStroke();
                fill(0, instance.wheelTrails[i][o][2]*5);
                push();
                translate(instance.wheelTrails[i][o][0], instance.wheelTrails[i][o][1]);
                rotate(instance.wheelTrails[i][o][3]);
                rect(-2.5, -1, 5, 2);
                noStroke();
                pop();
            }
        }
    }
    noStroke();
    fill(instance.color[0],instance.color[1],instance[2]);
    push();
        translate(instance.pos.x,instance.pos.y);
        rotate(instance.dir);
        rect(-15,-5,20,10);
    pop();
    text(instance.pos.dir, instance.pos.x, instance.pos.y-10);
}

var renderBullet = function(instance) {
    noStroke();
    fill(255,0,0);
    //rect(instance.x,instance.y,3,3);
}