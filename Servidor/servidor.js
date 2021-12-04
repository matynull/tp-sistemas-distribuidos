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

let msgID = 0;

server.post('/file', (req, res) => {
    let formulario = req.body;
    let aux = req.ip.split(':');
    formulario.nodeIP = aux[aux.length - 1];
    store(formulario)
});

server.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '/public', 'index.html'));
})

var respuestasID = []; // vector para ID-Respuesta 

server.get('/file', async(req, res) => {
    // buscar la lista completa de archivas y devolverla
    let index;
    let idSave = msgID;
    await scan();
    index = respuestasID.findIndex((e) => e.id == idSave);
    while (respuestasID[index].Response === undefined)
        await delay(50);
    res.send(JSON.stringify(respuestasID[index].Response));
});

function delay(delay) {
    return new Promise(resolve => {
        setTimeout(() => { resolve(); }, delay);
    });
}

server.get('/file/:hash', async(req, res) => {
    //busca el archivo en los trackers y devuelve el .torrent con la lista de pares que tienen el archivo
    let index;
    let idSave = msgID;
    await search(req.params.hash);
    index = respuestasID.findIndex((e) => e.id == idSave);
    while (respuestasID[index].Response === undefined)
        await delay(50);
    res.send(JSON.stringify(respuestasID[index].Response));
})


server.listen(27016, () => {
    console.log('Escuchando 27016');
})

//--------------------------------------------------------- TRACKER MANAGEMENT ---------------------------------------------------------//

let socket = udp.createSocket('udp4');
const puertoSV = 27017

//GUARDA MANEJAR CONFIRMACION DE STORE

socket.on('message', function(msg, info) {
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
        }
    }
    console.log(respuestasID[indexRespuesta]);
});

socket.bind(puertoSV);
const portTracker = 27015; //CFGEAR ESTO PLS
const ipTracker = '190.190.36.80';

function store(formulario) {
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
    msgID++;
    console.log(objetoStore);
    socket.send(JSON.stringify(objetoStore), portTracker, ipTracker);
}

function scan() {
    return new Promise((resolve) => {
        socket.send(JSON.stringify({
            messageId: msgID,
            route: '/scan',
            originIP: '0.0.0.0',
            originPort: puertoSV,
        }), portTracker, ipTracker, function(err) {
            if (!err) {
                respuestasID.push({ id: msgID });
                msgID++;
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
        }), portTracker, ipTracker, function(err) {
            if (!err) {
                respuestasID.push({ id: msgID });
                msgID++;
            } else
                console.log('error en send de search');
            resolve();
        })
    })
}