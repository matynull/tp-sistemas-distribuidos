const fs = require('fs');
const net = require('net');

const puertoPares = 27019;

const socketPares = new net.Socket();

let writeStream; 

socketPares.connect(puertoPares,'localhost',() => {
    console.log("Conexion establecida con " + socketPares.remoteAddress);
    socketPares.write(JSON.stringify({
        type: 'GET FILE',
        hash: 1
    }));
    writeStream = fs.createWriteStream('./recibidos/videoRecibido.mp4');
});

socketPares.on('data',(data) => {
    writeStream.write(data);
});

socketPares.on('end',() => {
    console.log("Se terminó de descargar el archivo.");
});