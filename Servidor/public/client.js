function doupload() {
    let form = document.getElementById("file");
    let file = document.getElementById("file").files[0];
    let package = JSON.stringify({
        "filename": file.name,
        "filesize": file.size,
        "nodeIP": '',
        "nodePort": 27018
    })
    var xhr = new XMLHttpRequest();
    //open the request
    xhr.open('POST', 'http://190.245.254.237:27016/file')
    xhr.setRequestHeader("Content-Type", "application/json");
	event.preventDefault();
    //send the form data
    xhr.send(package);
}

function scan(){
    var xhr = new XMLHttpRequest();
    //open the request
    xhr.open('GET', 'http://190.245.254.237:27016/file')
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
			let listaArchivos = document.getElementById("archivos");
			listaArchivos.innerHTML = ''; //elimina la lista previa
			let archivos = JSON.parse(xhr.response).sort((a,b)=>{ //ordena los archivos alfabéticamente y luego por tamaño
				if (a.filename.toUpperCase() < b.filename.toUpperCase())
					return -1;
				else
					if (a.filename.toUpperCase() == b.filename.toUpperCase() && a.filesize <= b.filesize)
						return -1;
					else
						return 1;
			});
			archivos.forEach((e,i,array)=>{ //agrega los archivos a la lista en el html
				let elemento = document.createElement("li");
				elemento.setAttribute('id',e.filename);
				elemento.appendChild(document.createTextNode(e.filename + " - " + e.filesize + " bytes"));
				listaArchivos.appendChild(elemento);
			});
        }
      }
    //send the form data
    xhr.send();
}