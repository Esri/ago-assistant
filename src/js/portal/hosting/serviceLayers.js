import request from "../request";

/*
 * Retrieve the individual layers from a Hosted Service.
 */
export function serviceLayers(serviceUrl) {
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
}
