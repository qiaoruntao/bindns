/**
 * Tests ability of server and client to handle various types of requests by
 * proxying a list of dig commands to another server.
 *
 * In another terminal, run `node ./examples/proxy.js` first, and then run this.
 *
 * Currently this passes a test if the status is `NOERROR`. Better would be to
 * make the same query against the proxied server directly and make sure the
 * responses are the same.
 */

const ZONE = "google.com";
const SERVER = "127.0.0.1";

// generated by genreport -D (see https://gitlab.isc.org/isc-projects/DNS-Compliance-Testing/blob/master/genreport.md#tests)
const tests = [
    ["dns", 'dig +noedns +noad +norec SOA <zone>'],
    ["aa", 'dig +noedns +noad +norec +aaflag SOA <zone>'],
    ["ad", 'dig +noedns +ad +norec SOA <zone>'],
    ["cd", 'dig +noedns +noad +norec +cd SOA <zone>'],
    ["ra", '### dig +noedns +noad +norec +raflag SOA <zone> ###'],
    ["rd", 'dig +noedns +noad +rec SOA <zone>'],
    ["tc", '### dig +noedns +noad +norec +tcflag SOA <zone> ###'],
    ["zflag", 'dig +noedns +noad +norec +zflag SOA <zone>'],
    ["opcode", 'dig +noedns +noad +norec +header-only +opcode=15'],
    ["opcodeflg", '### dig +noedns +header-only +opcode=15 +tcflag +rec +raflag +cd +ad +aaflag +zflag ###'],
    ["type666", 'dig +noedns +noad +norec TYPE666 <zone>'],
    ["tcp", 'dig +noedns +noad +norec +tcp SOA <zone>'],
    ["edns", 'dig +edns=0 +nocookie +noad +norec SOA <zone>'],
    ["edns1", 'dig +edns=1 +noednsneg +nocookie +noad +norec SOA <zone>'],
    ["edns@512", 'dig +edns=0 +nocookie +noad +norec +dnssec +ignore +bufsize=512 DNSKEY <zone>'],
    ["ednsopt", 'dig +edns=0 +nocookie +noad +norec +ednsopt=100 SOA <zone>'],
    ["edns1opt", 'dig +edns=1 +noednsneg +nocookie +noad +norec +ednsopt=100 SOA <zone>'],
    ["do", 'dig +edns=0 +nocookie +noad +norec +dnssec SOA <zone>'],
    ["docd", 'dig +edns=0 +nocookie +noad +norec +dnssec +cd SOA <zone>'],
    ["edns1do", 'dig +edns=1 +noednsneg +nocookie +noad +norec +dnssec SOA <zone>'],
    ["ednsflags", 'dig +edns=0 +nocookie +noad +norec +ednsflags=0x0080 SOA <zone>'],
    ["optlist", 'dig +edns=0 +noad +norec +nsid +subnet=0.0.0.0/0 +expire +cookie=0102030405060708 SOA <zone>'],
    ["ednsnsid", 'dig +edns=0 +nocookie +noad +norec +nsid SOA <zone>'],
    ["ednscookie", 'dig +edns=0 +noad +norec +cookie=0102030405060708 SOA <zone>'],
    ["ednsexpire", 'dig +edns=0 +nocookie +noad +norec +expire SOA <zone>'],
    ["ednssubnet", 'dig +edns=0 +nocookie +noad +norec +subnet=0.0.0.0/0 SOA <zone>'],
    ["edns1nsid", 'dig +edns=1 +noednsneg +nocookie +noad +norec +nsid SOA <zone>'],
    ["edns1cookie", 'dig +edns=1 +noednsneg +noad +norec +cookie=0102030405060708 SOA <zone>'],
    ["edns1expire", 'dig +edns=1 +noednsneg +nocookie +noad +norec +expire SOA <zone>'],
    ["edns1subnet", 'dig +edns=1 +noednsneg +nocookie +noad +norec +subnet=0.0.0.0/0 SOA <zone>'],
    ["ednstcp", 'dig +edns=0 +nocookie +noad +norec +dnssec +bufsize=512 +tcp DNSKEY <zone>'],
    ["bind11", 'dig +edns=0 +cookie=0102030405060708 +noad +norec +dnssec SOA <zone>'],
    ["dig11", 'dig +edns=0 +cookie=0102030405060708 +ad +rec SOA <zone>'],
    ["dnswkk", 'dig +noedns +noad +norec -y hmac-sha256:.:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA= SOA <zone>'],
    // ["icmp", 'ping / ping6'],
    ["A", 'dig +noedns +noad +norec A <zone>'],
    ["NS", 'dig +noedns +noad +norec NS <zone>'],
    ["MD", 'dig +noedns +noad +norec MD <zone>'],
    ["MF", 'dig +noedns +noad +norec MF <zone>'],
    ["CNAME", 'dig +noedns +noad +norec CNAME <zone>'],
    ["SOA", 'dig +noedns +noad +norec SOA <zone>'],
    ["MB", 'dig +noedns +noad +norec MB <zone>'],
    ["MG", 'dig +noedns +noad +norec MG <zone>'],
    ["MR", 'dig +noedns +noad +norec MR <zone>'],
    ["NULL", 'dig +noedns +noad +norec NULL <zone>'],
    ["WKS", 'dig +noedns +noad +norec WKS <zone>'],
    ["PTR", 'dig +noedns +noad +norec PTR <zone>'],
    ["HINFO", 'dig +noedns +noad +norec HINFO <zone>'],
    ["MINFO", 'dig +noedns +noad +norec MINFO <zone>'],
    ["MX", 'dig +noedns +noad +norec MX <zone>'],
    ["TXT", 'dig +noedns +noad +norec TXT <zone>'],
    ["RP", 'dig +noedns +noad +norec RP <zone>'],
    ["AFSDB", 'dig +noedns +noad +norec AFSDB <zone>'],
    ["X25", 'dig +noedns +noad +norec X25 <zone>'],
    ["ISDN", 'dig +noedns +noad +norec ISDN <zone>'],
    ["RT", 'dig +noedns +noad +norec RT <zone>'],
    ["NSAP", 'dig +noedns +noad +norec NSAP <zone>'],
    ["NSAP-PTR", 'dig +noedns +noad +norec NSAP-PTR <zone>'],
    ["SIG", 'dig +noedns +noad +norec SIG <zone>'],
    ["KEY", 'dig +noedns +noad +norec KEY <zone>'],
    ["PX", 'dig +noedns +noad +norec PX <zone>'],
    ["GPOS", 'dig +noedns +noad +norec GPOS <zone>'],
    ["AAAA", 'dig +noedns +noad +norec AAAA <zone>'],
    ["LOC", 'dig +noedns +noad +norec LOC <zone>'],
    ["NXT", 'dig +noedns +noad +norec NXT <zone>'],
    ["SRV", 'dig +noedns +noad +norec SRV <zone>'],
    ["NAPTR", 'dig +noedns +noad +norec NAPTR <zone>'],
    ["KX", 'dig +noedns +noad +norec KX <zone>'],
    ["CERT", 'dig +noedns +noad +norec CERT <zone>'],
    ["A6", 'dig +noedns +noad +norec A6 <zone>'],
    ["DNAME", 'dig +noedns +noad +norec DNAME <zone>'],
    ["APL", 'dig +noedns +noad +norec APL <zone>'],
    ["DS", 'dig +noedns +noad +norec DS <zone>'],
    ["SSHFP", 'dig +noedns +noad +norec SSHFP <zone>'],
    ["IPSECKEY", 'dig +noedns +noad +norec IPSECKEY <zone>'],
    ["RRSIG", 'dig +noedns +noad +norec RRSIG <zone>'],
    ["NSEC", 'dig +noedns +noad +norec NSEC <zone>'],
    ["DNSKEY", 'dig +noedns +noad +norec DNSKEY <zone>'],
    ["DHCID", 'dig +noedns +noad +norec DHCID <zone>'],
    ["NSEC3", 'dig +noedns +noad +norec NSEC3 <zone>'],
    ["NSEC3PARAM", 'dig +noedns +noad +norec NSEC3PARAM <zone>'],
    ["TLSA", 'dig +noedns +noad +norec TLSA <zone>'],
    ["SMIMEA", 'dig +noedns +noad +norec SMIMEA <zone>'],
    ["HIP", 'dig +noedns +noad +norec HIP <zone>'],
    ["CDS", 'dig +noedns +noad +norec CDS <zone>'],
    ["CDNSKEY", 'dig +noedns +noad +norec CDNSKEY <zone>'],
    ["OPENPGPKEY", 'dig +noedns +noad +norec OPENPGPKEY <zone>'],
    ["CSYNC", 'dig +noedns +noad +norec CSYNC <zone>'],
    ["ZONEMD", 'dig +noedns +noad +norec ZONEMD <zone>'],
    ["SPF", 'dig +noedns +noad +norec SPF <zone>'],
    ["NID", 'dig +noedns +noad +norec NID <zone>'],
    ["L32", 'dig +noedns +noad +norec L32 <zone>'],
    ["L64", 'dig +noedns +noad +norec L64 <zone>'],
    ["LP", 'dig +noedns +noad +norec LP <zone>'],
    ["EUI48", 'dig +noedns +noad +norec EUI48 <zone>'],
    ["EUI64", 'dig +noedns +noad +norec EUI64 <zone>'],
    ["URI", 'dig +noedns +noad +norec URI <zone>'],
    ["CAA", 'dig +noedns +noad +norec CAA <zone>'],
    ["AVC", 'dig +noedns +noad +norec AVC <zone>'],
    ["DOA", 'dig +noedns +noad +norec DOA <zone>'],
    ["AMTRELAY", 'dig +noedns +noad +norec AMTRELAY <zone>'],
    ["TA", 'dig +noedns +noad +norec TA <zone>'],
    ["DLV", 'dig +noedns +noad +norec DLV <zone>'],
    ["TYPE1000", 'dig +noedns +noad +norec TYPE1000 <zone>']
];

const {execSync} = require("child_process");

function tmplToCommand(tmpl) {
    return tmpl.replace("<zone>", ZONE).replace("dig", `dig @${SERVER}`);
}

function parseDigOutput(out) {
    const status = /status: ([A-Z]+)/.exec(out)[1];
    return {
        okay: status === "NOERROR",
        status
    };
}

for (const [description, test] of tests) {
    const cmd = tmplToCommand(test);
    try {
        console.log("RUNNING", description, cmd);
        const output = execSync(cmd).toString();
        const parsed = parseDigOutput(output);
        if (parsed.okay) {
            console.log("\x1b[32mOKAY\x1b[0m", description);
        } else {
            console.error("\x1b[41mFAILED\x1b[0m", description);
            console.error(output);
        }
    } catch (ex) {
        console.error("\x1b[41mFAILED\x1b[0m", description);
    }
    console.log("------------------------------------------------------------");
}