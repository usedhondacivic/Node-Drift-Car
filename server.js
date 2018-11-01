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
			if(words[1] === "all"){
				for(var i in toSend["players"]){
					toSend["players"][i].accel = parseFloat(words[2]);
				}
				console.log("Acceleration was set for all players.");
			}
			else if(typeof parseFloat(words[2]) === "number"){
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

var leaderboard = [];

var spawns = [];
var spawnNumber = 0;

io.on("connection", function (socket) {
    console.log("a user connected");
    socket.on("new player", function(arg){
		var spawn = spawns[spawnNumber%spawns.length];
		spawnNumber++;
		if(!spawn){
			spawn = {x: 2300, y:2000};
		}
		//2300, 2000
		toSend["players"][socket.id] = new player(spawn.x, spawn.y, arg.name, socket.id, arg.color);
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
	updatePlayerPlacing();
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

//TODO: Get waypoints from illustrator layer, write function to get waypoint index for leaderboard.
var waypoints=[];

var parser = new xml2js.Parser();
fs.readFile(__dirname + '/client/images/circuits/test_circuit/SVG/vectors_MainBoard.svg', function(err, data) {
    parser.parseString(data, function (err, result) {
		for(var i in result.svg.g){
			if(result.svg.g[i].$.id === "Walls"){
				if(result.svg.g[i].polygon){
					for(var o in result.svg.g[i].polygon){
						var points = toPoints({type: 'polygon', points: result.svg.g[i].polygon[o].$.points.replace(/(\r\n\t|\n|\r\t|\t)/gm,"").trim()});
						for(var j = 1; j<points.length; j++){
							var start = points[j-1];
							var end = points[j];
							toSend["walls"].push(new wall(start.x, start.y, end.x, end.y));
						}
					}
				}
			}else if(result.svg.g[i].$.id === "Spawns"){
				if(result.svg.g[i].circle){
					for(var o in result.svg.g[i].circle){
						var circle = result.svg.g[i].circle[o].$;
						spawns.push({x: parseFloat(circle.cx), y: parseFloat(circle.cy)});
					}
				}
			}else if(result.svg.g[i].$.id === "Waypoints"){
				console.log(result.svg.g[i]);
				if(result.svg.g[i].polyline){
					for(var o in result.svg.g[i].polyline){
						var points = toPoints({type: 'polyline', points: result.svg.g[i].polyline[o].$.points.replace(/(\r\n\t|\n|\r\t|\t)/gm,"").trim()});
						for(var j = 0; j<points.length; j++){
							waypoints.push(points[j]);
						}
					}
				}
			}
		}
		for(var w in toSend["walls"]){
			toSend["walls"][w].setup();
		}
    });
});

var LEFT_ARROW = 37;
var RIGHT_ARROW = 39;
var UP_ARROW = 38;
var DOWN_ARROW = 40;

var trackMaskData;
var sandMaskData;

Jimp.read("./client/images/circuits/test_circuit/image/mask_MainBoard.png", function (err, image) {
	trackMaskData = image;
});
Jimp.read("./client/images/circuits/test_circuit/image/sand_MainBoard.png", function (err, image) {
	sandMaskData = image;
});

var player=function(x, y, name, id, c){
	this.name = name;
	this.id = id;
	this.pos=new Vector(x, y);
	this.posBuffer=new Vector(0,0);
    this.vel=new Vector(0, 0);
	this.color=c;
	this.currentWaypoint=150;
	this.positionIndex=0;
	this.waypointLocation={};
	this.lap=0;
	this.place=0;
    this.sideFriction=0.96;
	this.forwardFriction=0.98;
	this.frictionMultiplier=1;
	this.rightVel=new Vector(0, 0);
	this.speed=0;
	//0.05
	this.accel=0.05;
	this.accelMultiplier=1;
	this.decel=0.87;
	this.decelMultiplier=1;
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
		this.updateWaypoint();
        this.speed*=this.decel*this.decelMultiplier;
        if(this.keys[UP_ARROW]){this.speed+=this.accel*this.accelMultiplier;}
        if(this.keys[DOWN_ARROW]){this.speed-=this.accel*this.accelMultiplier*0.5;}
        if(this.keys[LEFT_ARROW]){this.dir-=(this.turnSpeed*this.vel.length())/this.turnDamp;}
		if(this.keys[RIGHT_ARROW]){this.dir+=(this.turnSpeed*this.vel.length())/this.turnDamp;}
		//this.color++;
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
		var past = false;
		for(var i in toSend["players"]){
			var otherCar = toSend["players"][i];
			if(otherCar === this){
				past = true;
				//console.log("Past: "+past);
				return;
			}
			if(!past){
				//return;
			}
			//console.log("Past test: "+past)
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
			this.accelMultiplier = 1;
			this.decelMultiplier = 1;
		}else if(Jimp.intToRGBA(sandMaskData.getPixelColor(Math.round(this.pos.x), Math.round(this.pos.y))).a !== 0){
			this.frictionMultipler = 1;
			this.accelMultiplier = 0.7;
			this.decelMultiplier = 0.9;
		}
		else{
			this.frictionMultiplier = 0.95;
			this.accelMultiplier = 1;
			this.decelMultiplier = 1;
		}
	}
	this.updateWaypoint=function(){
		//console.log(this.place);
		var close = findClosestWaypoint(this.pos);
		this.waypointLocation = waypoints[this.currentWaypoint];
		this.positionIndex = this.lap * waypoints.length + this.currentWaypoint;
		//console.log("Current: "+this.currentWaypoint+" Close: "+close+" Last: "+  (waypoints.length-1) + " Check 1: "+(this.currentWaypoint === (waypoints.length-1)));
		if(this.currentWaypoint == (waypoints.length-1) && close < 5){
			this.lap++;
			this.currentWaypoint = close;
		}else{
			if(Math.abs(close - this.currentWaypoint) < 5){
				this.currentWaypoint = close;
			}
		}
	}
};

var updatePlayerPlacing = function(){
	/*var playersCopy = toSend["Players"];
	playersCopy.sort(function(a,b){
		(a.lap*waypoints.length + a.currentWaypoint) - (b.lap*waypoints.length + b.currentWaypoint);
	});
	for(var o in playersCopy){
		var p = playersCopy[o];
		leaderboard = [];
		leaderboard.push({
			name: p.name,
			lap: p.lap
		});
	}*/
	for(var i in toSend["players"]){
		var p1 = toSend["players"][i];
		p1.place = Object.keys(toSend["players"]).length;
		for(var o in toSend["players"]){
			if(i == o){
				return;
			}
			console.log(p1.place);
			var p2 = toSend["players"][o];
			if(p1.positionIndex > p2.positionIndex){
				p1.place--;
			}
		}
	}
}

function findClosestWaypoint(pos){
	var lowestDistance = Infinity;
	var index = -1;
	for(var i in waypoints){
		var w = waypoints[i];
		var v = new Vector(pos.x - w.x, pos.y - w.y);
		if(v.length() < lowestDistance){
			lowestDistance = v.length();
			index = i;
		}
	}
	return index;
}

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