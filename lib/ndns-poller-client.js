//
// POLLER CLIENT FOR THE NDNS LOAD BALANCER
//
// Provides client side API to integrate the poller into the
// webserver. This responds to the requests by the poller-server.
//

var os = require('os');
var dgram = require('dgram');
var Buffer = require('buffer').Buffer;

var netResponseTime = 0;
var requestsServed  = 1;
var averageResponseTime = 0;

//
// Initialize the poller client
//
exports.startPoller = function (servHostname, servPortNumber) {
  netResponseTime = 0;
  requestsServed = 1;
  averageResponseTime = 0;
  setInterval(function(servHostname, portNumber) {
    var sock = dgram.createSocket('udp4');
    var buf = new Buffer(""+getLoadMetric());
    sock.send(buf, 0, buf.length, servPortNumber, servHostname);
    sock.close();
  }, 60000);
};

//
// Update the average time taken to serve a request
//
exports.updateResponseTime = function(responseTime) {
  netResponseTime = netResponseTime + responseTime;
  requestsServed = requestsServed + 1;
  averageResponseTime = netResponseTime/requestsServed;
};

//
// Get current system load metric
//
function getLoadMetric() {
  var loadAvg = os.loadavg();
  var memFrac = os.freemem()/os.totalmem();
  return 0.5*averageResponseTime + 0.2*memFrac + 0.15*loadAvg[0] + 0.1*loadAvg[1] + 0.05*loadAvg[2];
}

