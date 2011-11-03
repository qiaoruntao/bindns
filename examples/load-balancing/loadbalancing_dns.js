//
// Load Balancing DNS server
//

var ndns = require('../../lib/ndns');

var BIND_PORT = 53;

ndns.poller.server.createServer(5000);

var dns_server = ndns.createServer(udp4);
server.on('request', function(req, res) {
  var answer = ndns.poller.server.getServerWithMinLoad();
  // ^^^^^^^^^^^^^^^^
  // Serve answer to question here
  // ^^^^^^^^^^^^^^^
  ndns.poller.server.updateRequestCount(answer);
});

dns_server.bind(BIND_PORT);
