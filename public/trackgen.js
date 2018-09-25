var keys=[];
keyPressed=function(){keys[keyCode] = true;};
keyReleased=function(){keys[keyCode] = false;};

var setup = function() {
    createCanvas(document.body.clientWidth, window.innerHeight);
}

var trackNode = function(centerX, centerY, direction, width, cw){
    this.cX = centerX;
    this.cY = centerY;
    this.topX = 0;
    this.topY = 0;
    this.botX = 0;
    this.botY = 0;
    this.yInt = 0;
    this.slope = 0;
    this.dir = direction;
    this.width = width;
    this.cw = cw;
    this.setup = function(){
        this.topX = this.cX+Math.cos(this.dir)*this.width;
        this.topY = this.cY+Math.sin(this.dir)*this.width;
        this.botX = this.cX+Math.cos(this.dir+Math.PI)*this.width;
        this.botY = this.cY+Math.sin(this.dir+Math.PI)*this.width;
        if(Math.cos(this.dir) !== 0){
            this.slope = Math.sin(this.dir)/Math.cos(this.dir);
        }
        this.yInt = this.cY-this.cX*this.slope;
    };
};

var trackOne = [
    new trackNode(100, 200, Math.PI/2, 30),
];


var renderTrack = function(track, currentBrush){
    stroke(0);
    strokeWeight(2);
    currentBrush.track = track;
    for(var i=0; i<track.length; i++){
        track[i].setup();
        var current = track[i];
        if(i===track.length-1){
            var next = currentBrush;
        }else{
            var next = track[i+1];
        }
        line(current.topX, current.topY, current.botX, current.botY);
        stroke(0,255,255);
        line(next.topX, next.topY, next.botX, next.botY);
        if(current.dir === next.dir){
            line(current.topX, current.topY, next.topX, next.topY);
            line(current.botX, current.botY, next.botX, next.botY);
        }else{
            //https://mathwizz.com/algebra/help/help21.htm
            var centerX;
            var centerY;
            if(current.yInt !== next.yInt){
                if(Math.cos(current.dir) !== 0 && Math.cos(next.dir) !== 0){
                    centerX = (current.yInt - next.yInt)/(next.slope - current.slope);
                    centerY = (current.yInt * next.slope - next.yInt * current.slope)/(next.slope - current.slope);
                }else if(Math.cos(current.dir) === 0){
                    centerX = current.cX;
                    centerY = next.cY - next.slope*(next.cX-current.cY);
                }else{
                    centerX = next.cX;
                    centerY = current.cY - current.slope*(current.cX-next.cY);
                }
            }else{
                console.log("hit");
                var minX = Math.min(current.cX, next.cX);
                var maxX = Math.max(current.cX, next.cX);
                var minY = Math.min(current.cY, next.cY);
                var maxY = Math.max(current.cY, next.cY);
                centerX = (maxX - minX) / 2 + minX;
                centerY = (maxY - minY) / 2 + minY;
            }
            stroke(0);
            fill(255, 0, 0);
            strokeWeight(2);
            noFill();
            if(current.cw){
                var size = (dist(centerX, centerY, current.cX, current.cY)+current.width)*2;
                arc(centerX, centerY, size, size, Math.atan2(current.cY-centerY, current.cX-centerX), Math.atan2(next.cY-centerY, next.cX-centerX));
                var size = (dist(centerX, centerY, current.cX, current.cY)-current.width)*2;
                arc(centerX, centerY, size, size, Math.atan2(current.cY-centerY, current.cX-centerX), Math.atan2(next.cY-centerY, next.cX-centerX));
                ellipse(centerX, centerY, 10, 10);
            }else{
                var size = (dist(centerX, centerY, current.cX, current.cY)+current.width)*2;
                arc(centerX, centerY, size, size, Math.atan2(next.cY-centerY, next.cX-centerX), Math.atan2(current.cY-centerY, current.cX-centerX));
                var size = (dist(centerX, centerY, current.cX, current.cY)-current.width)*2;
                arc(centerX, centerY, size, size, Math.atan2(next.cY-centerY, next.cX-centerX), Math.atan2(current.cY-centerY, current.cX-centerX));
                ellipse(centerX, centerY, 10, 10);
            }
        }
    }
};

