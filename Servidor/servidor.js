const express = require('express');
const path = require('path');
const net = require('net')
const udp = require('dgram');
const crypto = require('crypto');

const server = express();
server.use(express.json());
server.use(express.static('public'));
server.set('trust proxy', true);

server.post('/file', (req, res) => {
    let formulario = req.body;
    let aux = req.ip.split(':');
    formulario.nodeIP = aux[aux.length - 1];
    store(formulario)
});

server.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '/public', 'webclient.html'));
})

server.get('/file', (req, res) => {
    // buscar la lista completa de archivas y devolverla
    res.send('Lista de archivos escaneados');
});

server.get('/file/:hash', (req, res) => {
    //busca el archivo en los trackers y devuelve el .torrent con la lista de pares que tienen el archivo
    res.send('Devuelve .torrente')
})


server.listen(27016, () => {
    console.log('Escuchando 27016');
})

//--------------------------------------------------------- TRACKER MANAGEMENT ---------------------------------------------------------//

let socket = udp.createSocket('udp4');
const puertoSV = 27017

socket.on('message', function(msg, info) {
    let mensaje = JSON.parse(msg.toString());
    let mensajeID = mensaje.messageId;

    if (mensajeID !== undefined)
        if (mensajeID == 'idCount') {
            console.log('Cantidad de trackers = ' + mensaje.body.trackerCount + ', archivos = ' + mensaje.body.fileCount);
            console.log('Cliente: Información de donde viene el mensaje. IP:' + info.address + ', PORT:' + info.port + '\n');
        } else if (mensajeID == 'idSearch') {
        console.log('Se encontró archivo con hash ' + mensaje.body.id);
    } else
    //Si llega acá es STORE
        console.log('Se guardó el archivo');
});

socket.bind(puertoSV);

function store(formulario) {
    let encriptado = crypto.createHash('sha1');
    const hash = encriptado.update(formulario.filename + formulario.filesize).digest('hex');
    const objetoStore = {
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
    console.log(objetoStore);
}

/*const objetoCount = {
    messageId: 'idCount',
    route: '/count',
    originIP: '0.0.0.0',
    originPort: puertoSV,
    body: {
        trackerCount: 0,
        fileCount: 0
    }
}

const objetoStore = {
    route: '/file/' + hash + '/store',
    originIP: '0.0.0.0',
    originPort: puertoSV,
    body: {
        id: hash,
        filename: '',
        filesize: 0,
        parIP: '',
        parPort: 0
    }
}

const objetoSearch = {
    messageId: 'idSearch',
    route: '/file/' + hash,
    originIP: '0.0.0.0',
    originPort: puertoSV
}
*/