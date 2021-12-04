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

/*const objetoCount = {
    messageId: 'idCount',
    route: '/count',
    originIP: '0.0.0.0',
    originPort: puertoSV,
    body: {
        trackerCount: 0,
        fileCount: 0
    }
}

const objetoSearch = {
    messageId: 'idSearch',
    route: '/file/' + hash,
    originIP: '0.0.0.0',
    originPort: puertoSV
}
*/