var LEFT_ARROW = 37;
var RIGHT_ARROW = 39;
var UP_ARROW = 38;
var DOWN_ARROW = 40;

var brush = {
    mode: "s",
    cX: 100,
    cY: 200,
    topX: 0,
    topY: 0,
    botX: 0,
    botY: 0,
    slope: 0,
    yInt: 0,
    dir: Math.PI/2,
    pole: 0,
    poleX: 0, 
    poleY: 0,
    poleLockX: 0,
    poleLockY: 0,
    lastPole: 0,
    width: 30,
    outside: false, 
    draw: function(){
        noFill();
        stroke(255,0,0);
        line(this.topX, this.topY, this.botX, this.botY);
        ellipse(this.cX+Math.cos(this.dir)*this.pole, this.cY+Math.sin(this.dir)*this.pole, 10, 10);
        this.setup();
        this.update();
    },
    update: function(){
        if(keys[UP_ARROW]){
            this.poleLockX = this.poleX;
            this.poleLockY = this.poleY;
            if(this.lastPole !== this.pole && Math.abs(this.pole) > this.width){
                trackOne.push(new trackNode(this.cX, this.cY, this.dir, this.width));
                this.outside = true;
            }
            if(Math.abs(this.pole) <= this.width && this.outside){
                trackOne.push(new trackNode(this.cX, this.cY, this.dir, this.width));
                this.outside = false;
            }
            if(this.pole > this.width){
                this.cX = Math.cos(this.dir+Math.PI/20) * -this.pole + this.poleX;
                this.cY = Math.sin(this.dir+Math.PI/20) * -this.pole + this.poleY;
                this.dir = Math.atan2(this.poleY - this.cY, this.poleX - this.cX);
                trackOne[trackOne.length-1].cw = true;
            }else if(this.pole < -this.width){
                this.cX = Math.cos(this.dir-Math.PI/20) * -this.pole + this.poleX;
                this.cY = Math.sin(this.dir-Math.PI/20) * -this.pole + this.poleY;
                this.dir = Math.atan2(this.poleY - this.cY, this.poleX - this.cX) + Math.PI;
                trackOne[trackOne.length-1].cw = false;
            }else{
                this.cX -= Math.cos(this.dir+Math.PI/2)*3;
                this.cY -= Math.sin(this.dir+Math.PI/2)*3;
            }
            this.lastPole = this.pole;
        }
        if(keys[RIGHT_ARROW]){
            this.pole += 5;
            this.poleX = this.cX+Math.cos(this.dir)*this.pole;
            this.poleY = this.cY+Math.sin(this.dir)*this.pole;
        }
        if(keys[LEFT_ARROW]){
            this.pole -= 5;
            this.poleX = this.cX+Math.cos(this.dir)*this.pole;
            this.poleY = this.cY+Math.sin(this.dir)*this.pole;
        }
    },
    setup: function(){
        this.topX = this.cX+Math.cos(this.dir)*this.width;
        this.topY = this.cY+Math.sin(this.dir)*this.width;
        this.botX = this.cX+Math.cos(this.dir+Math.PI)*this.width;
        this.botY = this.cY+Math.sin(this.dir+Math.PI)*this.width;
        if(Math.cos(this.dir) !== 0){
            this.slope = Math.sin(this.dir)/Math.cos(this.dir);
        }
        this.yInt = this.cY-this.cX*this.slope;
    }
};

var mode  = "s";

var draw= function() {
    background(255, 255, 255);
    renderTrack(trackOne, brush);
    brush.draw();
};