import {ns_name_ntop, ns_name_unpack} from "./ns_name";
import {_dname, _string, hexValueList} from "./ns_rdata";

export class RDataParser {
    public msg: Buffer;
    public eom: number;
    public rdata: number;
    public rdlen: number;
    public nrdata: unknown[];
    public active: boolean;

    constructor() {
        this.msg = null;
        this.eom = 0;
        this.rdata = 0;
        this.rdlen = 0;
        this.nrdata = null;
        this.active = false;
    }

    initialize(msg, eom, rdata, rdlen, nrdata) {
        this.msg = msg;
        this.eom = eom;
        this.rdata = rdata;
        this.rdlen = rdlen;
        this.nrdata = nrdata;
        this.active = true;
    }

    finalize() {
        this.active = false;
        return this.rdlen === 0;
    }

    consume(n) {
        if (this.active) {
            if (this.rdlen < n) {
                this.active = false;
            } else {
                this.rdata += n;
                this.rdlen -= n;
            }
        }
        return this.active;
    }

    IPv4() {
        if (this.consume(4)) {
            const {msg, rdata} = this;
            const item = [
                msg[rdata - 4],
                msg[rdata - 3],
                msg[rdata - 2],
                msg[rdata - 1]
            ].join(".");
            this.nrdata.push(item);
        }
    }

    IPv6() {
        if (this.consume(16)) {
            const {msg, rdata} = this;
            const item = [
                hexValueList[msg[rdata - 16]] +
                hexValueList[msg[rdata - 15]],
                hexValueList[msg[rdata - 14]] +
                hexValueList[msg[rdata - 13]],
                hexValueList[msg[rdata - 12]] +
                hexValueList[msg[rdata - 11]],
                hexValueList[msg[rdata - 10]] +
                hexValueList[msg[rdata - 9]],
                hexValueList[msg[rdata - 8]] +
                hexValueList[msg[rdata - 7]],
                hexValueList[msg[rdata - 6]] +
                hexValueList[msg[rdata - 5]],
                hexValueList[msg[rdata - 4]] +
                hexValueList[msg[rdata - 3]],
                hexValueList[msg[rdata - 2]] +
                hexValueList[msg[rdata - 1]]
            ].join(":");
            this.nrdata.push(item);
        }
    }

    name() {
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
    }

    UInt32() {
        if (this.consume(4)) {
            const item = this.msg[this.rdata - 4] * 16777216 +
                this.msg[this.rdata - 3] * 65536 +
                this.msg[this.rdata - 2] * 256 +
                this.msg[this.rdata - 1];
            this.nrdata.push(item);
        }
    }

    UInt16() {
        if (this.consume(2)) {
            const item = this.msg[this.rdata - 2] * 256 +
                this.msg[this.rdata - 1];
            this.nrdata.push(item);
        }
    }

    UInt8() {
        if (this.consume(1)) {
            const item = this.msg[this.rdata - 1];
            this.nrdata.push(item);
        }
    }

    string(n) {
        if (this.consume(n)) {
            const item = this.msg.toString("ascii", this.rdata - n, this.rdata);
            this.nrdata.push(item);
        }
    }

    txt() {
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
    }

    rest() {
        if (this.consume(this.rdlen)) {
            const item = this.msg.slice(this.rdata - this.rdlen, this.rdata);
            this.nrdata.push(item);
        }
    }
}
