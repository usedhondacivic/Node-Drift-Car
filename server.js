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
    this.vel=new Vector(0,0);
    this.x=200;
    this.y=200;
    this.sideFriction=1.00;
    this.forwardFriction=1.00;
    this.speed=0;
    this.accel=0.05;
    this.decl=0.90;
    this.dir=0;
    this.turnSpeed=0.7;
    this.turnDamp=70;
    this.wheelTrails=[[],[],[],[]];
    this.keys=[];
    this.draw=function(){
        this.update();
    };
    this.update=function(){
        this.pos.addTo(this.vel);
        this.vel.addTo(new Vector(Math.cos(this.dir)*this.speed,Math.sin(this.dir)*this.speed));
        var sideVector = new Vector(this.sideFriction, 0);
        sideVector.setDirection(this.dir-Math.PI/2);
        //sideVector.multiplyScalar(this.sideFriction);
        //this.vel.multiplyBy(sideVector);
        var frontVector = new Vector(this.forwardFriction, 0);
        frontVector.setDirection(this.dir);
        this.vel.multiplyBy(frontVector);
        console.log(this.dir);
        this.speed*=this.decl;
        if(this.keys[UP_ARROW]){this.speed+=this.accel;}
        if(this.keys[DOWN_ARROW]){this.speed-=this.accel*0.5;}
        if(this.keys[LEFT_ARROW]){this.dir-=(this.turnSpeed*this.vel.getMagnitude())/this.turnDamp;}
        if(this.keys[RIGHT_ARROW]){this.dir+=(this.turnSpeed*this.vel.getMagnitude())/this.turnDamp;}
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

var Vector = function(x, y) {
    this.x = x || 0;
    this.y = y || 0;
  };
  
  // return the angle of the vector in radians
  Vector.prototype.getDirection = function() {
      return Math.atan2(this.y, this.x);
  };
  
  // set the direction of the vector in radians
  Vector.prototype.setDirection = function(direction) {
      var magnitude = this.getMagnitude();
    this.x = Math.cos(direction) * magnitude;
    this.y = Math.sin(direction) * magnitude;
  };
  
  // get the magnitude of the vector
  Vector.prototype.getMagnitude = function() {
      // use pythagoras theorem to work out the magnitude of the vector
      return Math.sqrt(this.x * this.x + this.y * this.y);
  };
  
  // set the magnitude of the vector
  Vector.prototype.setMagnitude = function(magnitude) {
      var direction = this.getDirection(); 
      this.x = Math.cos(direction) * magnitude;
      this.y = Math.sin(direction) * magnitude;
  };
  
  // add two vectors together and return a new one
  Vector.prototype.add = function(v2) {
      return new Vector(this.x + v2.x, this.y + v2.y);
  };
  
  // add a vector to this one
  Vector.prototype.addTo = function(v2) {
      this.x += v2.x;
    this.y += v2.y;
  };
  
  // subtract two vectors and reutn a new one
  Vector.prototype.subtract = function(v2) {
      return new Vector(this.x - v2.x, this.y - v2.y);
  };
  
  // subtract a vector from this one
  Vector.prototype.subtractFrom = function(v2) {
      this.x -= v2.x;
    this.y -= v2.y;
  };
  
  // multiply this vector by a scalar and return a new one
  Vector.prototype.multiplyScalar = function(scalar) {
    this.x *= scalar;
    this.y *= scalar;
  };
  
  // multiply this vector by the scalar
  Vector.prototype.multiplyBy = function(scalar) {
    this.x *= scalar.x;
    this.y *= scalar.y;
  };
  
  // scale this vector by scalar and return a new vector
  Vector.prototype.divide = function(scalar) {
    return new Vector(this.x / scalar, this.y / scalar);
  };
  
  // scale this vector by scalar
  Vector.prototype.divideBy = function(scalar) {
    this.x /= scalar;
    this.y /= scalar;
  };
  
  // Aliases
  Vector.prototype.getLength = Vector.prototype.getMagnitude;
  Vector.prototype.setLength = Vector.prototype.setMagnitude;
  
  Vector.prototype.getAngle = Vector.prototype.getDirection;
  Vector.prototype.setAngle = Vector.prototype.setDirection;
  
  // Utilities
  Vector.prototype.copy = function() {
    return new Vector(this.x, this.y);
  };
  
  Vector.prototype.toString = function() {
    return 'x: ' + this.x + ', y: ' + this.y;
  };
  
  Vector.prototype.toArray = function() {
    return [this.x, this.y];
  };
  
  Vector.prototype.toObject = function() {
    return {x: this.x, y: this.y};
  };