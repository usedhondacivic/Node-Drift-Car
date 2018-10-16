var keys=[];
keyPressed=function(){keys[keyCode] = true;};
keyReleased=function(){keys[keyCode] = false;};

var trackParts = [
    new straight(200, 200, 0, 20, 200)
];

var straight = function(oX, oY, a, w, len) {
    this.originX = oX;
    this.originY = oY;
    this.angle = a;
    this.width = w;
    this.length = len;
    this.draw = function (){
        var top = [Math.cos(this.angle)*this.width, Math.sin(this.angle)*this.width];
        var bottom = [Math.cos(this.angle+Math.PI/2)*this.width, Math.sin(this.angle+Math.PI/2)*this.width];
        var end = [this.originX + Math.cos(this.angle)*this.length, this.originY + Math.sin(this.angle)*this.length];
        stroke(255, 255, 0);
        strokeWeight(2);
        line(this.originX + top[0], this.originY + top[1], end[0] + top[0], end[1] + top[1]);
        line(this.originX + bottom[0], this.originY + bottom[1], end[0] + bottom[0], end[1] + bottom[1]);
        stroke(255, 0, 0);
        line(this.originX + top[0], this.originY + top[1], this.originX + bottom[0], this.originY + bottom[1]);
        line(end[0] + top[0], end[1] + top[1], end[0] + bottom[0], end[1] + bottom[1]);
    }
}

var curve = function() {

}

var setup = function() {
    createCanvas(document.body.clientWidth, window.innerHeight);
}

var draw = function() {
    for(var i=0; i<trackParts.length; i++){
        trackParts[i].draw();
    }
}