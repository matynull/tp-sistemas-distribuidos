//Prueba branch

const udp = require('dgram');
const net = require('net');
const fs = require('fs');
const crypto = require('crypto');
const readline = require('readline');

const transferencia = function (hash, filename, filesize, parIP) {
    this.hash = hash;
    this.filename = filename;
    this.filesize = filesize;
    this.parIP = parIP;
    this.terminada = false;
    this.descargado = 0;
    this.avanceAcum = 0;
    this.velocidad = 0;
    this.porcentaje = 0;

    this.avanzar = function (avance) {
        this.descargado += avance;
        this.avanceAcum += avance;
    };

    this.actualizar = function (tiempo) {
        this.porcentaje = Math.round(1000 * (this.descargado / this.filesize)) / 10; //Redondeado a 1 decimal
        this.velocidad = 8000 * this.avanceAcum / tiempo; //En bit/s
        this.avanceAcum = 0;
    };

    this.terminar = function () {
        this.descargado = this.filesize;
        this.porcentaje = 100;
        this.velocidad = 0;
        this.terminada = true;
    };
}

let msgID = 0;
let archivos = [];
let descargas = [];
let subidas = [];
let encriptado;

//La conexión con Trackers es por UDP, la conexión con Pares es por TCP
//Se usan puertos distintos para evitar confusión
const puertoTrackers = 27018;
const puertoPares = 27019;

let socketTrackers = udp.createSocket('udp4');

let socketPares = new net.Socket();

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
                    socket.write(chunk);
                    indiceTransferencia = subidas.findIndex(e => e.hash == peticion.hash);
                    subidas[indiceTransferencia].avanzar(chunk.length);
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
        console.log('Hubo un error al enviar el archivo al par ' + socket.remoteAddress);
        indiceTransferencia = subidas.findIndex(e => e.hash == peticion.hash);
        if (indiceTransferencia != -1)
            subidas.splice(indiceTransferencia, 1);
    });

    socket.on('close', () => {
        console.log('Conexión terminada con ' + socket.remoteAddress);
        indiceTransferencia = subidas.findIndex(e => e.hash == peticion.hash);
        subidas.splice(indiceTransferencia, 1);
    });
}

const io = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

var stdin = process.openStdin();

var respuestasID = []; // vector para ID-Respuesta 

