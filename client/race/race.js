//IO
var socket = io();

//Key events
var keys=[];
keyPressed=function(){socket.emit("key press", keyCode);};
keyReleased=function(){socket.emit("key release", keyCode);};

socket.on("toggleTrip", function(set){
    trip = !trip;
});

var carImage;
var carMask;
var trackMask;
var trip = false;

var setup = function() {
    background(217, 255, 160);
    var cnv = createCanvas(document.body.clientWidth, window.innerHeight);
    cnv.position(0,0);
    carImage = loadImage("/images/cars/Sports/Sports.png");
    carMask = loadImage("/images/cars/Sports/Sports_Mask.png");
    trackMask = loadImage("/images/circuits/4x/Track@4x.png");
}

function windowResized() { resizeCanvas(document.body.clientWidth, window.innerHeight); }

var name = prompt("Please enter a name: ", "New Player");
if(name != null && name != "" && name.length < 100){     
    socket.emit("new player", {name:name, color: Math.random()*100});
}else{
    alert("That name isn't valid. Refresh to try again. Names cannot be empty and must be under 100 characters");
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
    if(trip){
        background(217, 255, 160, 20);
    }else{
        background(217, 255, 160);
    }
    push();
    followCamera.update(0.08);
    translate(-followCamera.x + width / 2, -followCamera.y + height / 2);
    image(trackMask, 0, 0, trackMask.width, trackMask.height);
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
        fill(0,0,0, 200);
        textAlign(CENTER);
        textSize(9);
        textFont("Sans Serif");
        text(instance.name, 0, -20);
        rotate(instance.dir);
        imageMode(CENTER);
        noStroke();
        image(carImage, -(instance.backOffset - (instance.backOffset + instance.frontOffset)/2), 0);
        colorMode(HSB, 100);
        tint(instance.color, 50, 100, 100);
        image(carMask, -(instance.backOffset - (instance.backOffset + instance.frontOffset)/2), 0);
        noTint();
        colorMode(RGB, 255);
    pop();
}

var renderWalls = function(instance) {
    stroke(0,0,0);
    strokeWeight(3);
    line(instance.x1, instance.y1, instance.x2, instance.y2);
}