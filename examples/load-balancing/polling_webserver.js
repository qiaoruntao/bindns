//
// Example polling webserver for NDNS load balancer
//

var ndns = require('../../lib/ndns');
var http = require('http');

ndns.poller.client.startPoller(localhost, 5000);

http.createServer(function (req, res) {
  var startTime = new Date();
  
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Hello World\n');

  var endTime = new Date();
  ndns.poller.client.updateResponseTime(endTime.getTime()-startTime.getTime());
}).listen(3000, "127.0.0.1");

console.log('Server running at http://127.0.0.1:3000/');
