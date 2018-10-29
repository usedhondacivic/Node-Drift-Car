const util = require('util'); 
var express = require('express');
var app = express();
var Jimp = require('jimp');
const SVGPoints = require('svg-points');
const toPoints = SVGPoints.toPoints;
var xml2js = require('xml2js');
var server = require('http').Server(app);
const io = require('socket.io')(server);
var fs = require('fs');

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

app.use(express.static("bower_components"));
app.use(express.static("client"));
app.use(express.static("scripts"));

require("./scripts/vector.js")();

app.get(
    "/",
    function(req, res){
        res.sendFile(__dirname + "/client/race/race.html");
    }
);

app.get(
    "/gen",
    function(req, res){
        res.sendFile(__dirname + "/client/track_generator/trackgen.html")
    }
);

rl.on('line', (input) => {
	var words = input.split(":");
	switch(words[0]){
		case "ban":
			if(getPlayerIndexFromName(words[1]).length === 1){
				delete toSend["players"][getPlayerIndexFromName(words[1])];
				console.log("Banned user with name " + words[1]);
			}else if(toSend["players"][words[1]]){
				delete toSend["players"][words[1]];
				console.log("Banned user with id " + words[1]);
			}else if(getPlayerIndexFromName(words[1]).length > 1){
				console.log("Multiple players of that name. Please try again using one of the following IDs");
				for(var i in getPlayerIndexFromName(words[1])){
					console.log(toSend["players"][getPlayerIndexFromName(words[1])[i]].id);
				}
			}else{
				console.log("No players found from that name/id.");
			}
		break;
		case "list":
			for(var i in toSend["players"]){
				var p = toSend["players"][i];
				console.log(p.name+":");
				console.log("   ID: "+p.id);
			}
		break;
		case "trip":
			if(io.sockets.connected[words[1]]){
				io.sockets.connected[words[1]].emit("toggleTrip");
				console.log("Trip was toggled.");
			}else if(words[1] === "all"){
				io.emit("toggleTrip");
				console.log("Trip was toggled for all players.");
			}
			else{
				console.log("Couldn't find that socket.");
			}
		break;
		case "set acceleration":
			if(typeof parseFloat(words[2]) === "number"){
				if(toSend["players"][words[1]]){
					toSend["players"][words[1]].accel = parseFloat(words[2]);
					console.log("Acceleration was set.");	
				}else{
					console.log("Couldn't find a player on that socket.");
				}
			}else{
				console.log("Input: "+words[2]+" is not a number.");
			}
		break;
		case "set color":
			if(words[1] === "all"){
				for(var i in toSend["players"]){
					toSend["players"][i].color = Math.random() * 100;
					console.log("Color was randomized for all players.")
				}
			}else if(typeof parseFloat(words[2]) === "number"){
				if(toSend["players"][words[1]]){
					toSend["players"][words[1]].color = parseFloat(words[2]);
					console.log("Color was set.");	
				}else{
					console.log("Couldn't find a player on that socket.");
				}
			}else{
				console.log("Input: "+words[2]+" is not a number.");
			}
		break;
	}
});

var toSend={};
toSend["players"] = {};
toSend["walls"] = [];

io.on("connection", function (socket) {
    console.log("a user connected");
    socket.on("new player", function(arg){
		toSend["players"][socket.id] = new player(2300, 2000, arg.name, socket.id, arg.color);
    });
    
    socket.on("key press", function(arg){
        if( toSend["players"][socket.id]){
            toSend["players"][socket.id].keys[arg] = true;
        }
    });

    socket.on("key release", function(arg){
        if( toSend["players"][socket.id]){
            toSend["players"][socket.id].keys[arg] = false;
        }
    });

    socket.on("disconnect", function(){
        console.log("a user disconnected");
        delete toSend["players"][socket.id];
	});
});

