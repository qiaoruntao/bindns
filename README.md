ndns -- dns client/server library for nodejs
==============================

This is a port of parts of libbind required to make a DNS server, plus a DNS
server implementation. It's very fast (~41k QPS on a computer that a server
written in C runs at ~50k QPS) and, given that it's a port of the C code,
hopefully low on bugs.

Forked from skampler/ndns (gone), which was forked from jsjohnst/ndns.
Significant changes:
* Code organization, ES6-ification, JSDoc.
  * Split code into separate files, as found in libbind.
  * Restored some of the names back to the original ones used in libbind (e.g.
    `ns_f` -> `ns_flag`).
  * Added JSDoc with type annotations, taking from libbind. VSCode's analyzer
    reports no type errors.
* Code errors fixed.
  * `errno` consistently set to numbers.
  * Remove use of reserved word `class`.
  * Remove usage of node's deprecated `sys` module.
  * Remove `freelist` dependency.
  * Some typos.
* Docs corrected.

An example DNS server which responds with a "Hello World" TXT record:

```js
const ndns = require('ndns');

ndns.createServer('udp4', (req, res) => {
	res.addRR(ndns.ns_sect.an, req.q[i].name, ndns.ns_type.txt, ndns.ns_class.in, 3600, "hello, world");
	res.send();
}).bind(5300);

console.log("Server running at 0.0.0.0:5300")
```

## API

DNS request messages are represented by an object like this:

```js
({
	header: {
		id: 39545,
		qr: 0,
		opcode: 0,
		aa: 0,
		tc: 0,
		rd: 1,
		ra: 0,
		z: 0,
		ad: 0,
		cd: 0,
		rcode: 0,
		qdcount: 1,
		ancount: 0,
		nscount: 0,
		arcount: 0
	},
	q: [
		{
			name: "example.com",
			type: 1,
			class: 1
		}
	],
	rr: [
		{
			name: "example.com",
			ttl: 3600,
			class: 1,
			type: 1,
			rdata: "127.0.0.1"
		}, {
			name: "example.com",
			ttl: 3600,
			class: 1,
			type: 1,
			rdata: "127.0.0.2"
		}
	]
})
```

There are several enums that you need to construct a response. See lib/nameser.js
for the full list.

* `ns_sect` - Section constants
* `ns_class` - Values for the `class` field
* `ns_type` - Values for the `type` field
* `ns_flag` - Flag constants

## ndns.Server

This is a dgram.Socket with the following events:

### Event: 'request'
function (request, response) {}

request is an instance of ndns.ServerRequest and response is an instance of
ndns.ServerResponse

### ndns.createServer(type, requestListener)
Return a new dns server object

The requestListener is a function which is automatially added to the 'request'
event.

For documentation on dgram.Socket, see https://nodejs.org/api/dgram.html#dgram_class_dgram_socket

## ndns.ServerRequest

This object is created internally by a DNS-server, not by the user, and passed
as the first argument to a 'request' listener

## ndns.ServerResponse

This object is created internally by a DNS-server, not by the user. It is
passed as the second argument to the 'request' event.

### response.setHeader(headers)
Sets the response header to the request.

Example #1:
	response.setHeader(request.header);
	response.header.qr = 1;
	response.header.qa = 1;

Example #2:
	response.setHeader({
	    id: 0,
	    qr: 0,
	    rd: 1,
	    qdcount: 1});

Valid keys `id`, `qr`, `opcode`, `aa`, `tc`, `rd`, `ra`, `z`, `ad`, `cd`,
`rcode`, `qdcount`, `ancount`, `nscount` and `arcount`.

This method can be called any number of times and must be called before
`response.send()` is called;

### response.addQuestion(name, class, type)
Sets the question on the response 
