import request from "../request";

/*
 * Return the version of the portal.
 */
export function version() {
    var portal = this;
    var url = portal.portalUrl + "sharing/rest";
    var parameters = {
        f: "json"
    };
    var options = {
        withCredentials: portal.withCredentials
    };
    return request.get(url, parameters, options);
}
