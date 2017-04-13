// remember.js -- arbitrary kvp/JSON bucket that backs up to plaintext.

const http = require('http');
const fs = require('fs');

const hostname = '127.0.0.1';
const port = 3000;

var data = {'test': 'test2'};

const helpString = '<html><head></head><body><p>' +
'Commands:</p> <ul><li>/add?key=value - add or modify a key' +
'<li>/remove?key - remove a key' +
'<li>/keys - list just the keys' +
'<li>/backup - write json to file' +
'</ul></body></html>';


var server = http.createServer((req, res) => {
  var s = req.url.substr( req.url.indexOf("?") + 1 );
  res.statusCode = 200;

  if ( req.url.startsWith("/add?" ) ) {
      s = s.split("=");

      console.log("Setting " + s[0] + " to " + s[1] );
      data[ s[0] ] = s[1];

      res.setHeader('Content-Type', 'application/json');
      res.end( JSON.stringify( data ) );
  } else if ( req.url.startsWith("/remove?") ) {
      if ( data[s] ) {
        delete data[ s ];
      }

      res.setHeader('Content-Type', 'application/json');
      res.end( JSON.stringify( data ) );
  } else if ( req.url.startsWith("/keys") ) {
      res.setHeader('Content-Type', 'application/json');
      res.end( JSON.stringify( Object.keys(data) ) );
  } else if ( req.url.startsWith("/backup") ) {
      fs.writeFile( 'ex-' + new Date().getTime() + '.txt', JSON.stringify(data), (err) => {
          res.setHeader('Content-Type', 'text/plain');
          if ( err ) {
              res.end(err.message);
          } else { 
              res.end("success");
          }
      } );
  } else {
      res.setHeader('Content-Type', 'text/html');
      res.end(helpString);
  }


  console.log("REQ: " + req.url);
});



server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
