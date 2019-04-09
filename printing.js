/**
Data loading and parsing
**/

var circuitsPath = "./client/circuits";
var clientCircuitsPath = "/circuits";
var circuits;
var validCars = [];


async function loadCircuits(){
    console.log("Starting server...");
    //Get car names
	var carsTemp = JSON.parse(fs.readFileSync("./client/images/cars/data.json"));
	for(var key in carsTemp){
		validCars.push(key);
    }
    //Load circuit data (names and file locations)
	circuits = JSON.parse(fs.readFileSync(circuitsPath + "/data.json"));
	console.log("Loaded circuit overview.");
	for(var p in circuits){
        var c = circuits[p];
        //Store file paths
		var paths = {
			recordsPath: circuitsPath + c.location + c.records,
			trackPath: circuitsPath + c.location + c.track,
			sandPath: circuitsPath + c.location + c.sand,
			svgPath: circuitsPath + c.location + c.svg,
			fullTrackPath: circuitsPath + c.location + c.fullTrack
        };
        //Load records
		c.recordData = JSON.parse(fs.readFileSync(paths.recordsPath));
        console.log("["+p+"]: loaded record data.");
        //Load track pixel data
		c.trackData = await Jimp.read(paths.trackPath);
        console.log("["+p+"]: loaded track data.");
        //Load sand pixel data
		c.sandData = await Jimp.read(paths.sandPath);
        console.log("["+p+"]: loaded sand data.");
        //Read vector (svg) from path
		var parser = new xml2js.Parser();
        var data = fs.readFileSync(paths.svgPath);
        //Parse and navigate the svg's xml to get convert svg data into wall, spawn, and AI waypoint objects. (Find xml structure by printing to console)
		parser.parseString(data, (err, result) => {
			for(var i in result.svg.g){
                //Walls
				if(result.svg.g[i].$.id === "Walls"){
                    //Full polygon
					if(result.svg.g[i].polygon){
						for(var o in result.svg.g[i].polygon){
							var points = toPoints({type: 'polygon', points: result.svg.g[i].polygon[o].$.points.replace(/(\r\n\t|\n|\r\t|\t)/gm,"").trim()});
							for(var j = 1; j<points.length; j++){
								var start = points[j-1];
								var end = points[j];
								c.walls.push(new wall(start.x, start.y, end.x, end.y));
							}
						}
                    }
                    //Uncompleted polygon (i.e. series of connected linesegments.)
					if(result.svg.g[i].polyline){
						for(var o in result.svg.g[i].polyline){
							var points = toPoints({type: 'polyline', points: result.svg.g[i].polyline[o].$.points.replace(/(\r\n\t|\n|\r\t|\t)/gm,"").trim()});
							for(var j = 1; j<points.length; j++){
								var start = points[j-1];
								var end = points[j];
								c.walls.push(new wall(start.x, start.y, end.x, end.y));
							}
						}
                    }
                }
                //Spawns
                else if(result.svg.g[i].$.id === "Spawns"){
					if(result.svg.g[i].circle){
						for(var o in result.svg.g[i].circle){
							var circle = result.svg.g[i].circle[o].$;
							c.spawns.push({x: parseFloat(circle.cx), y: parseFloat(circle.cy)});
						}
						c.spawns.reverse();
					}
                }
                //AI waypoints
                else if(result.svg.g[i].$.id === "Waypoints"){
					if(result.svg.g[i].polyline){
						for(var o in result.svg.g[i].polyline){
							var points = toPoints({type: 'polyline', points: result.svg.g[i].polyline[o].$.points.replace(/(\r\n\t|\n|\r\t|\t)/gm,"").trim()});
							for(var j = 0; j<points.length; j++){
								c.waypoints.push(points[j]);
							}
						}
					}
				}
            }
            //Setup the walls that have just been created (calculate slope and deltas for collision later)
			for(var w in c.walls){
				c.walls[w].setup();
			}
		});
        console.log("["+p+"]: loaded vector data.");
        //Find track size from the full track image. Used later on client side.
		parser = new xml2js.Parser();
		var data = fs.readFileSync(paths.fullTrackPath);
		parser.parseString(data, (err, result) => {
			var coords = result.svg.$.viewBox.split(" ");
			c.viewBox = {
				x:coords[2],
				y:coords[3]
			};
		});
		console.log("["+p+"]: loaded viewbox data.");
	}
    console.log("Server ready.");
    //Start the express server.
	server.listen(1234, function (err) {
		if (err) throw err
		console.log('Now listening on port 1234');
	});
}

loadCircuits();


