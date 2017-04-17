import request from "../request";

/*
 * Update an item's description.
 */
export function updateDescription(username, id, folder, description) {
    let portal = this;
    let url = `${portal.portalUrl}sharing/rest/content/users/${username}/${folder}/items/${id}/update`;
    /*
     * Clean up description items for posting.
     * This is necessary because some of the item descriptions (e.g. tags and extent)
     * are returned as arrays, but the POST operation expects comma separated strings.
     */
    let payload = JSON.parse(description);
    for (let key of Object.keys(payload)) {
        let value = payload[key];
        if (value === null) {
            payload[key] = "";
        } else if (value instanceof Array) {
            payload[key] = value.toString();
        }
    }
    payload.token = portal.token;
    payload.f = "json";
    let options = {
        withCredentials: portal.withCredentials
    };
    return request.post(url, payload, options);
}
