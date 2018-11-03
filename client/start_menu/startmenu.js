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
}

function submit() {
    if(textBox.value.length > 0){
        sessionStorage.setItem('nickname', textBox.value);
        sessionStorage.setItem('setup', "true");
        window.location.replace("./race");
    }else{
        document.getElementById("warning").style.display = "inline-block";
    }
}