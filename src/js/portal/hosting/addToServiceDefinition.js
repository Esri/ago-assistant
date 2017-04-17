import request from "../request";

/*
 * Modify the definition of an existing Hosted Service.
 */
export function addToServiceDefinition(serviceUrl, definition) {
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
}
