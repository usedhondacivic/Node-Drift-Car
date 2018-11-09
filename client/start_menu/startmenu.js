
var socket = io();

var currentPage="titlePage";
var textBox;

window.onload = function(){
    sessionStorage.setItem('setup', "false");
    textBox = document.getElementById("nickname");

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

function submit() {
    if(textBox.value.length > 0){
        sessionStorage.setItem('nickname', textBox.value);
        sessionStorage.setItem('setup', "true");
        window.location.replace("./race");
        //switchPage("carSelectPage");
    }else{
        document.getElementById("warning").style.display = "block";
    }
}

function switchPage(newPage) {
    document.getElementById(currentPage).style.display = "none";
    currentPage = newPage;
    document.getElementById(currentPage).style.display = "inline-block";
}