const fs = require('fs');
const net = require('net');

const puertoPares = 27019;
let serverPares = net.createServer(conexionEntrantePar);

function conexionEntrantePar(socket) {
    console.log("Conexion establecida con " + socket.remoteAddress);

    let datos = "";
    socket.on('data', (data) => {
        datos += data;
    });
    //if (peticion.hash == 1) {
    //socket.pipe(process.stdout);
    let stream = fs.createReadStream('video.mp4');
    stream.on("readable", () => {
        let chunk;
        while (chunk = stream.read())
            socket.write(chunk);
    });
    stream.on("end",() => {
        socket.end();
    });
    //}
    socket.on('end', (data) => {
        //let peticion = JSON.parse(datos);

    });
    socket.on('close', () => {
        console.log("Conexión terminada con " + socket.remoteAddress);
    });
}

serverPares.listen(puertoPares, () => {
    console.log("Escuchando conexiones entrantes en el puerto " + puertoPares + ".");
});