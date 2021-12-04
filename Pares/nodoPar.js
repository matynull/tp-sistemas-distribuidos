const udp = require('dgram');
const net = require('net');
const readline = require('readline')
const fs = require('fs');
const crypto = require('crypto');

let msgID = 1000000;
let socket = udp.createSocket('udp4');
socket.bind(27018);
let seeding = [];
checkSeedingFiles();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

var stdin = process.openStdin();

stdin.addListener("data", function(res) {
    fs.readFile(res, "utf-8", async(err, data) => {
        if (!err) {
            let info = JSON.parse(data);
            let indice = seeding.findIndex(e => e == info.hash);
            if (indice == -1) {
                let msg = {
                    messageId: msgID,
                    route: '/file/' + info.hash,
                    originIP: '0.0.0.0',
                    originPort: 27018
                };
                msgID++;
                socket.send(msg, info.trackerPort, info.trackerIP, (err) => {
                    if (err)
                        console.log("error al enviar mensaje a tracker");
                });
            } else {
                //agregarse a si mismo como par
            }
        }
    })
});

socket.on("message", (msg, info) => {
    let objetoJSON = JSON.parse(msg.toString());
    //objetoJSON.body.pares
})

function checkSeedingFiles() {
    let encriptado = crypto.createHash('sha1');
    fs.readdir("./Seeding", function(err, filenames) {
        if (err) {
            console.log("Error al leer archivos en Seeding");
            return;
        }
        filenames.forEach(function(filename) {
            const hash = encriptado.update(filename + fs.statSync("./Seeding/" + filename).size).digest('hex');
            seeding.push(hash);
        });
    });
}