/** Default UDP Packet size */
export const NS_PACKETSZ = 512;
/** Maximum domain name */
export const NS_MAXDNAME = 1025;
/** Maximum message size */
export const NS_MAXMSG = 65535;
/** Maximum compressed domain name */
export const NS_MAXCDNAME = 255;
/** Maximum compressed domain label */
export const NS_MAXLABEL = 63;
/** Bytes of fixed data in header */
export const NS_HFIXEDSZ = 12;
/** Bytes of fixed data in query */
export const NS_QFIXEDSZ = 4;
/** Bytes of fixed data in r record */
export const NS_RRFIXEDSZ = 10;
/** Bytes of data in a u_int32_t */
export const NS_INT32SZ = 4;
/** Bytes of data in a u_int16_t */
export const NS_INT16SZ = 2;
/** Bytes of data in a u_int8_t */
export const NS_INT8SZ = 1;
/** IPv4 T_A */
export const NS_INADDRSZ = 4;
/** IPv6 T_AAAA */
export const NS_IN6ADDRSZ = 16;
/** Flag bits indicating name compression. */
export const NS_CMPRSFLGS = 0xc0;
/** For both UDP and TCP. */
export const NS_DEFAULTPORT = 53;

/** Section constants */
export const ns_sect = {
    /** Query: Question. */                             "qd": 0,
    /** Update: Zone. */                                "zn": 0,
    /** Query: Answer. */                               "an": 1,
    /** Update: Prerequisites. */                       "pr": 1,
    /** Query: Name servers. */                         "ns": 2,
    /** Query: Update. */                               "ud": 2,
    /** Query|Update: Additional records. */            "ar": 3,
    "max": 4,
};

/** Flag constants */
export const ns_flag = {
    /** Question/Response. */                           "qr": 0,
    /** Operation code. */                              "opcode": 1,
    /** Authoritative Answer. */                        "aa": 2,
    /** Truncation occured. */                          "tc": 3,
    /** Recursion Desired. */                           "rd": 4,
    /** Recursion Available. */                         "ra": 5,
    /** MBZ */                                          "z": 6,
    /** Authentic Data (DNSSEC) */                      "ad": 7,
    /** Checking Disabled (DNSSEC) */                   "cd": 8,
    /** Response code. */                               "rcode": 9,
    "max": 10,
};

/** Currently defined opcodes. */
export const ns_opcode = {
    /** Standard query. */                              "query": 0,
    /** Inverse query (deprecated/unsupported). */      "iquery": 1,
    /** Name server status query (unsupported). */      "status": 2,
    // Opcode 3 is undefined/reserved
    /** Zone change notification. */                    "notify": 4,
    /** Zone update message. */                         "update": 5,
};

/** Currently defined response codes */
export const ns_rcode = {
    /** No error occured. */                            "noerror": 0,
    /** Format error. */                                "formerr": 1,
    /** Server failure. */                              "servfail": 2,
    /** Name error. */                                  "nxdomain": 3,
    /** Unimplemented. */                               "notimpl": 4,
    /** Operation refused. */                           "refused": 5,
    // These are for BIND_UPDATE
    /** Name exists */                                  "yxdomain": 6,
    /** RRset exists */                                 "yxrrset": 7,
    /** RRset does not exist */                         "nxrrset": 8,
    /** Not authoritative for zone */                   "notauth": 9,
    /** Zone of record different from zone section */   "notzone": 10,
    "max": 11,
    // The following are EDNS extended rcodes
    "badvers": 16,
    // The following are TSIG errors
    "badsig": 16,
    "badkey": 17,
    "badtime": 18,
};

// BIND_UPDATE
export const ns_update_operation = {
    "delete": 0,
    "add": 1,
    "max": 2,
};

export const NS_TSIG_FUDGE = 300;
export const NS_TSIG_TCP_COUNT = 100;
export const NS_TSIG_ALG_HMAC_MD5 = "HMAC-MD5.SIG-ALG.REG.INT";
export const NS_TSIG_ERROR_NO_TSIG = -10;
export const NS_TSIG_ERROR_NO_SPACE = -11;
export const NS_TSIG_ERROR_FORMERR = -12;

