const udp = require('dgram');
const net = require('net');
const fs = require('fs');
const crypto = require('crypto');
const readline = require('readline');

const descarga = function (hash, filename, filesize) {
    this.hash = hash;
    this.filename = filename;
    this.filesize = filesize;
    this.descargado = 0;
    this.inicio = Date.now();
    this.velocidad = 0;
    this.porcentaje = 0;
    this.actualizar = function (avance) {
        this.descargado += avance;
        this.porcentaje = Math.round(1000 * (this.descargado / this.filesize)) / 10; //Redondeado a 1 decimal
        this.velocidad = 8000 * this.descargado / (Date.now() - this.inicio); //En bit/s, redondeado a 1 decimal
    };
    this.terminar = function () {
        this.descargado = this.filesize;
        this.porcentaje = 100;
    };
}

let msgID = 0;
let archivos = [];
let descargas = [];
let encriptado = crypto.createHash('sha1');

//La conexión con Trackers es por UDP, la conexión con Pares es por TCP
//Se usan puertos distintos para evitar confusión
const puertoTrackers = 27018;
const puertoPares = 27019;

let socketTrackers = udp.createSocket('udp4');

let socketPares = new net.Socket();

let serverPares = net.createServer(conexionEntrantePar);
serverPares.listen(puertoPares, () => {
    console.log('Escuchando conexiones entrantes en el puerto ' + puertoPares + '.');
});

function conexionEntrantePar(socket) {
    console.log('Conexion establecida con ' + socket.remoteAddress);

    let datos = '';
    socket.on('data', (data) => {
        datos += data;
    });

    socket.on('end', (data) => {
        let peticion = JSON.parse(datos);
        let indice = archivos.findIndex(e => e.hash == peticion.hash);
        if (indice == -1) {
            console.log('no hay archivo xd');
            //No tenías el archivo
        } else {
            socket.pipe(process.stdout);
            let stream = fs.createReadStream(archivos[indice].dir);
            stream.on('readable', () => {
                let chunk;
                while (chunk = this.read())
                    socket.write(chunk);
            });
        }
        socket.close();
    });
    socket.on('close', () => {
        console.log('Conexión terminada con ' + socket.remoteAddress);
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

(async function leerRuta() {
    let rta;
    while (true) {
        rta = await pregunta();
        if (rta.toLowerCase() === 'status') //Mostrar estado de todas las descargas
            mostrarDescargas();
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
                        while (respuestasID[indice].Response === undefined) {
                            await delay(50);
                        }
                        let responseSearch = respuestasID[indice].Response;
                        if (responseSearch.body.id !== undefined) {
                            //Se recibió la respuesta del Search
                            if (indiceArchivos == -1) {
                                descargar(responseSearch);
                            } else {
                                addPar(responseSearch);
                            }
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
});

function mostrarDescargas() {
    if (descargas.length > 0) {
        let tabla = [];
        descargas.forEach(e => {
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
                velocidad = (Math.round(e.filesize / 100) / 10) + " Kbps";
            else
                velocidad = (Math.round(e.filesize / 1000) / 10) + " Mbps";
            tabla.push({
                "Archivo": e.filename,
                "Tamaño": size,
                "Descargado": e.porcentaje + "%",
                "Velocidad promedio": velocidad
            });
        });
        console.table(tabla);
    } else
        console.log("No hay descargas activas.");
};

function descargar(info) {
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
            delay(500);
        if (pares.length == 0)
            console.log('El archivo ' + filename + ' no tiene pares disponibles.');
        else {
            //Elige un par de la lista al azar para distribuir carga
            r = Math.trunc(Math.random() * pares.length);

            //Establece conexión con el par elegido
            socketPares.connect(pares[r].port, pares[r].ip, () => {
                console.log('Conexion establecida con ' + pares[r].ip + ' - Comenzando descarga de ' + filename);
                descargas.push(new descarga(hash,filename,info.body.filesize));
                descargando = true;
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
                descargas[indice].actualizar(data.length);
            });

            //Chequea que se haya descargado correctamente
            socketPares.on('end', () => {
                const hash = encriptado.update(filename + fs.statSync('./Archivos/' + filename).size).digest('hex');
                if (hash === info.body.id) {//Se descargó el archivo correctamente
                    console.log('Se terminó de descargar el archivo ' + filename);
                    archivos.push({ dir: './Archivos/' + filename, hash: hash });
                    indice = descargas.findIndex(e => e.hash == hash);
                    descargas[indice].terminar();
                    //Se agrega como par al archivo
                    addPar(info);
                    termino = true;
                } else
                    errorDescarga();
                descargando = false;
            });

            socketPares.on('error', () => {
                errorDescarga();
            });

            function errorDescarga() {
                console.log('Hubo un error al descargar el archivo ' + filename + ' del par ' + pares[r].ip);
                fs.unlinksync('./Archivos/' + filename);
                indice = descargas.findIndex(e => e.hash == hash);
                if (indice != -1)
                    descargas.splice(indice,1);
                console.log('Reintentando con otro par...');
                pares.splice(pares.findIndex(e => e == r), 1);
                descargando = false;
            };
        }
    }
}

function addPar(info) {
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
            parPort: 27018,
        }
        console.log(info.trackerPort);
        socketTrackers.send(JSON.stringify(msg), info.trackerPort, info.trackerIP, (err) => {
            if (!err) {
                respuestasID.push({ id: msgID });
                msgID += 2;
            } else
                console.log('error en send de addPar');
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
                console.log('error en send de search');
            resolve();
        })
    })
}

socketTrackers.on('message', (msg, info) => {
    let objetoJSON = JSON.parse(msg.toString());
    let mensajeID = objetoJSON.messageId;
    let indexRespuesta = respuestasID.findIndex((e) => e.id == mensajeID);
    if (indexRespuesta != -1) {
        respuestasID[indexRespuesta] = {
            id: mensajeID,
            Response: objetoJSON
        };
    } else {
        console.log('Llegó un mensaje con ID desconocido.');
    }
})

function checkearArchivos() {
    fs.readdir('./Archivos', function (err, filenames) {
        if (err) {
            console.log('Error al leer archivos.');
            return;
        }
        filenames.forEach(function (filename) {
            const hash = encriptado.update(filename + fs.statSync('./Archivos/' + filename).size).digest('hex');
            archivos.push({ dir: './Archivos/' + filename, hash: hash });
        });
    });
}

checkearArchivos();

leerRuta();

socketTrackers.bind(27018);