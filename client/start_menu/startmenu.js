var currentPage="titlePage";
var textBox;
var roomBox;

window.onload = function(){
    sessionStorage.setItem('setup', "false");
    textBox = document.getElementById("nickname");
    roomBox = document.getElementById("room");

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
    if(textBox){
        if(textBox.value.length > 0){
            sessionStorage.setItem('nickname', textBox.value);
            sessionStorage.setItem('setup', "true");
            if(roomBox.value.length > 0){
                window.location.replace("./race/"+roomBox.value);
            }else{
                window.location.replace("./race/default"+roomBox.value);
            }
            //switchPage("serverPage");
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