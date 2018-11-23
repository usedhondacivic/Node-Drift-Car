var socket = io("/menu");

var currentPage="titlePage";
var textBox;
var roomBox;
var serverList;

var pageHistory = [];

window.onload = function(){
    sessionStorage.setItem('setup', "false");
    textBox = document.getElementById("nickname");
    roomBox = document.getElementById("room");
    serverList = document.getElementById("serverList");

    textBox.addEventListener("keyup", function(event) {
        event.preventDefault();
        if (event.keyCode === 13) {
            document.getElementById("submit").click();
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
}