//
// POLLER SERVER FOR THE NDNS LOAD BALANCER
//
// Provides server side API for accessing polling information from
// all clients that are to be load balanced amongst.
//

var dgram = require('dgram');

var SERVER_BRING_ONLINE_THRESH = 0.5; // Load more than this implies bring one more server online
var SERVER_PUT_OFFLINE_THRESH = 0.3; // Load less than this means take one server offline

var clientList = new Object();
var activeList = [];
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
    };
    updateClientList(data);
  });
  servSocket.bind(portNumber)
};

//
// Update data of some client in the clientList. Messages are expected in the format
// { 'Hostname' : <>, 'LoadMetric' : <> }
//
function updateClientList(data) {
  clientList[data['Hostname']]['LoadMetric'] = data['LoadMetric'];
  recalculateMinLoad();
  if(activeList.indexOf(data['Hostname'])!=-1  ||  activeList.length<1) {
    recalculateActiveList();
  }
};
exports.updateClientList = updateClientList; 

//
// Add entries to the active list
//
function recalculateActiveList() {
  var bringUpNewServer = false;
  for(var i=0;i<activeList.length;i++) {
    if(clientList[activeList[i]]['LoadMetric'] >= SERVER_BRING_ONLINE_THRESH) {
      bringUpNewServer = true;
      break;
    }
  }
  if(bringUpNewServer || activeList.length<1) {
    tmpMin = {'IP':'', 'Load':1000000};
    for(var j in clientList) {
      if(activeList.indexOf(j)==-1) {
        if(clientList[j]['LoadMetric'] <= tmpMin['Load']) {
          tmpMin['IP'] = j;
          tmpMin['Load'] = clientList[j]['LoadMetric'];
        }
      }
    }
    if(tmpMin['IP']) {
      activeList.push(tmpMin['IP']);
    }
  }
};

//
// Calculate the name of the server with the minimum load
// in the activeList. If there is a server in the active list with load less
// than threshold then remove it.
//
function recalculateMinLoad() {
  tmpMinLoad = 100000000;
  for(var i=0;i<activeList.length;i++) {
     // Delete inactive entries from actiove list
    if(clientList[activeList[i]]['LoadMetric'] < SERVER_PUT_OFFLINE_THRESH) {
      activeList.splice(i,i);
    }
  }
  for(var i=0;i<activeList.length;i++) {
    // Find min in the activeList
    if(clientList[activeList[i]]['LoadMetric'] <= tmpMinLoad) {
      tmpMinLoad = clientList[activeList[i]]['LoadMetric'];
      min = activeList[i];
    }
  }
};

//
// Get server with minimum load
//
exports.getServerWithMinLoad = function() {
  return min;
};
