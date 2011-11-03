//
// POLLER SERVER FOR THE NDNS LOAD BALANCER
//
// Provides server side API for accessing polling information from
// all clients that are to be load balanced amongst.
//

var dgram = require('dgram');

var clientList = new Object();
var min = '';
var servSocket;

//
// Create a server to listen for clients
//
exports.createServer = function(portNumber) {
  servSocket = dgram.createSocket('udp4');
  servSocket.on('message', function(msg, rinfo) {
    data = {
      'Hostname'        : rinfo.address,
      'LoadMetric'      : parseFloat(msg.toString('utf8')),
      'RequestServed'   : 0
    };
    updateClientList(data);
  });
  servSocket.bind(portNumber)
};

//
// Update data of some client in the clientList. Messages are expected in the format
// { 'Hostname' : <>, 'LoadMetric' : <>, 'RequestServed' : <> }
//
function updateClientList(data) {
  clientList[data['Hostname']] = {
    'LoadMetric'      : data['LoadMetric'],
    'RequestServed'   : data['RequestServed'],
    'KeyVal'          : calculateKeyVal(data['LoadMetric'], data['RequestServed'])
  };
  recalculateMinLoad();
};
exports.updateClientList = updateClientList; 

//
// Update the request count between two updates of the load metric
//
exports.updateRequestCount = function(hostname) {
  clientList[hostname]['RequestServed']++;
  clientList[hostname]['KeyVal'] = calculateKeyVal(clientList[hostname]['LoadMetric'], clientList[hostname]['RequestServed']);
  if(hostname == min) {
    recalculateMinLoad();
  }
};

//
// Calculate the name of the server with the minimum load
//
function recalculateMinLoad() {
  tmpMinLoad = 100000000;
  for(var i in clientList) {
    if(clientList[i]['KeyVal'] <= tmpMinLoad) {
      tmpMinLoad = clientList[i]['KeyVal'];
      min = i;
    }
  }
}

//
// Calculate the keyValue which the load balancer will check while answering the DNS request
//
function calculateKeyVal(loadMetric, requestServed) {
  return 0.7*loadMetric + 0.3*requestServed;
}

//
// Get server with minimum load
//
exports.getServerWithMinLoad = function() {
  return min;
};
