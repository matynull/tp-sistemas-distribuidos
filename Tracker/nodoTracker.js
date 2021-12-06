//SHA1
const crypto = require('crypto');
//UDP y FS para leer archivo
const udp = require('dgram');
const fs = require('fs');

//Definición de tipos
//Tabla de hash distribuida
const dht = function () {
    this.elementos = [];

    this.agregar = function (hash, filename, filesize, ip, port) {
        let retorno;
        let id = parseInt(hash.substring(0, 2), 16);
        let indice = this.elementos.findIndex(e => e.id == id);
        if (indice == -1) {
            indice = this.elementos.length;
            this.elementos.push(new elementoHash(hash));
            retorno = this.elementos[indice].agregarArchivo(hash, filename, filesize, ip, port);
            this.elementos.sort(function (a, b) {
                if (a.id < b.id)
                    return -1;
                else
                    return 1;
            });
        } else
            retorno = this.elementos[indice].agregarArchivo(hash, filename, filesize, ip, port);
        return retorno;
    };

    this.cantArchivos = function () {
        let cont = 0;
        this.elementos.forEach((e, i, array) => { cont += e.archivos.length; });
        return cont;
    }

    //Devuelve un arreglo con todos los archivos del Tracker en el formato usado por Scan
    this.archivos = function () {
        let retorno = [];
        this.elementos.forEach((e, i, array) => {
            e.archivos.forEach((e1, i1, array1) => {
                retorno.push({
                    id: e1.hash,
                    filename: e1.filename,
                    filesize: e1.filesize
                });
            })
        });
        return retorno;
    }

    this.buscar = function (hash) {
        let id = parseInt(hash.substring(0, 2), 16);
        let indice = this.elementos.findIndex(e => e.id == id);
        if (indice == -1)
            return -1;
        else
            if (this.elementos[indice].archivos.findIndex(e => e.hash == hash) == -1)
                return -1;
            else
                return 1;
    }

    this.bodyFound = function (hash) {
        let retorno = {};
        let id = parseInt(hash.substring(0, 2), 16);
        let indice = this.elementos.findIndex(e => e.id == id);
        if (indice != -1) {
            let indiceArch = this.elementos[indice].archivos.findIndex(e => e.hash == hash);
            if (indiceArch != -1)
                retorno = this.elementos[indice].archivos[indiceArch].bodyFound();
        }
        return retorno;
    }

    this.agregarPar = function (hash, ip, puerto) {
        let id = parseInt(hash.substring(0, 2), 16);
        let indice1 = this.elementos.findIndex(e => e.id == id);
        if (indice1 == -1)
            return false;
        else {
            let indice2 = this.elementos[indice1].archivos.findIndex(e => e.hash == hash);
            if (indice2 == -1)
                return false;
            else
                return this.elementos[indice1].archivos[indice2].agregarPar(ip, puerto);
        }
    };

    this.pares = function (hash) {
        let id = parseInt(hash.substring(0, 2), 16);
        let indice1 = this.elementos.findIndex(e => e.id == id);
        if (indice1 == -1)
            return false;
        else {
            let indice2 = this.elementos[indice1].archivos.findIndex(e => e.hash == hash);
            if (indice2 == -1)
                return false;
            else
                return this.elementos[indice1].archivos[indice2].pares;
        }
    };
}

//Conjunto de archivos que comparten id (primeros dos caracteres del hash)
const elementoHash = function (hash) {
    this.id = parseInt(hash.substring(0, 2), 16);
    this.archivos = [];

    this.agregarArchivo = function (hash, filename, filesize, ip, port) {
        let cant = this.archivos.length;
        //Devuelve verdadero si realmente se agregó el archivo
        let indice = this.archivos.findIndex(e => e.hash = hash);
        if (indice == -1)
            if (cant != this.archivos.push(new archivo(hash, filename, filesize, ip, port)))
                return true;
            else
                return false;
        else
            return false;
    }
};

//Archivo con su lista de pares
const archivo = function (hash, filename, filesize, ip, port) {
    this.hash = hash;
    this.filename = filename;
    this.filesize = filesize;
    this.pares = [];

    this.bodyFound = function () {
        return {
            id: hash,
            filename: this.filename,
            filesize: this.filesize,
            trackerIP: '0.0.0.0',
            trackerPort: 0,
            pares: this.pares
        }
    }

    this.agregarPar = function (ip, puerto) {
        const cantVieja = this.pares.length;
        let indice = this.pares.findIndex(e => e.parIP == ip);
        if (indice == -1) {
            let cantNueva = this.pares.push({
                parIP: ip,
                parPort: puerto
            });
            if (cantVieja == cantNueva)
                return false;
            else
                return true;
        }
        else
            return false;
    };
}

