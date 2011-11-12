//
// DISPATCHER SERVER FOR THE NDNS LOAD BALANCER
//
// Dispatches a DNS query to a load balancer or web server
//

var dgram = require('dgram');
var ndns = require('../lib/ndns');
var util = require('util');
var server = ndns.createServer('udp4');
var client = ndns.createClient('udp4');
var p_type_syms = ndns.p_type_syms;
var BIND_PORT = 53;

// Zone file information
var zone = {}
// All domain names should be in lower case
addToTree(zone, ["in","aiesec"], 
								{ '*' : [ 
													{ name: 'aiesec.in', rr: 'SOA', ttl: '86400', dclass: 'IN', value: 'ns1.bluehost.com. root.box481.bluehost.com. 2011031102 86400 7200 3600000 300'},
													{ name: 'aiesec.in', rr: 'TXT', ttl: '14400', dclass: 'IN', value: 'v=spf1 a mx ptr include:bluehost.com ?all' },
													{ name: 'aiesec.in', rr: 'NS', ttl: '86400', dclass: 'IN', value: 'ns1.bluehost.com.' },
													{ name: 'aiesec.in', rr: 'NS', ttl: '86400', dclass: 'IN', value: 'ns2.bluehost.com.' },
													{ name: 'aiesec.in', rr: 'MX', ttl: '14400', dclass: 'IN', value: '0 aiesec.in' },
													{ name: 'aiesec.in', rr: 'A', ttl: '14400', dclass: 'IN', value: '74.220.219.81' },
													{ name: 'ns1.bluehost.com.', rr: 'A', ttl: '14400', dclass: 'IN', value: '127.0.0.1' },
													{ name: 'ns2.bluehost.com.', rr: 'A', ttl: '14400', dclass: 'IN', value: '127.0.0.2' },
												] } );
addToTree(zone, ["in","ac","lnmiit","proxy"], 
								{ '*' : [
													{ name: 'proxy.lnmiit.ac.in', rr:'A', ttl: '14400', dclass: 'IN', value: '172.22.2.211' }
												] } );

// Add to tree function
function addToTree(tree, array , value){
  for(var i = 0, length = array.length; i < length; i++) {
    tree = tree[array[i]] = ((i == length-1)? value : (tree[array[i]] || {}));
  }
}

// Retrieve RR records
function getRR(name) {
	var labels = name.split('.');
	var root = zone;
	for(var index = labels.length-1; index >= 0; index--){
		// Case Insensitive Comparison logic
		var label = labels[index].toLowerCase();
		if(root[label] == null){
			console.log("Domain not found");
			break;
		} else {
			console.log('->'+label);
			root = root[label];
		}
	}
	console.log(util.inspect(root['*'].length)+ " records found");
	if (root != zone)
		return root['*'];
	else 
		return null;
}

// Check if this RR record should be returned for Question q
function checkQuestions(q, rr){
	var result = false;
	console.log(p_type_syms[q.type] + " - " + util.inspect(rr['rr']));
	if( p_type_syms[q.type] == rr['rr']) {
		result = true;		
	}	else if ( q.type == 255 ) {
		result = true;
	}	else if ( q.type == 253 && (rr['rr'] == 'MB' || rr['rr'] == 'MG' || rr['rr'] == 'MR') ) {
			result = true;
 	}
	return result;		
} 

