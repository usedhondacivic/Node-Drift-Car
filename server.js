var express = require('express');
var app = express();
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

var toSend={};
toSend["players"] = {};
toSend["bullets"] = [];

io.on("connection", function (socket) {
    console.log("a user connected");
    socket.on("new player", function(){
        toSend["players"][socket.id] = new player(100, 100);
    });
    
    socket.on("key press", function(arg){
        toSend["players"][socket.id].keys[arg] = true;
    });

    socket.on("key release", function(arg){
        toSend["players"][socket.id].keys[arg] = false;
    });

    socket.on("click", function(arg){
        var currentPlayer = toSend["players"][socket.id] || {x:0, y:0};
        var angle = Math.atan2(arg.y-currentPlayer.y, arg.x-currentPlayer.x);
        toSend["bullets"].push(new bullet(currentPlayer.x, currentPlayer.y, Math.cos(angle)*currentPlayer.shotSpeed, Math.sin(angle)*currentPlayer.shotSpeed, socket.id));
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
            obj.update();
        }
    }
    io.emit("state", toSend);
}, 1000/60);

server.listen(3000, function (err) {
    if (err) throw err
    console.log('Now listening on port 3000');
});

var LEFT_ARROW = 37;
var RIGHT_ARROW = 39;
var UP_ARROW = 38;
var DOWN_ARROW = 40;

/*var player=function(x,y){
    this.x=x;
    this.y=y;
    this.width=5;
    this.height=5;
    this.velocityX=0;
    this.velocityY=0;
    this.speed=5;
    this.shotSpeed = 10;
    this.keys=[];
    this.update=function(){
        if(this.keys[LEFT_ARROW]){this.velocityX=-this.speed;}
        if(this.keys[RIGHT_ARROW]){this.velocityX=this.speed;}
        if(!this.keys[LEFT_ARROW]&&!this.keys[RIGHT_ARROW]){this.velocityX=0;}
        if(this.keys[UP_ARROW]){this.velocityY=-this.speed;}
        if(this.keys[DOWN_ARROW]){this.velocityY=this.speed;}
        if(!this.keys[DOWN_ARROW]&&!this.keys[UP_ARROW]){this.velocityY=0;}
        this.x += this.velocityX;
        this.y += this.velocityY;
    }
}*/
/*
var player=function(x,y){
    this.pos=new Vector(x, y);
    this.vel=new Vector(0,0);
    this.x=200;
    this.y=200;
    this.friction=0.96;
    this.speedFriction=0.85;
    this.speed=0;
    this.accel=0.05;
    this.dir=0;
    this.turnAdjust = 0.03;
    this.turnSpeed=0.7;
    this.turnDamp=70;
    this.wheelTrails=[[],[],[],[]];
    this.keys=[];
    this.draw=function(){
        this.update();
    };
    this.update=function(){
        this.pos.addTo(this.vel);
        //console.log(new Vector(Math.cos(this.dir)*this.speed,Math.sin(this.dir)*this.speed));
        this.vel.addTo(new Vector(Math.cos(this.dir)*this.speed,Math.sin(this.dir)*this.speed));
        this.vel.multiplyBy(this.friction);
        this.speed*=this.speedFriction;
        if(this.keys[UP_ARROW]){this.speed+=this.accel;}else{
            this.vel.addTo(new Vector(Math.cos(this.dir)*this.vel.getMagnitude()*this.turnAdjust,Math.sin(this.dir)*this.vel.getMagnitude()*this.turnAdjust));
        }
        if(this.keys[DOWN_ARROW]){this.speed-=this.accel*0.5;}
        if(this.keys[LEFT_ARROW]){this.dir-=(this.turnSpeed*this.vel.getMagnitude())/this.turnDamp;}
        if(this.keys[RIGHT_ARROW]){this.dir+=(this.turnSpeed*this.vel.getMagnitude())/this.turnDamp;}
    };
};
*/
var player=function(x,y){
    this.pos=new Vector(x, y);
    this.vel=new Vector(0, 0);
    this.x=200;
    this.y=200;
    this.sideFriction=0.90;
    this.forwardFriction=0.90;
    this.speed=0;
    this.accel=0.03;
    this.decl=0.90;
    this.dir=0;
    this.turnSpeed=0.6;
    this.turnDamp=70;
    this.wheelTrails=[[],[],[],[]];
    this.keys=[];
    this.draw=function(){
        this.update();
    };
    this.update=function(){
        this.pos.add(this.vel);
        this.vel.add(new Vector(Math.cos(this.dir)*this.speed,Math.sin(this.dir)*this.speed));
        this.sideFriction(0.96, 0.98);
        this.speed*=this.decl;
        if(this.keys[UP_ARROW]){this.speed+=this.accel;}
        if(this.keys[DOWN_ARROW]){this.speed-=this.accel*0.5;}
        if(this.keys[LEFT_ARROW]){this.dir-=(this.turnSpeed*this.vel.length())/this.turnDamp;}
        if(this.keys[RIGHT_ARROW]){this.dir+=(this.turnSpeed*this.vel.length())/this.turnDamp;}
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
    };
};

