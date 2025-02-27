import Ptr from "./Ptr";

import copy from "./copy";

import {EMSGSIZE, errno} from "./errno";

import {NS_MAXDNAME, ns_type} from "./nameser";

import {ns_name_pton2} from "./ns_name";
import {RDataParser} from "./r_data_parser";

export const hexValueList = [
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

// Performance: these buffers are reused. They could be localized within name().
export const _dname = Buffer.alloc(NS_MAXDNAME);
export const _string = Buffer.alloc(NS_MAXDNAME);
// Likewise:
const _ptr = new Ptr<number>(undefined);

const _rdataParser = new RDataParser();

export function ns_rdata_unpack(msg, eom, type, rdata, rdlen, nrdata) {
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


class RDataWriter {
    public srdata: unknown[];
    public buf: Buffer;
    public ordata: number;
    public rdata: number;
    public rdsiz: number;
    public nconsumed: number;
    public nitem: number;
    public active: boolean;

    constructor() {
        this.srdata = null;
        this.buf = null;
        this.ordata = 0;
        this.rdata = 0;
        this.rdsiz = 0;

        this.nconsumed = 0;
        this.nitem = 0;

        this.active = false;
    }

    initialize(srdata, buf, rdata, rdsiz) {
        this.srdata = srdata;
        this.buf = buf;
        this.ordata = rdata;
        this.rdata = rdata;
        this.rdsiz = rdsiz;

        this.nconsumed = 0;
        this.nitem = 0;

        this.active = true;
    };

    consume(n) {
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

    next() {
        let item;
        if (this.nitem < this.srdata.length) {
            item = this.srdata[this.nitem++];
        }
        return item;
    };

    IPv4() {
        let item = this.next();
        if (this.consume(4)) {
            if (typeof item === "string") {
                item = item.split(".");
            } else if (!Buffer.isBuffer(item) && !Array.isArray(item)) {
                item = item.toString().split(".");
            }
            if (item.length < 4) {
                this.active = false;
                return;
            }
            this.buf[this.rdata - 4] = Number.parseInt(item[0], 10);
            this.buf[this.rdata - 3] = Number.parseInt(item[1], 10);
            this.buf[this.rdata - 2] = Number.parseInt(item[2], 10);
            this.buf[this.rdata - 1] = Number.parseInt(item[3], 10);
        }
    };

    IPv6() {
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

    name() {
        const item = this.next();
        let len, n;
        if (this.active) {
            if (Buffer.isBuffer(item)) {
                len = item.length;
                if (len + 1 > _string.length) {
                    this.active = false;
                    return;
                }
                copy(item, _string, 0, 0, len);
                _string[len] = 0;
                if (ns_name_pton2(_string, _dname, _dname.length, _ptr) === -1) {
                    this.active = false;
                    return;
                }
                n = _ptr.get();
                if (this.consume(n)) {
                    copy(_dname, this.buf, this.rdata - n, 0, n);
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
                    copy(_dname, this.buf, this.rdata - n, 0, n);
                }
            } else {
                this.active = false;
                return;
            }
        }
    };

    UInt32() {
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

    UInt16() {
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

    UInt8() {
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

    txt() {
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
                        copy(_string, this.buf, this.rdata - n, 0, n);
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
                        copy(item, this.buf, this.rdata - n, 0, n);
                    } else {
                        this.active = false;
                        return;
                    }
                }
            }
        }
    };

    rest() {
        this.consume(this.rdsiz);
    };
}

const _rdataWriter = new RDataWriter();

export function ns_rdata_pack(type, srdata, buf, rdata, rdsiz) {
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