setInterval(function(){
    for(var type in toSend){
        for(var id in toSend[type]){
			var obj = toSend[type][id];
			if(typeof obj.update === "function")
				obj.update();
        }
    }
    io.emit("state", toSend);
}, 1000/60);

server.listen(1234, function (err) {
    if (err) throw err
    console.log('Now listening on port 1234');
});


var wall=function(x1, y1, x2, y2){
	this.x1 = x1;
	this.y1 = y1;
	this.x2 = x2;
	this.y2 = y2;
	this.vec = new Vector();
	this.normal = new Vector();
	this.length = 0;
	this.angle = 0;
	this.setup=function(){
		this.vec = new Vector(this.x2 - this.x1, this.y2 - this.y1);
		this.length = this.vec.length();
		this.vec.normalize();
		this.angle = this.vec.toAngles();
		this.normal = new Vector(Math.cos(this.angle + Math.PI/2), Math.sin(this.angle + Math.PI/2));
		this.normal.normalize();
	}
}

/*createPolygon(new Vector(-400, -360), 4, 50, Math.PI/4, 0);
createPolygon(new Vector(-320, -320), 4, 30, -Math.PI/3, 0);
createPolygon(new Vector(-350, -350), 4, 200, Math.PI/6, 1);
createPolygon(new Vector(-700, -700), 6, 100, Math.PI/5, 1);
createPolygon(new Vector(-1500, -500), 3, 500, -Math.PI/7, 0);
createPolygon(new Vector(-800, -200), 20, 100, -Math.PI/3, 0);*/

var scale = 4;

const wallPath = {
	type: 'polygon',
	points: "478,208.1 560.7,291.8 595.9,305 664.3,315 1073.1,219.1 1097.3,226.8 1101.7,249.9 1090.7,272 926.5,261.5 838.4,285.2 773.3,315 698.4,319.4 309.4,263.7 241.1,268.7 156.3,299.5 118.8,356.8 112.2,393.2 118.8,456 167.3,523.2 274.2,566.2 1113.8,493.5 1486.3,490.2 1861,446.1 1875.3,457.1 1711.1,504.5 1653.8,550.8 1635.1,597 1638.4,689.6 1604.2,706.1 1186.6,670.9 1123.8,684.1 1038.9,780 683,717.2 608.1,589.2 535.3,550.8 272,579.4 194.8,584.9 147.5,545.2 112.2,471.4 112.2,342.5 135.3,309.4 457.1,194.8"
}

//TODO: parse the SVG data straight from the xml generated by Illustrator
var parser = new xml2js.Parser();
fs.readFile(__dirname + '/client/images/circuits/SVG/Walls.svg', function(err, data) {
    parser.parseString(data, function (err, result) {
        console.log(util.inspect(result.svg.g, false, null));
		console.log(util.inspect(result.svg.g[1].polygon[0].$.points.replace(/(\r\n\t|\n|\r\t|\t)/gm,""), false, null));
        console.log(util.inspect(result.svg.g[1].$.id, false, null));
        console.log('Done');
    });
});

var points = toPoints(wallPath);

for(var i = 1; i<points.length; i++){
	var start = points[i-1];
	var end = points[i];
	toSend["walls"].push(new wall(start.x*scale, start.y*scale, end.x*scale, end.y*scale));
}

for(var w in toSend["walls"]){
	toSend["walls"][w].setup();
}

var LEFT_ARROW = 37;
var RIGHT_ARROW = 39;
var UP_ARROW = 38;
var DOWN_ARROW = 40;

var trackMaskData;

Jimp.read("./client/images/circuits/4x/Track@4x.png", function (err, image) {
	trackMaskData = image;
    console.log(Jimp.intToRGBA(image.getPixelColor(200,200)));
});

