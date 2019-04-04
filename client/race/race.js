if(sessionStorage.getItem("setup") == "false"){
    window.location.replace("../");
    redirect = true;
}

window.onbeforeunload = function(){
    //if(!backToServer){
    sessionStorage.setItem('setup', "false");
    //}
}

var chatbox;
var chatlog;
var chatContainer;
var backToServer = false;
var redirect = false;

window.onload = function(){
    chatbox = document.getElementById("chatEntry");
    chatlog = document.getElementById("chatlog");
    chatContainer = document.getElementById("chatContainer");
    chatbox.addEventListener("keyup", function(event) {
        event.preventDefault();
        if (event.keyCode === 13) {
            if(chatbox.value != ""){
                socket.emit("chat message", chatbox.value);
            }
            chatbox.value="";
        }
    });
    chatbox.addEventListener("focus", function(event) {
        chatlog.style.maxHeight = "400px";
        chatlog.scrollTop = chatlog.scrollHeight;
    });
    chatbox.addEventListener("focusout", function(event) {
        chatlog.style.maxHeight = "200px";
        chatlog.scrollTop = chatlog.scrollHeight;
    });
    window.addEventListener("keydown", function(e) {
        // space and arrow keys
        if([37, 38, 39, 40].indexOf(e.keyCode) > -1) {
            e.preventDefault();
        }
    }, false);
    chatlog.style.paddingRight = chatlog.offsetWidth - chatlog.clientWidth + "px";
}

//IO
var socket = io("/");
var room = window.location.pathname.split("/");
try{
   room = decodeURI(room[room.length-1]);
}catch(e){
    console.log(e);
}

//Key events
var keys=[];
keyPressed=function(){socket.emit("key press", keyCode);};
keyReleased=function(){socket.emit("key release", keyCode);};

socket.on("toggleTrip", function(){
    trip = !trip;
});

socket.on("chat message", function(data){
    var newEntry = document.createElement("P");
    newEntry.innerHTML = "<span style='color: hsl("+data.color*3.6+", 100%, 40%);'>"+(data.spectator?"(Spectator)":"")+"["+data.name+"]</span>: "+data.message;
    chatlog.appendChild(newEntry);
    chatlog.scrollTop = chatlog.scrollHeight;
});

socket.on("set owner", function(arg){
    isOwner = arg;
});

var carImage;
var carMask;
var ctx;
var trackContainer;
var showHUD = true;
var trip = false;
var countdown = -1;
var loaded = false;
var isOwner = false;

var sounds = {
    cars:{
        "4Runner":{
            "startups":{
                files:["/sound/4Runner_start.mp3", "/sound/4Runner_start_2.mp3"],
                sounds:[]
            },
            "idle loops":{
                files:["/sound/4Runner_idle_loop.mp3", "/sound/4Runner_idle_loop_2.mp3"],
                sounds:[]
            },
            "rev loops":{
                files:["/sound/4Runner_rev_loop.mp3", "/sound/4Runner_rev_loop_2.mp3"],
                sounds:[]
            },
            "rev up":{
                files:["/sound/4Runner_rev_up.mp3"],
                sounds:[]
            },
            "rev down":{
                files:["/sound/4Runner_rev_down.mp3"],
                sounds:[]
            },
        }
    },

    players:{},

    load : function(){
        for(var car in this.cars){
            for(var type in this.cars[car]){
                for(var i in this.cars[car][type].files){
                    var fileDir = this.cars[car][type].files[i];
                    this.cars[car][type].sounds.push(loadSound(fileDir));
                }
            }
        }
    },

    addPlayers : function(players){
        for(var id in players){
            if(this.players[id] != null){
                this.players[id].active = true;
            }else{
                this.players[id] = new playerSoundController("4Runner");
                this.players[id].setup();
            }
        }
        for(var i in this.players){
            if(!this.players[i].active){
                delete this.players[i];
            }else{
                this.players[i].active = false;
            }
        }
    },
};

var playerSoundController = function(carName){
    this.active = true;
    this.car = carName;
    this.sounds = sounds.cars[carName];
    this.currentState = "none";
    this.currentLoop = "none";

    this.setup = function(){
        this.sounds["startups"].sounds[0].onended(() => {
            //this.sounds["startups"].sounds[0].stop();
            this.sounds["idle loops"].sounds[0].loop();
            this.currentState = "none";
            this.currentLoop = "idle loops";
        });

        
        this.sounds["rev up"].sounds[0].onended(() => {
            //this.sounds["rev up"].sounds[0].stop();
            this.sounds["rev loops"].sounds[0].loop();
            this.currentState = "none";
            this.currentLoop = "rev loops";
        });

        
        this.sounds["rev down"].sounds[0].onended(() => {
            //this.sounds["rev down"].sounds[0].stop();
            this.sounds["idle loops"].sounds[0].loop();
            this.currentState = "none";
            this.currentLoop = "idle loops";
        });
    }
    this.update = function(){
        if(this.currentState == "startups"){
            this.sounds["startups"].sounds[0].play();
            this.currentLoop = "none";
        }

        if(this.currentState == "rev up"){
            this.sounds["rev up"].sounds[0].play();
            this.currentLoop = "none";
        }

        if(this.currentState == "rev down"){
            this.sounds["rev down"].sounds[0].play();
            this.currentLoop = "none";
        }
    }
    this.setState = function(newState){
        if(this.currentState != "none"){
            this.sounds[this.currentState].sounds[0].stop();
        }

        if(this.currentLoop != "none"){
            this.sounds[this.currentLoop].sounds[0].stop();
        }

        this.currentState = newState;
    }
};

