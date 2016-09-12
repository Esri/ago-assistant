import request from "./request";
import {items} from "./info";
import {fixUrl, upgradeUrl} from "./util";

export function Portal(config) {
    config = typeof config !== "undefined" ? config : {};
    this.portalUrl = config.portalUrl;
    this.username = config.username;
    this.token = config.token;
    this.withCredentials = false;
    this.jsonp = false;
    this.items = [];
    this.services = [];
    /*
     * Return the version of the portal.
     */
    this.version = function() {
        let portal = this;
        let url = `${portal.portalUrl}sharing/rest`;
        let parameters = {
            f: "json"
        };
        let options = {
            withCredentials: portal.withCredentials
        };
        return request.get(url, parameters, options);
    },
    /*
     * Generates an access token in exchange for user credentials that
     * can be used by clients when working with the ArcGIS Portal API.
     */
    this.generateToken = function(username, password) {
        let portal = this;
        let url = `${portal.portalUrl}sharing/rest/generateToken`;
        let payload = {
            client: "referer",
            referer: window.location.hostname,
            expiration: 60,
            username: username,
            password: password,
            f: "json"
        };
        let options = {
            withCredentials: portal.withCredentials
        };
        return request.post(url, payload, options);
    },
    /* Return the view of the portal as seen by the current user,
     * anonymous or logged in.
     */
    this.self = function() {
        let portal = this;
        let url =  `${portal.portalUrl}sharing/rest/portals/self`;
        let parameters = {
            token: portal.token,
            f: "json"
        };
        let options = {
            withCredentials: portal.withCredentials
        };
        return request.get(url, parameters, options);
    },
    /*
     * Searches for content items in the portal.
     * The results of a search only contain items that the user
     * (token) has permission to access.
     * Excluding a token will yield only public items.
     */
    this.search = function(query, numResults, sortField, sortOrder) {
        let portal = this;
        let url = `${portal.portalUrl}sharing/rest/search`;
        let parameters = {
            q: query,
            num: numResults,
            sortField: sortField,
            sortOrder: sortOrder,
            token: portal.token,
            f: "json"
        };
        let options = {
            withCredentials: portal.withCredentials
        };
        return request.get(url, parameters, options);
    },
    this.userProfile = function(username) {
        let portal = this;
        let url = `${portal.portalUrl}sharing/rest/community/users/${username}`;
        let parameters = {
            token: portal.token,
            f: "json"
        };
        let options = {
            withCredentials: portal.withCredentials
        };
        return request.get(url, parameters, options);
    },
    this.userContent = function(username, folder) {
        let portal = this;
        let url = `${portal.portalUrl}sharing/rest/content/users/${username}/${folder}`;
        let parameters = {
            token: portal.token,
            f: "json"
        };
        let options = {
            withCredentials: portal.withCredentials
        };
        return request.get(url, parameters, options);
    },
    this.itemDescription = function(id) {
        let portal = this;
        let url = `${portal.portalUrl}sharing/rest/content/items/${id}`;
        let parameters = {
            token: portal.token,
            f: "json"
        };
        let options = {
            withCredentials: portal.withCredentials
        };
        return request.get(url, parameters, options);
    },
    this.itemData = function(id) {
        let portal = this;
        let url = `${portal.portalUrl}sharing/rest/content/items/${id}/data`;
        let parameters = {
            token: portal.token,
            f: "json"
        };
        let options = {
            withCredentials: portal.withCredentials
        };
        return request.get(url, parameters, options);
    },
    /*
     * Create a new item.
     */
    this.addItem = function(username, folder, description, data, thumbnailUrl) {
        let portal = this;
        let url = `${portal.portalUrl}sharing/rest/content/users/${username}/${folder}/addItem`;
        /*
         * Clean up description items for posting.
         * This is necessary because some of the item descriptions (e.g. tags and extent)
         * are returned as arrays, but the POST operation expects comma separated strings.
         */
        for (let [key, value] of description) {
            if (value === null) {
                description[key] = "";
            } else if (value instanceof Array) {
                description[key] = value.toString();
            }
        }
        let payload = {
            item: description.title,
            text: JSON.stringify(data), // Stringify the object so it can be properly sent.
            overwrite: false, // Prevent users from accidentally overwriting items.
            thumbnailurl: thumbnailUrl,
            token: portal.token,
            f: "json"
        };
        let options = {
            withCredentials: portal.withCredentials
        };
        return request.post(url, payload, options);
    },
    /*
     * Update the content in a web map.
     */
    this.updateWebmapData = function(username, folder, id, data) {
        let portal = this;
        let url = `${portal.portalUrl}sharing/rest/content/users/${username}/${folder}/items/${id}/update`;
        let payload = {
            text: JSON.stringify(data), // Stringify the object so it can be properly sent.
            token: portal.token,
            f: "json"
        };
        let options = {
            withCredentials: portal.withCredentials
        };
        return request.post(url, payload, options);
    },
    /*
     * Update an item's description.
     */
    this.updateDescription = function(username, id, folder, description) {
        let portal = this;
        let url = `${portal.portalUrl}sharing/rest/content/users/${username}/${folder}/items/${id}/update`;
        /*
         * Clean up description items for posting.
         * This is necessary because some of the item descriptions (e.g. tags and extent)
         * are returned as arrays, but the POST operation expects comma separated strings.
         */
        for (let [key, value] of description) {
            if (value === null) {
                description[key] = "";
            } else if (value instanceof Array) {
                description[key] = value.toString();
            }
        }
        let payload = JSON.parse(description);
        payload.token = portal.token;
        payload.f = "json";
        let options = {
            withCredentials: portal.withCredentials
        };
        return request.post(url, payload, options);
    },
    /*
     * Update the content in a Web Map.
     */
    this.updateData = function(username, id, folder, data) {
        let portal = this;
        let url = `${portal.portalUrl}sharing/rest/content/users/${username}/${folder}/items/${id}/update`;
        let payload = {
            text: data,
            token: portal.token,
            f: "json"
        };
        let options = {
            withCredentials: portal.withCredentials
        };
        return request.post(url, payload, options);
    },
    /*
     * Update the URL of a registered service or web application.
     */
    this.updateUrl = function(username, folder, id, newUrl) {
        let portal = this;
        let url = `${portal.portalUrl}sharing/rest/content/users/${username}/${folder}/items/${id}/update`;
        let payload = {
            url: newUrl,
            token: portal.token,
            f: "json"
        };
        let options = {
            withCredentials: portal.withCredentials
        };
        return request.post(url, payload, options);
    },
    /*
     * Get the description of a Hosted Service.
     */
    this.serviceDescription = function(serviceUrl) {
        let portal = this;
        let url = serviceUrl;
        let parameters = {
            token: portal.token,
            f: "json"
        };
        let options = {
            withCredentials: portal.withCredentials
        };
        return request.get(url, parameters, options);
    },
    /*
     * Retrieve the individual layers from a Hosted Service.
     */
    this.serviceLayers = function(serviceUrl) {
        let portal = this;
        let url = `${serviceUrl}/layers`;
        let parameters = {
            token: portal.token,
            f: "json"
        };
        let options = {
            withCredentials: portal.withCredentials
        };
        return request.get(url, parameters, options);
    },
    /*
     * Return the number of records in the service layer.
     */
    this.layerRecordCount = function(serviceUrl, layerId) {
        let portal = this;
        let url = `${serviceUrl}/${layerId}/query`;
        let parameters = {
            where: "1=1",
            returnCountOnly: true,
            token: portal.token,
            f: "json"
        };
        let options = {
            withCredentials: portal.withCredentials
        };
        return request.get(url, parameters, options);
    },
    /*
     * Create a new Hosted Service.
     */
    this.createService = function(username, folder, serviceParameters) {
        let portal = this;
        let url = `${portal.portalUrl}sharing/rest/content/users/${username}/${folder}/createService`;
        let payload = {
            createParameters: serviceParameters,
            outputType: "featureService",
            token: portal.token,
            f: "json"
        };
        let options = {
            withCredentials: portal.withCredentials
        };
        return request.post(url, payload, options);
    },
    /*
     * Modify the definition of an existing Hosted Service.
     */
    this.addToServiceDefinition = function(serviceUrl, definition) {
        let portal = this;
        serviceUrl = serviceUrl.replace("/rest/services/", "/rest/admin/services/");
        let url = `${serviceUrl}/addToDefinition`;
        let payload = {
            addToDefinition: definition,
            token: portal.token,
            f: "json"
        };
        let options = {
            withCredentials: portal.withCredentials
        };
        return request.post(url, payload, options);
    },
    /*
     * Check if the provided service name is available.
     */
    this.checkServiceName = function(portalId, name, type) {
        let portal = this;
        let url = `${portal.portalUrl}sharing/rest/portals/${portalId}/isServiceNameAvailable`;
        let parameters = {
            name: name,
            type: type,
            token: portal.token,
            f: "json"
        };
        let options = {
            withCredentials: portal.withCredentials
        };
        return request.get(url, parameters, options);
    },
    /*
     * Query the records of a service.
     */
    this.harvestRecords = function(serviceUrl, layerId, offset, numresults) {
        let portal = this;
        let url = `${serviceUrl}/${layerId}/query`;
        let parameters = {
            where: "1=1",
            outFields: "*",
            returnGeometry: true,
            resultOffset: offset,
            resultRecordCount: numresults,
            token: portal.token,
            f: "json"
        };
        let options = {
            withCredentials: portal.withCredentials
        };
        return request.get(url, parameters, options);
    },
    /*
     * Add features to an existing service.
     */
    this.addFeatures = function(serviceUrl, layerId, features) {
        let portal = this;
        let url = `${serviceUrl}/${layerId}/addFeatures`;
        let payload = {
            features: features,
            token: portal.token,
            f: "json"
        };
        let options = {
            withCredentials: portal.withCredentials
        };
        return request.post(url, payload, options);
    },
    /*
     * Stores an item within the portal object.
     */
    this.cacheItem = function(description) {
        this.items.push({
            id: description.id,
            description: description
        });
    };
}

export function portal(options) {
    return new Portal(options);
}

export function itemInfo(type) {
    return items(type);
}

export let url = {
    fix: function fix(url) {
        return fixUrl(url);
    },
    upgrade: function upgrade(url) {
        return upgradeUrl(url);
    }
};

export default portal;
