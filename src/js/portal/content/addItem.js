import request from "../request";

/*
 * Create a new item.
 */
export function addItem(username, folder, description, data, thumbnailUrl) {
    let portal = this;
    let url = `${portal.portalUrl}sharing/rest/content/users/${username}/${folder}/addItem`;
    /*
     * Clean up description items for posting.
     * This is necessary because some of the item descriptions (e.g. tags and extent)
     * are returned as arrays, but the POST operation expects comma separated strings.
     */
    for (let key in description) {
        if (description[key] === null) {
            description[key] = "";
        } else if (description[key] instanceof Array) {
            description[key] = description[key].toString();
        }
    }
    let payload = {
        item: description.title,
        overwrite: false, // Prevent users from accidentally overwriting items.
        thumbnailurl: thumbnailUrl,
        token: portal.token,
        f: "json"
    };
    // Handle "dataless" items like Map Services.
    if (typeof data === "object" && data !== null) {
        payload.text = JSON.stringify(data); // Stringify the object so it can be properly sent.
    } else {
        payload.text = "";
    }
    // Merge the description items into the payload object.
    Object.assign(payload, description);
    let options = {
        withCredentials: portal.withCredentials
    };
    return request.post(url, payload, options);
}
