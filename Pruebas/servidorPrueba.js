//const express = require('express');

const udp = require('dgram');
const { TIMEOUT } = require('dns');
let socket = udp.createSocket('udp4');



//SHA1
const crypto = require('crypto');
let encriptado = crypto.createHash('sha1');

var puertoSV = 27016;

//FORMA DEL FOUND
/*
{
    messageId: str,
    route: /file/{hash}/found,
    body: {
        id: str,
        trackerIP: str,
        trackerPort: int
    }
}
*/

socket.on('message', function (msg, info) {
    let mensaje = JSON.parse(msg.toString());
    let mensajeID = mensaje.messageId;
      
    if (mensajeID !== undefined)
        if (mensajeID == 'idCount'){
            console.log('Cantidad de trackers = ' + mensaje.body.trackerCount + ', archivos = ' + mensaje.body.fileCount);
            console.log('Cliente: Información de donde viene el mensaje. IP:' + info.address + ', PORT:' + info.port + '\n');
        }
        else if (mensajeID == 'idSearch'){
                console.log('Se encontró archivo con hash ' + mensaje.body.id);
        }
    else
        //Si llega acá es STORE
        console.log('Se guardó el archivo');
});

socket.bind(27016);


const objetoCount = {
    messageId: 'idCount',
    route : '/count',
    originIP: '0.0.0.0',
    originPort: puertoSV,
    body : {
        trackerCount: 0,
        fileCount : 0
    }
}

const hash = encriptado.update('chotodemono' + '3').digest('hex');

const objetoStore = {
    route: '/file/'+hash+'/store',
    originIP: '0.0.0.0',
    originPort: puertoSV,
    body : {
        id: hash,
        filename: 'chotodemono',
        filesize: 3,
        parIP: '190.245.254.237',
        parPort: 42069
    }
}

const objetoSearch = {
    messageId: 'idSearch',
    route: '/file/'+hash,
    originIP: '0.0.0.0',
    originPort: puertoSV
}

let portTracker,ipTracker;

portTracker = 27015;
ipTracker = '190.245.254.237';

//STORE

//socket.send(JSON.stringify(objetoSearch),portTracker,ipTracker);

socket.send(JSON.stringify(objetoStore),portTracker,ipTracker);

setTimeout(() => {
    socket.send(JSON.stringify(objetoCount),portTracker,ipTracker);
}, 100);

/*

*/

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