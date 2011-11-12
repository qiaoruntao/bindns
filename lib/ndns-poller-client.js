//
// POLLER CLIENT FOR THE NDNS LOAD BALANCER
//
// Provides client side API to integrate the poller into the
// webserver. This responds to the requests by the poller-server.
//

var os = require('os');
var dgram = require('dgram');
var Buffer = require('buffer').Buffer;

var UPDATE_LOAD_THRESHOLD = 0.05;
var ALWAYS_UPDATE_THRESHOLD = 0.6;
var LAST_SENT_LOAD_METRIC = 0;
var myHostName = '';

//
// Check if the load has changed beyond threhold and then new data to the server 
//
function checkAndSend(servHostname, servPortNumber) {
	if( Math.abs ( getLoadMetric() - LAST_SENT_LOAD_METRIC ) > UPDATE_LOAD_THRESHOLD || getLoadMetric() >= ALWAYS_UPDATE_THRESHOLD) {
    sendData(servHostname, servPortNumber);
  }
}

//
// Initialize the poller client
//
exports.startPoller = function (servHostname, servPortNumber, hostName) {
  myHostName = hostName;
  sendData(servHostname, servPortNumber);
  setInterval(function() {
    checkAndSend(servHostname, servPortNumber);
  }, 1000);
};

//
// Send load data to the server identified by host and port
//
function sendData(servHostName, port) {
  console.log('sending data to '+servHostName+' and '+port+'\n');
  var sock = dgram.createSocket('udp4');
  LAST_SENT_LOAD_METRIC = getLoadMetric();
  var buf = new Buffer("{'Hostname': '"+myHostName+"','LoadMetric': "+LAST_SENT_LOAD_METRIC+"}");
  sock.send(buf, 0, buf.length, port, servHostName);
  sock.close();
}

//
// Get current system load metric
//
function getLoadMetric() {
  var loadAvg = os.loadavg();
	return loadAvg[0];
}

