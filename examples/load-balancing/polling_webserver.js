//
// Example polled webserver for NDNS load balancer
//

var ndns = require('../../lib/ndns');
var http = require('http');

ndns.poller.client.startPoller("127.0.0.1", 5000);

http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Hello World\n');
}).listen(3000, "127.0.0.1");

console.log('Server running at http://127.0.0.1:3000/');
