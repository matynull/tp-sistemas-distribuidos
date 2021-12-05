const udp = require('dgram');
const net = require('net');
const fs = require('fs');
const crypto = require('crypto');
const readline = require('readline');

let msgID = 0;
let archivos = [];

//const tamChunk = 1024;

//La conexión con Trackers es por UDP, la conexión con Pares es por TCP
//Se usan puertos distintos para evitar confusión
const puertoTrackers = 27018;

let socketTrackers = udp.createSocket('udp4');

const puertoPares = 27019;
let serverPares = net.createServer(conexionEntrantePar);
serverPares.listen(puertoPares,() => {
    console.log("Escuchando conexiones entrantes en el puerto " + puertoPares + ".");
});

function conexionEntrantePar(socket) {
    console.log("Conexion establecida con " + socket.remoteAddress);
    
    let datos = "";
    socket.on('data', (data) => {
        datos += data;
    });

    socket.on('end',(data) => {
        let peticion = JSON.parse(datos);
        let indice = archivos.findIndex(e => e.hash == peticion.hash);
        if (indice == -1) {
            console.log("no hay archivo xd");
            //No tenías el archivo
        } else {
            socket.pipe(process.stdout);
            let stream = fs.createReadStream(archivos[indice].dir);
            stream.on("readable", () => {
                let chunk;
                while (chunk = this.read())
                    socket.write(chunk);
            });
        }
        socket.close();
    });
    socket.on('close', () => {
        console.log("Conexión terminada con " + socket.remoteAddress);
    });
}

let socketPares = new net.Socket();

const rl = readline.createInterface({
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
        rl.question('', respuesta => {
            resolve(respuesta);
        })
    });
};

(async function leerRuta() {
    let ruta;
    while (true) {
        ruta = await pregunta();
        if (ruta.includes(' '))
            ruta = ruta.substring(1, ruta.length - 1);
        if (ruta.includes('.torrente')) {
            fs.readFile(ruta, "utf-8", async (err, data) => {
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
});

function descargar(info) {
    let aceptado = false;
    let r;
    let pares = info.body.pares;
    if (pares.length == 0) 
        console.log("El archivo a descargar no tiene pares disponibles.");
    else {
        while (!aceptado) {
            r = Math.trunc(Math.random() * pares.length);

            if (true) // OJO CON ESE TRUE
                pares.splice(pares.findIndex(e => e==r),1);
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
        console.log("Se agregó el par al archivo con hash " + info.body.id + ".");
    else
        console.log("No se agregó el par al archivo con hash " + info.body.id + ".");
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

socketTrackers.on("message", (msg, info) => {
    let objetoJSON = JSON.parse(msg.toString());
    let mensajeID = objetoJSON.messageId;
    let indexRespuesta = respuestasID.findIndex((e) => e.id == mensajeID);
    if (indexRespuesta != -1) {
        respuestasID[indexRespuesta] = {
            id: mensajeID,
            Response: objetoJSON
        };
    } else {
        console.log("Llegó un mensaje con ID desconocido.");
    }
})

function checkearArchivos() {
    let encriptado = crypto.createHash('sha1');
    fs.readdir("./Archivos", function (err, filenames) {
        if (err) {
            console.log("Error al leer archivos.");
            return;
        }
        filenames.forEach(function (filename) {
            const hash = encriptado.update(filename + fs.statSync("./Archivos/" + filename).size).digest('hex');
            archivos.push({dir: "./Archivos/" + filename, hash: hash});
        });
    });
}

checkearArchivos();

leerRuta();

socketTrackers.bind(27018);