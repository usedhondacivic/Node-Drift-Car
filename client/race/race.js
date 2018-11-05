/*if(sessionStorage.getItem("setup") == "false"){
    window.location.replace("../");
}*/

window.onbeforeunload = function(){
    sessionStorage.setItem('nickname', "");
    sessionStorage.setItem('setup', "false");
    print("hit");
}

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
var trackImage;
var sandImage;
var trip = false;

var setup = function() {
    background(217, 255, 160);
    var cnv = createCanvas(document.body.clientWidth, window.innerHeight);
    cnv.position(0,0);
    carImage = loadImage("/images/cars/Sports/Sports.png");
    carMask = loadImage("/images/cars/Sports/Sports_Mask.png");
    //carImage = loadImage("/images/cars/Truck/Truck.png");
    //carMask = loadImage("/images/cars/Truck/Truck_Mask.png");
    //carImage = loadImage("/images/cars/Ambulance/Ambulance.png");
    //carMask = loadImage("/images/cars/Ambulance/Ambulance_Mask.png");
    trackImage = loadImage("/images/circuits/test_circuit/image/mask_MainBoard.png");
    sandImage = loadImage("/images/circuits/test_circuit/image/sand_MainBoard.png");
}

function windowResized() { resizeCanvas(document.body.clientWidth, window.innerHeight); }

var name = sessionStorage.getItem("nickname");
//if(name != null && name != "" && name.length < 100){     
    socket.emit("new player", {name:name, color: Math.random()*100});
//}else{
    //alert("That name isn't valid. Refresh to try again. Names cannot be empty and must be under 100 characters");
//}

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
    image(sandImage, 0, 0, sandImage.width, sandImage.height);
    image(trackImage, 0, 0, trackImage.width, trackImage.height);
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
    for (var id in items["players"]) {
        if(id === socket.id){
            renderHUD(items["players"][id], Object.keys(items["players"]).length);
        }
    }
});

var renderPlayer = function(instance) {
    var tailLength = 15;
    /*fill(255,0,0);
    noStroke();
    ellipse(instance.waypointLocation.x, instance.waypointLocation.y, 10, 10);*/
    if(instance.rightVel){
        if(Math.sqrt(Math.pow(instance.rightVel.x,2) + Math.pow(instance.rightVel.y,2)) > 5){
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
        tint(instance.color%100, 40, 100, 100);
        //tint(instance.color, 0, 100, 100);
        image(carMask, -(instance.backOffset - (instance.backOffset + instance.frontOffset)/2), 0);
        noTint();
        colorMode(RGB, 255);
    pop();
}

var renderWalls = function(instance) {
    stroke(255,255,255);
    strokeWeight(3);
    line(instance.x1, instance.y1, instance.x2, instance.y2);
}

var renderHUD = function(instance, carNum) {
    push();
    fill(0,0,0);
    var raceMinutes = Math.floor(instance.time.toFixed(2) / 60);
    var raceSeconds = (instance.time%60).toFixed(2).toString().replace(".",":");
    var lapMinutes = Math.floor(instance.lapTime.toFixed(2) / 60);
    var lapSeconds = (instance.lapTime%60).toFixed(2).toString().replace(".",":");
    //Position
    textSize(15);
    textAlign(LEFT, BOTTOM);
    text("Position:", 40, 50);
    textSize(40);
    textAlign(LEFT, TOP);
    text((instance.place.toString().length>1?"":"0")+instance.place+"/", 40, 50);
    textSize(25);
    text((carNum.toString().length>1?"":"0")+carNum, 100, 63);
    //Lap
    textSize(15);
    textAlign(RIGHT, BOTTOM);
    text("Lap:", width - 95, 50);
    textSize(40);
    textAlign(RIGHT, TOP);
    text(((instance.lap.toString().length>1 && instance.lap != -1)?"":"0")+(instance.lap>=0?instance.lap.toString():"0")+"/", width - 70, 50);
    textSize(25);
    text("03", width - 40, 63);
    //Time
    textSize(15);
    textAlign(RIGHT, BOTTOM);
    text("Time:", width - 105, 130);
    textSize(25);
    textAlign(RIGHT, TOP);
    text((raceMinutes.toString().length>1?"":"0")+raceMinutes+":"+(raceSeconds.toString().length>4?"":"0")+raceSeconds, width - 40, 130);
    //Lap Time
    textSize(15);
    textAlign(RIGHT, BOTTOM);
    text("Lap:", width - 105, 160);
    textSize(25);
    textAlign(RIGHT, TOP);
    text((lapMinutes.toString().length>1?"":"0")+lapMinutes+":"+(lapSeconds.toString().length>4?"":"0")+lapSeconds, width - 40, 160);

    textAlign(RIGHT, TOP);
    text("Lap: "+(instance.lap>=0?instance.lap:0), 300, height - 100);
    //text("Time: "+(minutes.toString().length>1?"":"0")+minutes+":"+(seconds.toString().length>4?"":"0")+seconds, width - 40, 170);
    pop();
}