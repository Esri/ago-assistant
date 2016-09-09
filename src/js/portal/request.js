function get(url, parameters, options) {

    options = typeof options !== "undefined" ? options : {withCredentials: false};
    return new Promise(function(resolve, reject) {

        var xhr = new XMLHttpRequest();
        xhr.withCredentials = options.withCredentials;

        xhr.addEventListener("readystatechange", function() {
            if (xhr.status == 200) {
                // Resolve the promise with the response text
                resolve(JSON.parse(xhr.responseText));
            }
        });

        xhr.addEventListener("error", function() {
            reject(Error(xhr));
        });

        xhr.open("GET", url + "?" + serialize(parameters));
        xhr.send();
    });

}

function post(url, data, options) {

    options = typeof options !== "undefined" ? options : {withCredentials: false};

    return new Promise(function(resolve, reject) {

        var xhr = new XMLHttpRequest();
        xhr.withCredentials = options.withCredentials;

        xhr.addEventListener("readystatechange", function() {
            if (xhr.status == 200) {
                // Resolve the promise with the response text
                resolve(JSON.parse(xhr.responseText));
            }
        });

        xhr.addEventListener("error", function() {
            reject(Error(xhr));
        });

        xhr.open("POST", url);
        xhr.setRequestHeader("content-type", "application/x-www-form-urlencoded");
        xhr.send(serialize(data));
    });

}

function serialize(obj, prefix) {
    var str = [];
    for (var p in obj) {
        if (obj.hasOwnProperty(p)) {
            var k = prefix ? prefix + "[" + p + "]" : p;
            var v = obj[p];
            str.push(typeof v == "object" ?
                serialize(v, k) :
                encodeURIComponent(k) + "=" + encodeURIComponent(v));
        }
    }
    return str.join("&");
}

export var Request = {
    get: get,
    post: post
};

export default Request;
