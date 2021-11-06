function doupload() {
    let xmlHttp = new XMLHttpRequest();
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