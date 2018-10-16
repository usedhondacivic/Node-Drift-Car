//IO
var socket = io();

//Key events
var keys=[];
keyPressed=function(){socket.emit("key press", keyCode);};
keyReleased=function(){socket.emit("key release", keyCode);};

function mousePressed() {
    socket.emit("click", {x:mouseX, y:mouseY})
}

var carImage;

var setup = function() {
    createCanvas(document.body.clientWidth, window.innerHeight);
    imageMode(CENTER);
    carImage = loadImage("/images/cars/Sports.png");
}

var name = prompt("Please enter a name: ", "New Player");
if(name != null && name != ""){
    socket.emit("new player", name);
}

var trails = [];
socket.on("state", function(items){
    background(255, 255, 255);
    for(var i in trails){
        push();
        noStroke();
        fill(0, 0, 0, trails[i][2]*5);
        translate(trails[i][0], trails[i][1]);
        rotate(trails[i][3]);
        rect(-2.5, -1, 5, 2);
        noStroke();
        pop();
        trails[i][2]--;
        if(trails[i][2]<0){
            trails.splice(i,1);
        }
    }
    for (var id in items["players"]) {
        var player = items["players"][id];
        renderPlayer(player);
    }
    for (var id in items["walls"]) {
        var wall = items["walls"][id];
        renderWalls(wall);
    }
});

var renderPlayer = function(instance) {
    var tailLength = 15;
    if(instance.rightVel){
        if(Math.sqrt(Math.pow(instance.rightVel.x,2) + Math.pow(instance.rightVel.y,2)) > 3){
            trails.push([instance.corners.topRightWheel.x, instance.corners.topRightWheel.y, tailLength, instance.dir]);
	        trails.push([instance.corners.topLeftWheel.x, instance.corners.topLeftWheel.y, tailLength, instance.dir]);
	        trails.push([instance.corners.bottomRightWheel.x, instance.corners.bottomRightWheel.y, tailLength, instance.dir]);
	        trails.push([instance.corners.bottomLeftWheel.x, instance.corners.bottomLeftWheel.y, tailLength, instance.dir]);
        }
    }
    push();
        translate(instance.pos.x,instance.pos.y);
        rotate(instance.dir);
        noStroke();
        fill(instance.color[0],instance.color[1],instance.color[2]);
        rect(-15,-5,20,10);
        image(carImage, -(instance.backOffset - (instance.backOffset + instance.frontOffset)/2), 0);
    pop();
}

var renderWalls = function(instance) {
    stroke(255, 0, 0);
    strokeWeight(3);
    line(instance.x1, instance.y1, instance.x2, instance.y2);
}