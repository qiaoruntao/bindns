const {
    NS_INT16SZ,
    NS_INT32SZ,
    NS_MAXDNAME,
    NS_HFIXEDSZ,
    NS_QFIXEDSZ,
    NS_RRFIXEDSZ,
    NS_MAXMSG,
    ns_sect,
    ns_type,
    ns_flag} = require("./nameser.js");

const {
    errno,
    EMSGSIZE,
    ENODEV} = require("./errno.js");

const {
    ns_name_skip,
    ns_name_pack,
    ns_name_unpack, ns_name_unpack2,
    ns_name_ntop,
    ns_name_pton, ns_name_pton2,
    ns_name_uncompress} = require("./ns_name.js");

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

const ns_flagdata = [
    {mask: 0x8000, shift: 15}, // qr.
    {mask: 0x7800, shift: 11}, // opcode.
    {mask: 0x0400, shift: 10}, // aa.
    {mask: 0x0200, shift: 9}, // tc.
    {mask: 0x0100, shift: 8}, // rd.
    {mask: 0x0080, shift: 7}, // ra.
    {mask: 0x0040, shift: 6}, // z.
    {mask: 0x0020, shift: 5}, // ad.
    {mask: 0x0010, shift: 4}, // cd.
    {mask: 0x000f, shift: 0}, // rcode.
    {mask: 0x0000, shift: 0}, // expansion (1/6).
    {mask: 0x0000, shift: 0}, // expansion (2/6).
    {mask: 0x0000, shift: 0}, // expansion (3/6).
    {mask: 0x0000, shift: 0}, // expansion (4/6).
    {mask: 0x0000, shift: 0}, // expansion (5/6).
    {mask: 0x0000, shift: 0}, // expansion (6/6).
];

const res_opcodes = [
    "QUERY",
    "IQUERY",
    "CQUERYM",
    "CQUERYU",	// experimental
    "NOTIFY",	// experimental
    "UPDATE",
    "6",
    "7",
    "8",
    "9",
    "10",
    "11",
    "12",
    "13",
    "ZONEINIT",
    "ZONEREF",
];
const res_sectioncodes = [
    "ZONE",
    "PREREQUISITES",
    "UPDATE",
    "ADDITIONAL",
];

const p_class_syms = {
    1: "IN",
    3: "CHAOS",
    4: "HESOID",
    254: "ANY",
    255: "NONE"
};
exports.p_class_syms = p_class_syms;

const p_default_section_syms = {
    0: "QUERY",
    1: "ANSWER",
    2: "AUTHORITY",
    3: "ADDITIONAL"
};
exports.p_default_section_syms = p_default_section_syms;

const p_key_syms = {
    1: ["RSA", "RSA KEY with MD5 hash"],
    2: ["DH", "Diffie Hellman"],
    3: ["DSA", "Digital Signature Algorithm"],
    4: ["PRIVATE", "Algorithm obtained from OID"]
};
exports.p_key_syms = p_key_syms;

const p_cert_syms = {
    1: ["PKIX", "PKIX (X.509v3) Certificate"],
    2: ["SKPI", "SPKI Certificate"],
    3: ["PGP", "PGP Certificate"],
    253: ["URL", "URL Private"],
    254: ["OID", "OID Private"]
};
exports.p_cert_syms = p_cert_syms;