let dhtTracker, dhtAnt;
dhtTracker = new dht();

let msgPendientes = [];

const socket = udp.createSocket('udp4');
let encriptado = crypto.createHash('sha1');

let idTracker;
let puertoTracker;
let idAnt, ipAnt, puertoAnt, idSig, ipSig, puertoSig;
let limiteMenor, limiteMayor;
let solo = false;

//Lee el archivo de configuración
function leerCfg() {
    const config = JSON.parse(fs.readFileSync('./tracker.cfg'));
    ipServer = config.ipServer;
    puertoServer = config.puertoServer;
    puertoTracker = config.puertoTracker;
};

//Inicializa el tracker
function configurar() {
    let msg = {
        route: '/join',
        id: '',
        trackerIP: '0.0.0.0',
        trackerPort: puertoTracker
    };
    ipAnt = '0.0.0.0';
    limiteMenor = -1;
    limiteMayor = 255;
    console.log("Intentando unirse a la red de Trackers...");
    socket.send(JSON.stringify(msg), puertoServer, ipServer, (err) => {
        if (err)
            console.log("Hubo un error al intentar unirse a la red.");
    });
};

function store(objetoJSON, info, tokens) {
    let objetoJSONConfirmacion = {
        messageId: objetoJSON.messageId,
        route: '/file/' + tokens[2] + '/store',
        status: false
    }
    objetoJSONConfirmacion.status = dhtTracker.agregar(objetoJSON.body.id, objetoJSON.body.filename, objetoJSON.body.filesize, objetoJSON.body.parIP, objetoJSON.body.parPort);
    //Mensaje de confirmación
    if (objetoJSONConfirmacion.status)
        console.log("Se guardó un archivo con hash " + objetoJSON.body.id + '.');
    else
        console.log("Ya existía un archivo con hash " + objetoJSON.body.id + '.');
    socket.send(JSON.stringify(objetoJSONConfirmacion), objetoJSON.originPort, objetoJSON.originIP, (err) => {
        if (err)
            socket.close('Error en tracker ' + idMax + ' al enviar confirmación de Store.');
    });
};

function addPar(objetoJSON, info, tokens) {
    let objetoJSONConfirmacion = {
        messageId: objetoJSON.messageId,
        route: '/file/' + tokens[2] + '/addPar',
        status: false
    }
    if (objetoJSON.parIP == '0.0.0.0')
        objetoJSON.parIP = info.address;
    objetoJSONConfirmacion.status = dhtTracker.agregarPar(objetoJSON.id, objetoJSON.parIP, objetoJSON.parPort);
    //Mensaje de confirmación
    if (objetoJSONConfirmacion.status)
        console.log("Se agregó un par al archivo con hash " + objetoJSON.id + '.');
    else
        console.log("Hubo un error al agregar un par al archivo con hash " + objetoJSON.id + '.');
    socket.send(JSON.stringify(objetoJSONConfirmacion), 27018, objetoJSON.parIP, (err) => {
        if (err)
            socket.close('Error en tracker ' + idMax + ' al enviar confirmación de addPar.');
    });
};

function search(objetoJSON, info, tokens) {
    //Si no se encuentra el archivo buscado, se devuelve Found con body vacío
    let objetoJSONFound = {
        messageId: objetoJSON.messageId,
        route: '/file/' + tokens[2] + '/found',
        body: {
        }
    }
    if (dhtTracker.buscar(tokens[2]) == 1) {
        console.log("Se encontró un archivo con hash " + tokens[2] + '.');
        objetoJSONFound.body = dhtTracker.bodyFound(tokens[2]);
        objetoJSONFound.body.trackerPort = socket.address().port;
    } else
        console.log("No se encontró ningún archivo con hash " + tokens[2] + '.');
    socket.send(JSON.stringify(objetoJSONFound), objetoJSON.originPort, objetoJSON.originIP, (err) => {
        if (err)
            socket.close('Error en tracker ' + idNodo + ' al enviar mensaje Found.');
    });
};