function preload() {
    sounds.load();
}

function setup() {
    createCanvas(document.body.clientWidth, window.innerHeight);
    var c = document.getElementsByTagName("canvas")[0];
    ctx = c.getContext("2d");
    c.style.zIndex = "10";
    trackContainer = document.getElementById("track");
    var name = sessionStorage.getItem("nickname");
    var car = sessionStorage.getItem("car");
    var color = sessionStorage.getItem("color");
    var track = sessionStorage.getItem("map");
    var players = sessionStorage.getItem("players");
    if(name != null && name != "" && name != "null" && name.length < 100 && car && color && !redirect){
        socket.emit("new player", {name:name, color: color, room:room, track:(track?track:"Mugello Circuit"), car:car, players:(players?players:10)});
    }
    socket.emit("request images");
}

function windowResized() { resizeCanvas(document.body.clientWidth, window.innerHeight); }

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
var walls = [];
var carImages = {};

socket.on("images", function(images){
    trackContainer.setAttribute("src", images.track);
    walls = images.walls;
    loadJSON("/images/cars/data.json", (response) => {
        var carData = response;
        for(var key in carData){
            var c = carData[key];
            carImages[key] = {
                base: loadImage((c.location + c.base).toString()),
                mask: loadImage((c.location + c.mask).toString())
            };
        }
        loaded = true;
    });
});

socket.on("state", function(items){
    if(!loaded){
        return;
    }
    if(!showHUD){
        chatContainer.style.visibility = "hidden";
    }else{
        chatContainer.style.visibility = "";
    }
    document.getElementById("loading").style.display = "none";
    if(trip){
        background(217, 255, 160, 2);
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
    sounds.addPlayers(items["players"]);
    for (var id in items["players"]) {
        if(id === socket.id){
            followCamera.pos = items["players"][id].pos;
        }
        var player = items["players"][id];
        sounds.players[id].update();
        if(player.effectIsNew){
            sounds.players[id].setState(player.currentSoundEffect);
        }
        renderPlayer(player);
    }
    for (var id in walls) {
        var wall = walls[id];
        renderWalls(wall);
    }
    pop();
    for (var id in items["players"]) {
        textSize(20);
        textAlign(LEFT, TOP);
        if(showHUD){
            text(items["players"][id].place+". "+items["players"][id].name, 40, 100+(items["players"][id].place-1)*22);
            if(id === socket.id){
                renderHUD(items["players"][id], Object.keys(items["players"]).length, items["gameData"].gameState);
            }
        }
    }
    for(var id in items["spectators"]){
        var s = items["spectators"][id];
        if(id === socket.id){
            followCamera.pos = s.pos;
            if(s.following && showHUD){
                renderHUD(items["players"][s.followID], Object.keys(items["players"]).length, "racing");
            }
            textSize(15);
            textAlign(CENTER, BOTTOM);
            if(showHUD){
                text("You are currently spectating. You can join the game once the current race ends, or a space opens up. You are currently "+(s.readyToJoin?"READY":"NOT READY")+" to join (CTRL to toggle).\nArrow keys to free move. Space to switch players.", width/2, height-60);
            }
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
    var tailLength = 10;
    fill(255,0,0);
    noStroke();
    //ellipse(instance.waypointLocation.x, instance.waypointLocation.y, 10, 10);
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
        if(showHUD){
            text(instance.name, 0, -20);
        }
        rotate(instance.dir);
        imageMode(CENTER);
        noStroke();
        image(carImages[instance.car].base, -(instance.backOffset - (instance.backOffset + instance.frontOffset)/2), 0);
        colorMode(HSB, 100);
        tint(instance.color%100, 40, 100, 100);
        image(carImages[instance.car].mask, -(instance.backOffset - (instance.backOffset + instance.frontOffset)/2), 0);
        noTint();
        colorMode(RGB, 255);
    pop();
};

var renderWalls = function(instance) {
    stroke(255,255,255);
    strokeWeight(3);
    line(instance.x1, instance.y1, instance.x2, instance.y2);
};

var renderHUD = function(instance, carNum, gameState) {
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
    //Room Owner
    textSize(15);
    textAlign(RIGHT, BOTTOM);
    if(isOwner){
        text("You are the room owner.\nPress [1] to start/end a race.\nPress [2] to add an AI", width - 60, height - 30);
    }
    //Game State
    if(gameState == "waiting"){
        textSize(15);
        textAlign(CENTER, BOTTOM);
        text("Waiting for room owner to start a race...", width/2, height-60);
    }
    pop();
};

function loadJSON(src, callback) {   
    var xobj = new XMLHttpRequest();
        xobj.overrideMimeType("application/json");
    xobj.open('GET', src, true);
    xobj.onreadystatechange = function () {
          if (xobj.readyState == 4 && xobj.status == "200") {
            callback(xobj.responseText);
          }
    };
    xobj.send(null);  
 };