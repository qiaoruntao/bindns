const {
    NS_MAXDNAME,
    NS_MAXMSG,

    ns_class,
    ns_sect,
    ns_type,
    ns_flag,

    ns_msg,
    ns_newmsg,
    ns_rr2
} = require("./nameser.js");

exports.ns_class = ns_class;
exports.ns_sect = ns_sect;
exports.ns_type = ns_type;
exports.ns_flag = ns_flag;

const {
    ns_name_ntop,
    ns_name_pton
} = require("./ns_name.js");

const {
    ns_newmsg_init,
    ns_newmsg_done,
    ns_newmsg_q,
    ns_newmsg_rr
} = require("./ns_newmsg.js");

const {
    ns_initparse,
    ns_parserr2
} = require("./ns_parse.js");

const {
    ns_rdata_unpack,
    ns_rdata_pack
} = require("./ns_rdata.js");

const {
    MessageHeader,
    MessageQuestion,
    MessageRR
} = require("./Messages.js");

const util = require("util");

const _string = Buffer.alloc(NS_MAXDNAME);
const _dname = Buffer.alloc(NS_MAXDNAME);

const debugLevel = Number.parseInt(process.env.NODE_DEBUG, 16);
const debug = debugLevel & 0x4 ? x => console.error("NDNS: " + x) : () => {};

const dgram = require("dgram");
const {EventEmitter} = require("events");

// for parseOnce:
const _msg = new ns_msg();
const _rr = new ns_rr2();
// for writeOnce:
const _newmsg = new ns_newmsg();
const _rdata = new Buffer(512);
// for sendTo:
const _maxmsg = new Buffer(NS_MAXMSG);

class Message extends EventEmitter {
    constructor() {
        super();

        this.header = new MessageHeader();
        this.question = new Array();
        this.answer = new Array();
        this.authorative = new Array();
        this.additional = new Array();
    }

    addQuestion(qname, qtype, qclass) {
        const q = new MessageQuestion(qname, qtype, qclass);
        this.question.push(q);
        return q;
    }

    addRR(sect, name, type, klass, ttl) {
        let rr;
        if (sect === ns_sect.qd) {
            rr = new MessageQuestion(name, type, klass);
        } else {
            rr = new MessageRR(name, type, klass, ttl, Array.prototype.slice.call(arguments, 5));
        }

        switch (sect) {
            case ns_sect.qd:
                this.question.push(rr);
                this.header.qdcount++;
                break;
            case ns_sect.an:
                this.answer.push(rr);
                this.header.ancount++;
                break;
            case ns_sect.ns:
                this.authorative.push(rr);
                this.header.nscount++;
                break;
            case ns_sect.ar:
                this.additional.push(rr);
                this.header.arcount++;
                break;
        }
    }

    parseOnce(buf) {
        if (ns_initparse(buf, buf.length, _msg) === -1)
            return false;

        this.header.id = _msg.getId();
        this.header.qr = _msg.getFlag(ns_flag.qr);
        this.header.opcode = _msg.getFlag(ns_flag.opcode);
        this.header.aa = _msg.getFlag(ns_flag.aa);
        this.header.tc = _msg.getFlag(ns_flag.tc);
        this.header.rd = _msg.getFlag(ns_flag.rd);
        this.header.ra = _msg.getFlag(ns_flag.ra);
        this.header.z = _msg.getFlag(ns_flag.a);
        this.header.ad = _msg.getFlag(ns_flag.ad);
        this.header.cd = _msg.getFlag(ns_flag.cd);
        this.header.rcode = _msg.getFlag(ns_flag.rcode);
        this.header.qdcount = _msg.getCount(ns_sect.qd);
        this.header.ancount = _msg.getCount(ns_sect.an);
        this.header.nscount = _msg.getCount(ns_sect.ns);
        this.header.arcount = _msg.getCount(ns_sect.ar);

        let len;
        for (let section = 0; section < ns_sect.max; section++) {
            for (let rrnum = 0; rrnum < _msg.getCount(section); rrnum++) {

                if (ns_parserr2(_msg, section, rrnum, _rr) === -1)
                    return false;
                if ((len = ns_name_ntop(_rr.nname, _dname, _dname.length)) === -1)
                    return false;

                const name = _dname.toString("ascii", 0, len);
                let rr;
                if (section === ns_sect.qd) {
                    rr = new MessageQuestion(name, _rr.type, _rr.rr_class);
                } else {
                    rr = new MessageRR(name, _rr.type, _rr.rr_class, _rr.ttl);
                    if (ns_rdata_unpack(buf, buf.length, _rr.type, _rr.rdata, _rr.rdlength, rr.rdata) === -1) return -1;
                }

                switch (section) {
                    case ns_sect.qd:
                        this.question.push(rr);
                        break;
                    case ns_sect.an:
                        this.answer.push(rr);
                        break;
                    case ns_sect.ns:
                        this.authorative.push(rr);
                        break;
                    case ns_sect.ar:
                        this.additional.push(rr);
                        break;
                }
            }
        }
        return true;
    }

