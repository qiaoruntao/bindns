//
// POLLER SERVER FOR THE NDNS LOAD BALANCER
//
// Provides server side API for accessing polling information from
// all clients that are to be load balanced amongst.
//

var configPath = './config';
var pollingList = [];

//
// Set path to configuration folder. This folder will contain the 
// data using which requests will be handled from the NDNS server.
// Process must have RW permissions.
//
exports.setConfigPath = function(newPath) {
  configPath = newPath;
}

//
// Add a new host to the list of clients which are being load balanced
//
exports.addToPollingList = function(newHost) {
}

//
// Refresh data about load on clients by pulling new data and storing
// in self's data structures
//
exports.refreshPollingData = function() {
}

//
// Lock the configuration file from any reads and write new file
//
exports.lockAndWriteConfig = function() {
}
