import request from "../request";

/*
 * Get the description of a Hosted Service.
 */
export function serviceDescription(serviceUrl) {
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
}
