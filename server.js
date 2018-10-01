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

app.get(
    "/gen",
    function(req, res){
        res.sendFile(__dirname + "/gen.html")
    }
);

var toSend={};
toSend["players"] = {};
toSend["bullets"] = [];
//toSend["walls"] = [];

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
	this.setup=function(){
		this.vec = new Vector(x2 - x1, y2 - y1);
		this.length = vec.length;
		this.vec.normalize();
		
	}
}

var LEFT_ARROW = 37;
var RIGHT_ARROW = 39;
var UP_ARROW = 38;
var DOWN_ARROW = 40;

var player=function(x,y,c){
    this.pos=new Vector(x, y);
    this.vel=new Vector(0, 0);
    this.x=200;
    this.y=200;
    this.color=c;
    this.sideFriction=0.90;
    this.forwardFriction=0.90;
    this.speed=0;
    this.accel=0.03;
    this.decl=0.90;
    this.dir=0;
    this.turnSpeed=0.6;
    this.turnDamp=70;
	this.wheelTrails=[[],[],[],[]];
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
        this.speed*=this.decl;
        if(this.keys[UP_ARROW]){this.speed+=this.accel;}
        if(this.keys[DOWN_ARROW]){this.speed-=this.accel*0.5;}
        if(this.keys[LEFT_ARROW]){this.dir-=(this.turnSpeed*this.vel.length())/this.turnDamp;}
		if(this.keys[RIGHT_ARROW]){this.dir+=(this.turnSpeed*this.vel.length())/this.turnDamp;}
        for(var i in this.wheelTrails){
            for(var o=0; o<this.wheelTrails[i].length; o++){
                this.wheelTrails[i][o][2]--;
                if(this.wheelTrails[i][o][2]<0){
                    this.wheelTrails[i].splice(o,1);
                }
            }
        }
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
		var tailLength = 25;
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
        if(rightVelocity.length()>3){
            this.wheelTrails[0].push([this.corners.topRightWheel.x, this.corners.topRightWheel.y, tailLength, this.dir]);
            this.wheelTrails[1].push([this.corners.topLeftWheel.x, this.corners.topLeftWheel.y, tailLength, this.dir]);
            this.wheelTrails[2].push([this.corners.bottomRightWheel.x, this.corners.bottomRightWheel.y, tailLength, this.dir]);
            this.wheelTrails[3].push([this.corners.bottomLeftWheel.x, this.corners.bottomLeftWheel.y, tailLength, this.dir]);
        }
	}
	this.collision=function(){
		for(var w in toSend["walls"]){
			
		}
	}
};

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

function doLineSegmentsIntersect(p, p2, q, q2) {
	var r = subtractPoints(p2, p);
	var s = subtractPoints(q2, q);

	var uNumerator = crossProduct(subtractPoints(q, p), r);
	var denominator = crossProduct(r, s);

	if (uNumerator == 0 && denominator == 0) {
		if (equalPoints(p, q) || equalPoints(p, q2) || equalPoints(p2, q) || equalPoints(p2, q2)) {
			return true
		}
		return !allEqual(
				(q.x - p.x < 0),
				(q.x - p2.x < 0),
				(q2.x - p.x < 0),
				(q2.x - p2.x < 0)) ||
			!allEqual(
				(q.y - p.y < 0),
				(q.y - p2.y < 0),
				(q2.y - p.y < 0),
				(q2.y - p2.y < 0));
	}

	if (denominator == 0) {
		return false;
	}

	var u = uNumerator / denominator;
	var t = crossProduct(subtractPoints(q, p), s) / denominator;

	return (t >= 0) && (t <= 1) && (u >= 0) && (u <= 1);
}
function crossProduct(point1, point2) {
	return point1.x * point2.y - point1.y * point2.x;
}
function subtractPoints(point1, point2) {
	var result = {};
	result.x = point1.x - point2.x;
	result.y = point1.y - point2.y;

	return result;
}
function equalPoints(point1, point2) {
	return (point1.x == point2.x) && (point1.y == point2.y)
}

function allEqual(args) {
	var firstValue = arguments[0],
		i;
	for (i = 1; i < arguments.length; i += 1) {
		if (arguments[i] != firstValue) {
			return false;
		}
	}
	return true;
}