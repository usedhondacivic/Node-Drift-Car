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
        res.sendFile(__dirname + "/client/start_menu/startmenu.html");
    }
);

app.get(
    "/race",
    function(req, res){
        res.sendFile(__dirname + "/client/race/race.html");
    }
);

app.get(
    "/race/:roomName",
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

var broadcastRoom = null;
rl.on('line', (input) => {
	var words = input.split(":");
	if(words[0] === "set room"){
		broadcastRoom = words[1];
		if(rooms[broadcastRoom]){
			console.log("Room set to "+words[1]+".");
			return;
		}else{
			console.log("Didn't find that room.");
		}
	}
	if(!rooms[broadcastRoom]){
		console.log("Please select a room to send to:");
		for(var r in rooms){
			console.log("     '"+rooms[r].name+"'");
		}
		if(Object.keys(rooms).length == 0){
			console.log("     No rooms found.")
		}
		return;
	}
	switch(words[0]){
		case "ban":
			if(rooms[broadcastRoom].players[words[1]]){
				rooms[broadcastRoom].removePlayer({id:words[1]});
				if(words[2]){
					io.sockets.connected[words[1]].emit("alert", words[2]);
				}
				console.log("Player banned.");	
			}else{
				console.log("Couldn't find a player on that socket.");
			}
		break;
		case "list":
			console.log("Players in room: "+rooms[broadcastRoom].name);
			for(var i in rooms[broadcastRoom].players){
				var p = rooms[broadcastRoom].players[i];
				console.log(p.name+":");
				console.log("   ID: "+p.id);
			}
		break;
		case "set owner":
			if(rooms[broadcastRoom].players[words[1]]){
				rooms[broadcastRoom].owner = words[1];
				console.log("Set owner of room '"+rooms[broadcastRoom].name+"' to player '"+rooms[broadcastRoom].players[words[1]].name+"'.");
			}else{
				console.log("Could find a player on that socket in the current room.")
			}
		break;
		case "get owner":
			console.log("Owner of room '"+rooms[broadcastRoom].name+"' is player '"+rooms[broadcastRoom].players[rooms[broadcastRoom].owner].name+"' on socket "+rooms[broadcastRoom].owner);
		break;
		case "trip":
			if(io.sockets.connected[words[1]]){
				io.sockets.connected[words[1]].emit("toggleTrip");
				console.log("Toggled trip.");
			}else if(words[1] === "all"){
				io.to(broadcastRoom).emit("toggleTrip");
				console.log("Toggled trip for all players.");
			}
			else{
				console.log("Couldn't find that socket.");
			}
		break;
		case "set acceleration":
			if(words[1] === "all"){
				for(var i in rooms[broadcastRoom].players){
					rooms[broadcastRoom].players[i].accel = parseFloat(words[2]);
				}
				console.log("Set acceleration for all players.");
			}
			else if(typeof parseFloat(words[2]) === "number"){
				if(rooms[broadcastRoom].players[words[1]]){
					rooms[broadcastRoom].players[words[1]].accel = parseFloat(words[2]);
					console.log("Set acceleration.");	
				}else{
					console.log("Couldn't find a player on that socket.");
				}
			}else{
				console.log("Input: "+words[2]+" is not a number.");
			}
		break;
		case "set color":
			if(words[1] === "all"){
				for(var i in rooms[broadcastRoom].players){
					rooms[broadcastRoom].players[i].color = Math.random() * 100;
					console.log("Color was randomized for all players.")
				}
			}else if(typeof parseFloat(words[2]) === "number"){
				if(rooms[broadcastRoom].players[words[1]]){
					rooms[broadcastRoom].players[words[1]].color = parseFloat(words[2]);
					console.log("Set color.");	
				}else{
					console.log("Couldn't find a player on that socket.");
				}
			}else{
				console.log("Input: "+words[2]+" is not a number.");
			}
		break;
		case "reset":
			rooms[broadcastRoom].spawnNumber = 0;
			for(var i in rooms[broadcastRoom].players){
				var spawn = rooms[broadcastRoom].spawns[rooms[broadcastRoom].spawnNumber%rooms[broadcastRoom].spawns.length];
				rooms[broadcast].spawnNumber++;
				if(!spawn){
					spawn = {x: 2300, y:2000};
				}
				rooms[broadcastRoom].players[i].pos = new Vector(spawn.x, spawn.y);
				rooms[broadcastRoom].players[i].reset();
			}
			console.log("Players reset.");
		break;
		case "start race":
			rooms[broadcastRoom].spawnNumber = 0;
			for(var i in rooms[broadcastRoom].players){
				var spawn = rooms[broadcastRoom].spawns[rooms[broadcastRoom].spawnNumber%rooms[broadcastRoom].spawns.length];
				rooms[broadcastRoom].spawnNumber++;
				if(!spawn){
					spawn = {x: 2300, y:2000};
				}
				rooms[broadcastRoom].raceStart = rooms[broadcastRoom].seconds;
				rooms[broadcastRoom].players[i].pos = new Vector(spawn.x, spawn.y);
				rooms[broadcastRoom].players[i].reset();
			}
			io.to(broadcastRoom).emit("countdown");
			setTimeout(function(){
				for(var i in rooms[broadcastRoom].players){
					rooms[broadcastRoom].players[i].startRace();
				}
				rooms[broadcastRoom].raceStart = rooms[broadcastRoom].seconds;
			}, 3000);
			console.log("Race started.");
		break;
		default:
			console.log("Command not recognized.");
		break;
	}
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

var circuitsPath = "./client/circuits";
var clientCircuitsPath = "/circuits";
var circuits={
	"Mugello Circuit":{
        location:"/mugello_circuit",
        track:"/image/mask_MainBoard.png",
		sand:"/image/sand_Mainboard.png",
		fullTrack:"/SVG/fulltrack_Mainboard.svg",
		svg:"/SVG/vectors_Mainboard.svg",
		records:"/data/records.json",
		maskScale:4,
		walls:[],
		spawns:[],
		waypoints:[],
	},
	"Nürburgring Circuit":{
		location:"/nurburgring_circuit",
        track:"/image/mask_MainBoard.png",
        sand:"/image/sand_Mainboard.png",
		fullTrack:"/SVG/fulltrack_Mainboard.svg",
		svg:"/SVG/vectors_Mainboard.svg",
		records:"/data/records.json",
		maskScale:4,
		walls:[],
		spawns:[],
		waypoints:[],
	}
}

async function loadCircuits(){
	console.log("Starting server...");
	for(var p in circuits){
		var c = circuits[p];
		var paths = {
			recordsPath: circuitsPath + c.location + c.records,
			trackPath: circuitsPath + c.location + c.track,
			sandPath: circuitsPath + c.location + c.sand,
			svgPath: circuitsPath + c.location + c.svg,
			fullTrackPath: circuitsPath + c.location + c.fullTrack
		};
		c.recordData = JSON.parse(fs.readFileSync(paths.recordsPath));
		console.log("["+p+"]: loaded record data.");
		c.trackData = await Jimp.read(paths.trackPath);
		console.log("["+p+"]: loaded track data.");
		c.sandData = await Jimp.read(paths.sandPath);
		console.log("["+p+"]: loaded sand data.");
		var parser = new xml2js.Parser();
		var data = fs.readFileSync(paths.svgPath);
		parser.parseString(data, (err, result) => {
			for(var i in result.svg.g){
				if(result.svg.g[i].$.id === "Walls"){
					if(result.svg.g[i].polygon){
						for(var o in result.svg.g[i].polygon){
							var points = toPoints({type: 'polygon', points: result.svg.g[i].polygon[o].$.points.replace(/(\r\n\t|\n|\r\t|\t)/gm,"").trim()});
							for(var j = 1; j<points.length; j++){
								var start = points[j-1];
								var end = points[j];
								c.walls.push(new wall(start.x, start.y, end.x, end.y));
							}
						}
					}
					if(result.svg.g[i].polyline){
						for(var o in result.svg.g[i].polyline){
							var points = toPoints({type: 'polyline', points: result.svg.g[i].polyline[o].$.points.replace(/(\r\n\t|\n|\r\t|\t)/gm,"").trim()});
							for(var j = 1; j<points.length; j++){
								var start = points[j-1];
								var end = points[j];
								c.walls.push(new wall(start.x, start.y, end.x, end.y));
							}
						}
					}
				}else if(result.svg.g[i].$.id === "Spawns"){
					if(result.svg.g[i].circle){
						for(var o in result.svg.g[i].circle){
							var circle = result.svg.g[i].circle[o].$;
							c.spawns.push({x: parseFloat(circle.cx), y: parseFloat(circle.cy)});
						}
					}
				}else if(result.svg.g[i].$.id === "Waypoints"){
					if(result.svg.g[i].polyline){
						for(var o in result.svg.g[i].polyline){
							var points = toPoints({type: 'polyline', points: result.svg.g[i].polyline[o].$.points.replace(/(\r\n\t|\n|\r\t|\t)/gm,"").trim()});
							for(var j = 0; j<points.length; j++){
								c.waypoints.push(points[j]);
							}
						}
					}
				}
			}
			for(var w in c.walls){
				c.walls[w].setup();
			}
		});
		console.log("["+p+"]: loaded vector data.");
		parser = new xml2js.Parser();
		var data = fs.readFileSync(paths.fullTrackPath);
		parser.parseString(data, (err, result) => {
			var coords = result.svg.$.viewBox.split(" ");
			c.viewBox = {
				x:coords[2],
				y:coords[3]
			};
		});
		console.log("["+p+"]: loaded viewbox data.");
	}
	console.log("Server ready.");
	server.listen(1234, function (err) {
		if (err) throw err
		console.log('Now listening on port 1234');
	});
}

loadCircuits();

var room=function(name, circuit){
	this.name = name;
	this.circuit = circuit;
	this.owner = "";
	this.maxPlayers = 10;
	//Room data
	this.recordsPath="";
	this.trackPath="";
	this.clientTrackPath="";
	this.sandPath="";
	this.clientSandPath="";
	this.svgPath="";
	this.trackSize = {};
	//To be sent
	this.players = {};
	this.toSend = {};
	//Race variables
	this.spawnNumber = 0;
	this.waypoints = [];
	this.spawns = [];
	//Data
	this.recordData = null;
	this.trackMaskData = null;
	this.sandMaskData = null;
	//Time
	this.raceStart = 0;
	this.seconds = 0;

	this.loadCircuit=function(){
		var circuit = circuits[this.circuit];
		this.clientTrackPath = clientCircuitsPath + circuit.location + circuit.fullTrack;
		this.recordsPath = circuitsPath + circuit.location + circuit.records;
		this.recordData = circuit.recordData;
		this.trackMaskData = circuit.trackData;
		this.sandMaskData = circuit.sandData;
		this.toSend["walls"] = circuit.walls;
		this.waypoints = circuit.waypoints;
		this.spawns = circuit.spawns;
		this.trackSize = circuit.viewBox;
	};
	this.getWrapper=function(){
		return {
			name: this.name,
			maxPlayers: this.maxPlayers,
			currentPlayers: Object.keys(this.players).length,
			track:this.circuit
		};
	};
	this.setup=function(){
		console.log("Created room: "+this.name);
		this.toSend["players"] = {};
		this.toSend["walls"] = [];
		this.toSend["spectators"] = {};
		this.toSend["gameData"] = {
			room:{
				leaderboard:[],
			}
		};
		this.loadCircuit();
	};
	this.update=function(){
		this.updatePlayerPlacing();
		this.updatePlayerWrappers();
		if(Object.keys(this.players).length < this.maxPlayers){
			for(var i in this.toSend["spectators"]){
				var s = this.toSend["spectators"][i];
				if(s.readyToJoin){
					console.log("Spectator "+this.toSend["spectators"][i].args.name+" is joining the race.");
					this.addPlayer(io.sockets.connected[i], s.args);
					delete this.toSend["spectators"][i];
					break;
				}
			}
		}
		for(var type in this.toSend){
			for(var id in this.toSend[type]){
				var obj = this.toSend[type][id];
				if(typeof obj.update === "function")
					obj.update();
			}
		}
		io.to(this.name).emit("state", this.toSend);
		this.seconds+=1/60;
	};
	this.reset=function(){
		this.spawnNumber = 0;
		for(var i in this.players){
			var spawn = this.spawns[this.spawnNumber%this.spawns.length];
			this.spawnNumber++;
			if(!spawn){
				spawn = {x: 2300, y:2000};
			}
			this.players[i].pos = new Vector(spawn.x, spawn.y);
			this.players[i].reset();
			this.players[i].startRace();
		}
	};
	this.dispose=function(){
		for(var i in this.players){
			if(roomAssociation[i]){
				delete roomAssociation[i];
			}
		}
		for(var i in this.toSend["spectators"]){
			if(roomAssociation[i]){
				delete roomAssociation[i];
			}
		}
	};
	this.addPlayer=function(socket, arg){
		console.log("Player '"+arg.name+"' joined room '"+this.name+"'");
		socket.join(this.name);
		if(Object.keys(this.players).length == 0){
			this.owner = socket.id;
		}
		if(Object.keys(this.players).length < this.maxPlayers){
			var spawn = this.spawns[this.spawnNumber%this.spawns.length];
			this.spawnNumber++;
			if(!spawn){
				spawn = {x: 2300, y:2000};
			}
			this.players[socket.id] = new player(spawn.x, spawn.y, arg.name, socket.id, arg.color, this.name);
			this.players[socket.id].startRace();
		}else{
			this.toSend["spectators"][socket.id] = new spectator(arg);
			this.toSend["spectators"][socket.id].room = this.name;
			console.log("Player "+arg.name+" was moved to spectators due to game being full.");
		}
	}
	this.removePlayer=function(socket){
		if(roomAssociation[socket.id]){
			delete roomAssociation[socket.id];
		}
		if(this.players[socket.id]){
			console.log("Player '"+this.players[socket.id].name+"' left room '"+this.name+"'");
			if(this.owner === socket.id){
				if(Object.keys(this.players)[0]){
					this.owner = Object.keys(this.players)[0];
					console.log("Owner of room "+this.name+" has left. New owner is "+this.players[this.owner].name+".");
				}
			}
			delete this.players[socket.id];
		}
		if(this.toSend["spectators"][socket.id]){
			console.log("Spectator '"+this.toSend["spectators"][socket.id].args.name+"' left room '"+this.name+"'");
			delete this.toSend["spectators"][i];
			return;
		}

		for(var i in this.toSend["spectators"]){
			var s = this.toSend["spectators"][i];
			if(s.readyToJoin){
				console.log("Spectator "+this.toSend["spectators"][i].args.name+" is joining the race.");
				this.addPlayer(io.sockets.connected[i], s.args);
				delete this.toSend["spectators"][i];
				break;
			}
		}
		if(Object.keys(this.players).length === 0){
			console.log("Room '"+this.name+"' has been deleted.");
			this.dispose();
			delete rooms[this.name];
		}
	}
	this.keyPressed=function(socket, arg){
		if(this.players[socket.id]){
            this.players[socket.id].keys[arg] = true;
		}
		if(this.toSend["spectators"][socket.id]){
            this.toSend["spectators"][socket.id].keys[arg] = true;
		}
	}
	this.keyReleased=function(socket, arg){
		if(this.players[socket.id]){
            this.players[socket.id].keys[arg] = false;
        }
		if(this.toSend["spectators"][socket.id]){
            this.toSend["spectators"][socket.id].keys[arg] = false;
		}
	}
	this.updatePlayerPlacing = function(){
		this.toSend["gameData"].room.leaderboard = [];
		for(var i in this.players){
			var p = this.players[i];
			this.toSend["gameData"].room.leaderboard.push({
				id:i,
				name: p.name,
				lap: p.lap,
				index: p.positionIndex,
			});
		}
		this.toSend["gameData"].room.leaderboard.sort(function(a,b){
			return b.index - a.index;
		});
		for(var i in this.players){
			var p = this.players[i];
			for(var o in this.toSend["gameData"].room.leaderboard){
				var l = this.toSend["gameData"].room.leaderboard[o];
				if(i == l.id){
					p.place = parseInt(o)+1;
				}
			}
		}
	}
	
	this.updatePlayerWrappers = function() {
		this.toSend["players"] = {};
		for(var i in this.players){
			this.players[i].update();
			this.toSend["players"][i] = this.players[i].getWrapper();
		}
	}
	
	this.findClosestWaypoint = function(pos){
		var lowestDistance = Infinity;
		var index = -1;
		for(var i in this.waypoints){
			var w = this.waypoints[i];
			var v = new Vector(pos.x - w.x, pos.y - w.y);
			if(v.length() < lowestDistance){
				lowestDistance = v.length();
				index = i;
			}
		}
		return index;
	}
}

var rooms={};
var roomAssociation = {};

io.on("connection", function(socket){
	socket.on("new player", function(arg){
		if(!rooms[arg.room]){
			if(arg.circuit){
				rooms[arg.room] = new room(arg.room);
			}else{
				//Mugello Circuit
				//Nürburgring Circuit
				rooms[arg.room] = new room(arg.room, arg.track);
			}
			rooms[arg.room].setup();
		}
		rooms[arg.room].addPlayer(socket, arg);
		roomAssociation[socket.id] = arg.room;
	});
	
	socket.on("key press", function(arg){
		if(rooms[roomAssociation[socket.id]]){
			rooms[roomAssociation[socket.id]].keyPressed(socket, arg);
		}
	});

	socket.on("key release", function(arg){
		if(rooms[roomAssociation[socket.id]]){
			rooms[roomAssociation[socket.id]].keyReleased(socket, arg);
		}
	});

	socket.on("disconnect", function(){
		if(rooms[roomAssociation[socket.id]]){
			rooms[roomAssociation[socket.id]].removePlayer(socket);
		}
	});

	socket.on("request images", function(){
		socket.emit("images", {
			track: rooms[roomAssociation[socket.id]].clientTrackPath,
			trackSize: rooms[roomAssociation[socket.id]].trackSize
		});
	});

	socket.on("chat message", function(arg){
		var player = rooms[roomAssociation[socket.id]].players[socket.id];
		io.emit("chat message",{
			color: player.color,
			name: player.name,
			message: arg

		});
	});
});

var menu = io.of("/menu");
setInterval(function(){
	var roomWrappers = {};
	for(var i in rooms){
		roomWrappers[i] = rooms[i].getWrapper();
	}
	menu.emit("rooms", roomWrappers);
}, 1000);


setInterval(function(){
	for(var i in rooms){
		rooms[i].update();
	}
}, 1000/60);

var LEFT_ARROW = 37;
var RIGHT_ARROW = 39;
var UP_ARROW = 38;
var DOWN_ARROW = 40;

var player=function(x, y, name, id, c, room){
	this.name = name;
	this.room = room;
	this.id = id;
	this.pos=new Vector(x, y);
	this.posBuffer=new Vector(0,0);
    this.vel=new Vector(0, 0);
	this.color=c;
	this.frozen = false;
	this.time=0;
	this.lapTime=0;
	this.timerBuffer=0;
	this.lapStart=0;
	this.splits=[];
	this.startedRace=false;
	this.currentWaypoint=0;
	this.positionIndex=0;
	this.waypointLocation={};
	this.lap=-1;
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
	this.collidedThisFrame=[];
	this.getWrapper=function(){
		return {
			pos:this.pos,
			dir:this.dir,
			color:this.color,
			place:this.place,
			name:this.name,
			corners:this.corners,
			frontOffset:this.frontOffset,
			backOffset:this.backOffset,
			sideOffset:this.sideOffset,
			wheelInset:this.wheelInset,
			splits:this.splits,
			lap:this.lap,
			lapTime:this.lapTime,
			time:this.time,
			rightVel:this.rightVel,
		};
	}
	this.startRace=function(){
		this.currentWaypoint = rooms[this.room].findClosestWaypoint(this.pos);
		this.waypointLocation = rooms[this.room].waypoints[this.currentWaypoint];
		this.positionIndex = this.lap * rooms[this.room].waypoints.length + parseInt(this.currentWaypoint);
		this.frozen=false;
	};
	this.reset=function(){
		this.lap = -1;
		this.vel = new Vector(0,0);
		this.dir = 0;
		this.frozen = true;
		this.lapStart = 0;
		this.splits=[];
	};
    this.update=function(){
		this.time = rooms[this.room].seconds - rooms[this.room].raceStart;
		this.lapTime = this.time - this.lapStart;
		if(this.frozen){
			this.time = 0;
			this.lapTime = 0;
		}
		if(!this.frozen){
			this.posBuffer=this.pos.clone();
			this.pos.add(this.vel);
			this.vel.add(new Vector(Math.cos(this.dir)*this.speed,Math.sin(this.dir)*this.speed));
			this.sideFriction(0.96 * this.frictionMultiplier, 0.98 * this.frictionMultiplier);
			this.collision();
			this.updateWaypoint();
			this.speed*=this.decel*this.decelMultiplier;
			if(this.keys[UP_ARROW]){this.speed+=this.accel*this.accelMultiplier;}
			if(this.keys[DOWN_ARROW]){this.speed-=this.accel*this.accelMultiplier*0.5;}
			//var invert = this.vel.angleTo
			if(this.keys[LEFT_ARROW]){this.dir-=Math.sign(this.speed)*(this.turnSpeed*this.vel.length())/this.turnDamp;}
			if(this.keys[RIGHT_ARROW]){this.dir+=Math.sign(this.speed)*(this.turnSpeed*this.vel.length())/this.turnDamp;}
		}
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
		for(var i in rooms[this.room].toSend["walls"]){
			var w = rooms[this.room].toSend["walls"][i];
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
		for(var i in rooms[this.room].players){
			var otherCar = rooms[this.room].players[i];
			if(otherCar === this){
				return;
			}
			if(carCollision(this, otherCar)){
				var posDiff = Vector.subtract(this.pos, otherCar.pos);
				posDiff.normalize();
				while(carCollision(this, otherCar)){
					var thisVel = posDiff.clone();
					var otherVel = Vector.multiply(posDiff, -1);
					thisVel.multiply(0.5);
					otherVel.multiply(0.5);
					this.pos.add(thisVel);
					distance+=thisVel.length;
					otherCar.pos.add(otherVel);
					this.setCorners(null);
					otherCar.setCorners(null);
					if(distance > 100){
						break;
					}
				}
				var v1 = this.vel.clone();
				var x1 = this.pos.clone();
				var v2 = otherCar.vel.clone();
				var x2 = otherCar.pos.clone();
				var deltaX1 = Vector.subtract(x1, x2);
				var deltaV1 = Vector.subtract(v1, v2);
				var deltaX2 = Vector.subtract(x2, x1);
				var deltaV2 = Vector.subtract(v2, v1);
				if(deltaX1.length() == 0){
					return;
				}
				this.vel = Vector.subtract(v1, Vector.multiply(deltaX1, Vector.dot(deltaV1, deltaX1)/Math.pow(deltaX1.length(), 2)));
				otherCar.vel = Vector.subtract(v2, Vector.multiply(deltaX2, Vector.dot(deltaV2, deltaX2)/Math.pow(deltaX2.length(), 2)));
				var distance = 0;
			}
		}
	}
	this.setFriction=function(){
		var circuitScale = circuits[rooms[this.room].circuit].maskScale;
		if(rooms[this.room].trackMaskData && rooms[this.room].sandMaskData){
			if(Jimp.intToRGBA(rooms[this.room].trackMaskData.getPixelColor(Math.round(this.pos.x/circuitScale), Math.round(this.pos.y/circuitScale))).a !== 0){
				this.frictionMultiplier = 1;
				this.accelMultiplier = 1;
				this.decelMultiplier = 1;
			}else if(Jimp.intToRGBA(rooms[this.room].sandMaskData.getPixelColor(Math.round(this.pos.x/circuitScale), Math.round(this.pos.y/circuitScale))).a !== 0){
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
	}
	this.updateWaypoint=function(){
		var close = rooms[this.room].findClosestWaypoint(this.pos);
		this.waypointLocation = rooms[this.room].waypoints[this.currentWaypoint];
		this.positionIndex = this.lap * rooms[this.room].waypoints.length + parseInt(this.currentWaypoint);
		if(this.currentWaypoint == (rooms[this.room].waypoints.length-1) && close < 5){
			if(this.lap<0){
				this.startedRace = true;
			}else{
				this.splits.push(this.lapTime);
				if(!rooms[this.room].recordData.lapTime){
					return;
				}
				for(var i in rooms[this.room].recordData.lapTime){
					if(this.lapTime<rooms[this.room].recordData.lapTime[i][0]){
						rooms[this.room].recordData.lapTime.splice(i, 0, [this.lapTime, this.name]);
						rooms[this.room].recordData.lapTime.splice(-1);
						fs.writeFileSync(rooms[this.room].recordsPath, JSON.stringify(rooms[this.room].recordData, null, 2));
						break;
					}
				}
			}
			this.lapStart = rooms[this.room].seconds - rooms[this.room].raceStart;
			this.lap++;
			this.currentWaypoint = close;
		}else{
			if(Math.abs(close - this.currentWaypoint) < 5){
				this.currentWaypoint = close;
			}
		}
	}
};

var spectator = function(args){
	this.args = args
	this.following = true;
	this.followID = null;
	this.readyToJoin = true;
	this.pos = new Vector(500, 500);
	this.room = "";
	this.keys = [];
	this.released = true;
	this.readyReleased = true;
	this.update=function(){
		if(this.keys[LEFT_ARROW]||this.keys[RIGHT_ARROW]||this.keys[UP_ARROW]||this.keys[DOWN_ARROW]){
			this.following=false;
		}
		if(this.keys[32]){
			this.following=true;
		}else{
			this.released=true;
		}
		if(this.keys[13]&&this.readyReleased){
			this.readyToJoin=!this.readyToJoin;
			this.readyReleased=false;
		}else if(!this.keys[13]){
			this.readyReleased=true;
		}
		if(!this.following){
			if(this.keys[LEFT_ARROW]){this.pos.x-=15;}
			if(this.keys[RIGHT_ARROW]){this.pos.x+=15;}
			if(this.keys[UP_ARROW]){this.pos.y-=15;}
			if(this.keys[DOWN_ARROW]){this.pos.y+=15;}
		}else{
			if(!rooms[this.room]){
				return;
			}
			if(this.keys[32] && this.released){
				this.released = false;
				if(Object.keys(rooms[this.room].players).indexOf(this.followID) != -1){
					var index = Object.keys(rooms[this.room].players).indexOf(this.followID) + 1;
					if(index < Object.keys(rooms[this.room].players).length){
						this.followID = Object.keys(rooms[this.room].players)[index];
					}else{
						this.followID = Object.keys(rooms[this.room].players)[0];
					}
				}else{
					this.followID = Object.keys(rooms[this.room].players)[0];
				}
			}
			if(!this.followID){
				this.followID = Object.keys(rooms[this.room].players)[0];
				return;
			}
			if(rooms[this.room].players[this.followID]){
				this.pos = new Vector(rooms[this.room].players[this.followID].pos.x, rooms[this.room].players[this.followID].pos.y);
			}
		}
	}
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

function clone(obj) {
    if (null == obj || "object" != typeof obj) return obj;
    var copy = obj.constructor();
    for (var attr in obj) {
        if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
    }
    return copy;
}

function createPolygon(center, sides, size, angle, leaveOff){
	for(var i=1; i<=sides-leaveOff; i++){
		toSend["walls"].push(new wall(center.x + Math.cos(i * ((2 * Math.PI) / sides) + angle) * size, center.y + Math.sin(i * ((2 * Math.PI) / sides) + angle) * size, center.x + Math.cos((i - 1) * ((2 * Math.PI) / sides) + angle) * size, center.y + Math.sin((i - 1) * ((2 * Math.PI) / sides) + angle) * size));
	}
}

var getPlayerIndexFromName = function (name) {
	var users= [];
	for(var i in players){
		if(players[i].name === name){
			users.push(i);
		}
	}
	return users;
}