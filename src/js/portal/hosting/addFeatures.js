import request from "../request";

/*
 * Add features to an existing service.
 */
export function addFeatures(serviceUrl, layerId, features) {
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
}
