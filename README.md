bindns: Fast DNS library, server and client for Node.js based on libbind-6
==============================

A **DNS client and server** built from a port of
[libbind](https://www.isc.org/downloads/libbind/) with **zero dependencies**.
It's very **fast**: it has about the same throughput as a server written with
the [evldns C library](https://github.com/raybellis/evldns) (~50k QPS on a 4.0
GHz i7-6700k CPU), and given that it's a port of libbind, hopefully it's low on
bugs.

See **history** at the bottom for info on all of the forks of `ndns` and how
this library came to be.

This module isn't published to npm yet, so install it from github:
`yarn add primitybio/bindns`.

## Example

An example DNS server which responds with a "Hello World" TXT record:

```js
const bindns = require("bindns");

const server = new bindns.Server("udp4", (req, res) => {
    res.header.aa = 1; // Authoritative for this zone.
    res.header.rcode = bindns.ns_rcode.noerror; // NOERROR response code
    res.addRR(
        bindns.ns_sect.an,    // answer section
        req.question[0].name, // host name
        bindns.ns_type.txt,   // TXT record
        bindns.ns_class.in,   // IN
        3600,                 // TTL
        "hello, world"        // data
    );
    res.send();
});

server.on("listening", () => console.log("Server running at 0.0.0.0:5300"));

server.bind(5300);
```

See the examples folder for two additional examples.

## API

DNS request and response messages are represented by an object like this:

```js
ServerRequest {
    header: MessageHeader {
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
        arcount: 1
    },
    question: [
        MessageQuestion {
            name: "example.com",
            type: 1,
            class: 1
        }
    ],
    answer: [],
    authoritative: [],
    additional: [
        MessageRR {
            name: ".",
            type: 41,
            class: 4096,
            ttl: 0,
            rdata: [ ... ]
        }
    ],
    socket: dgram.Socket { ... },
    rinfo: {
        address: "127.0.0.1",
        family: "IPv4",
        port: 52289,
        size: 41
    }
})
```

There are several **enums** that you need to construct a response, including the
common ones listed below. See lib/nameser.js for the full list.

* `ns_rcode` - Response codes
* `ns_sect` - Section constants
* `ns_class` - Values for the `class` field
* `ns_type` - Values for the `type` field. To convert an `ns_type` number to its
  corresponding string, use `ns_type_str(ns_type_t)`.
* `ns_flag` - Flag constants

### ndns.Server

#### Constructor

`new Server(type: "udp4"|"udp6"[, listener: (req, res) => void])`

`listener` is an optional listener for the `"request"` event.

#### Event: "request"

`function (request: ServerRequest, response: ServerResponse) {}`

#### Event: "listening"

Inherited from `dgram.Socket`.

#### Event: "close"

Inherited from `dgram.Socket`.

#### Evenet: "error"

Inherited from `dgram.Socket`.

### ServerRequest

This object is created internally by a DNS server as the result of a DNS query,
not by the user, and passed as the first argument to a 'request' listener. Note:
`answer`, `authoritative` and `additional` properties are present, but are
meaningless in queries.

#### request.header

This object is an instance of `MessageHeader`. Properties:

* `id` (read-only) ID of query.
* `qr` (read-only) Query/response flag.
* `opcode` (read-only) Operation code (one of `ns_opcode`).
* `aa` (N/A for queries) Authoritative answer.
* `tc` (N/A for queries) Truncation flag.
* `rd` (read-only) Recursion desired.
* `ra` (N/A for queries) Recursion available.
* `z` (read-only) Three bits set to zero.
* `ad` (N/A for queries) Authentic data (DNSSEC).
* `cd` (read-only) Checking disabled (DNSSEC).
* `rcode` Response code (one of `ns_rcode`).
* `qdcount`, `ancount`, `nscount` and `arcount` (read-only) The number of
  questions, answers, name servers and additional records, respectively. Only
  `qdcount` should be non-zero for queries.

#### request.question

An array of `MessageQuestion`s.

### ServerResponse

This object is created internally by a DNS server, not by the user. It is passed
as the second argument to the 'request' event.

#### response.header

This object is an instance of `MessageHeader`. Properties:

* `id` (read-only) ID of query, copied from the request.
* `qr` (read-only) Query/response flag, set to 1 for responses.
* `opcode` (read-only) Operation code, copied from the request (one of
  `ns_opcode`).
* `aa` Authoritative answer.
* `tc` Truncation flag.
* `rd` (read-only) Recursion desired, copied from the request.
* `ra` Recursion available.
* `z` (read-only) Three bits set to zero.
* `ad` Authentic data (DNSSEC).
* `cd` (read-only) Checking disabled (DNSSEC), copied from the request.
* `rcode` Response code (one of `ns_rcode`).
* `qdcount`, `ancount`, `nscount` and `arcount` (read-only) The number of
  questions, answers, name servers and additional records, respectively. These
  are incremented when you call `response.addRR()`.

#### response.addRR(sect, name, type, klass, ttl, ...info)

Adds an RR to the response.

* @param {number} sect An ns_sect value.
* @param {string} name
* @param {number} type An ns_type value.
* @param {number} klass An ns_class value.
* @param {number} ttl
* @param {Array<string>} info

#### response.answer

An array of `MessageRR`s.

#### response.authoritative

An array of `MessageRR`s.

#### response.additional

An array of `MessageRR`s.

### ClientRequest

This object is created by `client.request(port, host, callback)`.

#### request.addQuestion(name, type, class)

Sets the question.

## Benchmarks and Other Libraries

Check out https://github.com/zbjornson/node-dnsperf for benchmarking.

| Library | Throughput (QPS) | Latency (ms) | Notes |
| --- | ---: | ---: | --- |
| **this library** | 50,295 | 1.9 |
| https://github.com/raybellis/evldns | 50,570 | 1.9 | C library |
| https://github.com/tjfontaine/node-dns <br>(published to npm as `native-dns`)| 35,042 | 2.8 | Working. No longer maintained. Many forks exist. |
| https://github.com/trevoro/node-named <br>or the fork<br>https://github.com/kaija/dns-express | 24,300 | 4.1 | Some bugs and not a lot of maintenance activity.
| https://github.com/jhs/dnsd | 18,000 | 5.7 | Working and simple, but doesn't appear to be maintained. |
| https://github.com/chjj/bns | 12,900 | 6.9 | Not fully working |

## To-Do List and Technical Details

* There is no TCP fallback support.
* I haven't looked yet if the truncation flag is set automatically on overflow.
* Improve test suite (see test.js for info).
* DNSSEC - the flags are here for it, but I've never used it and don't know what
  a full implementation looks like.

## History

As far as I can tell... the original source of this was
[jsjohnst/ndns](https://github.com/jsjohnst/ndns). The [`ndns` module published
to npm](https://www.npmjs.com/package/ndns) is from someone named "skmplr" or
"skampler" (can't find their source repo). The fork at
[atrniv/ndns](https://github.com/atrniv/ndns) has some changes to the original
source.

This module pulls from all three, and has some additional significant changes:

* Code organization, ES6-ification, JSDoc.
  * Split code into separate files, following the organization of libbind.
  * Restored some of the names back to the original ones used in libbind (e.g.
    `ns_f` -> `ns_flag`).
  * Added JSDoc with type annotations, taking from libbind. VSCode's analyzer
    reports no type errors.
* Code errors fixed.
  * `errno` consistently set to numbers.
  * Remove use of reserved word `class`.
  * Remove usage of node's deprecated `sys` module.
  * Remove `freelist` dependency.
  * Some typos ("authorative" -> "authoritative", "buffer.Length" ->
    "buffer.length")
  * `ClientRequest` sets an ID automatically.
  * `ClientRequest` increments `qdcount` automatically when adding a question.
  * `client.request` now accepts a callback. While you can still listen to the
    `"response"` event on the client, I'm not sure what the utility would be.
    Might remove that functionality.
  * Don't make globals.
  * Fix possible infinite loop (https://github.com/primitybio/bindns/issues/1).
* Docs and examples updated.
