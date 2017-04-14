
//TODO: userToken should live in a cookie for persistent
// login across pages and userNameMode should be keyed off
// the existence / validity of that cookie.

var server = 'http://127.0.0.1:3000/';
var userNameMode = true;

var chatDiv = document.createElement("div");
var inputBox = document.createElement("input");
var outputBox = document.createElement("div");
var layoutTable = document.createElement("table");

var tblTopRow = document.createElement("tr");
var tblBottomRow = document.createElement("tr");
var tblTopCell = document.createElement("td");
var tblBottomCell = document.createElement("td");

var userToken = "";

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

function handleResponse (data) {
    if ( data['token'] ) {
        userToken = data['token'];
        userNameMode = false;
    } else if ( data['error'] ) {
        outputBox.focus();
        userNameMode = true;
        outputBox.textContent = data['error'];
        inputBox.value = "Enter a name";
    } else if ( data['users'] ) {
        printUserList( data['users'] );
    }
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



tblTopRow.appendChild(tblTopCell);
tblBottomRow.appendChild(tblBottomCell);
layoutTable.appendChild(tblTopRow);
layoutTable.appendChild(tblBottomRow);
tblTopCell.appendChild(outputBox);
tblBottomCell.appendChild(inputBox);

layoutTable.style.width = "100%";
layoutTable.style.height = "100%";
layoutTable.style.borderCollapse = "collapse";
tblBottomRow.style.height = "1ex";


chatDiv.style.position = "fixed";
chatDiv.style.width = "40%";
chatDiv.style.height = "20%";
chatDiv.style.bottom = "3px";
chatDiv.style.right = "3px";
chatDiv.style.border = "1px solid #000";


outputBox.style.width = "100%";
outputBox.style.overflow = "auto";
inputBox.style.cssFloat = "left";
inputBox.style.width = "100%";
outputBox.style.padding = "3px";

chatDiv.appendChild(layoutTable);
document.getElementsByTagName("body")[0].appendChild(chatDiv);



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
            } else {
                send("msg?", "token=" + userToken + "&message=" + encodeURIComponent(inputBox.value));
            }
        }
        inputBox.value = "";
    }
});