const p_type_syms = {
    1: "A",
    2: "NS",
    3: "MD",
    4: "MF",
    5: "CNAME",
    6: "SOA",
    7: "MB",
    8: "MG",
    9: "MR",
    10: "NULL",
    11: "WKS",
    12: "PTR",
    13: "HINFO",
    14: "MINFO",
    15: "MX",
    16: "TXT",
    17: "RP",
    18: "AFSDB",
    19: "X25",
    20: "ISDN",
    21: "RT",
    22: "NSAP",
    23: "NSAP_PTR",
    24: "SIG",
    25: "KEY",
    26: "PX",
    27: "GPOS",
    28: "AAAA",
    29: "LOC",
    30: "NXT",
    31: "EID",
    32: "NIMLOC",
    33: "SRV",
    34: "ATMA",
    35: "NAPTR",
    36: "KX",
    37: "CERT",
    38: "A6",
    39: "DNAME",
    40: "SINK",
    41: "OPT",
    42: "APL",
    43: "DS",
    44: "SSHFP",
    45: "IPSECKEY",
    46: "RRSIG",
    47: "NSEC",
    48: "DNSKEY",
    49: "DHCID",
    50: "NSEC3",
    51: "NSEC3PARAM",
    55: "HIP",
    99: "SPF",
    249: "TKEY",
    250: "TSIG",
    251: "IXFR",
    252: "AXFR",
    253: "MAILB",
    254: "MAILA",
    255: "ANY",
    32769: "DLV",
    256: "ZXFR",
};
exports.p_type_syms = p_type_syms;

const p_rcode_syms = {
    0: ["NOERROR", "no error"],
    1: ["FORMERR", "format error"],
    2: ["SERVFAIL", "server failed"],
    3: ["NXDOMAIN", "no such domain name"],
    4: ["NOTIMP", "not implemented"],
    5: ["REFUSED", "refused"],
    // These are for BIND_UPDATE
    6: ["YXDOMAIN", "domain name exist"],
    7: ["YXRRSET", "rrset exists"],
    8: ["NXRRSET", "rrset doesn't exist"],
    9: ["NOTAUTH", "not authorative"],
    10: ["NOTZONE", "not in zone"],
    11: ["", ""],
    // The following are EDNS extended rcodes
    // The following are TSIG errors
    16: ["BADSIG", "bad signature"],
    17: ["BADKEY", "bad key"],
    18: ["BADTIME", "bad time"]
};
exports.p_rcode_syms = p_rcode_syms;

// ns_name.c was here

function isspace(ch) {
    return ch === 32 || ch === 12 || ch === 10 || ch === 13 || ch === 9 || ch === 12;
}

function dn_skipname(buf, ptr, eom) {
    const saveptr = ptr;
    const ptrptr = new Ptr(ptr);

    if (ns_name_skip(buf, ptrptr, eom) === -1) {
        return -1;
    }

    return ptrptr.get() - saveptr;
}
exports.dn_skipname = dn_skipname;

function dn_expand(msg, offset, len, dst, dstsiz) {
    const n = ns_name_uncompress(msg, offset, len, dst, dstsiz);

    if (n > 0 && dst[0] === ".") dst[0] = 0;
    return n;
}
exports.dn_expand = dn_expand;

function ns_skiprr(buf, ptr, eom, section, count) {
    const optr = ptr;
    for (let i = 0; i < count; i++) {
        let rdlength;
        const b = dn_skipname(buf, ptr, eom);
        if (b < 0) {
            return -1;
        }
        ptr += b + NS_INT16SZ + NS_INT16SZ;
        if (section !== ns_sect.qd) {
            if (ptr + NS_INT32SZ + NS_INT16SZ > eom) return -1;
            ptr += NS_INT32SZ;
            rdlength = buf[ptr] * 256 + buf[ptr + 1];
            ptr += NS_INT16SZ;
            ptr += rdlength;
        }
    }
    if (ptr > eom) {
        errno(EMSGSIZE);
        return -1;
    }
    return ptr - optr;
}
exports.ns_skiprr = ns_skiprr;

function ns_msg() {
    this._buf = 0;
    this._msg = 0;
    this._eom = 0;
    this._id = 0, this._flags = 0, this._counts = new Array(ns_sect.max);
    this._sections = new Array(ns_sect.max);
    this._sect = 0;
    this._rrnum = 0;
    this._msg_ptr = 0;
}
exports.ns_msg = ns_msg;

ns_msg.prototype.getId = function () {
    return this._id;
};

ns_msg.prototype.getBase = function () {
    return this._msg;
};

ns_msg.prototype.getSize = function () {
    return this._eom;
};

