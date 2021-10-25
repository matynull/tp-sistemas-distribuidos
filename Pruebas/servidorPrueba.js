//const express = require('express');

const udp = require('dgram');
const { TIMEOUT } = require('dns');
const socket = udp.createSocket('udp4');



//SHA1
const crypto = require('crypto');
let encriptado = crypto.createHash('sha1');



socket.on('message', function (msg, info) {
    let mensaje = JSON.parse(msg.toString());
    if (mensaje.messageId !== undefined){
        console.log('contador de trackers: ' + mensaje.body.trackerCount + ', archivos:' + mensaje.body.fileCount);
        console.log('Cliente: Información de donde viene el mensaje. IP:' + info.address + ', PORT:' + info.port + '\n');
    }
    else{
        console.log('Se guardó el archivo');
    }
});



socket.bind(27016);


const objetoCount = {
    messageId: 'idCount',
    route : '/count',
    originIP: '0.0.0.0',
    originPort: 27016,
    body : {
        trackerCount: 0,
        fileCount : 0
    }
}

const hash = encriptado.update('chotodemono' + '40').digest('hex');
console.log(hash);


const objetoStore = {
    route: '/file/'+hash+'/store',
    originIP: '0.0.0.0',
    originPort: 27016,
    body : {
        id: hash,
        filename: 'chotodemono',
        filesize: 40,
        parIP: '190.245.254.237',
        parPort: 42069
    }
}


//STORE
socket.send(JSON.stringify(objetoStore),27015,'201.235.167.115');

setTimeout(() => {
    socket.send(JSON.stringify(objetoCount),27015,'201.235.167.115');
}, 100);


/*
const server = express();

server.use(express.json());

server.post('/file', (req, res) => {
    console.log(req.body);
});

server.get('/file', (req, res) => {
    // buscar la lista completa de archivas y devolverla
    res.send('Lista de archivos escaneados');
});

server.get('/file/:hash', (req, res) => {
    //busca el archivo en los trackers y devuelve el .torrent con la lista de pares que tienen el archivo
    res.send('Devuelve .torrente')
})


server.listen(4200, () => {
    console.log('Escuchando 4200');
})

/*

/* SERVIDOR MANDA ESTO AL PRIMER TRACKER PARA HACER UN STORE DE UN ARCHIVO NUEVO.

route

{
    route: /file/{hash}/store
    body: {
        id: str,
        filename: str,
        filesize: int,
        nodeIP: str,
        nodePort: int
    }
}
CASE:

    ALTA: A TRACKER
    POST /file/
    body: {
        id: str,
        filename: str,
        filesize: int,
        nodeIP: str,
        nodePort: int
    }

    LISTAR:
    SOLICITUD DESCARGA: */