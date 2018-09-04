var trackNode = function(centerX, centerY, direction, width){
    this.cX = centerX;
    this.cY = centerY;
    this.dir = direction;
    this.width = width;
};

var trackOne = [
    new trackNode(100, 200, Math.PI/2, 10),
    new trackNode(300, 200, Math.PI/2, 10)
];

var renderTrack = function(track){
    stroke(0);
    strokeWeight(2);
    for(var i=0; i<track.length-1; i++){
        var current = track[i];
        var next = track[i+1];
        if(current.dir === next.dir){
            line(current.cX+Math.cos(current.dir)*current.width, current.cY+Math.sin(current.dir)*current.width, next.cX+Math.cos(next.dir)*next.width, next.cY+Math.sin(next.dir)*next.width);
            line(current.cX+Math.cos(current.dir+Math.PI)*current.width, current.cY+Math.sin(current.dir+Math.PI)*current.width, next.cX+Math.cos(next.dir+Math.PI)*next.width, next.cY+Math.sin(next.dir+Math.PI)*next.width);
        }else{
            
        }
    }
};

var draw= function() {
    background(255, 255, 255);
    
    renderTrack(trackOne);
};