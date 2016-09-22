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
    for (let [key, value] of description) {
        if (value === null) {
            description[key] = "";
        } else if (value instanceof Array) {
            description[key] = value.toString();
        }
    }
    let payload = JSON.parse(description);
    payload.token = portal.token;
    payload.f = "json";
    let options = {
        withCredentials: portal.withCredentials
    };
    return request.post(url, payload, options);
}
