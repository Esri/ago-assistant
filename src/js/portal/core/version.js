import request from "../request";

/*
 * Return the version of the portal.
 */
export function version() {
    let portal = this;
    let url = `${portal.portalUrl}sharing/rest`;
    let parameters = {
        f: "json"
    };
    let options = {
        withCredentials: portal.withCredentials
    };
    return request.get(url, parameters, options);
}
