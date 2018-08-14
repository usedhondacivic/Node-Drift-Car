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
        console.log(currentPlayer.x);
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

var player=function(x,y){
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
}

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