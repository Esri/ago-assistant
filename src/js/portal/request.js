var request = {
    get: function(url, parameters) {

        return new Promise(function(resolve, reject) {

            var xhr = new XMLHttpRequest();
            xhr.withCredentials = portal.withCredentials;

            xhr.addEventListener("readystatechange", function() {
                console.log("ok");
                if (xhr.status == 200) {
                    // Resolve the promise with the response text
                    resolve(JSON.parse(xhr.responseText));
                }
            });

            xhr.addEventListener("error", function() {
                console.log("error");
                reject(Error(xhr));
            });

            xhr.open("GET", url + "?" + serialize(parameters));
            // xhr.setRequestHeader("content-type", "application/x-www-form-urlencoded");

            // xhr.onload = function() {
            //     // This is called even on 404 etc
            //     // so check the status
            //     if (xhr.status == 200) {
            //         // Resolve the promise with the response text
            //         resolve(JSON.parse(xhr.responseText));
            //     } else {
            //         // Otherwise reject with the status text
            //         // which will hopefully be a meaningful error
            //         reject(Error(xhr));
            //     }
            // };

            xhr.send();
        });

    },
    post: function(url, data) {

        return new Promise(function(resolve, reject) {

            var xhr = new XMLHttpRequest();
            xhr.withCredentials = portal.withCredentials;

            xhr.addEventListener("readystatechange", function() {
                console.log("ok");
                if (xhr.status == 200) {
                    // Resolve the promise with the response text
                    resolve(JSON.parse(xhr.responseText));
                }
            });

            xhr.addEventListener("error", function() {
                console.log("error");
                reject(Error(xhr));
            });

            xhr.open("POST", url);
            xhr.setRequestHeader("content-type", "application/x-www-form-urlencoded");

            // xhr.onload = function() {
            //     // This is called even on 404 etc
            //     // so check the status
            //     if (xhr.status == 200) {
            //         // Resolve the promise with the response text
            //         resolve(JSON.parse(xhr.responseText));
            //     } else {
            //         // Otherwise reject with the status text
            //         // which will hopefully be a meaningful error
            //         reject(Error(xhr));
            //     }
            // };

            xhr.send(serialize(data));
        });

    },
    serialize: function(obj, prefix) {
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
};

export { request as default };
