// SERVIDOR MANDA ESTO AL PRIMER TRACKER PARA HACER UN STORE DE UN ARCHIVO NUEVO.

route
/*
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

*/

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

    SOLICITUD DESCARGA: