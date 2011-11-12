//
// POLLER CLIENT FOR THE NDNS LOAD BALANCER
//
// Provides client side API to integrate the poller into the
// webserver. This responds to the requests by the poller-server.
//

var os = require('os');
var dgram = require('dgram');
var Buffer = require('buffer').Buffer;

var UPDATE_LOAD_THRESHOLD = 0.1;
var ALWAYS_UPDATE_THRESHOLD = 0.6;
var LAST_SENT_LOAD_METRIC = 0;
var myHostName = '';

//
// Check if the load has changed beyond threhold and then new data to the server 
//
function checkAndSend(servHostname, servPortNumber, myHostName) {
  if(Maths.abs(getLoadMetric()-LAST_SENT_LOAD_METRIC)>UPDATE_LOAD_THRESHOLD || getLoadMetric()>=ALWAYS_UPDATE_THRESHOLD) {
    sendData(servHostname, servPortNumber, myHostname);
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
  }, 60000);
};

//
// Send load data to the server identified by host and port
//
function sendData(hostname, port) {
  console.log('seding data to '+hostname+' and '+port+'\n');
  var sock = dgram.createSocket('udp4');
  LAST_SENT_LOAD_METRIC = getLoadMetric();
  var buf = new Buffer("{'Hostname':"+myHostName+",'LoadMetric': "+LAST_SENT_LOAD_METRIC"}");
  sock.send(buf, 0, buf.length, port, hostname);
  sock.close();
}

//
// Get current system load metric
//
function getLoadMetric() {
  var loadAvg = os.loadavg();
  return (0.5*loadAvg[0] + 0.3333*loadAvg[1] + 0.16667*loadAvg[2]);
}

