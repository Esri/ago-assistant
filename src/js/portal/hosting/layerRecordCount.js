import request from "../request";

/*
 * Return the number of records in the service layer.
 */
export function layerRecordCount(serviceUrl, layerId) {
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
}
