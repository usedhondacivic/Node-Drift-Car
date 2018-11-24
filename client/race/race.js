if(sessionStorage.getItem("setup") == "false"){
    window.location.replace("../");
}

window.onbeforeunload = function(){
    sessionStorage.setItem('nickname', "");
    sessionStorage.setItem('setup', "false");
}

var chatbox;
var chatlog;

window.onload = function(){
    chatbox = document.getElementById("chatEntry");
    chatlog = document.getElementById("chatlog");
    chatbox.addEventListener("keyup", function(event) {
        event.preventDefault();
        if (event.keyCode === 13) {
            socket.emit("chat message", chatbox.value);
            chatbox.value="";
        }
    });
}

//IO
var socket = io();
var room = window.location.pathname.split("/");
room = room[room.length-1];

//Key events
var keys=[];
keyPressed=function(){socket.emit("key press", keyCode);};
keyReleased=function(){socket.emit("key release", keyCode);};

socket.on("toggleTrip", function(){
    trip = !trip;
});

socket.on("chat message", function(data){
    var newEntry = document.createElement("P");
    newEntry.innerHTML = "<span style='color: hsl("+data.color*3.6+", 100%, 40%);'>["+data.name+"]</span>: "+data.message;
    chatlog.appendChild(newEntry);
});

var carImage;
var carMask;
var trackImage;
var sandImage;
var trackPaths;
var trackSize;
var sandPaths;
var ctx;
var trackContainer;
var trip = false;
var countdown = -1;
var loaded = false;

function setup() {
    createCanvas(document.body.clientWidth, window.innerHeight);
    var c = document.getElementsByTagName("canvas")[0];
    ctx = c.getContext("2d");
    c.style.zIndex = "10";
    trackContainer = document.getElementById("track");
    socket.emit("request images");
}

function windowResized() { resizeCanvas(document.body.clientWidth, window.innerHeight); }

var name = sessionStorage.getItem("nickname");
if(name != null && name != "" && name != "null" && name.length < 100){     
    socket.emit("new player", {name:name, color: Math.random()*100, room:room, track:"Nürburgring Circuit"});
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

socket.on("images", function(images){
    carImage = loadImage("/images/cars/Sports/Sports.png");
    carMask = loadImage("/images/cars/Sports/Sports_Mask.png");
    //carImage = loadImage("/images/cars/Truck/Truck.png");
    //carMask = loadImage("/images/cars/Truck/Truck_Mask.png");
    //carImage = loadImage("/images/cars/Ambulance/Ambulance.png");
    //carMask = loadImage("/images/cars/Ambulance/Ambulance_Mask.png");
    trackContainer.setAttribute("src", images.track);
    loaded = true;
});

var trails = [];

socket.on("state", function(items){
    if(!loaded){
        return;
    }
    document.getElementById("loading").style.display = "none";
    if(trip){
        background(217, 255, 160, 20);
    }else{
        ctx.clearRect(0,0,width,height);
    }
    push();
    followCamera.update(0.08);
    trackContainer.style.left = (-followCamera.x + width / 2)+"px";
    trackContainer.style.top = (-followCamera.y + height / 2)+"px";
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
    for (var id in items["players"]) {
        textSize(20);
        textAlign(LEFT, TOP);
        text(items["players"][id].place+". "+items["players"][id].name, 40, 100+(items["players"][id].place-1)*22);
        if(id === socket.id){
            renderHUD(items["players"][id], Object.keys(items["players"]).length);
        }
    }
    for(var id in items["spectators"]){
        var s = items["spectators"][id];
        if(id === socket.id){
            followCamera.pos = s.pos;
            if(s.following){
                renderHUD(items["players"][s.followID], Object.keys(items["players"]).length);
            }
            textSize(15);
            textAlign(CENTER, BOTTOM);
            text("You are currently spectating. You can join the game once a spot opens up. You are currently "+(s.readyToJoin?"READY":"NOT READY")+" to join (ENTER to toggle).", width/2, height-60);
        }
    }
});

socket.on("countdown", function(){
    countdown = 3;
    setTimeout(function(){
        countdown = 2;
    }, 1000);
    setTimeout(function(){
        countdown = 1;
    }, 2000);
    setTimeout(function(){
        countdown = 0;
    }, 3000);
    setTimeout(function(){
        countdown = -1;
    }, 4000);
});

socket.on("alert", function(message){
    alert(message);
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
        textAlign(CENTER, BOTTOM);
        textSize(9);
        textFont("Sans Serif");
        text(instance.name, 0, -20);
        rotate(instance.dir);
        imageMode(CENTER);
        noStroke();
        image(carImage, -(instance.backOffset - (instance.backOffset + instance.frontOffset)/2), 0);
        colorMode(HSB, 100);
        tint(instance.color%100, 40, 100, 100);
        image(carMask, -(instance.backOffset - (instance.backOffset + instance.frontOffset)/2), 0);
        noTint();
        colorMode(RGB, 255);
    pop();
};

var renderWalls = function(instance) {
    stroke(255,255,255);
    strokeWeight(3);
    line(instance.x1, instance.y1, instance.x2, instance.y2);
};

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
    text("Lap:", width - 105, 180);
    textSize(25);
    textAlign(RIGHT, TOP);
    if(instance.lap != -1){
        text((lapMinutes.toString().length>1?"":"0")+lapMinutes+":"+(lapSeconds.toString().length>4?"":"0")+lapSeconds, width - 40, 180);
    }else{
        text("00:00:00", width - 40, 180);
    }
    //Lap Splits
    for(var i in instance.splits){
        lapMinutes = Math.floor(instance.splits[i].toFixed(2) / 60);
        lapSeconds = (instance.splits[i]%60).toFixed(2).toString().replace(".",":");
        textSize(20);
        textAlign(RIGHT, TOP);
        text((lapMinutes.toString().length>1?"":"0")+lapMinutes+":"+(lapSeconds.toString().length>4?"":"0")+lapSeconds, width - 40, 210+(instance.splits.length-i-1)*22);
    }
    //Countdown
    textSize(150);
    textAlign(CENTER, CENTER);
    if(countdown>0){
        text(countdown, width/2, height/2);
    }else if(countdown == 0){
        text("GO!", width/2, height/2);
    }
    pop();
};