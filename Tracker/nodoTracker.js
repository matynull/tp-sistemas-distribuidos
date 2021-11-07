//SHA1
const crypto = require('crypto');
//UDP y FS para leer archivo
const udp = require('dgram');
const fs = require('fs');

let ipSig, puertoSig, ipAnt, puertoAnt, cantNodos, idNodo, idNodoAnt;
let ipOrigen, portOrigen;
let dhtPropia, dhtAnterior = [],
    dhtSiguiente = [];
let msgID = [];
let encriptado = crypto.createHash('sha1');

const socket = udp.createSocket('udp4');

const dht = function() {
    this.elementos = [];

    this.agregar = function(hash, nombre, size, ip, puerto) {
        let id = parseInt(hash.substring(0, 2), 16);
        let indice = this.elementos.findIndex(e => e.id == id);
        if (indice == -1) {
            indice = this.elementos.length;
            this.elementos.push(new elementoHash(hash));
            this.elementos[indice].agregarArchivo(hash, nombre, size, ip, puerto);
            this.elementos.sort(function(a, b) {
                if (a.id < b.id)
                    return -1;
                else
                    return 1;
            });
        } else
            this.elementos[indice].agregarArchivo(hash, nombre, size, ip, puerto);
    };

    this.cantArchivos = function() {
        let cont = 0;
        this.elementos.forEach((e, i, array) => { cont += e.archivos.length; });
        return cont;
    }

    this.archivos = function() {
        let retorno = [];
        this.elementos.forEach((e, i, array) => {
            e.archivos.forEach((e1, i1, array1) => {
                retorno.push({
                    "id": e1.hash,
                    "filename": e1.filename,
                    "filesize": e1.filesize
                });
            })
        });
        return retorno;
    }

    this.buscar = function(hash) {
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
}

dhtPropia = new dht();

//listaNodosPares van a ser muchos
const elementoHash = function(hash) {
    this.id = parseInt(hash.substring(0, 2), 16);
    this.archivos = [];
    this.agregarArchivo = function(hash, nombre, size, ip, puerto) {
        this.archivos.push(new archivo(hash, nombre, size, ip, puerto));
    }
};

const archivo = function(hash, nombre, size, ip, puerto) {
    this.hash = hash;
    this.filename = nombre;
    this.filesize = size;
    this.sockets = [];
    this.agregarSocket = function(ip, puerto) {
        this.sockets.push({
            ip: ip,
            puerto: puerto
        })
    };
    this.agregarSocket(ip, puerto);
}

//LEE JSON Y GUARDO EN VARIABLES. 
function leerDatos() {
    const datosJSON = fs.readFileSync('./cfg/JSONPRUEBA.json');
    const data = JSON.parse(datosJSON);
    ipSig = data.IPSiguienteNodo;
    puertoSig = data.PORTSiguienteNodo;
    ipAnt = data.IPAnteriorNodo;
    puertoAnt = data.PORTAnteriorNodo;
    cantNodos = data.CantNodos;
    idNodo = data.IdNodo * 256 / cantNodos - 1; //limite mayor
    idNodoAnt = idNodo - 256 / cantNodos; //limite menor
};

//SERVIDOR

//Printea mensaje recibido y muestra de donde viene.
socket.on('message', function(msg, info) {
    let objetoJSON = JSON.parse(msg.toString());
    let tokens = objetoJSON.route.split('/');

    if (objetoJSON.originIP !== undefined && objetoJSON.originIP == '0.0.0.0')
        objetoJSON.originIP = info.address;
    switch (tokens[1]) {
        case 'file':
            let hash = tokens[2].substring(0, 2);
            let id = parseInt(hash, 16);
            if (id <= idNodo && id > idNodoAnt) {
                //caso de que le corresponde hacer algo con lo que viene
                if (tokens.length > 3) {
                    //FOUND O STORE
                    let funcion = tokens[3];
                    switch (funcion) {
                        case 'store':
                            dhtPropia.agregar(objetoJSON.body.id, objetoJSON.body.filename, objetoJSON.body.filesize, objetoJSON.body.nodeIP, objetoJSON.body.nodePort);
                            console.log("GUARDÉ UN ARCHIVO A");
                            console.log("Hash: " + objetoJSON.body.id);
                            //GUARDA CON ESTO, CHEQUEAR INTERFAZ
                            /*socket.send('STORE OK', objetoJSON.originPort, objetoJSON.originIP, (err) => {
                                if (err)
                                    socket.close('Error en tracker ' + idNodo + ' - enviando confirmación de Store.');
                            });
                            */
                            break;
                            //Dejamos CASE por si hay que agregar alguna función nueva para tracker.
                        default:
                            console.log('Función en tracker no encontrada');
                            break;
                    }
                } else
                //SEARCH
                {
                    //GUARDA
                    //QUÉ HACER SI NO SE ENCONTRÓ?
                    //DE DÓNDE SACAR LA IP DEL TRACKER?
                    let objetoJSONFound = {
                        messageId: objetoJSON.messageId,
                        route: '/file/' + tokens[2] + '/found',
                        body: {
                            id: tokens[2],
                            trackerIP: '',
                            trackerPort: socket.address().port
                        }
                    }
                    if (dhtPropia.buscar(tokens[2]) == 1) {
                        console.log("Encontro archivo hash: " + tokens[2]);
                        console.log("ip: " + objetoJSON.originIP + " port: " + objetoJSON.originPort);
                        socket.send(JSON.stringify(objetoJSONFound), objetoJSON.originPort, objetoJSON.originIP, (err) => {
                            if (err)
                                socket.close('Error en tracker ' + idNodo + ' - enviando confirmación de Search.');
                        });
                    }
                }
                //LOGICA DE ALMACENAR ARCHIVO
            }
            //ENVIAR A SIGUIENTE TRACKER
            else {
                socket.send(JSON.stringify(objetoJSON), puertoSig, ipSig, (err) => {
                    if (err)
                        socket.close('Error en tracker ' + idNodo + ' - enviando al siguiente.');
                });
                console.log("pasé el mensaje");
            }
            break;
        case 'scan':
            if (msgID.findIndex(e => e == objetoJSON.messageId) == -1) {
                let objetoJSONRespuesta = {
                    "messageId": objetoJSON.messageId,
                    "route": objetoJSON.route,
                    "originIP": objetoJSON.originIP,
                    "originPort": objetoJSON.originPort,
                    "body": { files: [] }
                }
                if (objetoJSON.body === undefined) {
                    msgID.push(objetoJSON.messageId);
                    objetoJSON.originIP = info.address;
                } else
                    objetoJSONRespuesta.body.files = objetoJSON.body.files;
				dhtPropia.archivos().forEach((e,i,array)=>{objetoJSONRespuesta.body.files.push(e)});
				socket.send(JSON.stringify(objetoJSONRespuesta), objetoJSON.originPort, objetoJSON.originIP, (err) => {
                    if (err)
                        socket.close('Error en tracker ' + idNodo + ' - scan hacia siguiente.');
                });
            } else {
                msgID.splice(msgID.findIndex(e => e == objetoJSON.messageId), 1);
                socket.send(msg, objetoJSON.originPort, objetoJSON.originIP, (err) => {
                    if (err)
                        socket.close('Error en tracker ' + idNodo + ' - scan hacia servidor.');
                });
            }
            break;
        case 'count':
            if (msgID.findIndex(e => e == objetoJSON.messageId) == -1) {
                if (objetoJSON.body.trackerCount == 0) {
                    msgID.push(objetoJSON.messageId);
                    objetoJSON.originIP = info.address;
                }
                objetoJSON.body.trackerCount++;
                objetoJSON.body.fileCount += dhtPropia.cantArchivos();
                socket.send(JSON.stringify(objetoJSON), puertoSig, ipSig, (err) => {
                    if (err)
                        socket.close('Error en tracker ' + idNodo + ' - count.');
                });
            } else {
                msgID.splice(msgID.findIndex(e => e == objetoJSON.messageId), 1);
                socket.send(msg, objetoJSON.originPort, objetoJSON.originIP, (err) => {
                    if (err)
                        socket.close('Error en tracker ' + idNodo + ' - count hacia servidor.');
                });
            }
            break;
        default:
            console.log('ERROR CASE TOKEN 0 SERVIDOR DE TRACKER');
            console.log('Objeto JSON recibido: ' + objetoJSON);
            break;
    }
});

leerDatos();

socket.bind({
    port: 27015,
    exclusive: true
});

/*
// ESTAS COSAS PUEDEN LLEGAR A SERVIR

//Printea IP y puerto que el server está escuchando (Se puede hacer con un callback en bind, cumplen la misma función)
socket.on('listening', () => {
    const address = socket.address;
    console.log('Servidor: Escuchando en IP:' + address.address + ', PORT:' + address.port+ '\n');
});

//Printea x error con su causa y cierra socket (CAMBIAR PARA RECUPERAR SOCKET EN CASO DE CAIDA) 
socket.on('error', function (err) {
    console.log('Servidor: Error:' + err.stack);
    socket.close();
});

//El servidor escucha en PORT e IP address
socket.bind({
    port: 27015,
    exclusive: true
});


  /* ESTO ES PARA IDENTIFICAR DE DONDE VINO
     const address = socket.address;
    console.log('Servidor: Escuchando en :' + address.address + ', PORT:' + address.port+ '\n');
    console.log('Servidor: Información de donde viene el mensaje. IP:' + info.address + ', PORT:' + info.port + '\n');
    socket.send();
    */


//CLIENTE 
// creo un server socket

/*
//Printea mensaje que recibe de servidor.
socket.on('message', function (msg, info) {
    console.log('Cliente: Mensaje recibido del servidor: ' + msg.toString());
    console.log('Cliente: Información de donde viene el mensaje. IP:' + info.address + ', PORT:' + info.port + '\n');
});

const mensaje = Buffer.from('Prueba de envio mensaje UDP');
//Envia mensajes tanto a sockets conectados con socket.connect como a los especificados en los parametros. 
//Parametros: 1.Mensaje seteado en buffer.from - 2.Puerto donde envio mensaje - 3.IP donde envio mensaje - 4.Callback por error. 
socket.send(mensaje, 27015, '190.245.254.237', (err) => {
    socket.close();
  });

*/