angleMode = "radians";
var trackNode = function(centerX, centerY, direction, width){
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
    new trackNode(100, 200, Math.PI/2, 50),
    new trackNode(100, 200, Math.PI/2, 50),
];


var renderTrack = function(track){
    stroke(0);
    strokeWeight(2);
    track[track.length-1].setup();
    for(var i=0; i<track.length-1; i++){
        track[i].setup();
        var current = track[i];
        var next = track[i+1];
        line(current.topX, current.topY, current.botX, current.botY);
        line(next.topX, next.topY, next.botX, next.botY);
        if(current.dir === next.dir){
            line(current.topX, current.topY, next.topX, next.topY);
            line(current.botX, current.botY, next.botX, next.botY);
        }else{
            var centerX;
            var centerY;
            if(Math.cos(current.dir) !== 0 && Math.cos(next.dir) !== 0){
                centerX = (current.yInt - next.yInt)/(next.slope - current.slope);
                centerY = (current.yInt*next.slope - next.yInt*current.slope)/(next.slope - current.slope);
            }else if(Math.cos(current.dir) === 0){
                centerX = current.cX;
                centerY = next.cY - next.slope*(next.cX-current.cY);
            }else{
                centerX = next.cX;
                centerY = current.cY - current.slope*(current.cX-next.cY);
            }
            println(dist(centerX, centerY, current.cX, current.cY)+","+dist(centerX, centerY, next.cX, next.cY));
            stroke(0);
            fill(255, 0, 0);
            strokeWeight(2);
            var size = (dist(centerX, centerY, current.cX, current.cY)+current.width)*2;
            noFill();
            arc(centerX, centerY, size, size, Math.atan2(next.cY-centerY, next.cX-centerX), Math.atan2(current.cY-centerY, current.cX-centerX));
        }
    }
};
var mode  = "s";

var draw= function() {
    background(255, 255, 255);
    renderTrack(trackOne);
    if(mouseIsPressed){
        if(mode === "s"){
            trackOne[trackOne.length-1].cX -= Math.cos(trackOne[trackOne.length-1].dir+Math.PI/2)*3;
            trackOne[trackOne.length-1].cY -= Math.sin(trackOne[trackOne.length-1].dir+Math.PI/2)*3;
        }
    }
};