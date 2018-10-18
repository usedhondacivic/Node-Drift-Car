//IO
var socket = io();

//Key events
var keys=[];
keyPressed=function(){socket.emit("key press", keyCode);};
keyReleased=function(){socket.emit("key release", keyCode);};

var carImage;

var setup = function() {
    background(255, 255, 255);
    var cnv = createCanvas(document.body.clientWidth, window.innerHeight);
    cnv.position(0,0);
    //canvas.style.left = "0px";
    //canvas.style.top="0px";
    imageMode(CENTER);
    carImage = loadImage("/images/cars/Sports.png");
}

var name = prompt("Please enter a name: ", "New Player");
if(name != null && name != ""){
    socket.emit("new player", name);
}

var followCamera = {
    x:0,
    y:0,
    pos:{
        x:0,
        y:0
    },
    update:function(per){
        this.x = lerp(this.x, this.pos.x, per);
        this.y = lerp(this.y, this.pos.y, per);
    }
};

var trails = [];
socket.on("state", function(items){
    background(255, 255, 255, 50);
    push();
    followCamera.update(0.08);
    translate(-followCamera.x + width / 2, -followCamera.y + height / 2);
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
        if(id === socket.id){
            followCamera.pos = items["players"][id].pos;
        }
        var player = items["players"][id];
        renderPlayer(player);
    }
    for (var id in items["walls"]) {
        var wall = items["walls"][id];
        renderWalls(wall);
    }
    pop();
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