function delay(delay) {
    return new Promise(resolve => {
        setTimeout(() => { resolve(); }, delay);
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
            console.log("Descargas:");
            mostrarEstado(descargas);
            console.log("*****");
            console.log("Subidas:");
            mostrarEstado(subidas);
            console.log("*****");
        }
        else { //Se ingresó una ruta
            if (rta.includes(' '))
                rta = rta.substring(1, rta.length - 1);
            if (rta.includes('.torrente')) {
                fs.readFile(rta, 'utf-8', async (err, data) => {
                    if (!err) {
                        let info = JSON.parse(data);
                        let idSave = msgID;
                        let indice;
                        let indiceArchivos = archivos.findIndex(e => e.hash == info.hash);
                        await search(info.hash, info.trackerIP, info.trackerPort);
                        indice = respuestasID.findIndex((e) => e.id == idSave);
                        while (respuestasID[indice].Response === undefined)
                            await delay(50);
                        let responseSearch = respuestasID[indice].Response;
                        if (responseSearch.body.id !== undefined) {
                            //Se encontró el archivo en el Tracker
                            if (indiceArchivos == -1)
                                descargar(responseSearch);
                            else
                                addPar(responseSearch);
                        }
                        else
                            console.log('No existe el archivo para el torrente asociado.');
                    }
                    else
                        console.log(err);
                })
            }
            else
                console.log('El archivo debe tener extensión .torrente');
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
            /*
            if (e.velocidad < 1000000)
                velocidad = (Math.round(e.velocidad / 100) / 10) + " Kbps";
            else
                velocidad = (Math.round(e.velocidad / 1000) / 10) + " Mbps";
            */
            tabla.push({
                "Archivo": e.filename,
                "Tamaño": size,
                "Descargado": e.porcentaje + "%",
                //"Velocidad": velocidad,
                "Par": e.parIP
            });
        });
        console.table(tabla);
    } else
        console.log("No hay transferencias activas.");
};

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
                    writeStream = fs.createWriteStream('./Archivos/' + filename);
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
                    const hash = encriptado.update(filename + fs.statSync('./Archivos/' + filename).size).digest('hex');
                    if (hash === info.body.id) {//Se descargó el archivo correctamente
                        console.log('Se terminó de descargar el archivo ' + filename);
                        archivos.push({ dir: './Archivos/' + filename, hash: hash });
                        indice = descargas.findIndex(e => e.hash == hash);
                        descargas[indice].terminar();
                        //Se agrega como par al archivo
                        addPar(info);
                        termino = true;
                        descargando = false;
                    } else
                        errorDescarga();
                });

                socketPares.on('error', () => {
                    errorDescarga();
                });

                function errorDescarga() {
                    console.log('Hubo un error al descargar el archivo ' + filename + ' del par ' + pares[r].parIP);
                    try {
                        fs.unlinkSync('./Archivos/' + filename);
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

async function addPar(info) {
    let idSave = msgID;
    await addParPromise(info.body);
    let indice = respuestasID.findIndex((e) => e.id == idSave);

    while (respuestasID[indice].Response === undefined)
        await delay(50);

    let responseAddPar = respuestasID[indice].Response;
    //Se recibió la respuesta del addPar
    if (responseAddPar.status == true)
        console.log('Se agregó el par al archivo con hash ' + info.body.id + '.');
    else
        console.log('No se agregó el par al archivo con hash ' + info.body.id + '.');
}

function addParPromise(info) {
    return new Promise((resolve) => {
        let msg = {
            messageId: msgID,
            route: '/file/' + info.id + '/addPar',
            id: info.id,
            filename: info.filename,
            filesize: info.filesize,
            parIP: '0.0.0.0',
            parPort: 27019,
        }

        socketTrackers.send(JSON.stringify(msg), info.trackerPort, info.trackerIP, (err) => {
            if (!err) {
                respuestasID.push({ id: msgID });
                msgID += 2;
            } else
                console.log('Error al enviar addPar.');
            resolve();
        });
    });
}

function search(hash, ip, port) {
    return new Promise((resolve) => {
        socketTrackers.send(JSON.stringify({
            messageId: msgID,
            route: '/file/' + hash,
            originIP: '0.0.0.0',
            originPort: 27018
        }), port, ip, function (err) {
            if (!err) {
                respuestasID.push({ id: msgID });
                msgID += 2;
            } else
                console.log('Error al enviar Search.');
            resolve();
        })
    })
}

socketTrackers.on('message', (msg, info) => {
    let objetoJSON = JSON.parse(msg.toString());
    let mensajeID = objetoJSON.messageId;
    let indexRespuesta = respuestasID.findIndex((e) => e.id == mensajeID);
    if (indexRespuesta != -1) {
        if (objetoJSON.route.includes('found') && objetoJSON.body.trackerIP === '0.0.0.0')
            objetoJSON.body.trackerIP = info.address;

        respuestasID[indexRespuesta] = {
            id: mensajeID,
            Response: objetoJSON
        };

    } else {
        console.log('Llegó un mensaje con ID desconocido.');
    }
})

function checkearArchivos() {
    console.log('Leyendo archivos...');
    fs.readdir('./Archivos', function (err, filenames) {
        if (err)
            console.log('Error al leer archivos.');
        else {
            filenames.forEach(function (filename) {
                encriptado = crypto.createHash('sha1');
                const hash = encriptado.update(filename + fs.statSync('./Archivos/' + filename).size).digest('hex');
                archivos.push({ dir: './Archivos/' + filename, hash: hash });
            });
        }
    });
};

async function actualizarTransferencias() {
    let t = 250;
    while (true) {
        descargas.forEach(e => {
            if (!e.terminada)
                e.actualizar(t);
        });
        subidas.forEach(e => {
            if (!e.terminada)
                e.actualizar(t);
        });
        await delay(t);
    }
};

checkearArchivos();

leerConsola();

actualizarTransferencias();

socketTrackers.bind(27018);

serverPares.listen(puertoPares, '0.0.0.0', () => {
    console.log('Escuchando conexiones entrantes en el puerto ' + puertoPares + '.');
});