/**
 Player on player collisions
 **/

 //Loop through every other car to check collision
 for(var i in rooms[this.room].players){
    var otherCar = rooms[this.room].players[i];
    if(otherCar === this){
        //Can't collide with yourself, break out
        return;
    }
    //Are the cars touching?
    if(carCollision(this, otherCar)){
        //Vector clones so to not effect by reference
        var v1 = this.vel.clone();
        var x1 = this.pos.clone();
        var v2 = otherCar.vel.clone();
        var x2 = otherCar.pos.clone();
        //Deltas
        var deltaX1 = Vector.subtract(x1, x2);
        var deltaV1 = Vector.subtract(v1, v2);
        var deltaX2 = Vector.subtract(x2, x1);
        var deltaV2 = Vector.subtract(v2, v1);
        //Check if cars are on top of each other
        if(deltaX1.length() == 0 || deltaX2.length() == 0){
            //Will divide by zero, break out
            return;
        }
        //Normal vector from the other car to this car
        var posDiff = Vector.subtract(this.pos, otherCar.pos);
        posDiff.normalize();
        //Move the cars apart slowly until they are no longer touching
        while(carCollision(this, otherCar)){
            //Find small vectors that send the cars directly away from each other
            var thisVel = posDiff.clone();
            var otherVel = Vector.multiply(posDiff, -1);
            thisVel.multiply(0.5);
            otherVel.multiply(0.5);
            //Add the vectors to the positions
            this.pos.add(thisVel);
            otherCar.pos.add(otherVel);
            //Update corner variables for collsion to the new position
            this.setCorners();
            otherCar.setCorners(null);
            if(posDiff.length() == 0){
                //Cars aren't moving, break out to avoid infinte loop
                break;
            }
        }
        //Apply elastic collision algorithm to simulate rebound
        this.vel = Vector.subtract(v1, Vector.multiply(deltaX1, Vector.dot(deltaV1, deltaX1)/Math.pow(deltaX1.length(), 2)));
        this.vel.multiply(this.bounce);
        otherCar.vel = Vector.subtract(v2, Vector.multiply(deltaX2, Vector.dot(deltaV2, deltaX2)/Math.pow(deltaX2.length(), 2)));
        otherCar.vel.multiply(this.bounce);
    }
}


/**
 Waypoint system for race placement and record keeping
**/

this.updateWaypoint=function(){
    //Find closest waypoing to this car and store it
    var close = rooms[this.room].findClosestWaypoint(this.pos);
    this.waypointLocation = rooms[this.room].waypoints[this.currentWaypoint];
    this.positionIndex = this.lap * rooms[this.room].waypoints.length + parseInt(this.currentWaypoint);
    //Check if the current waypoint is the last in the track loop AND the closest waypoint is on the other side of the finish line. This signifes the completion of a lap.
    if(this.currentWaypoint == (rooms[this.room].waypoints.length-1) && close < 5){
        //Check if this is the first time crossing. Starts lap time if so.
        if(this.lap<1){
            this.startedRace = true;
        }else{
            //Add lap split to splits
            this.splits.push(this.lapTime);
            //Make sure record data is being kept
            if(!rooms[this.room].recordData.lapTime){
                //If not, break out
                return;
            }
            //Loop through records
            for(var i in rooms[this.room].recordData.lapTime){
                //Check if the lap time is lower than the record, working from fastest to slowest
                if(this.lapTime<rooms[this.room].recordData.lapTime[i][0]){
                    //Edit the records to reflect the new record
                    rooms[this.room].recordData.lapTime.splice(i, 0, [this.lapTime, this.name]);
                    rooms[this.room].recordData.lapTime.splice(-1);
                    //Find place sufix
                    var suffix = "th";
                    if(i == 0){
                        suffix = "st";
                    }else if(i == 1){
                        suffix = "nd";
                    }else if(i == 2){
                        suffix = "rd";
                    }
                    //Display a new record message in the chat
                    serverMessage("["+this.name+"] just set the "+(parseInt(i)+1)+suffix+" fastest lap of all time with a time of "+this.lapTime.toFixed(2)+"s.", this.room);
                    //Write the new records to the file
                    fs.writeFileSync(rooms[this.room].recordsPath, JSON.stringify(rooms[this.room].recordData, null, 2));
                    //Break out of the loop because we don't need to check any of the slower track times
                    break;
                }
            }
        }
        //Update lap data
        this.lapStart = rooms[this.room].seconds - rooms[this.room].raceStart;
        this.lap++;
        //Update the waypoint
        this.currentWaypoint = close;
    }else{
        //If the new waypoint isn't a huge jump away from the current one (i.e. across walls, backwards across the finish line), change the current to be the new.
        if(Math.abs(close - this.currentWaypoint) < 5){
            this.currentWaypoint = close;
        }
    }
}


/**
 Car friction physics to simulate realistic drifting
**/

this.sideFriction=function(sideFriction, forwardFriction){
    //Set friction coeffecients given which materal this car is on
    this.setFriction();
    //Set direction vectors relative to this car
    var forward = new Vector(Math.cos(this.dir), Math.sin(this.dir));
    var right = new Vector(Math.cos(this.dir+Math.PI/2), Math.sin(this.dir+Math.PI/2));
    //Define velocity vectors
    var forwardVelocity = new Vector();
    var rightVelocity = new Vector();
    //Decompose the car's velocity vector along both the forward the right vectors
    forwardVelocity = forward.multiply(Vector.dot(this.vel, forward));
    rightVelocity = right.multiply(Vector.dot(this.vel, right));
    //Multiply the velocity vectors by the respective friction coefficents. By applying more friction along the right axis (perpendicular to the wheels) the car moves and feels more like a real car
    forwardVelocity.multiply(forwardFriction);
    rightVelocity.multiply(sideFriction);
    //Set the velocity reflect proper value adjusted for friction
    this.vel = forwardVelocity.add(rightVelocity);
    //Set variable later used to determine if the car is drifting
    this.rightVel = rightVelocity;
    //Update the corner locations
    this.setCorners();
};