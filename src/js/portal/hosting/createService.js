import request from "../request";

/*
 * Create a new Hosted Service.
 */
export function createService(username, folder, serviceParameters) {
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
}
