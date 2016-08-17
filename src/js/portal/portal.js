// define(["jquery", "portal/util"], function(jquery, util) {
import request from "./request";
var Portal = function(config) {
    config = typeof config !== "undefined" ? config : {};
    this.portalUrl = config.portalUrl;
    this.username = config.username;
    this.token = config.token;
    this.withCredentials = false;
    this.jsonp = false;
    this.items = [];
    this.services = [];
    this.version = function() {
        var portal = this;
        var url = portal.portalUrl + "sharing/rest";
        var parameters = {
            f: "json"
        };
        return request.get(url, parameters);
    },
    this.generateToken = function(username, password) {
        var portal = this;
        var url = portal.portalUrl + "sharing/rest/generateToken";
        var data = {
            client: "referer",
            referer: window.location.hostname,
            expiration: 60,
            username: username,
            password: password,
            f: "json"
        };
        return request.post(url, data);
    }
};
export { Portal as default};
// var serialize = function(obj, prefix) {
//     var str = [];
//     for (var p in obj) {
//         if (obj.hasOwnProperty(p)) {
//             var k = prefix ? prefix + "[" + p + "]" : p;
//             var v = obj[p];
//             str.push(typeof v == "object" ?
//                 serialize(v, k) :
//                 encodeURIComponent(k) + "=" + encodeURIComponent(v));
//         }
//     }
//     return str.join("&");
// };
//
// return {
//     Portal: function(config) {
//         config = typeof config !== "undefined" ? config : {};
//         this.portalUrl = config.portalUrl;
//         this.username = config.username;
//         this.token = config.token;
//         this.withCredentials = false;
//         this.jsonp = false;
//         this.items = [];
//         this.services = [];
//         /**
//          * Return the version of the portal.
//          */
//         this.version = function() {
//             if (this.jsonp) {
//                 return jquery.ajax({
//                     type: "GET",
//                     url: this.portalUrl + "sharing/rest?f=json",
//                     async: false,
//                     jsonpCallback: "callback",
//                     crossdomain: true,
//                     contentType: "application/json",
//                     dataType: "jsonp"
//                 });
//             } else {
//                 return jquery.ajax({
//                     type: "GET",
//                     url: this.portalUrl + "sharing/rest?f=json",
//                     dataType: "json",
//                     xhrFields: {
//                         withCredentials: this.withCredentials
//                     }
//                 });
//             }
//         };
//         /**
//          * Return the view of the portal as seen by the current user,
//          * anonymous or logged in.
//          */
//         this.self = function() {
//             return jquery.ajax({
//                 type: "GET",
//                 url: this.portalUrl + "sharing/rest/portals/self?" + jquery.param({
//                     token: this.token,
//                     f: "json"
//                 }),
//                 dataType: "json",
//                 xhrFields: {
//                     withCredentials: this.withCredentials
//                 }
//             });
//         };
//         /**
//          * Generates an access token in exchange for user credentials that
//          * can be used by clients when working with the ArcGIS Portal API.
//          */
//         // this.generateToken = function(username, password) {
//         //     return jquery.ajax({
//         //         type: "POST",
//         //         url: this.portalUrl + "sharing/rest/generateToken?",
//         //         data: {
//         //             username: username,
//         //             password: password,
//         //             referer: jquery(location).attr("href"), // URL of the sending app.
//         //             expiration: 60, // Lifetime of the token in minutes.
//         //             f: "json"
//         //         },
//         //         dataType: "json",
//         //         xhrFields: {
//         //             withCredentials: this.withCredentials
//         //         }
//         //     });
//         // };
//         this.generateToken = function(username, password) {
//             var portal = this;
//             var url = portal.portalUrl + "sharing/rest/generateToken";
//             var method = "POST";
//             var data = {
//                 client: "referer",
//                 referer: window.location.hostname,
//                 expiration: 60,
//                 username: username,
//                 password: password,
//                 f: "json"
//             };
//
//             return new Promise(function(resolve, reject) {
//
//                 var xhr = new XMLHttpRequest();
//                 xhr.withCredentials = portal.withCredentials;
//
//                 xhr.addEventListener("readystatechange", function() {
//                     console.log("ok");
//                 });
//
//                 xhr.addEventListener("error", function() {
//                     console.log("error");
//                     reject(Error(xhr));
//                 });
//
//                 // xhr.addEventListener("readystatechange", function() {
//                 //     if (this.readyState === 4) {
//                 //         console.log(this.responseText);
//                 //     }
//                 // });
//
//                 xhr.open(method, url);
//                 xhr.setRequestHeader("content-type", "application/x-www-form-urlencoded");
//
//                 xhr.onload = function() {
//                     // This is called even on 404 etc
//                     // so check the status
//                     if (xhr.status == 200) {
//                         // Resolve the promise with the response text
//                         resolve(JSON.parse(xhr.responseText));
//                     } else {
//                         // Otherwise reject with the status text
//                         // which will hopefully be a meaningful error
//                         reject(Error(xhr));
//                     }
//                 };
//
//                 xhr.send(serialize(data));
//             });
//
//         };
//         /**
//          * Searches for content items in the portal.
//          * The results of a search only contain items that the user
//          * (token) has permission to access.
//          * Excluding a token will yield only public items.
//          */
//         this.search = function(query, numResults, sortField, sortOrder) {
//             return jquery.ajax({
//                 type: "GET",
//                 url: this.portalUrl + "sharing/rest/search?",
//                 data: {
//                     q: query,
//                     num: numResults,
//                     sortField: sortField,
//                     sortOrder: sortOrder,
//                     token: this.token,
//                     f: "json"
//                 },
//                 dataType: "json",
//                 xhrFields: {
//                     withCredentials: this.withCredentials
//                 }
//             });
//         };
//
//         this.userProfile = function(username) {
//             return jquery.ajax({
//                 type: "GET",
//                 url: this.portalUrl + "sharing/rest/community/users/" + username + "?",
//                 data: {
//                     token: this.token,
//                     f: "json"
//                 },
//                 dataType: "json",
//                 xhrFields: {
//                     withCredentials: this.withCredentials
//                 }
//             });
//         };
//
//         this.userContent = function(username, folder) {
//             return jquery.ajax({
//                 type: "GET",
//                 url: this.portalUrl + "sharing/rest/content/users/" + username + "/" + folder + "?",
//                 data: {
//                     token: this.token,
//                     f: "json"
//                 },
//                 dataType: "json",
//                 xhrFields: {
//                     withCredentials: this.withCredentials
//                 }
//             });
//         };
//
//         this.itemDescription = function(id) {
//             return jquery.ajax({
//                 type: "GET",
//                 url: this.portalUrl + "sharing/rest/content/items/" + id + "?",
//                 data: {
//                     token: this.token,
//                     f: "json"
//                 },
//                 dataType: "json",
//                 xhrFields: {
//                     withCredentials: this.withCredentials
//                 }
//             });
//         };
//
//         this.itemData = function(id) {
//             return jquery.ajax({
//                 type: "GET",
//                 url: this.portalUrl + "sharing/rest/content/items/" + id + "/data?",
//                 data: {
//                     token: this.token,
//                     f: "json"
//                 },
//                 dataType: "json",
//                 xhrFields: {
//                     withCredentials: this.withCredentials
//                 }
//             });
//         };
//
//         /**
//          * Create a new item on the specified portal.
//          */
//         this.addItem = function(username, folder, description, data, thumbnailUrl) {
//             // Clean up description items for posting.
//             // This is necessary because some of the item descriptions (e.g. tags and extent)
//             // are returned as arrays, but the post operation expects comma separated strings.
//             jquery.each(description, function(item, value) {
//                 if (value === null) {
//                     description[item] = "";
//                 } else if (value instanceof Array) {
//                     description[item] = util.arrayToString(value);
//                 }
//             });
//
//             // Create a new item in a user's content.
//             var params = {
//                 item: description.title,
//                 text: JSON.stringify(data), // Stringify the Javascript object so it can be properly sent.
//                 overwrite: false, // Prevent users from accidentally overwriting items with the same name.
//                 thumbnailurl: thumbnailUrl,
//                 f: "json",
//                 token: this.token
//             };
//             return jquery.ajax({
//                 type: "POST",
//                 url: this.portalUrl + "sharing/rest/content/users/" + username + "/" + folder + "/addItem?",
//                 data: jquery.extend(description, params), // Merge the description and params JSON objects.
//                 dataType: "json",
//                 xhrFields: {
//                     withCredentials: this.withCredentials
//                 }
//             });
//         };
//         /**
//          * Update the content in a web map.
//          */
//         this.updateWebmapData = function(username, folder, id, data) {
//             return jquery.ajax({
//                 type: "POST",
//                 url: this.portalUrl + "sharing/rest/content/users/" + username + "/" + folder + "/items/" + id + "/update?",
//                 data: {
//                     text: JSON.stringify(data), // Stringify the Javascript object so it can be properly sent.
//                     token: this.token,
//                     f: "json"
//                 },
//                 dataType: "json",
//                 xhrFields: {
//                     withCredentials: this.withCredentials
//                 }
//             });
//         };
//         /**
//          * Update the description for an item.
//          */
//         this.updateDescription = function(username, id, folder, description) {
//             var postData = JSON.parse(description);
//             /**
//              * Clean up description items for posting.
//              * This is necessary because some of the item descriptions
//              * (e.g. tags and extent) are returned as arrays, but the post
//              * operation expects comma separated strings.
//              */
//             jquery.each(postData, function(item, value) {
//                 if (value === null) {
//                     postData[item] = "";
//                 } else if (value instanceof Array) {
//                     postData[item] = value.join(",");
//                 }
//             });
//
//             postData.token = this.token;
//             postData.f = "json";
//             return jquery.ajax({
//                 type: "POST",
//                 url: this.portalUrl + "sharing/rest/content/users/" + username + "/" + folder + "/items/" + id + "/update",
//                 data: postData,
//                 dataType: "json",
//                 xhrFields: {
//                     withCredentials: this.withCredentials
//                 }
//             });
//         };
//
//         this.updateData = function(username, id, folder, data) {
//             // Update the content in a web map.
//             return jquery.ajax({
//                 type: "POST",
//                 url: this.portalUrl + "sharing/rest/content/users/" + username + "/" + folder + "/items/" + id + "/update",
//                 data: {
//                     text: data, // Stringify the Javascript object so it can be properly sent.
//                     token: this.token,
//                     f: "json"
//                 },
//                 dataType: "json",
//                 xhrFields: {
//                     withCredentials: this.withCredentials
//                 }
//             });
//         };
//         /**
//          * Update the URL of a registered service or web application.
//          */
//         this.updateUrl = function(username, folder, id, url) {
//             return jquery.ajax({
//                 type: "POST",
//                 url: this.portalUrl + "sharing/rest/content/users/" + username + "/" + folder + "/items/" + id + "/update",
//                 data: {
//                     url: url,
//                     token: this.token,
//                     f: "json"
//                 },
//                 dataType: "json",
//                 xhrFields: {
//                     withCredentials: this.withCredentials
//                 }
//             });
//         };
//         /**
//          * Get service details.
//          */
//         this.serviceDescription = function(url) {
//             return jquery.ajax({
//                 type: "GET",
//                 url: url + "?" + jquery.param({
//                     token: this.token,
//                     f: "json"
//                 }),
//                 dataType: "json",
//                 xhrFields: {
//                     withCredentials: this.withCredentials
//                 }
//             });
//         };
//         /**
//          * Get service details.
//          */
//         this.serviceLayers = function(url) {
//             return jquery.ajax({
//                 type: "GET",
//                 url: url + "/layers?" + jquery.param({
//                     token: this.token,
//                     f: "json"
//                 }),
//                 dataType: "json",
//                 xhrFields: {
//                     withCredentials: this.withCredentials
//                 }
//             });
//         };
//         /**
//          *
//          */
//         this.createService = function(username, folder, serviceParameters) {
//             return jquery.ajax({
//                 type: "POST",
//                 url: this.portalUrl + "sharing/rest/content/users/" + username + "/" + folder + "/createService",
//                 data: {
//                     createParameters: serviceParameters,
//                     outputType: "featureService",
//                     token: this.token,
//                     f: "json"
//                 },
//                 dataType: "json",
//                 xhrFields: {
//                     withCredentials: this.withCredentials
//                 }
//             });
//         };
//         /**
//          *
//          */
//         this.addToServiceDefinition = function(serviceUrl, definition) {
//             serviceUrl = serviceUrl.replace("/rest/services/", "/rest/admin/services/");
//             return jquery.ajax({
//                 type: "POST",
//                 url: serviceUrl + "/addToDefinition",
//                 data: {
//                     addToDefinition: definition,
//                     token: this.token,
//                     f: "json"
//                 },
//                 dataType: "json",
//                 xhrFields: {
//                     withCredentials: this.withCredentials
//                 }
//             });
//         };
//         /**
//          *
//          */
//         this.checkServiceName = function(portalId, name, type) {
//             return jquery.ajax({
//                 type: "GET",
//                 url: this.portalUrl + "sharing/rest/portals/" + portalId + "/isServiceNameAvailable?" + jquery.param({
//                     name: name,
//                     type: type,
//                     token: this.token,
//                     f: "json"
//                 }),
//                 dataType: "json",
//                 xhrFields: {
//                     withCredentials: this.withCredentials
//                 }
//             });
//         };
//         /**
//          *
//          */
//         this.layerRecordCount = function(serviceUrl, layerId) {
//             return jquery.ajax({
//                 type: "GET",
//                 url: serviceUrl + "/" + layerId + "/query?" + jquery.param({
//                     where: "1=1",
//                     returnCountOnly: true,
//                     token: this.token,
//                     f: "json"
//                 }),
//                 dataType: "json",
//                 xhrFields: {
//                     withCredentials: this.withCredentials
//                 }
//             });
//         };
//         /**
//          *
//          */
//         this.harvestRecords = function(serviceUrl, layerId, offset, numresults) {
//             return jquery.ajax({
//                 type: "GET",
//                 url: serviceUrl + "/" + layerId + "/query?" + jquery.param({
//                     where: "1=1",
//                     outFields: "*",
//                     returnGeometry: true,
//                     resultOffset: offset,
//                     resultRecordCount: numresults,
//                     token: this.token,
//                     f: "json"
//                 }),
//                 dataType: "json",
//                 xhrFields: {
//                     withCredentials: this.withCredentials
//                 }
//             });
//         };
//         /**
//          *
//          */
//         this.addFeatures = function(serviceUrl, layerId, features) {
//             return jquery.ajax({
//                 type: "POST",
//                 url: serviceUrl + "/" + layerId + "/addFeatures",
//                 data: {
//                     features: features,
//                     token: this.token,
//                     f: "json"
//                 },
//                 dataType: "json",
//                 xhrFields: {
//                     withCredentials: this.withCredentials
//                 }
//             });
//         };
//         /**
//          * cacheItem() Stores an item with the portal object.
//          * @description {Object} the item's description object
//          */
//         this.cacheItem = function(description) {
//             this.items.push({
//                 id: description.id,
//                 description: description
//             });
//         };
//     }
// };
// });