ns_msg.prototype.getCount = function (section) {
    return this._counts[section];
};

ns_msg.prototype.getFlag = function (flag) {
    if (flag > 0 && flag < ns_flagdata.length)
        return (this._flags & ns_flagdata[flag].mask) >> ns_flagdata[flag].shift;
    return 0;
};

function ns_rr() {
    this.name = "";
    this.type = 0;
    this.rr_class = 0;
    this.ttl = 0;
    this.rdlength = 0;
    this.rdata = null;
}
exports.ns_rr = ns_rr;

function ns_rr2() {
    this.nname = new Buffer(NS_MAXDNAME);
    this.nnamel = 0;
    this.type = 0;
    this.rr_class = 0;
    this.ttl = 0;
    this.rdlength = 0;
    this.rdata = null;
}
exports.ns_rr2 = ns_rr2;

function ns_initparse(buf, buflen, handle) {
    let msg = 0;
    const eom = buflen;
    let i;

    handle._buf = buf;
    handle._msg = 0;
    handle._eom = eom;

    if (msg + NS_INT16SZ > eom) return -1;
    handle._id = buf[msg] * 256 + buf[msg + 1];
    msg += NS_INT16SZ;

    if (msg + NS_INT16SZ > eom) return -1;
    handle._flags = buf[msg] * 256 + buf[msg + 1];
    msg += NS_INT16SZ;

    for (i = 0; i < ns_sect.max; i++) {
        if (msg + NS_INT16SZ > eom) return -1;
        handle._counts[i] = buf[msg] * 256 + buf[msg + 1];
        msg += NS_INT16SZ;
    }

    for (i = 0; i < ns_sect.max; i++) {
        if (handle._counts[i] === 0) {
            handle._sections[i] = null;
        } else {
            const b = ns_skiprr(buf, msg, eom, i, handle._counts[i]);
            if (b < 0) {
                return -1;
            }
            handle._sections[i] = msg;
            msg += b;
        }
    }

    if (msg !== eom) return -1;
    setsection(handle, ns_sect.max);
    return 0;
}
exports.ns_initparse = ns_initparse;

function ns_parserr2(handle, section, rrnum, rr) {
    let b;

    const tmp = section;
    if (tmp < 0 || section >= ns_sect.max) {
        errno(ENODEV);
        return -1;
    }
    if (section !== handle._sect) setsection(handle, section);

    if (rrnum === -1) rrnum = handle._rrnum;
    if (rrnum < 0 || rrnum >= handle._counts[section]) {
        errno(ENODEV);
        return -1;
    }
    if (rrnum < handle._rrnum) setsection(handle, section);
    if (rrnum > handle._rrnum) {
        b = ns_skiprr(handle._buf, handle._msg_ptr, handle._eom, section, rrnum - handle._rrnum);
        if (b < 0) return -1;
        handle._msg_ptr += b;
        handle._rrnum = rrnum;
    }
    // do the parse
    const nnamelp = new Ptr();
    b = ns_name_unpack2(handle._buf, handle._msg_ptr, handle._eom, rr.nname, rr.nname.length, nnamelp);
    if (b < 0) return -1;
    rr.nnamel = nnamelp.get();
    handle._msg_ptr += b;
    if (handle._msg_ptr + NS_INT16SZ + NS_INT16SZ > handle._eom) {
        errno(EMSGSIZE);
        return -1;
    }
    rr.type = handle._buf[handle._msg_ptr] * 256 + handle._buf[handle._msg_ptr + 1];
    handle._msg_ptr += NS_INT16SZ;
    rr.rr_class = handle._buf[handle._msg_ptr] * 256 + handle._buf[handle._msg_ptr + 1];
    handle._msg_ptr += NS_INT16SZ;
    if (section === ns_sect.qd) {
        rr.ttl = 0;
        rr.rdlength = 0;
        rr.rdata = null;
    } else {
        if (handle._msg_ptr + NS_INT32SZ + NS_INT16SZ > handle._eom) {
            errno(EMSGSIZE);
            return -1;
        }
        rr.ttl = handle._buf[handle._msg_ptr] * 16777216 +
            handle._buf[handle._msg_ptr + 1] * 65536 +
            handle._buf[handle._msg_ptr + 2] * 256 +
            handle._buf[handle._msg_ptr + 3];
        handle._msg_ptr += NS_INT32SZ;
        rr.rdlength = handle._buf[handle._msg_ptr] * 256 + handle._buf[handle._msg_ptr + 1];
        handle._msg_ptr += NS_INT16SZ;
        if (handle._msg_ptr + rr.rdlength > handle._eom) {
            errno(EMSGSIZE);
            return -1;
        }
        rr.rdata = handle._msg_ptr;
        handle._msg_ptr += rr.rdlength;
    }
    if (++handle._rrnum > handle._counts[section]) setsection(handle, section + 1);

    // all done
    return 0;
}
exports.ns_parserr2 = ns_parserr2;

