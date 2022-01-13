import {
    ns_class,
    ns_flag,
    NS_MAXDNAME,
    NS_MAXMSG,
    ns_msg,
    ns_newmsg,
    ns_opcode,
    ns_rcode,
    ns_rr2,
    ns_sect,
    ns_type,
    ns_type_str
} from "./nameser";
import {MessageHeader, MessageQuestion, MessageRR} from "./Messages";

import {ns_name_ntop, ns_name_pton} from "./ns_name";

import {ns_newmsg_done, ns_newmsg_init, ns_newmsg_q, ns_newmsg_rr} from "./ns_newmsg";

import {ns_initparse, ns_parserr2} from "./ns_parse";

import {ns_rdata_pack, ns_rdata_unpack} from "./ns_rdata";
import {Socket} from "dgram";

export {
    ns_class,
    ns_flag,
    NS_MAXDNAME,
    NS_MAXMSG,
    ns_msg,
    ns_newmsg,
    ns_opcode,
    ns_rcode,
    ns_rr2,
    ns_sect,
    ns_type,
    ns_type_str
} from "./nameser";

const debugLevel = Number.parseInt(process.env.NODE_DEBUG || "", 16);
const debug = debugLevel & 0x4 ? x => console.error("NDNS: " + x) : () => {
};

const dgram = require("dgram");
const {EventEmitter} = require("events");

// Perf: reused objects
const _string = Buffer.alloc(NS_MAXDNAME);
const _dname = Buffer.alloc(NS_MAXDNAME);
const _msg = new ns_msg();
const _rr = new ns_rr2();
const _newmsg = new ns_newmsg();
const _rdata = Buffer.alloc(512);
const _maxmsg = Buffer.alloc(NS_MAXMSG);

export class Message {
    public header: MessageHeader;
    public question: MessageQuestion[];
    public answer: MessageRR[];
    public authoritative: MessageRR[];
    public additional: MessageRR[];

    constructor() {
        this.header = new MessageHeader();
        this.question = [];
        this.answer = [];
        this.authoritative = [];
        this.additional = [];
    }

    /**
     * Adds an RR to the message.
     * @param {number} sect An ns_sect value.
     * @param {string} name
     * @param {number} type An ns_type value.
     * @param {number} klass An ns_class value.
     * @param {number} ttl
     * @param {Array<string>} info
     */
    addRR(sect: number, name: string, type: number, klass: number, ttl: number, ...info: string[]) {
        let rr;
        if (sect === ns_sect.qd) {
            rr = new MessageQuestion(name, type, klass);
        } else {
            rr = new MessageRR(name, type, klass, ttl, info);
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
                this.authoritative.push(rr);
                this.header.nscount++;
                break;
            case ns_sect.ar:
                this.additional.push(rr);
                this.header.arcount++;
                break;
        }
    }

    parseOnce(buf: Buffer): boolean | number {
        if (ns_initparse(buf, buf.length, _msg) === -1) {
            return false;
        }

        this.header.id = _msg.getId();
        this.header.qr = _msg.getFlag(ns_flag.qr);
        this.header.opcode = _msg.getFlag(ns_flag.opcode);
        this.header.aa = _msg.getFlag(ns_flag.aa);
        this.header.tc = _msg.getFlag(ns_flag.tc);
        this.header.rd = _msg.getFlag(ns_flag.rd);
        this.header.ra = _msg.getFlag(ns_flag.ra);
        // @ts-ignore
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
                        this.authoritative.push(rr);
                        break;
                    case ns_sect.ar:
                        this.additional.push(rr);
                        break;
                }
            }
        }
        return true;
    }

    writeOnce(buf: Buffer, bufsiz: number) {
        if (ns_newmsg_init(buf, bufsiz, _newmsg) === -1) {
            return -1;
        }

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
                    arr = this.authoritative;
                    break;
                case ns_sect.ar:
                    arr = this.additional;
                    break;
            }
            for (let rrnum = 0; rrnum < arr.length; rrnum++) {
                const rr = arr[rrnum];

                let len;
                if ((len = asciiWrite(rr.name, _string, 0, 0, rr.name.length)) === _string.length)
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
        return ns_newmsg_done(_newmsg);
    }

    sendTo(socket: Socket, port: number, host: string) {
        let n;
        if ((n = this.writeOnce(_maxmsg, _maxmsg.length)) !== -1) {
            //hexdump (_maxmsg, n, 16);

            // I'm not certain if this copy is necessary. The comments in
            // https://github.com/nodejs/node/issues/26607 say that it is.
            // TODO(perf): as long as _maxmsg is large enough, send() accepts
            // offset and length parameters. Not sure if that copies internally.
            const tmp = Buffer.allocUnsafe(n);
            for (let i = 0; i < n; i++) {
                tmp[i] = _maxmsg[i];
            }
            socket.send(tmp, port, host, (err, _nbytes) => {
                if (err) debug(err);
            });
        }
    }
}

