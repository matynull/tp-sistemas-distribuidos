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
          console.log(xhr.response);
        }
      }
    //send the form data
    xhr.send();
}