function setsection(msg, sect) {
    msg._sect = sect;
    if (sect === ns_sect.max) {
        msg._rrnum = -1;
        msg._msg_ptr = null;
    } else {
        msg._rrnum = 0;
        msg._msg_ptr = msg._sections[sect];
    }
}
exports.setsection = setsection;

function ns_newmsg() {
    this.msg = new ns_msg();
    this.dnptrs = new Array(25);
    this.lastdnptr = this.dnptrs.length;
}
exports.ns_newmsg = ns_newmsg;

ns_newmsg.prototype.setId = function (id) {
    this.msg._id = id;
};

ns_newmsg.prototype.setFlag = function (flag, value) {
    this.msg._flags &= ~ns_flagdata[flag].mask;
    this.msg._flags |= value << ns_flagdata[flag].shift;
};

function ns_newmsg_init(buf, bufsiz, handle) {
    const msg = handle.msg;
    msg._buf = buf;
    msg._msg = 0;
    msg._eom = bufsiz;
    msg._sect = ns_sect.qd;
    msg._rrnum = 0;
    msg._msg_ptr = 0 + NS_HFIXEDSZ;

    handle.dnptrs[0] = 0;
    handle.dnptrs[1] = null;
    handle.lastdnptr = handle.dnptrs.length;

    return 0;
}
exports.ns_newmsg_init = ns_newmsg_init;

function ns_newmsg_q(handle, qname, qtype, qclass) {
    const msg = handle.msg;
    let t;

    if (msg._sect !== ns_sect.qd) {
        errno(ENODEV);
        return -1;
    }

    t = msg._msg_ptr;
    if (msg._rrnum === 0) {
        msg._sections[ns_sect.qd] = t;
    }
    const n = ns_name_pack(qname, 0, msg._buf, t, msg._eom - t, handle.dnptrs, handle.lastdnptr);
    if (n < 0) return -1;
    t += n;
    if (t + NS_QFIXEDSZ >= msg._eom) {
        errno(EMSGSIZE);
        return -1;
    }
    msg._buf[t++] = qtype >> 8;
    msg._buf[t++] = qtype >> 0;
    msg._buf[t++] = qclass >> 8;
    msg._buf[t++] = qclass >> 0;
    msg._msg_ptr = t;
    msg._counts[ns_sect.qd] = ++msg._rrnum;
    return 0;
}
exports.ns_newmsg_q = ns_newmsg_q;

