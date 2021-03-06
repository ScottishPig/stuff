// chatserver.js -- Let's fucking try this...

const http = require('http');
const querystring = require('querystring');
const crypto = require('crypto');


// Configuration items
const adminPW = 'mark';
const clientTimeout = 60; // in seconds, client pings server every 1.5s
const bufsize = 50;
const hostname = '0.0.0.0';
const port = 3000;


var data = [];
var users = [];
var blockedIps = [];

const blockedMessage = JSON.stringify( {"error": "The server administrator has blocked your IP address."} );
const noUNMessage = JSON.stringify( {"error": "A request to connect came in without a username."} );
const duplicateUNMessage = JSON.stringify( {"error": "A user by that name is already connected."} );
const notAdminMessage = JSON.stringify( {"error": "You are unauthorized to perform that operation."} );
const badTokenMessage = JSON.stringify( {"error": "Your session has expired, or something is wrong with your user token."} );

function timestamp() {
    return new Date().getTime();
}

function makeToken(un, ts) {
    return crypto.createHmac('sha256', un + ts).digest('hex');
}

function getUserFromToken(token) {
    for (i in users) {
        if ( users[i]['token'] === token ) {
            return users[i];
        } 
    }
    return null;
}

function isDuplicate(un) {
    for ( i in users ) {
        if ( users[i]['un'] === un ) {
            return true;
        }
    }
    return false;
}

function clearStaleUsers() {
    // Modifying the array while we're iterating over it
    // may cause some missed users, but if we execute this
    // enough, it won't matter.
    var threshold = timestamp() - (clientTimeout * 1000);
    for ( i in users ) {
        if ( users[i]['active'] < threshold ) {
            data.push({'id': makeToken( users[i]['token'], timestamp() ), 'msg': 'User ' + users[i]['un'] + ' has left.' })
            users.splice(i, 1);
        }
    }
}

var server = http.createServer((req, res) => {
    console.log("Req " + req.connection.remoteAddress + " - " + req.url );
    
    var s = req.url.substr(req.url.indexOf("?") + 1);
    var q = querystring.parse(s);
    var ip = req.connection.remoteAddress;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Connection', 'close');
    res.statusCode = 200;

    for ( i in blockedIps ) {
        if ( blockedIps[i] === ip ) {
            res.statusCode = 403;
            res.end(blockedMessage);
            return;
        }
    }

    if ( req.url.startsWith('/msg?') ) {
        if ( q['token'] && getUserFromToken(q['token']) !== null ) {
            var u = getUserFromToken(q['token']);
            u['active'] = timestamp();
            if ( q['message'] && q['message'].trim().length > 0 ) {
                data.push( {'id': makeToken( q['message'], timestamp() ), 'msg': u['un'] + ' - ' + q['message'] } );
                while ( data.length > bufsize ) {
                    data.shift();
                }
            }
            res.end(JSON.stringify({'messages': data}));
        } else {
            res.statusCode = 400;
            res.end(badTokenMessage);
        }
        return;
    } else if ( req.url.startsWith("/connect?" ) ) {
        if (q['username'] && !isDuplicate(q['username'])) {
            var un = q['username'];
            var ts = timestamp();
            var token =  makeToken(un, ts);
            users.push( {'un': un, 'ip': ip, 'active': ts, 'token': token} );
            res.end(JSON.stringify({'token': token}));
        } else if (q['username'] ) {
            res.statusCode = 400;
            res.end(duplicateUNMessage);
        } else {
            res.statusCode = 400;
            res.end(noUNMessage);
        }
        return;
    } else if ( req.url.startsWith('/users?') ) {
        // This is for use by the admin... shows IPs / tokens
        if ( q['pw'] === adminPW ) {
            res.end(JSON.stringify(users));
        } else {
            res.statusCode = 403;
            res.end(notAdminMessage);
        }
        return;
    } else if ( req.url.startsWith('/activeUsers') ) {
        // This is for use by a client.
        var u = [];
        for ( i in users ) {
            u.push( users[i]['un']);
        }
        res.end( JSON.stringify({'users': u}));
        return;
    } else if ( req.url.startsWith('/block?') ) {
        if ( q['pw'] === adminPW ) {
            if ( q['ip'] ) {
                blockedIps.push(q['ip']);
            }
            res.end(JSON.stringify(blockedIps));
        } else {
            res.statusCode = 403;
            res.end(notAdminMessage);
        }
        return;
    } else if ( req.url.startsWith('/unblock?') ) {
        if ( q['pw'] === adminPW ) {
            if ( q['ip'] ) {
                for ( i in blockedIps ) {
                    if ( blockedIps[i] === q['ip'] ) {
                        blockedIps.splice(i, 1);
                        break;
                    }
                }
            }
            res.end(JSON.stringify(blockedIps));
        } else {
            res.statusCode = 403;
            res.end(notAdminMessage);
        }
        return;
    }

    // Any other request-- just return the current chat buffer.
    res.end( JSON.stringify({'messages': data}));
});



server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});

setInterval(clearStaleUsers, 10000);