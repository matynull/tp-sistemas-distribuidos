const express = require('express');

const server = express();

server.use(express.json());

server.post('/file', (req, res) => {
    console.log(req.body);
});

server.get('/file', (req, res) => {
    // buscar la lista completa de archivas y devolverla
    res.send('Lista de archivos escaneados');
});

server.get('/file/:hash', (req, res) => {
    //busca el archivo en los trackers y devuelve el .torrent con la lista de pares que tienen el archivo
    res.send('Devuelve .torrente')
})


server.listen(4200, () => {
    console.log('Escuchando 4200');
})



/* SERVIDOR MANDA ESTO AL PRIMER TRACKER PARA HACER UN STORE DE UN ARCHIVO NUEVO.

route

{
    route: /file/{hash}/store
    body: {
        id: str,
        filename: str,
        filesize: int,
        nodeIP: str,
        nodePort: int
    }
}
CASE:

    ALTA: A TRACKER
    POST /file/
    body: {
        id: str,
        filename: str,
        filesize: int,
        nodeIP: str,
        nodePort: int
    }

    LISTAR:
    SOLICITUD DESCARGA: */