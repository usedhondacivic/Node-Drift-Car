var socket = io("/menu");

var currentPage="titlePage";
var textBox;
var roomBox;
var serverList;

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
    serverList.innerHTML = "";
    for(var i in data){
        var d = data[i];
        var newLine = document.createElement("LI");
        var text = document.createTextNode(d.name+"     "+d.currentPlayers+"/"+d.maxPlayers+"      "+d.track);
        newLine.appendChild(text);
        serverList.appendChild(newLine);
    }
});

function submit() {
    if(textBox){
        if(textBox.value.length > 0){
            sessionStorage.setItem('nickname', textBox.value);
            sessionStorage.setItem('setup', "true");
            if(roomBox.value.length > 0){
                window.location.replace("./race/"+roomBox.value);
            }else{
                window.location.replace("./race/default"+roomBox.value);
            }
        }else{
            document.getElementById("warning").style.display = "block";
        }
    }
}

function switchPage(newPage) {
    document.getElementById(currentPage).style.display = "none";
    currentPage = newPage;
    document.getElementById(currentPage).style.display = "inline-block";
}