var bullet=function(x,y,vx,vy, owner){
    this.x=x;
    this.y=y;
    this.vx=vx;
    this.vy=vy;
    this.owner=owner;
    this.update=function(){
        this.x+=this.vx;
        this.y+=this.vy;
    }
}

function Vector(x, y) {
	this.x = x || 0;
	this.y = y || 0;
}

/* INSTANCE METHODS */

Vector.prototype = {
	negative: function() {
		this.x = -this.x;
		this.y = -this.y;
		return this;
	},
	add: function(v) {
		if (v instanceof Vector) {
			this.x += v.x;
			this.y += v.y;
		} else {
			this.x += v;
			this.y += v;
		}
		return this;
	},
	subtract: function(v) {
		if (v instanceof Vector) {
			this.x -= v.x;
			this.y -= v.y;
		} else {
			this.x -= v;
			this.y -= v;
		}
		return this;
	},
	multiply: function(v) {
		if (v instanceof Vector) {
			this.x *= v.x;
			this.y *= v.y;
		} else {
			this.x *= v;
			this.y *= v;
		}
		return this;
	},
	divide: function(v) {
		if (v instanceof Vector) {
			if(v.x != 0) this.x /= v.x;
			if(v.y != 0) this.y /= v.y;
		} else {
			if(v != 0) {
				this.x /= v;
				this.y /= v;
			}
		}
		return this;
	},
	equals: function(v) {
		return this.x == v.x && this.y == v.y;
	},
	dot: function(v) {
		return this.x * v.x + this.y * v.y;
	},
	cross: function(v) {
		return this.x * v.y - this.y * v.x
	},
	length: function() {
		return Math.sqrt(this.dot(this));
	},
	normalize: function() {
		return this.divide(this.length());
	},
	min: function() {
		return Math.min(this.x, this.y);
	},
	max: function() {
		return Math.max(this.x, this.y);
	},
	toAngles: function() {
		return -Math.atan2(-this.y, this.x);
	},
	angleTo: function(a) {
		return Math.acos(this.dot(a) / (this.length() * a.length()));
	},
	toArray: function(n) {
		return [this.x, this.y].slice(0, n || 2);
	},
	clone: function() {
		return new Vector(this.x, this.y);
	},
	set: function(x, y) {
		this.x = x; this.y = y;
		return this;
	}
};

/* STATIC METHODS */
Vector.negative = function(v) {
	return new Vector(-v.x, -v.y);
};
Vector.add = function(a, b) {
	if (b instanceof Vector) return new Vector(a.x + b.x, a.y + b.y);
	else return new Vector(a.x + v, a.y + v);
};
Vector.subtract = function(a, b) {
	if (b instanceof Vector) return new Vector(a.x - b.x, a.y - b.y);
	else return new Vector(a.x - v, a.y - v);
};
Vector.multiply = function(a, b) {
	if (b instanceof Vector) return new Vector(a.x * b.x, a.y * b.y);
	else return new Vector(a.x * v, a.y * v);
};
Vector.divide = function(a, b) {
	if (b instanceof Vector) return new Vector(a.x / b.x, a.y / b.y);
	else return new Vector(a.x / v, a.y / v);
};
Vector.equals = function(a, b) {
	return a.x == b.x && a.y == b.y;
};
Vector.dot = function(a, b) {
	return a.x * b.x + a.y * b.y;
};
Vector.cross = function(a, b) {
	return a.x * b.y - a.y * b.x;
};