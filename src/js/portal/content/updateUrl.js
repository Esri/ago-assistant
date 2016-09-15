import request from "../request";

/*
 * Update the URL of a registered service or web application.
 */
export function updateUrl(username, folder, id, newUrl) {
    let portal = this;
    let url = `${portal.portalUrl}sharing/rest/content/users/${username}/${folder}/items/${id}/update`;
    let payload = {
        url: newUrl,
        token: portal.token,
        f: "json"
    };
    let options = {
        withCredentials: portal.withCredentials
    };
    return request.post(url, payload, options);
}
