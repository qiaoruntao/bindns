//
// POLLER CLIENT FOR THE NDNS LOAD BALANCER
//
// Provides client side API to integrate the poller into the
// webserver. This responds to the requests by the poller-server.
//

var os = require('os');
var net = require('net');

var netResponseTime = 0;
var requestsServed  = 1;
var averageResponseTime = 0;
var server;

//
// Initialize the poller client
//
exports.startPoller = function () {
  netResponseTime = 0;
  requestsServed = 1;
  averageResponseTime = 0;
  server = dgram.createServer(function (client) {
    client.write(getLoadMetric());
    client.end();
  });
  server.listen(3000);
}

//
// Notify the poller of the time taken to serve a request
//
exports.notifyResponseTime = function(responseTime) {
  netResponseTime = netResponseTime + responseTime;
  requestsServed = requestsServed + 1;
  averageResponseTime = netResponseTime/requestsServed;
}

//
// Get current system load metric
//
function getLoadMetric() {
  var laodAvg = os.loadavg();
  var memFrac = os.freemem()/os.totalmem();
  return 0.5*averageResponseTime + 0.2*memFrac + 0.15*loadAvg[0] + 0.1*loadAvg[1] + 0.05*loadAvg[2];
}
