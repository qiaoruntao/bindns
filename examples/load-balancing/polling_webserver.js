//
// Example polling webserver for NDNS load balancer
//

var ndns = require('../../lib/ndns');
var http = require('http');

ndns.poller.client.startPoller(3000);

http.createServer(function (req, res) {
  var startTime = new Date();
  
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Hello World\n');

  var endTime = new Date();
  ndns.poller.client.notifyResponseTime(endTime.getTime()-startTime.getTime());
}).listen(1337, "127.0.0.1");

console.log('Server running at http://127.0.0.1:1337/');