function scan(objetoJSON, info, tokens) {
    if (msgPendientes.findIndex(e => e == objetoJSON.messageId) == -1) {
        let objetoJSONRespuesta = {
            "messageId": objetoJSON.messageId,
            "route": objetoJSON.route,
            "originIP": objetoJSON.originIP,
            "originPort": objetoJSON.originPort,
            "body": { files: [] }
        }
        if (objetoJSON.body === undefined) { //Este Tracker es el primero de la cola circular. Es el responsable de devolver la respuesta a la petición.
            msgPendientes.push(objetoJSON.messageId);
            objetoJSON.originIP = info.address;
        } else
            objetoJSONRespuesta.body.files = objetoJSON.body.files;
        dhtTracker.archivos().forEach((e, i, array) => {
            objetoJSONRespuesta.body.files.push(e);
        });
        socket.send(JSON.stringify(objetoJSONRespuesta), puertoSig, ipSig, (err) => {
            if (err)
                socket.close('Error en Tracker ' + idMax + ' al enviar Scan hacia siguiente nodo.');
        });
    } else {
        msgPendientes.splice(msgPendientes.findIndex(e => e == objetoJSON.messageId), 1);
        socket.send(msg, objetoJSON.originPort, objetoJSON.originIP, (err) => {
            if (err)
                socket.close('Error en Tracker ' + idMax + ' al devolver Scan hacia el servidor.');
        });
    }
};

function count(objetoJSON, info, tokens) {
    if (msgPendientes.findIndex(e => e == objetoJSON.messageId) == -1) {
        if (objetoJSON.body.trackerCount == 0) { //Este Tracker es el primero de la cola circular. Es el responsable de devolver la respuesta a la petición.
            msgPendientes.push(objetoJSON.messageId);
            objetoJSON.originIP = info.address;
        }
        objetoJSON.body.trackerCount++;
        objetoJSON.body.fileCount += dhtTracker.cantArchivos();
        socket.send(JSON.stringify(objetoJSON), puertoSig, ipSig, (err) => {
            if (err)
                socket.close('Error en tracker ' + idMax + ' al enviar Count al siguiente nodo.');
        });
    } else {
        msgPendientes.splice(msgPendientes.findIndex(e => e == objetoJSON.messageId), 1);
        socket.send(msg, objetoJSON.originPort, objetoJSON.originIP, (err) => {
            if (err)
                socket.close('Error en tracker ' + idMax + ' al devolver Count hacia el servidor.');
        });
    }
};

function join(objetoJSON, info, tokens) {
    if (limiteMenor < objetoJSON.id && objetoJSON.id <= limiteMayor) {
        console.log(ipAnt);
        if (solo) {
            solo = false;
            ipSig = objetoJSON.trackerIP;
            puertoSig = objetoJSON.trackerPort;
            if (objetoJSON.id > idTracker)
                limiteMayor = idTracker;
            else
                limiteMenor = objetoJSON.id;
        }
        if (ipAnt === '0.0.0.0') {
            solo = true;
            idTracker = objetoJSON.id;
            idAnt = objetoJSON.id;
        }
        if (idAnt >= idTracker)
            limiteMenor = -1;
        else
            limiteMenor = idAnt;
        ipAnt = objetoJSON.trackerIP;
        puertoAnt = objetoJSON.trackerPort;
        let msg = {
            route: '/joinResponse',
            id: objetoJSON.id,
            sigId: idTracker,
            sigPort: puertoTracker,
            antId: idAnt,
            antIP: ipAnt,
            antPort: puertoAnt
        };
        console.log("id ANT: "+idAnt);
        idAnt = objetoJSON.id;
        socket.send(JSON.stringify(msg), puertoAnt, ipAnt, (err) => {
            if (err)
                console.log("Hubo un error al enviar joinResponse.");
        });
        console.log("Se aceptó la solicitud de unirse del Tracker " + idAnt);
    } else {
        console.log("puerto sig " + puertoSig + " ip sig" + ipSig);
        socket.send(JSON.stringify(objetoJSON), puertoSig, ipSig, (err) => {
            if (err)
                console.log("Hubo un error al reenviar Join al siguiente tracker.");
        });
    }
};

