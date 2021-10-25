let ipSig, puertoSig, ipAnt, puertoAnt,cantNodos,idNodo;
const dhtPropia = [], dhtAnterior = [], dhtSiguiente = [];

//SHA1
const crypto = require('crypto');
let encriptado = crypto.createHash('sha1');

//UDP y FS para leer archivo
const udp = require('dgram');
const fs = require('fs');

const server = udp.createSocket('udp4');
const client = udp.createSocket('udp4');


//listaNodosPares van a ser muchos
const elementoHash = function(hash,ip,puerto) {
    this.hash = hash;
    this.listaSockets = [];
    this.agregarSocket = function(ip,puerto){
        this.listaSockets.push({
            ip: ip,
            puerto:puerto
        })
    };
    this.agregarSocket(ip,puerto);
};

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
}

leerDatosIniciales();
//SERVIDOR

//Printea mensaje recibido y muestra de donde viene.
server.on('message', function (msg, info) {
    let objetoJSON = JSON.parse(msg);
    let tokens = objetoJSON.route.split('/');
    
    switch (tokens[0]){
        case 'file':{
            //  hash: '0b5d2a750e5ca2ef76906f09f8fd7de17817db83',
            let hash = tokens[1].substring(0,2);
            if (parseInt(hash,16)<=idNodo){

                //caso de que le corresponde hacer algo con lo que viene
                if (tokens.length()>2){
                    //FOUND O STORE
                    let funcion = tokens[2];
                    switch(funcion){
                        case 'found':{

                        }
                        case 'store':{
                            archivoNuevo = new elementoHash(objetoJSON.id,objetoJSON.nodeIP,objetoJSON.nodePort);
                            
                            //OPTIMIZAR ESTO
                            dhtPropia.push(archivoNuevo);
                            dhtPropia = dhtPropia.sort(function(a,b){
                                if (a.hash.substring(0,2) < b.hash.substring(0,2))
                                    return -1;
                                else 
                                    return 1;
                            });



                        }
                        //Dejamos CASE por si hay que agregar alguna función nueva para tracker.
                        default:{
                            console.log('Función en tracker no encontrada');
                        }
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
                client.send(msg, puertoSig, ipSig, (err) => {
                    client.close('Error en tracker ' + idNodo);
                  });
            }
        }
        case 'scan':{

        }
        case 'count':{
            
        }
        default:
            console.log('ERROR CASE TOKEN 0 SERVIDOR DE TRACKER');
    }
});

















/*
// ESTAS COSAS PUEDEN LLEGAR A SERVIR

//Printea IP y puerto que el server está escuchando (Se puede hacer con un callback en bind, cumplen la misma función)
server.on('listening', () => {
    const address = server.address;
    console.log('Servidor: Escuchando en IP:' + address.address + ', PORT:' + address.port+ '\n');
});

//Printea x error con su causa y cierra socket (CAMBIAR PARA RECUPERAR SOCKET EN CASO DE CAIDA) 
server.on('error', function (err) {
    console.log('Servidor: Error:' + err.stack);
    server.close();
});

//El servidor escucha en PORT e IP address
server.bind({
    port: 27015,
    exclusive: true
});


  /* ESTO ES PARA IDENTIFICAR DE DONDE VINO
     const address = server.address;
    console.log('Servidor: Escuchando en :' + address.address + ', PORT:' + address.port+ '\n');
    console.log('Servidor: Información de donde viene el mensaje. IP:' + info.address + ', PORT:' + info.port + '\n');
    server.send();
    */


//CLIENTE 
// creo un server socket


//Printea mensaje que recibe de servidor.
client.on('message', function (msg, info) {
    console.log('Cliente: Mensaje recibido del servidor: ' + msg.toString());
    console.log('Cliente: Información de donde viene el mensaje. IP:' + info.address + ', PORT:' + info.port + '\n');
});

const mensaje = Buffer.from('Prueba de envio mensaje UDP');
//Envia mensajes tanto a sockets conectados con client.connect como a los especificados en los parametros. 
//Parametros: 1.Mensaje seteado en buffer.from - 2.Puerto donde envio mensaje - 3.IP donde envio mensaje - 4.Callback por error. 
client.send(mensaje, 27015, '190.245.254.237', (err) => {
    client.close();
  });

*/
