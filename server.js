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
    "/servers",
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
	
	if(words[0] === "global message") {
		globalMessage(words[1]);
		return;
	}else if(!rooms[broadcastRoom]){
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
		case "kick":
			if(rooms[broadcastRoom].players[words[1]]){
				rooms[broadcastRoom].removePlayer({id:words[1]});
				if(words[2]){
					io.sockets.connected[words[1]].emit("alert", words[2]);
				}
				console.log("Player kick.");	
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
				io.sockets.connected[rooms[broadcastRoom].owner].emit("set owner", false);
				rooms[broadcastRoom].owner = words[1];
				io.sockets.connected[words[1]].emit("set owner", true);
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
			rooms[broadcastRoom].startRace();
			console.log("Race started.");
		break;
		case "room message":
			serverMessage(words[1], broadcastRoom);
			console.log("Sent message.");
		break;
		case "close":
			rooms[broadcastRoom].close();
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
var circuits;
var validCars = [];

async function loadCircuits(){
	console.log("Starting server...");
	var carsTemp = JSON.parse(fs.readFileSync("./client/images/cars/data.json"));
	for(var key in carsTemp){
		validCars.push(key);
	}
	circuits = JSON.parse(fs.readFileSync(circuitsPath + "/data.json"));
	console.log("Loaded circuit overview.");
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
						c.spawns.reverse();
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

var room=function(name, circuit, maxPlayers, moderated){
	this.name = name;
	this.circuit = circuit;
	this.owner = "";
	this.maxPlayers = maxPlayers;
	this.aiCount = 0;
	this.moderated = moderated;
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
	this.walls = [];
	//Race variables
	this.gameState = "waiting";
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
		this.walls = circuit.walls;
		this.waypoints = circuit.waypoints;
		this.spawns = circuit.spawns;
		this.trackSize = circuit.viewBox;
	};

	this.getWrapper=function(){
		return {
			name: this.name,
			maxPlayers: this.maxPlayers,
			aiCount: this.aiCount,
			spectatorCount: Object.keys(this.toSend["spectators"]).length,
			currentPlayers: Object.keys(this.players).length,
			track: this.circuit,
			moderated: this.moderated
		};
	};

	this.setup=function(){
		console.log("Created room: "+this.name);
		this.toSend["players"] = {};
		this.toSend["spectators"] = {};
		this.toSend["gameData"] = {
			room:{
				leaderboard:[],
			},
			gameState: this.gameState
		};
		this.loadCircuit();
	};

	/*BEGIN ABSTRACTION*/
	this.update=function(){
		this.updatePlayerPlacing();
		this.updatePlayerWrappers();
		this.toSend["gameData"].gameState = this.gameState;
		if(Object.keys(this.players).length < this.maxPlayers){
			for(var i in this.toSend["spectators"]){
				var s = this.toSend["spectators"][i];
				if(s.readyToJoin && this.gameState === "waiting"){
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
	/*END ABSTRACTION*/

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
		for(var i in roomAssociation){
			if(roomAssociation[i] == this.name){
				delete roomAssociation[i];
			}
		}
	};

	this.addPlayer=function(socket, arg){
		console.log("Player '"+arg.name+"' joined room '"+this.name+"'");
		socket.join(this.name);
		if(Object.keys(this.players).length == 0 || this.aiCount === Object.keys(this.players).length){
			this.owner = socket.id;
			io.sockets.connected[this.owner].emit("set owner", true);
			console.log("The new owner of room "+this.name+" is "+arg.name+".");
		}
		if(this.gameState !== "waiting"){
			this.toSend["spectators"][socket.id] = new spectator(arg);
			this.toSend["spectators"][socket.id].room = this.name;
			console.log("Player "+arg.name+" was moved to spectators because a race has already started.");
			return;
		}
		if(Object.keys(this.players).length < this.maxPlayers){
			var spawn = this.spawns[this.spawnNumber%this.spawns.length];
			this.spawnNumber++;
			if(!spawn){
				spawn = {x: 2300, y:2000};
			}
			this.players[socket.id] = new player(spawn.x, spawn.y, arg.name, socket.id, arg.color, this.name, arg.car);
			this.players[socket.id].startRace();
		}else{
			var replaced = false;
			for(var i in this.players){
				var p = this.players[i];
				if(p.ai){
					this.removePlayer({id:i});
					this.addPlayer(socket, arg);
					replaced = true;
				}
			}
			if(replaced){
				return;
			}
			this.toSend["spectators"][socket.id] = new spectator(arg);
			this.toSend["spectators"][socket.id].room = this.name;
			console.log("Player "+arg.name+" was moved to spectators due to game being full.");
		}
	}

	this.removePlayer=function(socket){
		if(this.players[socket.id]){
			console.log("Player '"+this.players[socket.id].name+"' left room '"+this.name+"'");
			if(this.players[socket.id].ai){
				this.aiCount--;
			}
			delete this.players[socket.id];
			if(this.owner === socket.id){
				if(Object.keys(this.players).length === 0){
					this.gameState = "waiting";
				}
				var foundNewOwner = false;
				for(var i in Object.keys(this.players)){
					if(Object.keys(this.players)[i]){
						this.owner = Object.keys(this.players)[i];
						if(this.players[this.owner].ai == false){
							io.sockets.connected[this.owner].emit("set owner", true);
							console.log("Owner of room "+this.name+" has left. New owner is "+this.players[this.owner].name+".");
							foundNewOwner = true;
							break;
						}
					}
				}
				if(!foundNewOwner && Object.keys(this.toSend["spectators"]).length === 0){
					this.close();
				}
			}
		}

		if(this.toSend["spectators"][socket.id]){
			console.log("Spectator '"+this.toSend["spectators"][socket.id].args.name+"' left room '"+this.name+"'");
			delete this.toSend["spectators"][i];
			return;
		}

		if(this.aiCount === Object.keys(this.players).length){
			this.gameState = "waiting";
		}

		for(var i in this.toSend["spectators"]){
			var s = this.toSend["spectators"][i];
			if(s.readyToJoin && this.gameState === "waiting"){
				console.log("Spectator "+this.toSend["spectators"][i].args.name+" is joining the race.");
				this.addPlayer(io.sockets.connected[i], s.args);
				delete this.toSend["spectators"][i];
				break;
			}
		}
		
		if(roomAssociation[socket.id]){
			delete roomAssociation[socket.id];
		}

		if(Object.keys(this.players).length === 0){
			console.log("Closed at end of player removed.");
			this.close();
		}
	}

	this.close=function(){
		console.log("Room '"+this.name+"' has been deleted.");
		this.dispose();
		delete rooms[this.name];
	}

	this.keyPressed=function(socket, arg){
		if(socket.id == this.owner){
			this.ownerControls(arg);
		}
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

	this.ownerControls=function(keycode){
		if(keycode == 49){
			if(this.gameState == "waiting"){
				this.startRace();
			}else if(this.gameState != "countdown"){
				this.gameState = "waiting";
			}
		}
		if(keycode == 50 && Object.keys(this.players).length < this.maxPlayers && this.gameState == "waiting"){
			this.addPlayer({id: Object.keys(this.players).length, join: function(){}}, {name:"AI", color: Math.random()*100, room:"", car:"truck"});
			this.players[Object.keys(this.players).length-1].ai = true;
			this.aiCount++;
			var carNum = Math.floor(Math.random()*4);
			if(carNum == 0){
				this.players[Object.keys(this.players).length-1].car = "sports";
			}else if(carNum == 1){
				this.players[Object.keys(this.players).length-1].car = "ambulance";
			}else if(carNum == 2){
				this.players[Object.keys(this.players).length-1].car = "dragster";
			}
		}
	}

	this.startRace = function(){
		this.spawnNumber = 0;
		for(var i in this.players){
			var spawn = this.spawns[this.spawnNumber%this.spawns.length];
			this.spawnNumber++;
			if(!spawn){
				spawn = {x: 2300, y:2000};
			}
			this.raceStart = this.seconds;
			this.players[i].pos = new Vector(spawn.x, spawn.y);
			this.players[i].reset();
		}
		io.to(this.name).emit("countdown");
		this.gameState = "countdown";
		setTimeout(() => {
			for(var i in this.players){
				this.players[i].startRace();
			}
			this.raceStart = this.seconds;
			this.gameState = "racing";
		}, 3000);
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
				position: p.pos,
				waypoint: this.waypoints[p.currentWaypoint+1]
			});
		}
		this.toSend["gameData"].room.leaderboard.sort((a,b) => {
			if(a.index != b.index){
				return b.index - a.index;
			}else{
				if(!a.waypoint || !b.waypoint){
					a.waypoint = this.waypoints[0];
					b.waypoint = this.waypoints[0];
				}
				var aVec = new Vector(a.position.x - a.waypoint.x, a.position.y - a.waypoint.y);
				var bVec = new Vector(b.position.x - b.waypoint.x, b.position.y - b.waypoint.y);
				return aVec.length() - bVec.length();
			}
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
				rooms[arg.room] = new room(arg.room, "Mugello Circuit", (arg.players > 0 && arg.players < 15) ? arg.players : 10, true);
			}else{
				rooms[arg.room] = new room(arg.room, arg.track, (arg.players > 0 && arg.players < 15) ? arg.players : 10, true);
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
		if(rooms[roomAssociation[socket.id]]){
			socket.emit("images", {
				track: rooms[roomAssociation[socket.id]].clientTrackPath,
				trackSize: rooms[roomAssociation[socket.id]].trackSize,
				walls: rooms[roomAssociation[socket.id]].walls
			});
		}
	});

	socket.on("chat message", function(arg){
		if(rooms[roomAssociation[socket.id]]){
			var player = rooms[roomAssociation[socket.id]].players[socket.id];
			var spectator = false;
			if(!player){
				player = rooms[roomAssociation[socket.id]].toSend["spectators"][socket.id].args;
				spectator = true;
			}
			if(!player){
				return;
			}
			if(!spectator){
				io.to(roomAssociation[socket.id]).emit("chat message",{
					color: player.color,
					name: player.name,
					message: arg,
					spectator: false
				});
			}else{
				io.to(roomAssociation[socket.id]).emit("chat message",{
					color: player.color,
					name: player.name,
					message: arg,
					spectator: true
				});
			}
		}
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

var player=function(x, y, name, id, c, room, car){
	this.name = name;
	this.room = room;
	this.car = car;
	this.id = id;
	this.ai = false;
	this.aiPreset = {
		pointsAhead : 1 + Math.floor(Math.random()*2.5),
		turnFrame : Math.random()*0.15 + 0.05
	};
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
	this.targetpointLocation={};
	this.lap=0;
	this.place=0;
    this.sideFriction=0.96;
	this.forwardFriction=0.98;
	this.frictionMultiplier=1;
	this.rightVel=new Vector(0, 0);
	this.bounce = 1;
	this.speed=0;
	this.accel=0.05;
	this.accelMultiplier=1;
	this.decel=0.87;
	this.decelMultiplier=1;
	this.dir=0;
	//0.5
	this.turnSpeed=0;
	this.turnAccel=0.15;
	this.turnDecel=0.75;
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
			car:this.car,
			waypointLocation:this.waypointLocation,
			//waypointLocation:this.targetpointLocation,
		};
	}
	this.startRace=function(){
		this.currentWaypoint = rooms[this.room].findClosestWaypoint(this.pos);
		this.waypointLocation = rooms[this.room].waypoints[this.currentWaypoint];
		this.positionIndex = this.lap * rooms[this.room].waypoints.length + parseInt(this.currentWaypoint);
		this.frozen=false;
		if(validCars.indexOf(this.car) == -1){
			this.car = "sports";
		}
	};
	this.reset=function(){
		this.lap = 0;
		this.vel = new Vector(0,0);
		this.speed = 0;
		this.turnSpeed = 0;
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
			if(this.keys[LEFT_ARROW]){this.turnSpeed-=this.turnAccel;}
			if(this.keys[RIGHT_ARROW]){this.turnSpeed+=this.turnAccel;}
			this.turnSpeed*=this.turnDecel;
			this.dir+=Math.sign(this.speed)*(this.turnSpeed*this.vel.length())/this.turnDamp;
			if(this.ai){
				this.aiSteer();
			}
		}
	};
	this.aiSteer=function(){
		var targetWaypoint;
		if(rooms[this.room].waypoints[parseInt(this.currentWaypoint)+this.aiPreset.pointsAhead]){
			targetWaypoint = rooms[this.room].waypoints[parseInt(this.currentWaypoint)+this.aiPreset.pointsAhead];
		}else{
			targetWaypoint = rooms[this.room].waypoints[0];
		}
		this.targetpointLocation = {
			x: targetWaypoint.x,
			y: targetWaypoint.y
		};
		var targetVector = new Vector(targetWaypoint.x - this.pos.x, targetWaypoint.y - this.pos.y);
		var dirVector = new Vector(Math.cos(this.dir), Math.sin(this.dir));
		var difAngle = Math.atan2(targetVector.x*dirVector.y-targetVector.y*dirVector.x,targetVector.x*dirVector.x+targetVector.y*dirVector.y);
		if(difAngle > this.aiPreset.turnFrame){
			this.keys[LEFT_ARROW] = true;
			this.keys[RIGHT_ARROW] = false;
		}else if(difAngle < -this.aiPreset.turnFrame){
			this.keys[LEFT_ARROW] = false;
			this.keys[RIGHT_ARROW] = true;
		}else{
			this.keys[LEFT_ARROW] = false;
			this.keys[RIGHT_ARROW] = false;
		}
		this.keys[UP_ARROW] = true;
	}
    this.sideFriction=function(sideFriction, forwardFriction){
		//Read image data from room masks and set friction accordingly
		this.setFriction();
		//Find the 
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
		for(var i in rooms[this.room].walls){
			var w = rooms[this.room].walls[i];
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
		/*BEGIN ALGORITHM*/
		//Loop through every other car to check collision
		for(var i in rooms[this.room].players){
			var otherCar = rooms[this.room].players[i];
			if(otherCar === this){
				//Can't collide with yourself, break out
				return;
			}
			//Are the cars touching?
			if(carCollision(this, otherCar)){
				//Vector clones so to not effect by reference
				var v1 = this.vel.clone();
				var x1 = this.pos.clone();
				var v2 = otherCar.vel.clone();
				var x2 = otherCar.pos.clone();
				//Deltas
				var deltaX1 = Vector.subtract(x1, x2);
				var deltaV1 = Vector.subtract(v1, v2);
				var deltaX2 = Vector.subtract(x2, x1);
				var deltaV2 = Vector.subtract(v2, v1);
				//Check if cars are on top of each other
				if(deltaX1.length() == 0 || deltaX2.length() == 0){
					//Will divide by zero, break out
					return;
				}
				//Normal vector from the other car to this car
				var posDiff = Vector.subtract(this.pos, otherCar.pos);
				posDiff.normalize();
				//Move the cars apart slowly until they are no longer touching
				while(carCollision(this, otherCar)){
					//Find small vectors that send the cars directly away from each other
					var thisVel = posDiff.clone();
					var otherVel = Vector.multiply(posDiff, -1);
					thisVel.multiply(0.5);
					otherVel.multiply(0.5);
					//Add the vectors to the positions
					this.pos.add(thisVel);
					otherCar.pos.add(otherVel);
					//Update corner variables for collsion to the new position
					this.setCorners(null);
					otherCar.setCorners(null);
					if(posDiff.length() == 0){
						//Cars aren't moving, break out to avoid infinte loop
						break;
					}
				}
				//Apply elastic collision algorithm to simulate rebound
				this.vel = Vector.subtract(v1, Vector.multiply(deltaX1, Vector.dot(deltaV1, deltaX1)/Math.pow(deltaX1.length(), 2)));
				this.vel.multiply(this.bounce);
				otherCar.vel = Vector.subtract(v2, Vector.multiply(deltaX2, Vector.dot(deltaV2, deltaX2)/Math.pow(deltaX2.length(), 2)));
				otherCar.vel.multiply(this.bounce);
			}
		}
		/*END ALGORITHM*/
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
			if(this.lap<1){
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
						var suffix = "th";
						if(i == 0){
							suffix = "st";
						}else if(i == 1){
							suffix = "nd";
						}else if(i == 2){
							suffix = "rd";
						}
						serverMessage("["+this.name+"] just set the "+(parseInt(i)+1)+suffix+" fastest lap of all time with a time of "+this.lapTime.toFixed(2)+"s.", this.room);
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
	this.args = args;
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
		if(this.keys[17]&&this.readyReleased){
			this.readyToJoin=!this.readyToJoin;
			this.readyReleased=false;
		}else if(!this.keys[17]){
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

function serverMessage(msg, room){
	io.to(room).emit("chat message",{
		color: 0,
		name: "SERVER",
		message: msg
	});
}

function globalMessage(msg){
	io.emit("chat message",{
		color: 0,
		name: "GLOBAL",
		message: msg
	});
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