var server = 'http://127.0.0.1:3000/';
var userNameMode = true;

var chatDiv = document.createElement("div");
var inputBox = document.createElement("input");
var outputBox = document.createElement("div");

var fillerDiv = document.createElement("div");
fillerDiv.style.height = "2000px";

outputBox.appendChild(fillerDiv);

var userToken = "";
var msgIds = [];

function printUserList(data) {
    var header = document.createElement('p');
    var userList = document.createElement('ul');
    for ( i in data ) {
        var l = document.createElement('li');
        l.textContent = data[i];
        userList.appendChild(l);
    }
    header.textContent = 'Online (' + data.length + ' active users):';
    outputBox.appendChild(header);
    outputBox.appendChild(userList);
}

function isMessageDuplicate(id) {
    for ( i in msgIds ) {
        if ( msgIds[i] === id ) { 
            return true;
        }
    }
    return false;
}

function clearBuffer() {
    //msgIds.length = 0;
    //msgIds = [];
    while ( outputBox.childNodes.length > 0 ) {
        outputBox.removeChild( outputBox.firstChild );
    }
    outputBox.appendChild(fillerDiv);
}

function breakout() {
    var chatWindow = window.open("", "", "width=400,height=320");
    var newBody = chatWindow.document.getElementsByTagName("body")[0];
    chatDiv.style.width = "100%";
    chatDiv.style.height = "100%";
    chatDiv.style.position = "relative";

    newBody.style.overflow = "hidden";
    newBody.appendChild(chatDiv);
    chatDiv.scrollTop = chatDiv.scrollHeight;
}

function printMessages(data) {
    for ( i in data ) {
        if ( !isMessageDuplicate( data[i]['id'] ) ) {
            msgIds.push( data[i]['id'] );
            var p = document.createElement('div');
            p.textContent = data[i]['msg'];
            outputBox.appendChild(p);
        }
    }
}

function handleResponse(data) {
    if ( data['token'] ) {
        var p = document.createElement('div');
        p.textContent = 'Connected!';
        outputBox.appendChild(p);
        userToken = data['token'];
        userNameMode = false;
        document.cookie = 'chatToken=' + data['token'];
        send("","");
    } else if ( data['error'] ) {
        clearBuffer();
        outputBox.focus();
        userNameMode = true;
        var p = document.createElement('div');
        p.textContent = data['error'];
        outputBox.appendChild(p);
        inputBox.value = "Enter a name";
    } else if ( data['users'] ) {
        printUserList( data['users'] );
    } else if ( data['messages'] ) {
        printMessages( data['messages'] );
    }
    chatDiv.scrollTop = chatDiv.scrollHeight;
}

function send(cmd, data) {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
        if ( this.readyState == 4 ) {
            var resp = JSON.parse( xhr.responseText );
            handleResponse(resp);
        }
    };
    xhr.open("GET", server + cmd + data, true );
    xhr.send(null);
}

function reUp() {
    send("msg?", "token=" + userToken );
}

function getCookie(cookie) {
    var name = cookie + "=";
    var cookies = document.cookie.split(';');
    for(i in cookies) {
        var c = cookies[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return false;
}


chatDiv.style.position = "fixed";
chatDiv.style.overflow = "auto";
chatDiv.style.width = "40%";
chatDiv.style.height = "20%";
chatDiv.style.bottom = "3px";
chatDiv.style.right = "3px";
chatDiv.style.padding = "3px";
chatDiv.style.border = "1px solid #000";


outputBox.style.width = "100%";
inputBox.style.width = "100%";


chatDiv.appendChild(outputBox);
chatDiv.appendChild(inputBox);
document.getElementsByTagName("body")[0].appendChild(chatDiv);


var introP1 = document.createElement('div');
var introP2 = document.createElement('div');

introP1.textContent = "Click below to get started!";
introP2.textContent = "Special commands are 'who', 'clear', and 'breakout'";

outputBox.appendChild(introP1);
outputBox.appendChild(introP2);
inputBox.value = "Enter a name";



inputBox.addEventListener("focus", function (x) {
    if ( userNameMode ) {
        inputBox.value = "";
    }
});

inputBox.addEventListener("click", function (x) {
    if ( userNameMode ) {
        inputBox.value = "";
    }
});

inputBox.addEventListener("keypress", function (ev) { 
    if ( ev.keyCode == 13 ) {
        if ( userNameMode ) {
            send("connect?", "username=" + inputBox.value.trim() );
        } else {
            if ( inputBox.value.trim().toLowerCase() === "who" ) {
                send("activeUsers", "");
            } else if ( inputBox.value.trim().toLowerCase() === "clear" ) {
                clearBuffer();
            } else if ( inputBox.value.trim().toLowerCase() === "breakout" ) {
                breakout();
            } else {
                send("msg?", "token=" + userToken + "&message=" + encodeURIComponent(inputBox.value));
            }
        }
        inputBox.value = "";
    }
});




setInterval(reUp, 1500);



// Handle page reloads / existing user.
if ( userNameMode && getCookie('chatToken')) {
    inputBox.value = "";
    userNameMode = false;
    userToken = getCookie('chatToken');
    reUp();
}