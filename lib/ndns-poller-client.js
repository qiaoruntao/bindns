//
// POLLER CLIENT FOR THE NDNS LOAD BALANCER
//
// Provides client side API to integrate the poller into the
// webserver. This responds to the requests by the poller-server.
//

var os = require('os');
var dgram = require('dgram');
var Buffer = require('buffer').Buffer;

var UPDATE_LOAD_THRESHOLD = 0.3;
var LAST_SENT_LOAD_METRIC = 0;

//
// Check if the load has changed beyond threhold and then new data to the server 
//
function checkAndSend(servHostname, servPortNumber) {
  if(Maths.abs(getLoadMetric() - LAST_SENT_LOAD_METRIC)>UPDATE_LOAD_THRESHOLD) {
    sendData(servHostname, servPortNumber);
  }
}

//
// Initialize the poller client
//
exports.startPoller = function (servHostname, servPortNumber) {
  sendData(servHostname, servPortNumber);
  setInterval(function() {
    checkAndSend(servHostname, servPortNumber);
  }, 60000);
};

//
// Send load data to the server identified by host and port
//
function sendData(hostname, port) {
  console.log('seding data to '+hostname+' and '+port+'\n');
  var sock = dgram.createSocket('udp4');
  LAST_SENT_LOAD_METRIC = getLoadMetric();
  var buf = new Buffer(""+LAST_SENT_LOAD_METRIC);
  sock.send(buf, 0, buf.length, port, hostname);
  sock.close();
}

//
// Get current system load metric
//
function getLoadMetric() {
  var loadAvg = os.loadavg();
  return (3*loadAvg[0] + 2*loadAvg[1] + loadAvg[2])/6.0;
}

