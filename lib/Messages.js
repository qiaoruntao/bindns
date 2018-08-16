exports.MessageHeader = class MessageHeader {
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

exports.MessageQuestion = class MessageQuestion {
    constructor(name, type, klass) {
        this.name = name;
        this.type = type;
        this.class = klass;
    }
};

/** @typedef {number} ns_type_t */
/** @typedef {number} ns_class_t */

exports.MessageRR = class MessageRR {
    /**
     *
     * @param {*} name
     * @param {ns_type_t} type
     * @param {ns_class_t} klass
     * @param {number} ttl
     */
    constructor(name, type, klass, ttl) {
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
};