/**
 * Faster version of buf.write(string, ...) for ASCII
 */
function asciiWrite(src: string, target: Buffer, targetStart: number, sourceStart: number, sourceEnd: number) {
    const numBytes = sourceEnd - sourceStart;
    while (sourceStart < sourceEnd) {
        target[targetStart++] = src.charCodeAt(sourceStart++);
    }
    return numBytes;
}

export class ServerRequest extends Message {
    socket: Socket;
    rinfo: Rinfo;

    constructor(socket, rinfo) {
        super();
        this.socket = socket;
        this.rinfo = rinfo;
    }
}

export type Rinfo = { port: number, address: string };

export class ServerResponse extends Message {
    private readonly socket: Socket;
    private rinfo: Rinfo;
    private edns: { udp_payload_size: any; z: any; version: any; extended_rcode: any };

    constructor(req: ServerRequest) {
        super();
        this.socket = req.socket;
        this.rinfo = req.rinfo;
        // edns
        for (let i = 0; i < req.answer.length; i++) {
            // @ts-ignore
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

export type UDP_TYPE = "udp4" | "udp6";
export type RequestListener = (req: ServerRequest, res: ServerResponse) => void;

export class Server extends EventEmitter {

    constructor(type: UDP_TYPE, requestListener?: RequestListener) {
        super();
        try {
            this.socket = dgram.createSocket(type);
        } catch (e) {
            console.error(e);
        }
        if (requestListener) {
            this.on("request", requestListener);
        }
        this.socket.on("close", () => this.emit("close"));
        this.socket.on("error", e => this.emit("error", e));
        this.socket.on("listening", () => this.emit("listening"));
        this.socket.on("message", (msg, rinfo) => {
            debug("server_messageListener: new message");
            if (debugLevel & 0x4) debug(hexdump(msg, msg.length, 16));

            const req = new ServerRequest(this.socket, rinfo);

            if (req.parseOnce(msg)) {
                const res = new ServerResponse(req);
                this.emit("request", req, res);
            }
        });
    }

    bind(port: number, address: string = "127.0.0.1") {
        this.socket.bind(port, address);
    }

    close() {
        this.socket.close();
    }
}

/**
 * @typedef {Object} RequestOptions
 * @property {number} port
 * @property {string} address IP address.
 * @property {number} [timeout] Response timeout in milliseconds. Defaults to
 * 10,000. Set to Infinity to disable.
 */
export type RequestOptions = { port: number, address: string, timeout: number };

let id = 0;

export class ClientRequest extends Message {
    private readonly client: Client;
    private rinfo: RequestOptions;

    /**
     * Do not construct directly. Use `Client.request`.
     */
    constructor(client: Client, rinfo: RequestOptions) {
        super();
        this.client = client;
        this.rinfo = rinfo;
        this.header.id = id = ++id & 65535;
    }

    /**
     * Adds a question.
     * @param {string} qname Query hostname.
     * @param {number} qtype Query type. Must be a value from `bindns.ns_type`.
     * @param {number} [qclass] Optional query class. Must be a value from
     * `bindns.ns_class`. Defaults to `in`.
     */
    addQuestion(qname: string, qtype: number, qclass: number = ns_class.in) {
        const q = new MessageQuestion(qname, qtype, qclass);
        this.question.push(q);
        this.header.qdcount++;
        return q;
    }

    /** Sends the request. */
    send() {
        const timeout = this.rinfo.timeout;
        if (Number.isFinite(timeout)) {
            const timeoutId = setTimeout(this.client._onTimeout, timeout, this.client, this);
            this.client.timeouts.set(this.header.id, timeoutId);
        }
        this.sendTo(this.client.socket, this.rinfo.port, this.rinfo.address);
    }
}

export class ClientResponse extends Message {
    private socket: Socket;
    private rinfo: any;

    constructor(socket, rinfo) {
        super();
        this.socket = socket;
        this.rinfo = rinfo;
    }
}

export type RequestCallback = (err: Error | null, res?: ClientResponse) => void;
const DEFAULT_TIMEOUT = 10000;

/**
 * Client for making DNS lookup requests.
 *
 * See examples/simple-client.ts for an example usage.
 *
 * ## Events
 * * `"response"` - `(res: ClientResponse)` - Emitted on every response. You do
 *   not need to listen to this if you add response listeners to your requests.
 * * `"error"` - `(err: Error)` - Emitted when a request that does not have a
 *   response listener times out, or when the underlying socket has an error.
 */
export class Client extends EventEmitter {
    /**
     * listener for "response" events.
     */
    constructor(type: UDP_TYPE = "udp4", responseListener?: RequestListener) {
        super();
        this.socket = dgram.createSocket(type);
        /** @type {Map<number, RequestCallback>} */
        this.callbacks = new Map();
        /** @type {Map<number, NodeJS.Timeout>} */
        this.timeouts = new Map();
        if (responseListener) {
            this.on("response", responseListener);
        }
        this.socket.on("message", (msg, rinfo) => {
            debug("client_messageListener: new message");
            if (debugLevel & 0x4) debug(hexdump(msg, msg.length, 16));

            const res = new ClientResponse(this.socket, rinfo);

            if (res.parseOnce(msg)) {
                const id = res.header.id;
                const timeout = this.timeouts.get(id);
                clearTimeout(timeout);
                this.timeouts.delete(id);
                const cb = this.callbacks.get(id);
                if (cb) {
                    cb(null, res);
                }
                this.emit("response", res);
            }
        });
        this.socket.on("error", err => this.emit("error", err));
    }

    /**
     * internal
     */
    _onTimeout(client: Client, request: ClientRequest) {
        const cb = client.callbacks.get(request.header.id);
        client.callbacks.delete(request.header.id);
        const err = new Error("Request timed out.");
        if (cb) {
            cb(err);
        } else {
            this.emit("error", err, request);
        }
    }

    /**
     * Creates a new `ClientRequest`.
     *
     * Valid patterns:
     * ```ts
     * request(port: number, address: string, cb: RequestCallback): ClientRequest;
     * request(options: RequestOptions, cb: RequestCallback): ClientRequest;
     * ```
     *
     */
    request(portOrOptions: number | object, addressOrCb: string | RequestCallback, cb): ClientRequest {
        /** @type {RequestOptions} */
        let options;
        if (portOrOptions && typeof portOrOptions === "object" &&
            typeof addressOrCb === "function") {
            options = portOrOptions;
            if (options.timeout != null && typeof options.timeout !== "number") {
                throw new TypeError("timeout must be a number.");
            }
            if (!options.timeout) {
                options.timeout = DEFAULT_TIMEOUT;
            }
            cb = addressOrCb;
        } else if (typeof portOrOptions === "number" &&
            typeof addressOrCb === "string" &&
            typeof cb === "function") {
            options = {
                port: portOrOptions,
                address: addressOrCb,
                timeout: DEFAULT_TIMEOUT
            };
        } else {
            throw new Error("Invalid invocation. Expected (port, address, cb) or (options, cb).");
        }

        const req = new ClientRequest(this, options);
        this.callbacks.set(req.header.id, cb);
        return req;
    }

    /**
     * Binds the socket so it can listen for responses. This must be called
     * before sending a request.
     * @param {number} [port] If not specified or if 0, will bind a random port.
     * @param {string} [address] If not specified, will listen on all addresses.
     */
    bind(port: number = 0, address: string = "0.0.0.0") {
        this.socket.bind(port, address);
    }

    /** Closes the client. You must call this to allow Node.js to exit. */
    close() {
        this.socket.close();
    }
}

class DnsError extends Error {
    private code: any;

    constructor(code, message) {
        super(message);
        this.code = code;
    }
}

/**
 * Returns a descriptive error for the `RCODE` of the response. Only those codes
 * in RFC1035 and RFC6891 (EDNS) are handled.
 */
export function getRcodeError(response: ClientResponse): DnsError {
    switch (response.header.rcode) {
        case 0:
            return;
        // RFC1035 errors:
        case 1:
            return new DnsError("FORMERR", "Format Error: The name server was unable to interpret the query.");
        case 2:
            return new DnsError("SERVFAIL", "Server Failure: The name server was unable to process this query due to a problem with the name server.");
        case 3:
            return new DnsError("NXDOMAIN", "Name Error: The domain name referenced in the query does not exist.");
        case 4:
            return new DnsError("NOTIMPL", "Not Implemented: The name server does not support the requested kind of query.");
        case 5:
            return new DnsError("REFUSED", "Refused: The name server refused to perform the specified operation for policy reasons.");
        // BIND_UPDATE errors - TODO not implemented
        // RFC6891 EDNS:
        case 16:
            return new DnsError("BADVERS", "Bad Version: Server does not implement the version level of the request.");
        // RFC2845 TSIG errors - TODO not impelemented. (case 16 collides.)
        default:
            return new DnsError("UNKNOWN", `Unknown Error ${response.header.rcode}.`);
    }
}

/**
 * Debugging utility to print part of packet in hex.
 * @param {Buffer} buf
 * @param {number} length
 * @param {number} width Octets per line
 * @return {string}
 */
function hexdump(buf: Buffer, length: number, width: number = 32): string {
    if (!Buffer.isBuffer(buf))
        throw new Error("argument must be buffer");
    let str = "\n";
    str += "0";
    str += "\t";
    for (let i = 0; i < length; i++) {
        str += buf.toString("hex", i, i + 1);
        str += " ";
        if ((i + 1) % (width / 2)) continue;
        str += " ";
        if ((i + 1) % width) continue;
        str += "\n";
        str += String(i + 1);
        str += "\t";
    }
    return str;
}
