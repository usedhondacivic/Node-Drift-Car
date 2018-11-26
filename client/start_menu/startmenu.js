var socket = io("/menu");

var currentPage="titlePage";
var textBox;
var roomBox;
var serverList;
var trackThumbnail;

var pageHistory = [];

var circuitWrappers = [];
var trackSelectIndex = 0;

window.onload = function(){
    sessionStorage.setItem('setup', "false");
    textBox = document.getElementById("nickname");
    roomBox = document.getElementById("room");
    serverList = document.getElementById("serverList");
    trackThumbnail = document.getElementById("trackThumbnail");
    loadJSON("/circuits/data.json", (response) => {
        var circuitData = JSON.parse(response);
        for(var key in circuitData){
            var c = circuitData[key];
            circuitWrappers.push({
                thumbnail: "/circuits"+c.location+c.thumbnail,
                name: key
            });
        }
        trackThumbnail.src = circuitWrappers[0].thumbnail;
        document.getElementById("trackName").innerHTML = circuitWrappers[0].name;
    });

    textBox.addEventListener("keyup", function(event) {
        event.preventDefault();
        if (event.keyCode === 13) {
            document.getElementById("submit").click();
        }
    });

    room.addEventListener("keyup", function(event) {
        event.preventDefault();
        if (event.keyCode === 13) {
            document.getElementById("host").click();
        }
    });
    
    updateCars();
}

socket.on("rooms", function(data){
    if(!serverList){
        return;
    }
    serverList.innerHTML = "<tr><th>Server name</th><th>Players</th><th>Track</th></tr>";
    for(var i in data){
        var d = data[i];
        var newRow = document.createElement("TR");
        var name = document.createElement("TD");
        name.innerHTML = d.name;
        var players = document.createElement("TD");
        players.innerHTML = d.currentPlayers+"/"+d.maxPlayers;
        var track = document.createElement("TD");
        track.innerHTML = d.track;
        var join = document.createElement("input");
        join.setAttribute("type", "button");
        join.setAttribute("onclick", "submit('"+d.name+"')");
        join.setAttribute("class", "smallButton");
        join.setAttribute("value","Join");
        track.appendChild(join);
        newRow.appendChild(name);
        newRow.appendChild(players);
        newRow.appendChild(track);
        serverList.childNodes[0].appendChild(newRow);
    }
    if(Object.keys(data).length == 0){
        var newRow = document.createElement("TR");
        var holder = document.createElement("TD");
        holder.innerHTML = "No servers found. Host a room to play.";
        newRow.appendChild(holder);
        serverList.childNodes[0].appendChild(newRow);
    }
});

function start() {
    if(textBox){
        if(textBox.value.length > 0){
            switchPage('carSelectPage');
        }else{
            document.getElementById("warning").style.display = "block";
        }
    }
};

function submit(room) {
    if(textBox){
        if(textBox.value.length > 0){
            sessionStorage.setItem('nickname', textBox.value);
            sessionStorage.setItem('setup', "true");
            sessionStorage.setItem('map', circuitWrappers[trackSelectIndex].name);
            if(room.length > 0){
                window.location.replace("./race/"+room);
            }else{
                window.location.replace("./race/default");
            }
        }else{
            alert("Hey, what do you think your tryna do buddy.");
        }
    }
};

function switchPage(newPage) {
    document.getElementById(currentPage).style.display = "none";
    pageHistory.push(currentPage);
    currentPage = newPage;
    document.getElementById(currentPage).style.display = "inline-block";
    document.getElementById("backButton").style.display = "inline-block";
};

function backPage() {
    console.log("hit");
    document.getElementById(currentPage).style.display = "none";
    currentPage = pageHistory[pageHistory.length-1];
    pageHistory.pop();
    if(pageHistory.length == 0){
        document.getElementById("backButton").style.display = "none";
    }
    document.getElementById(currentPage).style.display = "inline-block";
};

function cycleTrack(dir){
    trackSelectIndex += dir;
    if(trackSelectIndex < 0){
        trackSelectIndex = circuitWrappers.length-1;
    }
    if(trackSelectIndex >= circuitWrappers.length){
        trackSelectIndex = 0;
    }
    trackThumbnail.src = circuitWrappers[trackSelectIndex].thumbnail;
    document.getElementById("trackName").innerHTML = circuitWrappers[trackSelectIndex].name;
};

function updateCars(){
    var cars = document.getElementsByClassName("carMaskImage");
    var slider = document.getElementById("colorPicker");
    for(var i in cars){
        var tinto = new Tinto(cars[i]);
        console.log(hslToHex(slider.value, 40, 100));
        cars[i].src = tinto.imageDataWithTintColor(hslToHex(slider.value, 100, 80));
    }
}

function loadJSON(src, callback) {   
    var xobj = new XMLHttpRequest();
        xobj.overrideMimeType("application/json");
    xobj.open('GET', src, true); // Replace 'my_data' with the path to your file
    xobj.onreadystatechange = function () {
          if (xobj.readyState == 4 && xobj.status == "200") {
            // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
            callback(xobj.responseText);
          }
    };
    xobj.send(null);  
 };

 function hslToHex(h, s, l) {
    h /= 100;
    s /= 100;
    l /= 100;
    let r, g, b;
    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    const toHex = x => {
      const hex = Math.round(x * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }