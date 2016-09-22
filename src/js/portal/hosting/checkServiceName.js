import request from "../request";

/*
 * Check if the provided service name is available.
 */
export function checkServiceName(portalId, name, type) {
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
}
