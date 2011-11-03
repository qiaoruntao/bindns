//
// POLLER SERVER FOR THE NDNS LOAD BALANCER
//
// Provides server side API for accessing polling information from
// all clients that are to be load balanced amongst.
//

var dgram = require('dgram');

var pollingList = [];
var servSocket;

//
// Create a server to listen for clients
//
exports.createServer = function(portNumber) {
  servSocket = dgram.socket('udp4');
  servSocket.on('message', function(msg, rinfo) {
    console.log('Got: '+msg+' from '+rinfo.address);
    data = {
      'Hostname'    : rinfo.address,
      'LoadMetric'  : msg
    };
    updatePollingList(data);
  });
  servSocket.bind(portNumber)
}

//
// Update data of some client in the pollingList. Messages are expected in the format
// { 'Hostname' : <>, 'LoadMetric' : <> }
//
function updatePollingList(data) {
  pollingList.push(newHost);
}
exports.updatePollingList = updatePollingList; 