function joinResponse(objetoJSON, info, tokens) {
    idTracker = objetoJSON.id;
    idSig = objetoJSON.sigId;
    ipSig = info.address;
    puertoSig = objetoJSON.sigPort;
    idAnt = objetoJSON.antId;
    ipAnt = objetoJSON.antIP;
    puertoAnt = objetoJSON.antPort;
    let msg = {
        route: '/reqUpdate',
        id: idTracker,
        port: puertoTracker
    };
    socket.send(JSON.stringify(msg), puertoAnt, ipAnt, (err) => {
        if (err)
            console.log("Hubo un error al enviar el primer reqUpdate.");
    });

    console.log("Tracker incorporado a la red.");
    console.log("Tracker anterior: " + idAnt);
    console.log("Tracker siguiente: " + idSig);
};

function update(objetoJSON, info, tokens) {
    idAnt = objetoJSON.id;
    if (idAnt >= idTracker)
        limiteMenor = -1;
    else
        limiteMenor = idAnt;
    ipAnt = info.address;
    puertoAnt = objetoJSON.antPort;
    dhtAnt = objetoJSON.dht;
    console.log("Se actualizo la DHT.");
};

function reqUpdate(objetoJSON, info, tokens) {
    idSig = objetoJSON.id;
    console.log("idSig: " + idSig + " idTracker: " + idTracker);
    if (idSig <= idTracker)
        limiteMayor = 255;
    else
        limiteMayor = idSig;
    ipSig = info.address;
    puertoSig = objetoJSON.port;
    let msg = {
        route: '/update',
        id: idTracker,
        antPort: puertoTracker,
        dht: dhtTracker
    };
    socket.send(JSON.stringify(msg), puertoSig, ipSig, (err) => {
        if (err)
            console.log("Hubo un error al enviar Update.");
    });
};

function leave(objetoJSON, info, tokens) {

};

function heartbeat(objetoJSON, info, tokens) {

};

function missing(objetoJSON, info, tokens) {

};

//Manejo de mensajes entrantes
socket.on('message', function (msg, info) {
    let objetoJSON = JSON.parse(msg.toString());

    //Si el mensaje tiene un campo originIP y no está correctamente definido, es su primer envío
    //Reemplazar IP por la de la conexión entrante
    if (objetoJSON.originIP !== undefined && objetoJSON.originIP == '0.0.0.0')
        objetoJSON.originIP = info.address;

    let tokens = objetoJSON.route.split('/');
    switch (tokens[1]) {
        case 'file': //Search, Store, addPar
            let id = parseInt(tokens[2].substring(0, 2), 16);
            if (id <= limiteMayor && id > limiteMenor) { //Este tracker debe manejar la petición
                if (tokens.length > 3) { //Store o addPar
                    switch (tokens[3]) {
                        case 'store':
                            store(objetoJSON, info, tokens);
                            break;
                        case 'addPar':
                            addPar(objetoJSON, info, tokens);
                            break;
                        default:
                            console.log('Función ' + tokens[3] + ' no definida.');
                            break;
                    }
                } else //Search
                    search(objetoJSON, info, tokens);
            }
            //Pasar la petición al siguiente Tracker
            else {
                socket.send(JSON.stringify(objetoJSON), puertoSig, ipSig, (err) => {
                    if (err)
                        socket.close('Error en tracker ' + idMax + ' - enviando al siguiente.');
                });
                console.log("Se reenvió un mensaje al siguiente Tracker.");
            }
            break;
        case 'scan':
            scan(objetoJSON, info, tokens);
            break;
        case 'count':
            count(objetoJSON, info, tokens);
            break;
        case 'join':
            join(objetoJSON, info, tokens);
            break;
        case 'joinResponse':
            joinResponse(objetoJSON, info, tokens);
            break;
        case 'update':
            update(objetoJSON, info, tokens);
            break;
        case 'reqUpdate':
            reqUpdate(objetoJSON, info, tokens);
            break;
        case 'leave':
            leave(objetoJSON, info, tokens);
            break;
        case 'heartbeat':
            heartbeat(objetoJSON, info, tokens);
            break;
        case 'missing':
            missing(objetoJSON, info, tokens);
            break;
        default:
            console.log('Error en tracker ' + idMax + '.');
            console.log('Objeto JSON recibido: ' + objetoJSON);
            break;
    }
});

leerCfg();

socket.bind({
    port: puertoTracker,
    exclusive: true
});

console.log("Escuchando en el puerto 27015.");
configurar();

function delay(delay) {
    return new Promise(resolve => {
        setTimeout(() => { resolve(); }, delay);
    });
}