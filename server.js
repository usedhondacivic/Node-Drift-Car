var express = require('express');
var app = express();
require("./vector.js")();
var server = require('http').Server(app);
const io = require('socket.io')(server);

app.use(express.static("bower_components"));
app.use(express.static("public"));

app.get(
    "/",
    function(req, res){
        res.sendFile(__dirname + "/index.html");
    }
);

app.get(
    "/gen",
    function(req, res){
        res.sendFile(__dirname + "/gen.html")
    }
);

var toSend={};
toSend["players"] = {};
toSend["walls"] = [];

var colors= [
    [255,0,0],
    [0, 255, 0],
    [0, 0, 255],
    [0,255,255],
    [255,140,0],
    [255,0,255],
    [0,0,0]
];

var colorNum=0;

io.on("connection", function (socket) {
    console.log("a user connected");
    socket.on("new player", function(){
        var color = colors[colorNum%colors.length];
        colorNum++;
        toSend["players"][socket.id] = new player(100, 100, color);
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

toSend["walls"].push(new wall(300, 300, 300, 400), new wall(300, 300, 400, 300), new wall(400, 300, 400, 400), new wall(300, 400, 400, 400));

for(var w in toSend["walls"]){
	toSend["walls"][w].setup();
}

var LEFT_ARROW = 37;
var RIGHT_ARROW = 39;
var UP_ARROW = 38;
var DOWN_ARROW = 40;

var player=function(x,y,c){
    this.pos=new Vector(x, y);
    this.vel=new Vector(0, 0);
    this.color=c;
    this.sideFriction=0.90;
	this.forwardFriction=0.90;
	this.rightVel=new Vector(0, 0);
    this.speed=0;
    this.accel=0.03;
    this.decl=0.90;
    this.dir=0;
    this.turnSpeed=0.6;
    this.turnDamp=70;
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
    this.keys=[];
    this.draw=function(){
        this.update();
    };
    this.update=function(){
        this.pos.add(this.vel);
        this.vel.add(new Vector(Math.cos(this.dir)*this.speed,Math.sin(this.dir)*this.speed));
		this.sideFriction(0.96, 0.98);
		this.collision();
        this.speed*=this.decl;
        if(this.keys[UP_ARROW]){this.speed+=this.accel;}
        if(this.keys[DOWN_ARROW]){this.speed-=this.accel*0.5;}
        if(this.keys[LEFT_ARROW]){this.dir-=(this.turnSpeed*this.vel.length())/this.turnDamp;}
		if(this.keys[RIGHT_ARROW]){this.dir+=(this.turnSpeed*this.vel.length())/this.turnDamp;}
        /*for(var i in this.wheelTrails){
            for(var o=0; o<this.wheelTrails[i].length; o++){
                this.wheelTrails[i][o][2]--;
                if(this.wheelTrails[i][o][2]<0){
                    this.wheelTrails[i].splice(o,1);
                }
            }
        }*/
    };
    this.sideFriction=function(per, fric){
        var forward = new Vector(Math.cos(this.dir), Math.sin(this.dir));
        var right = new Vector(Math.cos(this.dir+Math.PI/2), Math.sin(this.dir+Math.PI/2));
        var forwardVelocity = new Vector();
        var rightVelocity = new Vector();
        forwardVelocity = forward.multiply(Vector.dot(this.vel, forward));
        forwardVelocity.multiply(fric);
        rightVelocity = right.multiply(Vector.dot(this.vel, right));
		this.vel = forwardVelocity.add(rightVelocity.multiply(per));
		this.setCorners(rightVelocity);
	};
	this.setCorners=function(rightVelocity){
		this.rightVel = rightVelocity;
		this.corners.bottomLeftWheel.x = this.pos.x + 2*Math.sin(-this.dir) - 12*Math.cos(-this.dir);
		this.corners.bottomLeftWheel.y =  this.pos.y + 2*Math.cos(-this.dir) + 12*Math.sin(-this.dir);
		this.corners.topLeftWheel.x = this.pos.x - 2*Math.sin(-this.dir) - 12*Math.cos(-this.dir);
		this.corners.topLeftWheel.y = this.pos.y - 2*Math.cos(-this.dir) + 12*Math.sin(-this.dir);
		this.corners.bottomRightWheel.x = this.pos.x + 2*Math.sin(-this.dir) + 2*Math.cos(-this.dir);
		this.corners.bottomRightWheel.y = this.pos.y + 2*Math.cos(-this.dir) - 2*Math.sin(-this.dir);
		this.corners.topRightWheel.x = this.pos.x - 2*Math.sin(-this.dir) + 2*Math.cos(-this.dir);
		this.corners.topRightWheel.y = this.pos.y - 2*Math.cos(-this.dir) - 2*Math.sin(-this.dir);
		
		this.corners.bottomLeft.x = this.pos.x + 5*Math.sin(-this.dir) - 15*Math.cos(-this.dir);
		this.corners.bottomLeft.y =  this.pos.y + 5*Math.cos(-this.dir) + 15*Math.sin(-this.dir);
		this.corners.topLeft.x = this.pos.x - 5*Math.sin(-this.dir) - 15*Math.cos(-this.dir);
		this.corners.topLeft.y = this.pos.y - 5*Math.cos(-this.dir) + 15*Math.sin(-this.dir);
		this.corners.bottomRight.x = this.pos.x + 5*Math.sin(-this.dir) + 5*Math.cos(-this.dir);
		this.corners.bottomRight.y = this.pos.y + 5*Math.cos(-this.dir) - 5*Math.sin(-this.dir);
		this.corners.topRight.x = this.pos.x - 5*Math.sin(-this.dir) + 5*Math.cos(-this.dir);
		this.corners.topRight.y = this.pos.y - 5*Math.cos(-this.dir) - 5*Math.sin(-this.dir);
		/*if(rightVelocity != null){
			if(rightVelocity.length()>3){
				this.dropTrack++;
				if(this.dropTrack === 2){
					this.wheelTrails[0].push([this.corners.topRightWheel.x, this.corners.topRightWheel.y, tailLength, this.dir]);
					this.wheelTrails[1].push([this.corners.topLeftWheel.x, this.corners.topLeftWheel.y, tailLength, this.dir]);
					this.wheelTrails[2].push([this.corners.bottomRightWheel.x, this.corners.bottomRightWheel.y, tailLength, this.dir]);
					this.wheelTrails[3].push([this.corners.bottomLeftWheel.x, this.corners.bottomLeftWheel.y, tailLength, this.dir]);
					this.dropTrack=0;
				}
			}
		}*/
	}
	this.collision=function(){
		for(var i in toSend["walls"]){
			w = toSend["walls"][i];
			if(	doLineSegmentsIntersect(this.corners.topRight, this.corners.topLeft, {x:w.x1, y:w.y1}, {x:w.x2, y:w.y2}) || 
				doLineSegmentsIntersect(this.corners.topRight, this.corners.bottomRight, {x:w.x1, y:w.y1}, {x:w.x2, y:w.y2}) || 
				doLineSegmentsIntersect(this.corners.topLeft, this.corners.bottomLeft, {x:w.x1, y:w.y1}, {x:w.x2, y:w.y2}) || 
				doLineSegmentsIntersect(this.corners.bottomRight, this.corners.bottomLeft, {x:w.x1, y:w.y1}, {x:w.x2, y:w.y2})
			){
				var lastPos = Vector.subtract(this.pos, this.vel);
				var reboundDirection = w.normal.clone();
				var parallelToWall = w.vec.clone();
				
				var intoWall = reboundDirection.multiply(Vector.dot(this.vel, reboundDirection));
				var parallelProjection = parallelToWall.multiply(Vector.dot(this.vel, w.vec));

				this.vel = parallelProjection.add(intoWall.multiply(-0.5));
				while(doLineSegmentsIntersect(this.corners.topRight, this.corners.topLeft, {x:w.x1, y:w.y1}, {x:w.x2, y:w.y2}) || 
				doLineSegmentsIntersect(this.corners.topRight, this.corners.bottomRight, {x:w.x1, y:w.y1}, {x:w.x2, y:w.y2}) || 
				doLineSegmentsIntersect(this.corners.topLeft, this.corners.bottomLeft, {x:w.x1, y:w.y1}, {x:w.x2, y:w.y2}) || 
				doLineSegmentsIntersect(this.corners.bottomRight, this.corners.bottomLeft, {x:w.x1, y:w.y1}, {x:w.x2, y:w.y2})){
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
	}
};