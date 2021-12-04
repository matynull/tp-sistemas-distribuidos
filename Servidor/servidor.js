const express = require('express');
const path = require('path');
const net = require('net')
const udp = require('dgram');
const crypto = require('crypto');
const { SourceMap } = require('module');
const { response } = require('express');

const server = express();
server.use(express.json());
server.use(express.static('public'));
server.set('trust proxy', true);

let msgID = 1;

server.post('/file', async (req, res) => {
    let indice;
    let idSave = msgID;
    let formulario = req.body;
    let aux = req.ip.split(':');
    formulario.nodeIP = aux[aux.length - 1];
    await store(formulario);
    indice = respuestasID.findIndex((e) => e.id == idSave);
    while (respuestasID[indice].Response === undefined)
        await delay(50);
    res.send(JSON.stringify(respuestasID[indice].Response)); //Respuesta al POST
    //LUQUI AAAAAAAAAAA AGARRÁ ESE JSON Y HACE UN CARTELITO CON EL STATUS
});

server.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '/public', 'index.html'));
})

var respuestasID = []; // vector para ID-Respuesta 

server.get('/file', async (req, res) => {
    // buscar la lista completa de archivas y devolverla
    let indice;
    let idSave = msgID;
    await scan();
    indice = respuestasID.findIndex((e) => e.id == idSave);
    while (respuestasID[indice].Response === undefined)
        await delay(50);
    res.send(JSON.stringify(respuestasID[indice].Response));
});

function delay(delay) {
    return new Promise(resolve => {
        setTimeout(() => { resolve(); }, delay);
    });
}

server.get('/file/:hash', async (req, res) => {
    //busca el archivo en los trackers y devuelve el .torrent con la lista de pares que tienen el archivo
    let indice;
    let idSave = msgID;
    await search(req.params.hash);
    indice = respuestasID.findIndex((e) => e.id == idSave);
    while (respuestasID[indice].Response === undefined)
        await delay(50);
    res.send(JSON.stringify(respuestasID[indice].Response));
})


server.listen(27016,'0.0.0.0', () => {
    console.log('Escuchando 27016');
})

//--------------------------------------------------------- TRACKER MANAGEMENT ---------------------------------------------------------//

let socket = udp.createSocket('udp4');
const puertoSV = 27017

socket.on('message', function (msg, info) {
    //console.log("me llegó un mensaje");
    let mensaje = JSON.parse(msg.toString());
    let mensajeID = mensaje.messageId;
    let indexRespuesta = respuestasID.findIndex((e) => e.id == mensajeID);
    if (indexRespuesta != -1) {
        if (mensaje.route == '/scan')
            respuestasID[indexRespuesta] = {
                id: mensajeID,
                Response: mensaje.body.files
            }
        else {
            if (mensaje.route.includes('/found'))
                respuestasID[indexRespuesta] = {
                    id: mensajeID,
                    Response: {
                        hash: mensaje.body.id,
                        trackerIP: info.address,
                        trackerPort: info.port
                    }
                }
            else if (mensaje.route.includes('/store')) { //Confirmación de Store
                //LUQUI HACE UN CARTELITO EN LA PÁGINA ES UNA ORDEN
                respuestasID[indexRespuesta] = {
                    id:mensajeID,
                    Responde: mensaje // Mando mensaje completo, podría mandar solo status
                }
                console.log("Llego mensaje de confirmación de Store con id " + mensajeID + ": " + mensaje.status);
            }
        }
    } else {
        console.log("Llegó un mensaje con ID desconocido.");
    }
    console.log(respuestasID[indexRespuesta]);
});

socket.bind(puertoSV);
const portTracker = 27015; //CFGEAR ESTO PLS
const ipTracker = 'localhost';

function store(formulario) {
    return new Promise((resolve) => {
        let encriptado = crypto.createHash('sha1');
        const hash = encriptado.update(formulario.filename + formulario.filesize).digest('hex');
        const objetoStore = {
            messageId: msgID,
            route: '/file/' + hash + '/store',
            originIP: '0.0.0.0',
            originPort: puertoSV,
            body: {
                id: hash,
                filename: formulario.filename,
                filesize: formulario.filesize,
                parIP: formulario.nodeIP,
                parPort: formulario.nodePort
            }
        }
        socket.send(JSON.stringify(objetoStore), portTracker, ipTracker, (err) => {
            if (!err) {
                respuestasID.push({ id: msgID });
                msgID+=2;
            } else
                console.log('Error al enviar petición Store.');
            resolve();
        });
    });
}

function scan() {
    return new Promise((resolve) => {
        socket.send(JSON.stringify({
            messageId: msgID,
            route: '/scan',
            originIP: '0.0.0.0',
            originPort: puertoSV,
        }), portTracker, ipTracker, function (err) {
            if (!err) {
                respuestasID.push({ id: msgID });
                msgID+=2;
            } else
                console.log('error en send de scan');
            resolve();
        })
    })
}

function search(hash) {
    return new Promise((resolve) => {
        socket.send(JSON.stringify({
            messageId: msgID,
            route: '/file/' + hash,
            originIP: '0.0.0.0',
            originPort: puertoSV
        }), portTracker, ipTracker, function (err) {
            if (!err) {
                respuestasID.push({ id: msgID });
                msgID+=2;
            } else
                console.log('error en send de search');
            resolve();
        })
    })
}