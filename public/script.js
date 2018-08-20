//IO
var socket = io();

//Key events
var keys=[];
keyPressed=function(){socket.emit("key press", keyCode);};
keyReleased=function(){socket.emit("key release", keyCode);};

function mousePressed() {
    socket.emit("click", {x:mouseX, y:mouseY})
}

var setup = function() {
    createCanvas(document.body.clientWidth, window.innerHeight);
}

socket.emit("new player");
socket.on("state", function(items){
    background(255, 255, 255);
    for (var id in items["players"]) {
        var player = items["players"][id];
        renderPlayer(player);
    }
    for (var id in items["bullets"]) {
        var bullet = items["bullets"][id];
        renderBullet(bullet);
    }
});

var renderPlayer = function(instance) {
    /*noStroke();
    fill(0, 0, 0);
    rect(instance.x,instance.y,instance.width,instance.height);*/
    /*if(false){
        instance.wheelTrails[0].push([instance.pos.x + 2*Math.sin(-instance.dir) + -12*cos(-instance.dir), instance.pos.y + 2*Math.cos(-instance.dir) + 12*Math.sin(-instance.dir), 50, instance.dir]);
        instance.wheelTrails[1].push([instance.pos.x + -2*Math.sin(-instance.dir) + -12*cos(-instance.dir), instance.pos.y + -2*Math.cos(-instance.dir) + 12*Math.sin(-instance.dir), 50, instance.dir]);
        instance.wheelTrails[2].push([instance.pos.x + 2*Math.sin(-instance.dir) + 2*cos(-instance.dir), instance.pos.y + 2*Math.cos(-instance.dir) - 2*Math.sin(-instance.dir), 50, instance.dir]);
        instance.wheelTrails[3].push([instance.pos.x + -2*Math.sin(-instance.dir) + 2*cos(-instance.dir), instance.pos.y + -2*Math.cos(-instance.dir) - 2*Math.sin(-instance.dir), 50, instance.dir]);
    }
    if(instance.wheelTrails[0].length>0){
        line(instance.wheelTrails[0][instance.wheelTrails[0].length-1][0], instance.wheelTrails[0][instance.wheelTrails[0].length-1][1], instance.pos.x + 5*Math.sin(-instance.dir) + -5*cos(-instance.dir), instance.pos.y + 5*Math.cos(-instance.dir) + 5*Math.sin(-instance.dir));
        line(instance.wheelTrails[1][instance.wheelTrails[1].length-1][0], instance.wheelTrails[1][instance.wheelTrails[1].length-1][1], instance.pos.x + 5*Math.sin(-instance.dir) + -5*cos(-instance.dir), instance.pos.y + 5*Math.cos(-instance.dir) + 5*Math.sin(-instance.dir));
    }
    for(var i in instance.wheelTrails){
        for(var o=0; o<instance.wheelTrails[i].length; o++){
            instance.wheelTrails[i][o][2]--;
            if(instance.wheelTrails[i][o][2]<0){
                instance.wheelTrails[i].splice(o,1);
            }
            if(o+1 < instance.wheelTrails[i].length){
                noStroke();
                fill(0, instance.wheelTrails[i][o][2]*5);
                pushMatrix();
                translate(instance.wheelTrails[i][o][0], instance.wheelTrails[i][o][1]);
                rotate(instance.dir);
                //rect(-2.5, -1, 5, 2);
                noStroke();
                popMatrix();
            }
        }
    }*/
    noStroke();
    fill(0, 255, 255);
    push();
        translate(instance.pos.x,instance.pos.y);
        rotate(instance.dir);
        rect(-15,-5,20,10);
    pop();
}

var renderBullet = function(instance) {
    noStroke();
    fill(255,0,0);
    //rect(instance.x,instance.y,3,3);
}