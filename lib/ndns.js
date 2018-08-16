const {
    NS_MAXDNAME,
    NS_MAXMSG,

    ns_sect,
    ns_type,
    ns_flag,

    ns_msg,
    ns_newmsg,
    ns_rr2
} = require("./nameser.js");

const {
    errno,
    EMSGSIZE
} = require("./errno.js");

const {
    ns_name_unpack,
    ns_name_ntop,
    ns_name_pton,
    ns_name_pton2
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

const Ptr = require("./Ptr");

const util = require("util");

const _ptr = new Ptr();

const _string = Buffer.alloc(NS_MAXDNAME);
const _dname = Buffer.alloc(NS_MAXDNAME);

const debugLevel = Number.parseInt(process.env.NODE_DEBUG, 16);
const debug = debugLevel & 0x4 ? x => console.error("NDNS: " + x) : () => {};

const dgram = require("dgram");
const events = require("events");


// Flags field of the KEY RR rdata


const hexvalue = [
    "00", "01", "02", "03", "04", "05", "06", "07", "08", "09", "0a", "0b", "0c", "0d", "0e", "0f",
    "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "1a", "1b", "1c", "1d", "1e", "1f",
    "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "2a", "2b", "2c", "2d", "2e", "2f",
    "30", "31", "32", "33", "34", "35", "36", "37", "38", "39", "3a", "3b", "3c", "3d", "3e", "3f",
    "40", "41", "42", "43", "44", "45", "46", "47", "48", "49", "4a", "4b", "4c", "4d", "4e", "4f",
    "50", "51", "52", "53", "54", "55", "56", "57", "58", "59", "5a", "5b", "5c", "5d", "5e", "5f",
    "60", "61", "62", "63", "64", "65", "66", "67", "68", "69", "6a", "6b", "6c", "6d", "6e", "6f",
    "70", "71", "72", "73", "74", "75", "76", "77", "78", "79", "7a", "7b", "7c", "7d", "7e", "7f",
    "80", "81", "82", "83", "84", "85", "86", "87", "88", "89", "8a", "8b", "8c", "8d", "8e", "8f",
    "90", "91", "92", "93", "94", "95", "96", "97", "98", "99", "9a", "9b", "9c", "9d", "9e", "9f",
    "a0", "a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8", "a9", "aa", "ab", "ac", "ad", "ae", "af",
    "b0", "b1", "b2", "b3", "b4", "b5", "b6", "b7", "b8", "b9", "ba", "bb", "bc", "bd", "be", "bf",
    "c0", "c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9", "ca", "cb", "cc", "cd", "ce", "cf",
    "d0", "d1", "d2", "d3", "d4", "d5", "d6", "d7", "d8", "d9", "da", "db", "dc", "dd", "de", "df",
    "e0", "e1", "e2", "e3", "e4", "e5", "e6", "e7", "e8", "e9", "ea", "eb", "ec", "ed", "ee", "ef",
    "f0", "f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "f9", "fa", "fb", "fc", "fd", "fe", "ff",
];

function RDataParser() {
    this.msg = null;
    this.eom = 0;
    this.rdata = 0;
    this.rdlen = 0;
    this.nrdata = 0;

    this.active = false;
}
RDataParser.prototype.initialize = function (msg, eom, rdata, rdlen, nrdata) {
    this.msg = msg;
    this.eom = eom;
    this.rdata = rdata;
    this.rdlen = rdlen;
    this.nrdata = nrdata;

    this.active = true;
};
RDataParser.prototype.finalize = function () {
    this.active = false;

    return this.rdlen === 0;
};
RDataParser.prototype.consume = function (n) {
    if (this.active) {
        if (this.rdlen < n) {
            this.active = false;
        } else {
            this.rdata += n;
            this.rdlen -= n;
        }
    }
    return this.active;
};
RDataParser.prototype.IPv4 = function () {
    if (this.consume(4)) {
        const item = [this.msg[this.rdata - 4],
            this.msg[this.rdata - 3],
            this.msg[this.rdata - 2],
            this.msg[this.rdata - 1]].join(".");
        this.nrdata.push(item);
    }
};
RDataParser.prototype.IPv6 = function () {
    if (this.consume(16)) {
        const item = [hexvalue[this.msg[this.rdata - 16]] +
            hexvalue[this.msg[this.rdata - 15]],
        hexvalue[this.msg[this.rdata - 14]] +
            hexvalue[this.msg[this.rdata - 13]],
        hexvalue[this.msg[this.rdata - 12]] +
            hexvalue[this.msg[this.rdata - 11]],
        hexvalue[this.msg[this.rdata - 10]] +
            hexvalue[this.msg[this.rdata - 9]],
        hexvalue[this.msg[this.rdata - 8]] +
            hexvalue[this.msg[this.rdata - 7]],
        hexvalue[this.msg[this.rdata - 6]] +
            hexvalue[this.msg[this.rdata - 5]],
        hexvalue[this.msg[this.rdata - 4]] +
            hexvalue[this.msg[this.rdata - 3]],
        hexvalue[this.msg[this.rdata - 2]] +
            hexvalue[this.msg[this.rdata - 1]]].join(":");

        this.nrdata.push(item);
    }
};
RDataParser.prototype.name = function () {
    let len, n;
    if (this.active) {
        if ((len = ns_name_unpack(this.msg, this.rdata, this.rdlen, _dname, _dname.length)) === -1) {
            this.active = false;
            return;
        }
        if ((n = ns_name_ntop(_dname, _string, _string.length)) === -1) {
            this.active = false;
            return;
        }

        const item = _string.toString("ascii", 0, n);

        if (this.consume(len)) {
            this.nrdata.push(item);
        }
    }
};
RDataParser.prototype.UInt32 = function () {
    if (this.consume(4)) {
        const item = this.msg[this.rdata - 4] * 16777216 +
            this.msg[this.rdata - 3] * 65536 +
            this.msg[this.rdata - 2] * 256 +
            this.msg[this.rdata - 1];
        this.nrdata.push(item);
    }
};
RDataParser.prototype.UInt16 = function () {
    if (this.consume(2)) {
        const item = this.msg[this.rdata - 2] * 256 +
            this.msg[this.rdata - 1];
        this.nrdata.push(item);
    }
};
RDataParser.prototype.UInt8 = function () {
    if (this.consume(1)) {
        const item = this.msg[this.rdata - 1];
        this.nrdata.push(item);
    }
};
RDataParser.prototype.string = function (n) {
    if (this.consume(n)) {
        const item = this.msg.toString("ascii", this.rdata - n, this.rdata);
        this.nrdata.push(item);
    }
};
RDataParser.prototype.txt = function () {
    if (this.active) {
        let item = "";
        if (this.rdlen > 0 && this.consume(1)) {
            const n = this.msg[this.rdata - 1];
            if (this.consume(n)) {
                const tmp = this.msg.toString("ascii", this.rdata - n, this.rdata);
                item += tmp;
            } else {
                this.active = false;
                return;
            }
        }
        this.nrdata.push(item);
    }
};
RDataParser.prototype.rest = function () {
    if (this.consume(this.rdlen)) {
        const item = this.msg.slice(this.rdata - this.rdlen, this.rdata);
        this.nrdata.push(item);
    }
};

const _rdataParser = new RDataParser();
function ns_rdata_unpack(msg, eom, type, rdata, rdlen, nrdata) {
    _rdataParser.initialize(msg, eom, rdata, rdlen, nrdata);

    switch (type) {
        case ns_type.a:
            _rdataParser.IPv4();
            break;
        case ns_type.aaaa:
            _rdataParser.IPv6();
            break;
        case ns_type.cname:
        case ns_type.mb:
        case ns_type.mg:
        case ns_type.mr:
        case ns_type.ns:
        case ns_type.ptr:
        case ns_type.dname:
            _rdataParser.name();
            break;
        case ns_type.soa:
            _rdataParser.name();
            _rdataParser.name();
            _rdataParser.UInt32();
            _rdataParser.UInt32();
            _rdataParser.UInt32();
            _rdataParser.UInt32();
            _rdataParser.UInt32();
            break;
        case ns_type.mx:
        case ns_type.afsdb:
        case ns_type.rt:
            _rdataParser.UInt16();
            _rdataParser.name();
            break;
        case ns_type.px:
            _rdataParser.UInt16();
            _rdataParser.name();
            _rdataParser.name();
            break;
        case ns_type.srv:
            _rdataParser.UInt16();
            _rdataParser.UInt16();
            _rdataParser.UInt16();
            _rdataParser.name();
            break;
        case ns_type.minfo:
        case ns_type.rp:
            _rdataParser.name();
            _rdataParser.name();
            break;
        case ns_type.txt:
            _rdataParser.txt();
            break;
        default:
            _rdataParser.rest();
    }

    if (_rdataParser.finalize() === false) {
        errno(EMSGSIZE);
        return -1;
    }

    return 0;
}
exports.ns_rdata_unpack = ns_rdata_unpack;

function RDataWriter() {
    this.srdata = null;
    this.buf = null;
    this.ordata = 0;
    this.rdata = 0;
    this.rdsiz = 0;

    this.nconsumed = 0;
    this.nitem = 0;

    this.active = false;
}
RDataWriter.prototype.initialize = function (srdata, buf, rdata, rdsiz) {
    this.srdata = srdata;
    this.buf = buf;
    this.ordata = rdata;
    this.rdata = rdata;
    this.rdsiz = rdsiz;

    this.nconsumed = 0;
    this.nitem = 0;

    this.active = true;
};
RDataWriter.prototype.consume = function (n) {
    if (this.active) {
        if (this.rdsiz < n) {
            this.active = false;
        } else {
            this.rdata += n;
            this.rdsiz -= n;

            this.nconsumed += n;
        }
    }
    return this.active;
};
RDataWriter.prototype.next = function () {
    let item;
    if (this.nitem < this.srdata.length) {
        item = this.srdata[this.nitem++];
    }
    return item;
};
RDataWriter.prototype.IPv4 = function () {
    let item = this.next();
    if (this.consume(4)) {
        if (!Buffer.isBuffer(item) && !Array.isArray(item)) {
            if (typeof item === "string") {
                item = item.split(".");
            } else {
                item = item.toString().split(".");
            }
        }
        if (item.length < 4) {
            this.active = false;
            return;
        }
        this.buf[this.rdata - 4] = item[0];
        this.buf[this.rdata - 3] = item[1];
        this.buf[this.rdata - 2] = item[2];
        this.buf[this.rdata - 1] = item[3];
    }
};
RDataWriter.prototype.IPv6 = function () {
    const item = this.next();
    if (this.consume(16)) {
        if (Buffer.isBuffer(item) || Array.isArray(item)) {
            if (item.length < 16) {
                this.active = false;
                return;
            }

            this.buf[this.rdata - 16] = item[0];
            this.buf[this.rdata - 15] = item[1];
            this.buf[this.rdata - 14] = item[2];
            this.buf[this.rdata - 13] = item[3];
            this.buf[this.rdata - 12] = item[4];
            this.buf[this.rdata - 11] = item[5];
            this.buf[this.rdata - 10] = item[6];
            this.buf[this.rdata - 9] = item[7];
            this.buf[this.rdata - 8] = item[8];
            this.buf[this.rdata - 7] = item[9];
            this.buf[this.rdata - 6] = item[10];
            this.buf[this.rdata - 5] = item[11];
            this.buf[this.rdata - 3] = item[12];
            this.buf[this.rdata - 2] = item[13];
            this.buf[this.rdata - 1] = item[14];
            this.buf[this.rdata - 1] = item[15];
        } else {
            const tmp = item.toString().split(":");
            if (tmp.length < 8) {
                this.active = false;
                return;
            }
            for (let i = 0; i < 8; i++) {
                const n = Number.parseInt(tmp[i], 16);
                this.buf[this.rdata - 16 + i * 2] = n >> 8;
                this.buf[this.rdata - 15 + i * 2] = n >> 0;
            }
        }
    }
};
RDataWriter.prototype.name = function () {
    const item = this.next();
    let len, n;
    if (this.active) {
        if (Buffer.isBuffer(item)) {
            len = item.length;
            if (len + 1 > _string.length) {
                this.active = false;
                return;
            }
            item.copy(_string, 0, 0, len);
            _string[len] = 0;
            if (ns_name_pton2(_string, _dname, _dname.length, _ptr) === -1) {
                this.active = false;
                return;
            }
            n = _ptr.get();
            if (this.consume(n)) {
                _dname.copy(this.buf, this.rdata - n, 0, n);
            }
        }
        if (typeof item === "string") {
            if ((len = _string.write(item, 0)) === _string.length) {
                this.active = false;
                return;
            }
            _string[len] = 0;
            if (ns_name_pton2(_string, _dname, _dname.length, _ptr) === -1) {
                this.active = false;
                return;
            }
            n = _ptr.get();
            if (this.consume(n)) {
                _dname.copy(this.buf, this.rdata - n, 0, n);
            }
        } else {
            this.active = false;
            return;
        }
    }
};
RDataWriter.prototype.UInt32 = function () {
    let item = this.next();
    if (this.consume(4)) {
        if (Buffer.isBuffer(item) || Array.isArray(item)) {
            if (item.length < 4) {
                this.active = false;
                return;
            }
            this.buf[this.rdata - 4] = item[0];
            this.buf[this.rdata - 3] = item[1];
            this.buf[this.rdata - 2] = item[2];
            this.buf[this.rdata - 1] = item[3];
        } else {
            if (typeof item !== "number") {
                item = Number.parseInt(item, 10);
            }
            this.buf[this.rdata - 4] = item >> 24;
            this.buf[this.rdata - 3] = item >> 16;
            this.buf[this.rdata - 2] = item >> 8;
            this.buf[this.rdata - 1] = item >> 0;
        }
    }
};
RDataWriter.prototype.UInt16 = function () {
    let item = this.next();
    if (this.consume(2)) {
        if (Buffer.isBuffer(item) || Array.isArray(item)) {
            if (item.length < 2) {
                this.active = false;
                return;
            }
            this.buf[this.rdata - 2] = item[0];
            this.buf[this.rdata - 1] = item[1];
        } else {
            if (typeof item !== "number") {
                item = Number.parseInt(item, 10);
            }
            this.buf[this.rdata - 2] = item >> 8;
            this.buf[this.rdata - 1] = item >> 0;
        }
    }
};
RDataWriter.prototype.UInt8 = function () {
    let item = this.next();
    if (this.consume(1)) {
        if (Buffer.isBuffer(item) || Array.isArray(item)) {
            if (item.length < 1) {
                this.active = false;
                return;
            }
            this.buf[this.rdata - 1] = item[0];
        } else {
            if (typeof item !== "number") {
                item = Number.parseInt(item, 10);
            }
            this.buf[this.rdata - 1] = item;
        }
    }
};
RDataWriter.prototype.txt = function () {
    const item = this.next();
    let n;
    if (this.active) {
        if (typeof item === "string") {
            if ((n = _string.write(item, 0)) === _string.length) {
                this.active = false;
                return;
            }
            if (n > 0 && this.consume(1)) {
                this.buf[this.rdata - 1] = n;
                if (this.consume(n)) {
                    _string.copy(this.buf, this.rdata - n, 0, n);
                } else {
                    this.active = false;
                    return;
                }
            }
        } else if (Buffer.isBuffer(item)) {
            n = item.length;
            if (n > 0 && this.consume(1)) {
                this.buf[this.rdata - 1] = n;
                if (this.consume(n)) {
                    item.copy(this.buf, this.rdata - n, 0, n);
                } else {
                    this.active = false;
                    return;
                }
            }
        }
    }
};
RDataWriter.prototype.rest = function () {
    this.consume(this.rdsiz);
};

const _rdataWriter = new RDataWriter();
function ns_rdata_pack(type, srdata, buf, rdata, rdsiz) {
    /* javascript */
    _rdataWriter.initialize(srdata, buf, rdata, rdsiz);

    switch (type) {
        case ns_type.a:
            _rdataWriter.IPv4();
            break;
        case ns_type.aaaa:
            _rdataWriter.IPv6();
            break;
        case ns_type.cname:
        case ns_type.mb:
        case ns_type.mg:
        case ns_type.mr:
        case ns_type.ns:
        case ns_type.ptr:
        case ns_type.dname:
            _rdataWriter.name();
            break;
        case ns_type.soa:
            _rdataWriter.name();
            _rdataWriter.name();
            _rdataWriter.UInt32();
            _rdataWriter.UInt32();
            _rdataWriter.UInt32();
            _rdataWriter.UInt32();
            _rdataWriter.UInt32();
            break;
        case ns_type.mx:
        case ns_type.afsdb:
        case ns_type.rt:
            _rdataWriter.UInt16();
            _rdataWriter.name();
            break;
        case ns_type.px:
            _rdataWriter.UInt16();
            _rdataWriter.name();
            _rdataWriter.name();
            break;
        case ns_type.srv:
            _rdataWriter.UInt16();
            _rdataWriter.UInt16();
            _rdataWriter.UInt16();
            _rdataWriter.name();
            break;
        case ns_type.minfo:
        case ns_type.rp:
            _rdataWriter.name();
            _rdataWriter.name();
            break;
        case ns_type.txt:
            _rdataWriter.txt();
            break;
        default:
            _rdataWriter.rest();
    }

    if (_rdataWriter.active === false) {
        return -1;
    }

    //debug (util.inspect (buf.slice (rdata, _rdataWriter.nconsumed)));

    return _rdataWriter.nconsumed;
}
exports.ns_rdata_pack = ns_rdata_pack;

function MessageHeader() {
    this.id = 0;
    this.qr = 0;
    this.opcode = 0;
    this.aa = 0;
    this.tc = 0;
    this.rd = 0;
    this.ra = 0;
    this.z = 0;
    this.ad = 0;
    this.cd = 0;
    this.rcode = 0;
    this.qdcount = 0;
    this.ancount = 0;
    this.nscount = 0;
    this.arcount = 0;
}
exports.MessageHeader = MessageHeader;

function MessageQuestion(name, type, klass) {
    this.name = name;
    this.type = type;
    this.class = klass;
}
exports.MessageQuestion = MessageQuestion;

function MessageRR(name, type, klass, ttl) {
    this.name = name;
    this.type = type;
    this.class = klass;
    this.ttl = ttl;

    if (arguments.length > 4) {
        this.rdata = arguments[4];
    } else {
        this.rdata = new Array();
    }
}
exports.MessageRR = MessageRR;

// for parseOnce:
const _msg = new ns_msg();
const _rr = new ns_rr2();
// for writeOnce:
const _newmsg = new ns_newmsg();
const _rdata = new Buffer(512);
// for sendTo:
const _maxmsg = new Buffer(NS_MAXMSG);

class Message extends events.EventEmitter {
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
        console.log(hexvalue[buf[i]]);
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