function ns_newmsg_rr(handle, sect, name, type, rr_class, ttl, rdlen, rdata) {
    const msg = handle.msg;
    let t;

    if (!Buffer.isBuffer(rdata)) {
        throw new Error("error");
    }

    if (sect < msg._sect) {
        errno(ENODEV);
        return -1;
    }
    t = msg._msg_ptr;
    if (sect > msg._sect) {
        msg._sect = sect;
        msg._sections[sect] = t;
        msg._rrnum = 0;
    }
    const n = ns_name_pack(name, 0, msg._buf, t, msg._eom - t, handle.dnptrs, handle.lastdnptr);
    if (n < 0) return -1;
    t += n;
    if (t + NS_RRFIXEDSZ + rdlen > msg._eom) {
        errno(EMSGSIZE);
        return -1;
    }
    msg._buf[t++] = type >> 8;
    msg._buf[t++] = type >> 0;
    msg._buf[t++] = rr_class >> 8;
    msg._buf[t++] = rr_class >> 0;
    msg._buf[t++] = ttl >> 24;
    msg._buf[t++] = ttl >> 16;
    msg._buf[t++] = ttl >> 8;
    msg._buf[t++] = ttl >> 0;
    msg._msg_ptr = t;
    if (rdcpy(handle, type, rdata, rdlen) < 0) return -1;
    msg._counts[sect] = ++msg._rrnum;
    return 0;
}
exports.ns_newmsg_rr = ns_newmsg_rr;

function ns_newmsg_done(handle) {
    const msg = handle.msg;
    let t = 0;
    msg._buf[t++] = msg._id >> 8;
    msg._buf[t++] = msg._id >> 0;
    msg._buf[t++] = msg._flags >> 8;
    msg._buf[t++] = msg._flags >> 0;
    for (let sect = 0; sect < ns_sect.max; sect++) {
        msg._buf[t++] = msg._counts[sect] >> 8;
        msg._buf[t++] = msg._counts[sect] >> 0;
    }
    msg._eom = msg._msg_ptr;
    msg._sect = ns_sect.max;
    msg._rrnum = -1;
    msg._msg_ptr = null;

    return msg._eom;
}
exports.ns_newmsg_done = ns_newmsg_done;

function rdcpy(handle, type, rdata, rdlen) {
    const msg = handle.msg;

    let p = msg._msg_ptr;
    let t = p + NS_INT16SZ;
    const s = t;
    let n;

    let nrdata = 0;

    switch (type) {
        case ns_type.soa:
            n = ns_name_pack(rdata, nrdata, msg._buf, t, msg._eom - t, handle.dnptrs, handle.lastdnptr);
            if (n < 0) return -1;
            t += n;

            _ptr.set(nrdata);
            if (ns_name_skip(rdata, _ptr, msg._eom) < 0) return -1;
            nrdata = _ptr.get();

            n = ns_name_pack(rdata, nrdata, msg._buf, t, msg._eom - t, handle.dnptrs, handle.lastdnptr);
            if (n < 0) return -1;
            t += n;

            _ptr.set(nrdata);
            if (ns_name_skip(rdata, _ptr, msg._eom) < 0) return -1;
            nrdata = _ptr.get();

            if (msg._eom - t < NS_INT32SZ * 5) {
                errno(EMSGSIZE);
                return -1;
            }
            rdata.copy(msg._buf, t, nrdata, nrdata + NS_INT32SZ * 5);
            t += NS_INT32SZ * 5;
            /*
            rdata.copy (msg._buf, t, nrdata, rdlen);
            t += rdlen;
            */
            break;
        case ns_type.ptr:
        case ns_type.cname:
        case ns_type.ns:
            n = ns_name_pack(rdata, nrdata, msg._buf, t, msg._eom - t, handle.dnptrs, handle.lastdnptr);
            if (n < 0) return -1;
            t += n;
            break;
        default:
            rdata.copy(msg._buf, t, nrdata, rdlen);
            t += rdlen;
            break;
    }

    msg._buf[p++] = t - s >> 8;
    msg._buf[p++] = t - s >> 0;
    msg._msg_ptr = t;
    return 0;
}

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
    util.print(0);
    util.print("\t");
    for (let i = 0; i < length; i++) {
        util.print(hexvalue[buf[i]]);
        util.print(" ");
        if ((i + 1) % (count / 2)) continue;
        util.print(" ");
        if ((i + 1) % count) continue;
        util.print("\n");
        util.print(i + 1);
        util.print("\t");
    }
    util.print("\n");
}
