function get(url, parameters, options) {

    options = typeof options !== "undefined" ? options : {withCredentials: false};
    return new Promise(function(resolve, reject) {

        let xhr = new XMLHttpRequest();
        xhr.responseType = "json";
        xhr.withCredentials = options.withCredentials;

        xhr.addEventListener("readystatechange", function() {
            if (xhr.readyState === 4 && xhr.status == 200) {
                // Resolve the promise with the response.
                resolve(xhr.response);
            }
        });

        xhr.addEventListener("error", function() {
            reject(Error(xhr));
        });

        xhr.open("GET", `${url}?${serialize(parameters)}`);
        xhr.send();
    });

}

function post(url, data, options) {

    options = typeof options !== "undefined" ? options : {withCredentials: false};

    return new Promise(function(resolve, reject) {

        let xhr = new XMLHttpRequest();
        xhr.responseType = "json";
        xhr.withCredentials = options.withCredentials;

        xhr.addEventListener("readystatechange", function() {
            if (xhr.readyState === 4 && xhr.status == 200) {
                // Resolve the promise with the response.
                resolve(xhr.response);
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
    let str = [];
    for (let p in obj) {
        if (obj.hasOwnProperty(p)) {
            let k = prefix ? prefix + "[" + p + "]" : p;
            let v = obj[p];
            str.push(typeof v == "object" ?
                serialize(v, k) :
                encodeURIComponent(k) + "=" + encodeURIComponent(v));
        }
    }
    return str.join("&");
}

export let Request = {
    get: get,
    post: post
};

export default Request;
