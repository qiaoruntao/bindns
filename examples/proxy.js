const ndns = require("../lib/ndns");
const server = new ndns.Server("udp4");
const client = new ndns.Client("udp4");

const LOCAL_PORT = 5300;
const REMOTE_HOST = "8.8.8.8";
const REMOTE_PORT = 53;

server.on("request", (req, res) => {
    const c_req = client.request(REMOTE_PORT, REMOTE_HOST, c_res => {
        res.header.aa = c_res.header.aa;
        res.header.rcode = c_res.header.rcode;

        // Copy the first answer:
        const answer = c_res.answer[0];
        res.addRR(ndns.ns_sect.an, answer.name, answer.type, answer.class, answer.ttl, ...answer.rdata);
        res.send();

        // Alternatively, you could use what might be consideredan internal API:
        // for (const answer of c_res.answer) res.answer.push(answer);
        // for (const authoritative of c_res.authoritative) res.authoritative.push(authoritative);
        // for (const additional of c_res.additional) res.additional.push(additional);
    });

    c_req.header.rd = 1; // Recursion desired
    const question = req.question[0];
    c_req.addQuestion(question.name, question.class, question.type);
    c_req.send();
});

server.bind(LOCAL_PORT);
client.bind();