    writeOnce(buf, bufsiz) {
        if (ns_newmsg_init(buf, bufsiz, _newmsg) === -1)
            return -1;

        _newmsg.setId(this.header.id);
        _newmsg.setFlag(ns_flag.qr, this.header.qr);
        _newmsg.setFlag(ns_flag.opcode, this.header.opcode);
        _newmsg.setFlag(ns_flag.aa, this.header.aa);
        _newmsg.setFlag(ns_flag.tc, this.header.tc);
        _newmsg.setFlag(ns_flag.rd, this.header.rd);
        _newmsg.setFlag(ns_flag.ra, this.header.ra);
        _newmsg.setFlag(ns_flag.z, this.header.z);
        _newmsg.setFlag(ns_flag.ad, this.header.ad);
        _newmsg.setFlag(ns_flag.cd, this.header.cd);
        _newmsg.setFlag(ns_flag.rcode, this.header.rcode);

        for (let section = 0; section < ns_sect.max; section++) {
            let arr;
            switch (section) {
                case ns_sect.qd:
                    arr = this.question;
                    break;
                case ns_sect.an:
                    arr = this.answer;
                    break;
                case ns_sect.ns:
                    arr = this.authorative;
                    break;
                case ns_sect.ar:
                    arr = this.additional;
                    break;
            }
            for (let rrnum = 0; rrnum < arr.length; rrnum++) {
                const rr = arr[rrnum];

                let len;
                if ((len = _string.write(rr.name, 0)) === _string.length)
                    return -1;
                _string[len] = 0;
                if (ns_name_pton(_string, _dname, _dname.length) === -1)
                    return -1;

                if (section === ns_sect.qd) {
                    if (ns_newmsg_q(_newmsg, _dname, rr.type, rr.class) === -1) {
                        return -1;
                    }
                } else {
                    let nrdata = 0;
                    if ((nrdata = ns_rdata_pack(rr.type, rr.rdata, _rdata, 0, _rdata.length)) === -1)
                        return -1;
                    if (ns_newmsg_rr(_newmsg, section, _dname, rr.type, rr.class, rr.ttl, nrdata, _rdata) === -1) {
                        return -1;
                    }
                }
            }
        }
        const n = ns_newmsg_done(_newmsg);
        return n;
    }

    sendTo(socket, port, host) {
        let n;
        if ((n = this.writeOnce(_maxmsg, _maxmsg.length)) !== -1) {
            //hexdump (_maxmsg, n, 16);

            const tmp = new Buffer(n);
            _maxmsg.copy(tmp, 0, 0, n);
            socket.send(tmp, 0, n, port, host, (err, nbytes) => {
                if (err) debug(err);
            });
        }
    }
}
exports.Message = Message;

class ServerRequest extends Message {
    constructor(socket, rinfo) {
        super();
        this.socket = socket;
        this.rinfo = rinfo;
    }
}
exports.ServerRequest = ServerRequest;

