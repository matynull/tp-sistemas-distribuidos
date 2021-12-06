const net = require('net');
const fs = require('fs');
const crypto = require('crypto');
const readline = require('readline');

const transferencia = function (hash, filename, filesize, parIP) {
    this.hash = hash;
    this.filename = filename;
    this.filesize = filesize;
    this.parIP = parIP;
    this.descargado = 0;
    this.avanceAcum = 0;
    this.inicio = Date.now();
    this.velocidad = 0;
    this.porcentaje = 0;
    this.avanzar = function (avance) {
        this.descargado += avance;
        this.avanceAcum += avance;
    };

    this.actualizar = function(tiempo) {
        this.porcentaje = Math.round(1000 * (this.descargado / this.filesize)) / 10; //Redondeado a 1 decimal
        this.velocidad = 8000 * this.avanceAcum / tiempo; //En bit/s
        this.avanceAcum = 0;
    };

    this.terminar = function () {
        this.descargado = this.filesize;
        this.porcentaje = 100;
        this.velocidad = 0;
    };
}

const io = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let archivos = [{ dir: './Archivos/video.mp4', hash: 'ed96867823bf73a4b17032b6428aa6c693d66c2e' }];
let subidas = [];

const puertoPares = 27019;

let serverPares = net.createServer(conexionEntrantePar);

function conexionEntrantePar(socket) {
    let peticion;

    console.log('Conexion establecida con ' + socket.remoteAddress);

    socket.on('data', (data) => {
        peticion = JSON.parse(data);
        let indiceArchivo = archivos.findIndex(e => e.hash == peticion.hash);
        let indiceTransferencia;
        let filename = archivos[indiceArchivo].dir.split("/")[2];
        if (indiceArchivo != -1) {
            //El archivo está disponible para enviar
            subidas.push(new transferencia(peticion.hash, filename, fs.statSync(archivos[indiceArchivo].dir).size, socket.remoteAddress));
            let stream = fs.createReadStream(archivos[indiceArchivo].dir);

            stream.on('readable', () => {
                let chunk;
                while (chunk = stream.read()) {
                    indiceTransferencia = subidas.findIndex(e => e.hash == peticion.hash);
                    subidas[indiceTransferencia].avanzar(chunk.length);
                    socket.write(chunk);
                } 
            });

            stream.on('end', () => {
                indiceTransferencia = subidas.findIndex(e => e.hash == peticion.hash);
                subidas[indiceTransferencia].terminar();
                socket.end();
            });
        }
    });

    socket.on('error', () => {
        console.log('Hubo un error al enviar el archivo ' + filename + ' al par ' + socket.remoteAddress);
        indiceTransferencia = subidas.findIndex(e => e.hash == peticion.hash);
        if (indice != -1)
            subidas.splice(indiceTransferencia, 1);
    });

    socket.on('close', () => {
        console.log('Conexión terminada con ' + socket.remoteAddress);
        indiceTransferencia = subidas.findIndex(e => e.hash == peticion.hash);
        subidas.splice(indiceTransferencia, 1);
    });
}

var pregunta = function () {
    return new Promise((resolve) => {
        io.question('', respuesta => {
            resolve(respuesta);
        })
    });
};

async function leerConsola() {
    let rta;
    while (true) {
        rta = await pregunta();
        if (rta.toLowerCase() === 'status') {//Mostrar estado de todas las descargas
            console.log("*****");
            console.log("Subidas:");
            mostrarEstado(subidas);
            console.log("*****");
        }
    }
};

function mostrarEstado(a) {
    if (a.length > 0) {
        let tabla = [];
        a.forEach(e => {
            let size;
            let velocidad;
            if (e.filesize < 1024)
                size = e.filesize + " B";
            else if (e.filesize < 1048576)
                size = (Math.round(e.filesize / 102.4) / 10) + " KB";
            else if (e.filesize < 1073741824)
                size = (Math.round(e.filesize / 104857.6) / 10) + " MB";
            else
                size = (Math.round(e.filesize / 107374182.4) / 10) + " GB";
            if (e.velocidad < 1000000)
                velocidad = (Math.round(e.velocidad / 100) / 10) + " Kbps";
            else
                velocidad = (Math.round(e.velocidad / 1000) / 10) + " Mbps";
            tabla.push({
                "Archivo": e.filename,
                "Tamaño": size,
                "Descargado": e.porcentaje + "%",
                "Velocidad": velocidad,
                "Par": e.parIP
            });
        });
        console.table(tabla);
    } else
        console.log("No hay transferencias activas.");
};

serverPares.listen(puertoPares, () => {
    console.log('Escuchando conexiones entrantes en el puerto ' + puertoPares + '.');
});

leerConsola();