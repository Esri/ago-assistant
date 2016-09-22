import request from "../request";

/*
 * Update the content in a Web Map.
 */
export function updateData(username, id, folder, data) {
    let portal = this;
    let url = `${portal.portalUrl}sharing/rest/content/users/${username}/${folder}/items/${id}/update`;
    let payload = {
        text: data,
        token: portal.token,
        f: "json"
    };
    let options = {
        withCredentials: portal.withCredentials
    };
    return request.post(url, payload, options);
}
