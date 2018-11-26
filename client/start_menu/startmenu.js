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
    
    var cars = document.getElementsByClassName("carMaskImage");
    for(var i in cars){
        var tinto = new Tinto(cars[i]);
        cars[i].src = tinto.imageDataWithTintColor("#f44242");
    }
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
            switchPage('serverPage');
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