var player=function(x, y, name, id, c){
	this.name = name;
	this.id = id;
	this.pos=new Vector(x, y);
	this.posBuffer=new Vector(0,0);
    this.vel=new Vector(0, 0);
    this.color=c;
    this.sideFriction=0.96;
	this.forwardFriction=0.98;
	this.frictionMultiplier=1;
	this.rightVel=new Vector(0, 0);
	this.speed=0;
	//0.05
    this.accel=0.05;
    this.decl=0.87;
	this.dir=0;
	//0.5
	this.turnSpeed=0.5;
	//80
    this.turnDamp=105;
	this.wheelTrails=[[],[],[],[]];
	this.dropTrack = 0;
	this.corners={
		topRight:{
			x:0,
			y:0
		},
		topLeft:{
			x:0,
			y:0
		},
		bottomRight:{
			x:0,
			y:0
		},
		bottomLeft:{
			x:0,
			y:0
		},
		topRightWheel:{
			x:0,
			y:0
		},
		topLeftWheel:{
			x:0,
			y:0
		},
		bottomRightWheel:{
			x:0,
			y:0
		},
		bottomLeftWheel:{
			x:0,
			y:0
		}
	};
	this.frontOffset=9;
	this.backOffset=19;
	this.sideOffset=10;
	this.wheelInset=3;
	this.keys=[];
	this.modifiers=[];
    this.update=function(){
		this.posBuffer=this.pos.clone();
        this.pos.add(this.vel);
        this.vel.add(new Vector(Math.cos(this.dir)*this.speed,Math.sin(this.dir)*this.speed));
		this.sideFriction(0.96 * this.frictionMultiplier, 0.98 * this.frictionMultiplier);
		this.collision();
        this.speed*=this.decl;
        if(this.keys[UP_ARROW]){this.speed+=this.accel;}
        if(this.keys[DOWN_ARROW]){this.speed-=this.accel*0.5;}
        if(this.keys[LEFT_ARROW]){this.dir-=(this.turnSpeed*this.vel.length())/this.turnDamp;}
		if(this.keys[RIGHT_ARROW]){this.dir+=(this.turnSpeed*this.vel.length())/this.turnDamp;}
    };
    this.sideFriction=function(sideFriction, forwardFriction){
		this.setFriction();
        var forward = new Vector(Math.cos(this.dir), Math.sin(this.dir));
        var right = new Vector(Math.cos(this.dir+Math.PI/2), Math.sin(this.dir+Math.PI/2));
        var forwardVelocity = new Vector();
        var rightVelocity = new Vector();
        forwardVelocity = forward.multiply(Vector.dot(this.vel, forward));
        forwardVelocity.multiply(forwardFriction);
        rightVelocity = right.multiply(Vector.dot(this.vel, right));
		this.vel = forwardVelocity.add(rightVelocity.multiply(sideFriction));
		this.setCorners(rightVelocity);
	};
	this.setCorners=function(rightVelocity){
		this.rightVel = rightVelocity;
		this.corners.bottomLeftWheel.x = this.pos.x + (this.sideOffset-this.wheelInset)*Math.sin(-this.dir) - (this.backOffset-this.wheelInset)*Math.cos(-this.dir);
		this.corners.bottomLeftWheel.y =  this.pos.y + (this.sideOffset-this.wheelInset)*Math.cos(-this.dir) + (this.backOffset-this.wheelInset)*Math.sin(-this.dir);
		this.corners.topLeftWheel.x = this.pos.x - (this.sideOffset-this.wheelInset)*Math.sin(-this.dir) - (this.backOffset-this.wheelInset)*Math.cos(-this.dir);
		this.corners.topLeftWheel.y = this.pos.y - (this.sideOffset-this.wheelInset)*Math.cos(-this.dir) + (this.backOffset-this.wheelInset)*Math.sin(-this.dir);
		this.corners.bottomRightWheel.x = this.pos.x + (this.sideOffset-this.wheelInset)*Math.sin(-this.dir) + (this.frontOffset-this.wheelInset)*Math.cos(-this.dir);
		this.corners.bottomRightWheel.y = this.pos.y + (this.sideOffset-this.wheelInset)*Math.cos(-this.dir) - (this.frontOffset-this.wheelInset)*Math.sin(-this.dir);
		this.corners.topRightWheel.x = this.pos.x - (this.sideOffset-this.wheelInset)*Math.sin(-this.dir) + (this.frontOffset-this.wheelInset)*Math.cos(-this.dir);
		this.corners.topRightWheel.y = this.pos.y - (this.sideOffset-this.wheelInset)*Math.cos(-this.dir) - (this.frontOffset-this.wheelInset)*Math.sin(-this.dir);
		
		this.corners.bottomLeft.x = this.pos.x + this.sideOffset*Math.sin(-this.dir) - this.backOffset*Math.cos(-this.dir);
		this.corners.bottomLeft.y =  this.pos.y + this.sideOffset*Math.cos(-this.dir) + this.backOffset*Math.sin(-this.dir);
		this.corners.topLeft.x = this.pos.x - this.sideOffset*Math.sin(-this.dir) - this.backOffset*Math.cos(-this.dir);
		this.corners.topLeft.y = this.pos.y - this.sideOffset*Math.cos(-this.dir) + this.backOffset*Math.sin(-this.dir);
		this.corners.bottomRight.x = this.pos.x + this.sideOffset*Math.sin(-this.dir) + this.frontOffset*Math.cos(-this.dir);
		this.corners.bottomRight.y = this.pos.y + this.sideOffset*Math.cos(-this.dir) - this.frontOffset*Math.sin(-this.dir);
		this.corners.topRight.x = this.pos.x - this.sideOffset*Math.sin(-this.dir) + this.frontOffset*Math.cos(-this.dir);
		this.corners.topRight.y = this.pos.y - this.sideOffset*Math.cos(-this.dir) - this.frontOffset*Math.sin(-this.dir);
	}
	this.collision=function(){
		for(var i in toSend["walls"]){
			var w = toSend["walls"][i];
			if(carLineCollision(this, w)){
				var lastPos = Vector.subtract(this.pos, this.vel);
				var reboundDirection = w.normal.clone();
				var parallelToWall = w.vec.clone();
				
				var intoWall = reboundDirection.multiply(Vector.dot(this.vel, reboundDirection));
				var parallelProjection = parallelToWall.multiply(Vector.dot(this.vel, w.vec));

				this.vel = parallelProjection.add(intoWall.multiply(-0.5));
				while(carLineCollision(this, w)){
					var velCopy = w.normal.clone();
					velCopy.normalize();
					if(Vector.cross(w.vec, Vector.subtract(new Vector(w.x1, w.y1), lastPos)) > 0){
						velCopy.multiply(-1);
					}
					this.pos.add(velCopy);
					this.setCorners(null);
				}
			}
		}
		var pastSelf = false;
		for(var i in toSend["players"]){
			var otherCar = toSend["players"][i];
			if(otherCar === this){
				return;
			}
			if(carCollision(this, otherCar)){
				var v1 = this.vel.clone();
				var x1 = this.pos.clone();
				var v2 = otherCar.vel.clone();
				var x2 = otherCar.pos.clone();
				var deltaX1 = Vector.subtract(x1, x2);
				var deltaV1 = Vector.subtract(v1, v2);
				var deltaX2 = Vector.subtract(x2, x1);
				var deltaV2 = Vector.subtract(v2, v1);
				var bufferTest = Vector.subtract(this.posBuffer, x2);
				if(deltaX1.length() == 0){
					return;
				}
				if(Math.abs(bufferTest.angleTo(deltaX1)) > Math.PI/2){
					x1 = this.posBuffer.clone();
					deltaX1 = Vector.subtract(x1, x2);
					deltaX2 = Vector.subtract(x2, x1);
				}
				this.vel = Vector.subtract(v1, Vector.multiply(deltaX1, Vector.dot(deltaV1, deltaX1)/Math.pow(deltaX1.length(), 2)));
				otherCar.vel = Vector.subtract(v2, Vector.multiply(deltaX2, Vector.dot(deltaV2, deltaX2)/Math.pow(deltaX2.length(), 2)));
				var distance = 0;
				while(carCollision(this, otherCar)){
					var velCopy = this.vel.clone();
					var otherVelCopy = otherCar.vel.clone();
					velCopy.divide(5);
					otherVelCopy.divide(5);
					distance += velCopy.length();
					this.pos.add(velCopy);
					otherCar.pos.add(otherVelCopy);
					this.setCorners(null);
					otherCar.setCorners(null);
					if(distance > 100){
						break;
					}
				}
			}
		}
	}
	this.setFriction=function(){
		if(Jimp.intToRGBA(trackMaskData.getPixelColor(Math.round(this.pos.x), Math.round(this.pos.y))).a !== 0){
			//console.log(Jimp.intToRGBA(trackMaskData.getPixelColor(Math.round(this.pos.x), Math.round(this.pos.y))));
			this.frictionMultiplier = 1;
		}else{
			this.frictionMultiplier = 0.95;
		}
	}
};

