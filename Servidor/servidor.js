const express = require('express');
const path = require('path');
const net = require('net')
const udp = require('dgram');
const crypto = require('crypto');
const fs = require('fs');

const server = express();
server.use(express.json());
server.use(express.static('public'));
server.set('trust proxy', true);
let puertoServerCliente;

let msgID = 1;

var msgPendientes = []; // vector para ID-Respuesta 

server.post('/file', async (req, res) => {
    let indice;
    let idSave = msgID;
    let formulario = req.body;
    let aux = req.ip.split(':');
    formulario.nodeIP = aux[aux.length - 1];
    await store(formulario);
    indice = msgPendientes.findIndex((e) => e.id == idSave);
    while (msgPendientes[indice].mensaje === undefined)
        await delay(50);
    res.send(JSON.stringify(msgPendientes[indice].mensaje)); //Respuesta al POST
    //LUQUI AAAAAAAAAAA AGARRÁ ESE JSON Y HACE UN CARTELITO CON EL STATUS
});

server.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '/public', 'index.html'));
})

server.get('/file', async (req, res) => {
    // buscar la lista completa de archivas y devolverla
    let indice;
    let idSave = msgID;
    await scan();
    indice = msgPendientes.findIndex((e) => e.id == idSave);
    while (msgPendientes[indice].mensaje === undefined)
        await delay(50);
    res.send(JSON.stringify(msgPendientes[indice].mensaje));
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
    indice = msgPendientes.findIndex((e) => e.id == idSave);
    while (msgPendientes[indice].mensaje === undefined)
        await delay(50);
    res.send(JSON.stringify(msgPendientes[indice].mensaje));
})

//--------------------------------------------------------- TRACKER MANAGEMENT ---------------------------------------------------------//

let socket = udp.createSocket('udp4');
let puertoServerTrackers, ipTracker, puertoTracker, idTracker;


socket.on('message', function (msg, info) {
    let mensaje = JSON.parse(msg.toString());
    let mensajeID = mensaje.messageId;
    let indice = msgPendientes.findIndex((e) => e.id == mensajeID);
    if (indice != -1) {
        if (mensaje.route === '/scan')
            msgPendientes[indice] = {
                id: mensajeID,
                mensaje: mensaje.body.files
            }
        else if (mensaje.route === '/join') {
            mensaje.trackerIP = info.address;
            mensaje.id = parseInt(encriptado.update(mensaje.trackerIP + ':' + mensaje.trackerPort).digest('hex').substring(0, 2), 16);
            socket.send(JSON.stringify(mensaje),puertoTracker,ipTracker,(err) => {
                console.log("Hubo un error al enviar Join al primer Tracker.");
            });
            if (ipTracker === '0.0.0.0' || mensaje.id < idTracker) {
                ipTracker = mensaje.trackerIP;
                puertoTracker = mensaje.trackerPort;
                idTracker = mensaje.id;
            }
        } else
            if (mensaje.route.includes('/found'))
                msgPendientes[indice] = {
                    id: mensajeID,
                    mensaje: {
                        hash: mensaje.body.id,
                        trackerIP: info.address,
                        trackerPort: info.port
                    }
                }
            else if (mensaje.route.includes('/store')) { //Confirmación de Store - ???
                msgPendientes[indice] = {
                    id: mensajeID,
                    mensaje: mensaje // Mando mensaje completo, podría mandar solo status
                }
                console.log("Llego mensaje de confirmación de Store con id " + mensajeID + ": " + mensaje.status);
            }
    } else {
        console.log("Llegó un mensaje con ID desconocido.");
    }
    console.log(msgPendientes[indice]);
});

function store(formulario) {
    return new Promise((resolve) => {
        let encriptado = crypto.createHash('sha1');
        const hash = encriptado.update(formulario.filename + formulario.filesize).digest('hex');
        const objetoStore = {
            messageId: msgID,
            route: '/file/' + hash + '/store',
            originIP: '0.0.0.0',
            originPort: puertoServerTrackers,
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
                msgPendientes.push({ id: msgID });
                msgID += 2;
            } else
                console.log('Error al enviar petición Store.');
            resolve();
        });
    });
};

function scan() {
    return new Promise((resolve) => {
        socket.send(JSON.stringify({
            messageId: msgID,
            route: '/scan',
            originIP: '0.0.0.0',
            originPort: puertoServerTrackers,
        }), portTracker, ipTracker, function (err) {
            if (!err) {
                msgPendientes.push({ id: msgID });
                msgID += 2;
            } else
                console.log('error en send de scan');
            resolve();
        })
    })
};

function search(hash) {
    return new Promise((resolve) => {
        socket.send(JSON.stringify({
            messageId: msgID,
            route: '/file/' + hash,
            originIP: '0.0.0.0',
            originPort: puertoServerTrackers
        }), portTracker, ipTracker, function (err) {
            if (!err) {
                msgPendientes.push({ id: msgID });
                msgID += 2;
            } else
                console.log('error en send de search');
            resolve();
        })
    })
};

function leerCfg() {
    const config = JSON.parse(fs.readFileSync('./servidor.cfg'));
    puertoServerTrackers = config.puertoServerTrackers;
    puertoServerCliente = config.puertoServerCliente;
    ipTracker = config.ipTracker;
    puertoTracker = config.puertoTracker;
    let encriptado = crypto.createHash('sha1');
    idTracker = parseInt(encriptado.update(ipTracker + ':' + puertoTracker).digest('hex').substring(0, 2), 16);
};

leerCfg();

server.listen(puertoServerCliente, '0.0.0.0', () => {
    console.log('Escuchando ' + puertoServerCliente);
});

socket.bind(puertoServerTrackers);