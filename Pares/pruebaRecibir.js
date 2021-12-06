const net = require('net');
const fs = require('fs');
const crypto = require('crypto');
const readline = require('readline');

let antes;
let despues;

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

let archivos = [];
let descargas = [];

let socketPares = new net.Socket();

const puertoPares = 27019;

function delay(delay) {
    return new Promise(resolve => {
        setTimeout(() => { resolve(); }, delay);
    });
}

async function descargar(info) {
    let writeStream;
    let termino = false;
    let descargando = false;
    let r;
    let pares = info.body.pares;
    let filename = info.body.filename;
    let hash = info.body.id;
    let indice;
    while (!termino) {
        while (descargando)
            await delay(500);

        if (!termino) {
            if (pares.length == 0) {
                console.log('El archivo ' + filename + ' no tiene pares disponibles.');
                termino = true;
            }
            else {
                descargando = true;
                antes = Date.now();
                //Elige un par de la lista al azar para distribuir carga
                r = Math.trunc(Math.random() * pares.length);

                //Establece conexión con el par elegido
                socketPares.connect(pares[r].parPort, pares[r].parIP, () => {
                    console.log('Conexion establecida con ' + pares[r].parIP + ' - Comenzando descarga de ' + filename);
                    descargas.push(new transferencia(hash, filename, info.body.filesize, pares[r].parIP));
                    socketPares.write(JSON.stringify({
                        type: 'GET FILE',
                        hash: info.body.id
                    }));
                    //Crea el archivo
                    writeStream = fs.createWriteStream('./Archivos/' + filename + '2');
                });

                //Transfiere los datos recibidos al archivo creado
                socketPares.on('data', (data) => {
                    writeStream.write(data);
                    indice = descargas.findIndex(e => e.hash == hash);
                    descargas[indice].avanzar(data.length);
                });

                //Chequea que se haya descargado correctamente
                socketPares.on('end', () => {
                    encriptado = crypto.createHash('sha1');
                    const hash = encriptado.update(filename + fs.statSync('./Archivos/' + filename + '2').size).digest('hex');
                    if (hash === info.body.id) {//Se descargó el archivo correctamente
                        console.log('Se terminó de descargar el archivo ' + filename);
                        archivos.push({ dir: './Archivos/' + filename, hash: hash });
                        indice = descargas.findIndex(e => e.hash == hash);
                        descargas[indice].terminar();
                        //Se agrega como par al archivo
                        //addPar(info);
                        termino = true;
                    } else
                        errorDescarga();
                    descargando = false;
                });

                socketPares.on('error', () => {
                    errorDescarga();
                });

                function errorDescarga() {
                    console.log('Hubo un error al descargar el archivo ' + filename + ' del par ' + pares[r].parIP);
                    try {
                        fs.unlinkSync('./Archivos/' + filename + '2');
                    } catch (e) {
                    };
                    indice = descargas.findIndex(e => e.hash == hash);
                    if (indice != -1)
                        descargas.splice(indice, 1);
                    console.log('Reintentando con otro par...');
                    pares.splice(pares.findIndex(e => e == r), 1);
                    descargando = false;
                };
            }
        }
    }
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
            console.log("Descargas:");
            mostrarEstado(descargas);
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

let info = {
    body: {
        id: 'ed96867823bf73a4b17032b6428aa6c693d66c2e',
        filename: 'video.mp4',
        filesize: '77772923',
        pares: [{
            parIP: 'localhost',
            parPort: puertoPares
        }]
    }
};

async function actualizarTransferencias() {
    let t = 500;
    while (true) {
        descargas.forEach(e => {
            if (!e.terminada)
                e.actualizar(t);
        });
        mostrarEstado(descargas);
        await delay(t);
    }
}

descargar(info);

leerConsola();

actualizarTransferencias();