/** @typedef {number} ns_type_t */

/**
 * Currently defined type values for resources and queries.
 * @enum {ns_type_t}
 */
export const ns_type = {
    /** Cookie. */                                      "invalid": 0,
    /** Host address. */                                "a": 1,
    /** Authoritative server. */                        "ns": 2,
    /** Mail destinaion. */                             "md": 3,
    /** Mail forwarder. */                              "mf": 4,
    /** Canonical name. */                              "cname": 5,
    /** Start of authority zone. */                     "soa": 6,
    /** Mailbox domain name. */                         "mb": 7,
    /** Mail group member. */                           "mg": 8,
    /** Mail rename name. */                            "mr": 9,
    /** Null resource record. */                        "null": 10,
    /** Well known service. */                          "wks": 11,
    /** Domain name pointer. */                         "ptr": 12,
    /** Host information. */                            "hinfo": 13,
    /** Mailbox information. */                         "minfo": 14,
    /** Mail routing information. */                    "mx": 15,
    /** Text strings. */                                "txt": 16,
    /** Responsible person. */                          "rp": 17,
    /** AFS cell database. */                           "afsdb": 18,
    /** X_25 calling address. */                        "x25": 19,
    /** ISDN calling address. */                        "isdn": 20,
    /** Router. */                                      "rt": 21,
    /** NSAP address. */                                "nsap": 22,
    /** Reverse NSAP lookup (deprecated) */             "ns_nsap_ptr": 23,
    /** Security signature. */                          "sig": 24,
    /** Security key. */                                "key": 25,
    /** X.400 mail mapping. */                          "px": 26,
    /** Geographical position (withdrawn). */           "gpos": 27,
    /** Ip6 Address. */                                 "aaaa": 28,
    /** Location Information. */                        "loc": 29,
    /** Next domain (security) */                       "nxt": 30,
    /** Endpoint identifier. */                         "eid": 31,
    /** Nimrod Locator. */                              "nimloc": 32,
    /** Server Selection. */                            "srv": 33,
    /** ATM Address */                                  "atma": 34,
    /** Naming Authority PoinTeR */                     "naptr": 35,
    /** Key Exchange */                                 "kx": 36,
    /** Certification Record */                         "cert": 37,
    /** IPv6 Address (deprecated, use ns_t.aaaa) */     "a6": 38,
    /** Non-terminal DNAME (for IPv6) */                "dname": 39,
    /** Kitchen sink (experimental) */                  "sink": 40,
    /** EDNS0 option (meta-RR) */                       "opt": 41,
    /** Address prefix list (RFC3123) */                "apl": 42,
    /** Delegation Signer */                            "ds": 43,
    /** SSH Fingerprint */                              "sshfp": 44,
    /** IPSEC Key */                                    "ipseckey": 45,
    /** RRSet Signature */                              "rrsig": 46,
    /** Negative Security */                            "nsec": 47,
    /** DNS Key */                                      "dnskey": 48,
    /** Dynamic host configuartion identifier */        "dhcid": 49,
    /** Negative security type 3 */                     "nsec3": 50,
    /** Negative security type 3 parameters */          "nsec3param": 51,
    /** Host Identity Protocol */                       "hip": 55,
    /** Sender Policy Framework */                      "spf": 99,
    /** Transaction key */                              "tkey": 249,
    /** Transaction signature. */                       "tsig": 250,
    /** Incremental zone transfer. */                   "ixfr": 251,
    /** Transfer zone of authority. */                  "axfr": 252,
    /** Transfer mailbox records. */                    "mailb": 253,
    /** Transfer mail agent records. */                 "maila": 254,
    /** Wildcard match. */                              "any": 255,
    /** BIND-specific, nonstandard. */                  "zxfr": 256,
    /** DNSSEC look-aside validation. */                "dlv": 32769,
    "max": 65536
};

