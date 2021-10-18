let ipSig, puertoSig, ipAnt, puertoAnt;
const dhtPropia = [], dhtAnterior = [], dhtSiguiente = [];

//SHA1
const crypto = require('crypto');
let encriptado = crypto.createHash('sha1');


const udp = require('dgram');
const fs = require('fs');

const elementoHash = {
    hash: 0,
    direccion: ''
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
    const hash = encriptado.update(ipSig).digest('hex');
    console.log(hash);

}

/*
POST /file/
body: {
    id: str,
    filename: str,
    filesize: int,
    nodeIP: str,
    nodePort: int
}
*/

function recibeFormulario(datosJSON){
    const data = JSON.parse(datosJSON);
    return {
        hash: encriptado.update(data.filename + data.filesize.toString()).digest('hex'),
        nodeParIP:data.nodeIP,
        nodeParPort:data.nodePort
    }
}
const datosJSON = fs.readFileSync('./cfg/ArchivoPrueba.json');
const archivo = recibeFormulario(datosJSON);
console.log(archivo);


/*
leerDatos();
//SERVIDOR

// creo un server socket
var server = udp.createSocket('udp4');

//Printea mensaje recibido y muestra de donde viene.
server.on('message', function (msg, info) {
    const address = server.address;
    console.log('Servidor: Escuchando en :' + address.address + ', PORT:' + address.port+ '\n');
    console.log('Servidor: Mensaje recibido de cliente: ' + msg.toString());
    console.log('Servidor: Información de donde viene el mensaje. IP:' + info.address + ', PORT:' + info.port + '\n');
    server.send
});

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




//CLIENTE 
// creo un server socket
const client = udp.createSocket('udp4');

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
