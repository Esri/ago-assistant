import request from "../request";

export function userProfile(username) {
    let portal = this;
    let url = `${portal.portalUrl}sharing/rest/community/users/${username}`;
    let parameters = {
        token: portal.token,
        f: "json"
    };
    let options = {
        withCredentials: portal.withCredentials
    };
    return request.get(url, parameters, options);
}