function carLineCollision(car, wall){
	return (doLineSegmentsIntersect(car.corners.topRight, car.corners.topLeft, {x:wall.x1, y:wall.y1}, {x:wall.x2, y:wall.y2}) || 
	doLineSegmentsIntersect(car.corners.topRight, car.corners.bottomRight, {x:wall.x1, y:wall.y1}, {x:wall.x2, y:wall.y2}) || 
	doLineSegmentsIntersect(car.corners.topLeft, car.corners.bottomLeft, {x:wall.x1, y:wall.y1}, {x:wall.x2, y:wall.y2}) || 
	doLineSegmentsIntersect(car.corners.bottomRight, car.corners.bottomLeft, {x:wall.x1, y:wall.y1}, {x:wall.x2, y:wall.y2}));
}

function carCollision(car1, car2){
	return (carLineCollision(car1, {x1:car2.corners.topRight.x, y1:car2.corners.topRight.y, x2:car2.corners.topLeft.x, y2:car2.corners.topLeft.y}) ||
	carLineCollision(car1, {x1:car2.corners.topRight.x, y1:car2.corners.topRight.y, x2:car2.corners.bottomRight.x, y2:car2.corners.bottomRight.y}) ||
	carLineCollision(car1, {x1:car2.corners.bottomLeft.x, y1:car2.corners.bottomLeft.y, x2:car2.corners.topLeft.x, y2:car2.corners.topLeft.y}) ||
	carLineCollision(car1, {x1:car2.corners.bottomRight.x, y1:car2.corners.bottomRight.y, x2:car2.corners.bottomLeft.x, y2:car2.corners.bottomLeft.y}));
}

function createPolygon(center, sides, size, angle, leaveOff){
	for(var i=1; i<=sides-leaveOff; i++){
		toSend["walls"].push(new wall(center.x + Math.cos(i * ((2 * Math.PI) / sides) + angle) * size, center.y + Math.sin(i * ((2 * Math.PI) / sides) + angle) * size, center.x + Math.cos((i - 1) * ((2 * Math.PI) / sides) + angle) * size, center.y + Math.sin((i - 1) * ((2 * Math.PI) / sides) + angle) * size));
	}
}

var getPlayerIndexFromName = function (name) {
	var users= [];
	for(var i in toSend["players"]){
		if(toSend["players"][i].name === name){
			users.push(i);
		}
	}
	return users;
}

var getPlayerIndexFromId = function (id) {
	var users= [];
	for(var i in toSend["players"]){
		if(toSend["players"][i].id === id){
			users.push(i);
		}
	}
	return users;
}

var generateID = function () {
	// Math.random should be unique because of its seeding algorithm.
	// Convert it to base 36 (numbers + letters), and grab the first 9 characters
	// after the decimal.
	return '_' + Math.random().toString(36).substr(2, 9);
};