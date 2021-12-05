function doupload() {
    let form = document.getElementById("file");
    let file = document.getElementById("file").files[0];
    let package = JSON.stringify({
        "filename": file.name,
        "filesize": file.size,
        "nodeIP": '0.0.0.0',
        "nodePort": 27018
    })
    
    var xhr = new XMLHttpRequest();
    xhr.open('POST', 'http://190.245.254.237:27016/file')
    xhr.setRequestHeader("Content-Type", "application/json");
    event.preventDefault();
    xhr.send(package);
}

function scan() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'http://190.245.254.237:27016/file')
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                let listaArchivos = document.getElementById("archivos");
                listaArchivos.innerHTML = ''; //Elimina la lista previa
                let archivos = JSON.parse(xhr.response).sort((a, b) => { //Ordena los archivos alfabéticamente y luego por tamaño
                    if (a.filename.toUpperCase() < b.filename.toUpperCase())
                        return -1;
                    else
                    if (a.filename.toUpperCase() == b.filename.toUpperCase() && a.filesize <= b.filesize)
                        return -1;
                    else
                        return 1;
                });
                archivos.forEach((e, i, array) => { //Agrega los archivos a la lista en el html
                    let elemento = document.createElement("li");
                    elemento.setAttribute('id', e.filename);
                    let aux = e.filesize;
                    if (aux >= 1024) {
                        aux = aux / 1024
                        if (aux >= 1024) {
                            aux = aux / 1024
                            if (aux > 1024) {
                                aux = aux / 1024
                                elemento.appendChild(document.createTextNode(e.filename + " - " + Math.trunc(aux) + " GB"));
                            } else
                                elemento.appendChild(document.createTextNode(e.filename + " - " + Math.trunc(aux) + " MB"));
                        } else
                            elemento.appendChild(document.createTextNode(e.filename + " - " + Math.trunc(aux) + " kB"));
                    } else
                        elemento.appendChild(document.createTextNode(e.filename + " - " + aux + " bytes"));

                    let boton = document.createElement("button");
                    boton.innerHTML = "Descargar";
                    boton.name = "descargar";
                    boton.onclick = () => {
                        let xhr = new XMLHttpRequest();
                        console.log("pinga2");
                        xhr.open('GET', 'http://190.245.254.237:27016/file/' + e.id);
                        xhr.setRequestHeader("Content-Type", "application/json");
                        xhr.onreadystatechange = function() {
                            if (xhr.readyState === 4) {
                                console.log(xhr.response);
                                let dataStr = 'data:text/plain.;charset=utf-8,' + encodeURIComponent(xhr.response);
                                let a = document.createElement('a');
                                a.href = dataStr;
                                a.download = e.filename + ".torrente";
                                a.click();
                            }
                        }
                        xhr.send();
                    }
                    elemento.appendChild(boton)
                    listaArchivos.appendChild(elemento);
                });
            }
        }
    xhr.send();
}