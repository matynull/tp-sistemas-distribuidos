const udp = require('dgram');
const net = require('net');
const fs = require('fs');
const crypto = require('crypto');
const readline = require('readline');

let msgID = 0;
let socket = udp.createSocket('udp4');
socket.bind(27018);
let seeding = [];
checkSeedingFiles();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

var stdin = process.openStdin();

var respuestasID = []; // vector para ID-Respuesta 

function delay(delay) {
    return new Promise(resolve => {
        setTimeout(() => { resolve(); }, delay);
    });
}

var pregunta = function () {
    return new Promise((resolve) => {
        rl.question('', respuesta => {
            resolve(respuesta);
        })
    });
};

(async function leerRuta() {
    let ruta;
    while (true) {
        ruta = await pregunta();
        if (ruta.includes(' '))
            ruta = ruta.substring(1, ruta.length - 1);
        if (ruta.includes('.torrente')) {
            fs.readFile(ruta, "utf-8", async (err, data) => {
                if (!err) {
                    let info = JSON.parse(data);
                    let idSave = msgID;
                    let indice;
                    let indiceSeeding = seeding.findIndex(e => e == info.hash);
                    await search(info.hash, info.trackerIP, info.trackerPort);
                    indice = respuestasID.findIndex((e) => e.id == idSave);
                    while (respuestasID[indice].Response === undefined) {
                        await delay(50);
                    }
                    let responseSearch = respuestasID[indice].Response;
                    if (responseSearch.body.id !== undefined) {
                        //Se recibió la respuesta del Search
                        if (indiceSeeding == -1) {
                            console.log('Empieza la descarga');
                        } else {
                            //agregarse a si mismo como par
                            //mover esto a una función así lo podemos llamar
                            idSave = msgID;
                            await addPar(responseSearch.body);
                            indice = respuestasID.findIndex((e) => e.id == idSave);
                            while (respuestasID[indice].Response === undefined)
                                await delay(50);
                            let responseAddPar = respuestasID[indice].Response;
                            //Se recibió la respuesta del addPar
                            if (responseAddPar.status == true)
                                console.log("Se agregó el par al archivo con hash " + responseSearch.body.id + ".");
                            else
                                console.log("No se agregó el par al archivo con hash " + responseSearch.body.id + ".");
                        }
                    }
                    else
                        console.log('No existe el archivo para el torrente asociado.');
                }
                else
                    console.log(err);
            })
        }
        else
            console.log('El archivo debe tener extensión .torrente');
    }
})();


//stdin.addListener("data", function (res)) 

function addPar(info) {
    return new Promise((resolve) => {
        let msg = {
            messageId: msgID,
            route: '/file/' + info.id + '/addPar',
            id: info.id,
            filename: info.filename,
            filesize: info.filesize,
            parIP: '0.0.0.0',
            parPort: 27018,
        }
        console.log(info.trackerPort);
        socket.send(JSON.stringify(msg), info.trackerPort, info.trackerIP, (err) => {
            if (!err) {
                respuestasID.push({ id: msgID });
                msgID += 2;
            } else
                console.log('error en send de addPar');
            resolve();
        });
    });
}

function search(hash, ip, port) {
    return new Promise((resolve) => {
        socket.send(JSON.stringify({
            messageId: msgID,
            route: '/file/' + hash,
            originIP: '0.0.0.0',
            originPort: 27018
        }), port, ip, function (err) {
            if (!err) {
                respuestasID.push({ id: msgID });
                msgID += 2;
            } else
                console.log('error en send de search');
            resolve();
        })
    })
}

socket.on("message", (msg, info) => {
    let objetoJSON = JSON.parse(msg.toString());
    let mensajeID = objetoJSON.messageId;
    let indexRespuesta = respuestasID.findIndex((e) => e.id == mensajeID);
    if (indexRespuesta != -1) {
        respuestasID[indexRespuesta] = {
            id: mensajeID,
            Response: objetoJSON
        };
    } else {
        console.log("Llegó un mensaje con ID desconocido.");
    }
})

function checkSeedingFiles() {
    let encriptado = crypto.createHash('sha1');
    fs.readdir("./Archivos", function (err, filenames) {
        if (err) {
            console.log("Error al leer archivos.");
            return;
        }
        filenames.forEach(function (filename) {
            const hash = encriptado.update(filename + fs.statSync("./Archivos/" + filename).size).digest('hex');
            seeding.push(hash);
        });
    });
}