module.exports = function() {
    this.Vector = function(x, y) {
        this.x = x || 0;
        this.y = y || 0;
    }
    /* INSTANCE METHODS */
    this.Vector.prototype = {
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
            if(this.length() !== 0){
                return this.divide(this.length());
            }
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
    }

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
        else return new Vector(a.x * b, a.y * b);
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

    this.doLineSegmentsIntersect = function(p, p2, q, q2) {
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