//ESTO ES LO QUE MANDA CLIENTE AL SERVIDOR

function recibeFormulario(datosJSON){
    const data = JSON.parse(datosJSON);
    return {
        hash: encriptado.update(data.filename + data.filesize.toString()).digest('hex'),
        nodeParIP:data.nodeIP,
        nodeParPort:data.nodePort
    }
}
const datosJSON = fs.readFileSync('./cfg/ArchivoPrueba.json');