class ServerResponse extends Message {
    constructor(req) {
        super();
        this.socket = req.socket;
        this.rinfo = req.rinfo;
        // edns
        for (let i = 0; i < req.answer.length; i++) {
            const rr = req.rr[i];
            if (rr.type !== ns_type.opt)
                continue;
            const extended_rcode = rr.rdata[0];
            const udp_payload_size = rr.rdata[1];
            const version = rr.rdata[2];
            const z = rr.rdata[3];
            if (version !== 0)
                continue; // only support edns0
            // useful in Message.prototype.sendTo
            this.edns = {
                extended_rcode,
                udp_payload_size,
                version,
                z
            };
        }
        // request and response id are equal
        this.header.id = req.header.id;
        // query type = answer
        this.header.qr = 1;
        // request and response rd bit are equal
        this.header.rd = req.header.rd;
        // request and response question sections are equal
        this.header.qdcount = req.header.qdcount;
        this.question = req.question;
    }

    send() {
        this.sendTo(this.socket, this.rinfo.port, this.rinfo.address);
    }
}
exports.ServerResponse = ServerResponse;

function Server(type, requestListener) {
    // TODO New instances of dgram.Socket are created using
    // dgram.createSocket(). The new keyword is not to be used to create
    // dgram.Socket instances.
    dgram.Socket.call(this, type);

    if (requestListener) {
        this.on("request", requestListener);
    }

    this.on("message", messageListener);
}
util.inherits(Server, dgram.Socket);
exports.Server = Server;

exports.createServer = function (type = "udp4", requestListener = null) {
    return new Server(type, requestListener);
};

function messageListener(msg, rinfo) {
    const req = new ServerRequest(this, rinfo);

    if (req.parseOnce(msg)) {
        const res = new ServerResponse(req);
        this.emit("request", req, res);
    }
}

class ClientRequest extends Message {
    constructor(socket, rinfo) {
        super();
        this.socket = socket;
        this.rinfo = rinfo;
    }

    send() {
        this.sendTo(this.socket, this.rinfo.port, this.rinfo.address);
    }
}
exports.ClientRequest = ClientRequest;

class ClientResponse extends Message {
    constructor(socket, rinfo) {
        super();
        this.socket = socket;
        this.rinfo = rinfo;
    }
}
exports.ClientResponse = ClientResponse;

function Client(type, responseListener) {
    // TODO New instances of dgram.Socket are created using
    // dgram.createSocket(). The new keyword is not to be used to create
    // dgram.Socket instances.
    dgram.Socket.call(this, type);

    if (responseListener) {
        this.on("response", responseListener);
    }

    this.on("message", messageListener_client);
}
util.inherits(Client, dgram.Socket);
exports.Client = Client;

Client.prototype.request = function (port, host) {
    const req = new ClientRequest(this, {address: host, port: port});
    return req;
};

exports.createClient = function (type = "udp4", responseListener = null) {
    return new Client(type, responseListener);
};

function messageListener_client(msg, rinfo) {
    debug("messageListener_client: new message");
    hexdump(msg, msg.length, 16);

    const res = new ClientResponse(this, rinfo);

    if (res.parseOnce(msg)) {
        this.emit("response", res);
    }
}

/**
 * @param {Buffer} buf
 * @param {number} length
 * @param {number} count
 */
function hexdump(buf, length, count) {
    if (!Buffer.isBuffer(buf))
        throw new Error("argument must be buffer");
    count = arguments.length > 2 ? arguments[2] : 16;
    console.log(0);
    console.log("\t");
    for (let i = 0; i < length; i++) {
        console.log(buf.toString("hex", i, i + 1));
        console.log(" ");
        if ((i + 1) % (count / 2)) continue;
        console.log(" ");
        if ((i + 1) % count) continue;
        console.log("\n");
        console.log(i + 1);
        console.log("\t");
    }
    console.log("\n");
}
