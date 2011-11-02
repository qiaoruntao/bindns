//
// POLLER CLIENT FOR THE NDNS LOAD BALANCER
//
// Provides client side API to integrate the poller into the
// webserver. This responds to the requests by the poller-server.
//

var netResponseTime = 0;
var requestsServed  = 1;
var averageResponseTime = 0;

//
// Initialize the poller client
//
exports.startPoller = function () {
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
  return 0;
}