// Add a RR record to response
function addRR(res, rr){
	console.log("Adding "+ rr);
	if(rr['rr'] == 'SOA' ){
		var param = rr['value'].split(" ");
		res.addRR(rr['name'],
				rr['ttl'],
				rr['dclass'],
				rr['rr'], 
				param[0], 	// MNAME - The <domain-name> of the name server that was the original or primary source of data for this zone
				param[1], 	// RNAME - A <domain-name> which specifies the mailbox of the person responsible for this zone
				param[2], 	// SERIAL - The unsigned 32 bit version number of the original copy of the zone. Zone transfers preserve this value. This value wraps and should be compared using sequence space arithmetic
				param[3], 	// REFRESH - A 32 bit time interval that should elapse before the zone should be refreshed
				param[4], 	// RETRY - A 32 bit time interval that should elapse before a failed refresh should be retried
				param[5] 		// EXPIRE - A 32 bit time value that specifies the upper limit on the time interval that can elapse before the zone is no longer authoritative
				);
	}
	else if (rr['rr'] == 'HINFO' || rr['rr'] == 'MINFO' || rr['rr'] == 'MX' ){
		var param = rr['value'].split(" ");
		res.addRR(rr['name'],
				rr['ttl'],
				rr['dclass'],
				rr['rr'],
				param[0], 	/* HINFO : CPU - A <character-string> which specifies the CPU type
											 MINFO : RMAILBX -  <domain-name> which specifies a mailbox which is
											 responsible for the mailing list or mailbox.  If this
											 domain name names the root, the owner of the MINFO RR is
											 responsible for itself.  Note that many existing mailing
											 lists use a mailbox X-request for the RMAILBX field of
											 mailing list X, e.g., Msgroup-request for Msgroup.  This
											 field provides a more general mechanism.
											 MX : PREFERENCE -  A 16 bit integer which specifies the preference given to
											 this RR among others at the same owner.  Lower values
											 are preferred.
										 */
				param[1]  	/* HINFO : OS - A <character-string> which specifies the operating system type
											 MINFO : EMAILBX - A <domain-name> which specifies a mailbox which is to
											 receive error messages related to the mailing list or
											 mailbox specified by the owner of the MINFO RR (similar
											 to the ERRORS-TO: field which has been proposed).  If
											 this domain name names the root, errors should be
											 returned to the sender of the message.
											 MX : EXCHANGE - 	<domain-name> which specifies a host willing to act as
											 a mail exchange for the owner name.
										 */
			);
	}
	else if (rr['rr'] == 'WKS' ){
		var param = rr['value'].split(" ");
		res.addRR(rr['name'],
				rr['ttl'],
				rr['dclass'],
				rr['rr'],
				param[0], 	// An 32 bit Internet address
				param[1],		// An 8 bit IP protocol number
				param[2]);	// A variable length bit map. The bit map must be a multiple of 8 bits long

	}
	else {
		res.addRR(rr['name'],
							rr['ttl'],
							rr['dclass'],
							rr['rr'],
							rr['value']);
		if (rr['rr'] == 'NS') {

		}
	}
}
// Create DNS RR response
function createResponse (req, res, root) {

	var count = new Array(0,0,0);

	// Add RR to response


	// Iterate over each section - 0 - Answer, 1 - Authority, 2 -Additional of DNS Response
	for( var i = 0; i < 3; i++) {

		// Iterate over each question
		for( var j = 0; j < req.q.length; j++){
		
			// Iterate over each record
			for( var k = 0; k < root.length; k++) {
				console.log("Section: "+i+", Question: "+j+", Record: "+k);
				// Check if this RR should be returned for the DNS Query Question
				// Returns answers to query questions
				if(checkQuestions(req.q[j], root[k]) && i == 0) {
					addRR(res,root[k]);
					count[i]++;
				}	
				else if( i == 1 && root[k]['rr'] == 'NS'){
					addRR(res,root[k]);
					count[i]++;
				}
				else if ( i == 2 && root[k]['name'] != req.q[j].name ){
					addRR(res,root[k]);
					count[i]++;
				}
			}
		}
	}
	res.header.qr = 1;				//DNS query - 0 , DNS response - 1  
	res.header.ra = 1;  			//recursion available
	res.header.aa = 0;				//authoritative answer
	res.header.rd = 0;				//recursion desired
	res.header.qdcount = req.q.length;		//Question Count

	res.header.ancount = count[0];		//Answer Count
	res.header.nscount = count[1];		//Nameserver Record Count
	res.header.arcount = count[2];		//Additional Record Count

	console.log(util.inspect(res));
}
server.on("request", function(req, res) {
  res.setHeader(req.header);

  for (var i = 0; i < req.q.length; i++)
    res.addQuestion(req.q[i]);
 	console.log(util.inspect(req.q)); 
	if (req.q.length > 0) {
    var name = req.q[0].name;
    if (name == ".")
      name = "";

		var root = getRR(name);
		
		createResponse(req, res, root);
	}
  res.send();

	console.log("Response sent");
	//console.log(util.inspect(res));

});

server.bind(BIND_PORT);