/**
 * Returns the type (string) for the `type` (number).
 * This function is not fast. It could be made into an O(1) if needed.
 * @param {number} type
 * @return {string}
 */
export const ns_type_str = function (type) {
    const types = exports.ns_type;
    for (const str in types) if (types[str] === type) return str.toUpperCase();
};

/** @typedef {number} ns_class_t */

/**
 * Values for class field
 * @enum {ns_class_t}
 */
export const ns_class = {
    /** Cookie. */                                      "invalid": 0,
    /** Internet. */                                    "in": 1,
    /** unallocated/unsupported. */                     "2": 2,
    /** MIT Chaos-net. */                               "chaos": 3,
    /** MIT Hesoid. */                                  "hs": 4,
    // Query class values which do not appear in resource records
    /** for prereq. sections in update requests */      "none": 254,
    /** Wildcard match. */                              "any": 255,
    "max": 65535,
};

// DNSSEC constants.
export const ns_key_types = {
    /** key type RSA/MD5 */                             "rsa": 1,
    /** Diffie Hellman */                               "dh": 2,
    /** Digital Signature Standard (MANDATORY) */       "dsa": 3,
    /** Private key type starts with OID */             "private": 4
};

export const ns_cert_types = {
    /** PKIX (X.509v3) */                               "pkix": 1,
    /** SPKI */                                         "spki": 2,
    /** PGP */                                          "pgp": 3,
    /** URL private type */                             "url": 253,
    /** OID private type */                             "oid": 254
};

// In libbind, this struct and the methods like ns_msg_getflag live in
// ns_parse.c.
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

/**
 * This is a message handle. It is caller-allocated and has no dynamic data.
 * This structure is intended to be opaque to all but ns_parse.c, thus the
 * leading _'s on the member names. Use the accessor functions, not the _'s.
 */
export class ns_msg {
    private _buf: any;
    private _msg: any;
    private _eom: any;
    _id: any;
    _flags: any;
    private _counts: any;
    private _sections: any;
    private _sect: any;
    private _rrnum: any;
    private _msg_ptr: any;

    constructor() {
        this._buf = null; // not in original
        this._msg = null;
        this._eom = 0;
        this._id = 0;
        this._flags = 0;
        this._counts = new Array(exports.ns_sect.max);
        this._sections = new Array(exports.ns_sect.max);
        this._sect = 0;
        this._rrnum = 0;
        this._msg_ptr = 0;
    }

    getId() {
        return this._id;
    }

    getBase() {
        return this._msg;
    }

    getSize() {
        return this._eom;
    }

    getCount(section) {
        return this._counts[section];
    }

    getFlag(flag) {
        if (flag > 0 && flag < ns_flagdata.length)
            return (this._flags & ns_flagdata[flag].mask) >> ns_flagdata[flag].shift;
        return 0;
    }
}

/**
 * This is a newmsg handle, used when constructing new messages with
 * ns_newmsg_init, et al.
 */
export class ns_newmsg {
    private msg: ns_msg;
    private dnptrs: unknown[];
    private lastdnptr: unknown;

    constructor() {
        this.msg = new exports.ns_msg();
        this.dnptrs = new Array(25);
        this.lastdnptr = this.dnptrs.length;
    }

    setId(id) {
        this.msg._id = id;
    }

    setFlag(flag, value) {
        this.msg._flags &= ~ns_flagdata[flag].mask;
        this.msg._flags |= value << ns_flagdata[flag].shift;
    }
};

/**
 * A parsed record, using uncompressed network binary names.
 */
export class ns_rr2 {
    private nname: Buffer;
    private nnamel: unknown;
    private type: unknown;
    private rr_class: unknown;
    private ttl: unknown;
    private rdlength: unknown;
    private rdata: unknown;

    constructor() {
        this.nname = Buffer.alloc(NS_MAXDNAME);
        this.nnamel = 0;
        this.type = 0;
        this.rr_class = 0;
        this.ttl = 0;
        this.rdlength = 0;
        this.rdata = null;
    }
};
