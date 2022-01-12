export class MessageHeader {
    public id: number;
    public qr: number;
    public opcode: number;
    public aa: number;
    public tc: number;
    public rd: number;
    public ra: number;
    public z: number;
    public ad: number;
    public cd: number;
    public rcode: number;
    public qdcount: number;
    public ancount: number;
    public nscount: number;
    public arcount: number;

    constructor() {
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
};

export type ns_type_t = number;
export type ns_class_t = number;

export class MessageQuestion {
    public name: string;
    public type: ns_type_t;
    public class: ns_class_t;

    constructor(name, type, klass) {
        this.name = name;
        this.type = type;
        this.class = klass;
    }
};

export class MessageRR {
    public name: string;
    public type: ns_type_t;
    public class: ns_class_t;
    public ttl: number;
    public rdata: unknown[];

    constructor(name, type, klass, ttl, rdata = []) {
        this.name = name;
        this.type = type;
        this.class = klass;
        this.ttl = ttl;
        this.rdata = rdata;
    }
};
