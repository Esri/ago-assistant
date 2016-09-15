import request from "../request";

/*
 * Return the view of the portal as seen by the current user,
 * anonymous or logged in.
 */
export function self() {
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
}
