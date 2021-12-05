/*
const fs = require('fs');
const net = require('net');

const puertoPares = 27019;

const socketPares = new net.Socket();

let writeStream; 

let total = 0;

socketPares.connect(puertoPares,'localhost',() => {
    console.log("Conexion establecida con " + socketPares.remoteAddress);
    socketPares.write(JSON.stringify({
        type: 'GET FILE',
        hash: 1
    }));
    writeStream = fs.createWriteStream('./recibido.mp4');
});

socketPares.on('data',(data) => {
    writeStream.write(data);
    total += data.length;
    console.log(data.length);
});

socketPares.on('end',() => {
    console.log("Se terminó de descargar el archivo.");
});

socketPares.on('close', () => {
    console.log('terminada ' + total);
});
*/

const tabla = [
    {"Archivo": "Certificado de vacunación nacho.pdf",
    "Tamaño": "100.8 GB",
    "Descargado": "99.7%",
    "Velocidad promedio": "999.9 Mbits/s"}
];
console.table(tabla);