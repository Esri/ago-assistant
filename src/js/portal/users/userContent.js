import request from "../request";

export function userContent(username, folder) {
    let portal = this;
    let url = `${portal.portalUrl}sharing/rest/content/users/${username}/${folder}`;
    let parameters = {
        token: portal.token,
        f: "json"
    };
    let options = {
        withCredentials: portal.withCredentials
    };
    return request.get(url, parameters, options);
}
