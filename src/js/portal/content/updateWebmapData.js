import request from "../request";

/*
 * Update the content in a web map.
 */
export function updateWebmapData(username, folder, id, data) {
    let portal = this;
    let url = `${portal.portalUrl}sharing/rest/content/users/${username}/${folder}/items/${id}/update`;
    let payload = {
        text: JSON.stringify(data), // Stringify the object so it can be properly sent.
        token: portal.token,
        f: "json"
    };
    let options = {
        withCredentials: portal.withCredentials
    };
    return request.post(url, payload, options);
}
