import request from "../request";

export function itemData(id) {
    let portal = this;
    let url = `${portal.portalUrl}sharing/rest/content/items/${id}/data`;
    let parameters = {
        token: portal.token,
        f: "json"
    };
    let options = {
        withCredentials: portal.withCredentials
    };
    return request.get(url, parameters, options);
}
