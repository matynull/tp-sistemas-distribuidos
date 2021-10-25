let ipSig, puertoSig, ipAnt, puertoAnt,cantNodos,idNodo;
let ipOrigen, portOrigen, banderaCount;
let dhtPropia, dhtAnterior = [], dhtSiguiente = [];

//SHA1
const crypto = require('crypto');
let encriptado = crypto.createHash('sha1');

//UDP y FS para leer archivo
const udp = require('dgram');
const fs = require('fs');

const socket = udp.createSocket('udp4');

const dht = function() {
	this.elementos = [];
	this.agregar = function(hash,nombre,size,ip,puerto) {
		let id = parseInt(hash.substring(0,2),16);
		let indice = this.elementos.find(e => e.id == id);
		if (indice === undefined)
		{
			indice = this.elementos.length;
			this.elementos.push(new elementoHash(hash));
			this.elementos[indice].agregarArchivo(hash,nombre,size,ip,puerto);
			this.elementos.sort(function(a,b){
                if (a.hash.substring(0,2) < b.hash.substring(0,2))
                    return -1;
                else 
                    return 1;
            });
		}
		else
			this.elementos[indice].agregarArchivo(hash,nombre,size,ip,puerto);
	};
	this.cantArchivos = function() {
		let cont = 0;
		for (e in this.elementos)
			cont += e.archivos.length;
		return cont;
	}
}

dhtPropia = new dht();

//listaNodosPares van a ser muchos
const elementoHash = function(hash) {
    this.id = parseInt(hash.substring(0,2),16);
	this.archivos = [];
    this.agregarArchivo = function(hash,nombre,size,ip,puerto){
		this.archivos.push(new archivo(hash,nombre,size,ip,puerto));
	}
};

const archivo = function(hash,nombre,size,ip,puerto) {
	this.nombre = nombre;
	this.size = size;
	this.sockets = [];
	this.agregarSocket = function(ip,puerto){
        this.sockets.push({
            ip: ip,
            puerto:puerto
        })
    };
	this.agregarSocket(ip,puerto);
}

/*
//CREAR JSON 
const data = {
    name: "John Doe",
    age: 32,
    title: "Vice President of JavaScript"
  }
  const jsonStr = JSON.stringify(data);
*/

//LEE JSON Y GUARDO EN VARIABLES. 
function leerDatos(){
    const datosJSON = fs.readFileSync('./cfg/JSONPRUEBA.json');
    const data = JSON.parse(datosJSON);
    ipSig = data.IPSiguienteNodo;
    puertoSig = data.PORTSiguienteNodo;
    ipAnt = data.IPAnteriorNodo;
    puertoAnt = data.PORTAnteriorNodo;
    cantNodos = data.CantNodos;
    idNodo = data.IdNodo * 256/cantNodos - 1; //limite mayor
};

//SERVIDOR

//Printea mensaje recibido y muestra de donde viene.
socket.on('message', function (msg, info) {
    let objetoJSON = JSON.parse(msg.toString());
    let tokens = objetoJSON.route.split('/');
    
    switch (tokens[1]){
        case 'file':
            //  hash: '0b5d2a750e5ca2ef76906f09f8fd7de17817db83',
            let hash = tokens[2].substring(0,2);
            if (parseInt(hash,16)<=idNodo){
                //caso de que le corresponde hacer algo con lo que viene
                if (tokens.length()>2){
                    //FOUND O STORE
                    let funcion = tokens[3];
                    switch(funcion){
                        case 'found':
                            break;
                        case 'store':
							dht.agregar(objetoJSON.id,objetoJSON.filename,objetoJSON.filesize,objetoJSON.nodeIP,objetoJSON.nodePort);
                            console.log("GUARDÉ UN ARCHIVO A");
                            console.log("Hash: " + objetoJSON.id);
                            break;
                        //Dejamos CASE por si hay que agregar alguna función nueva para tracker.
                        default:
                            console.log('Función en tracker no encontrada');
                            break;
                    }
                }
                else
                {
                    //LOGICA DE SEARCH
                }
                //LOGICA DE ALMACENAR ARCHIVO
            }
            //ENVIAR A SIGUIENTE TRACKER
            else{
                socket.send(msg, puertoSig, ipSig, (err) => {
                    if (err)
                        socket.close('Error en tracker ' + idNodo + ' - enviando al siguiente.');
                });
                console.log("pasé el mensaje");
            }
            break;
        case 'scan': break;
        case 'count':
			if (!banderaCount)
			{
				if (objetoJSON.body.trackerCount == 0)
				{
					banderaCount = true;
					ipOrigen = info.address;
					portOrigen = info.port;
				}
				objetoJSON.body.trackerCount++;
				objetoJSON.body.fileCount += dhtPropia.cantArchivos();
				socket.send(JSON.stringify(objetoJSON), puertoSig, ipSig, (err) => {
                    if (err)
                        socket.close('Error en tracker ' + idNodo + ' - count.');
                });
			}
			else
			{
				//ERROR MITIGATION
				if (objetoJSON.body.trackerCount != 0)
				{
					banderaCount = false;
					socket.send(msg, portOrigen, ipOrigen, (err) => {
						if (err)
                            socket.close('Error en tracker ' + idNodo + ' - count hacia servidor.');
					});
				}
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
