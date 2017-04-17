import request from "../request";

/*
 * Searches for content items in the portal.
 * The results of a search only contain items that the user
 * (token) has permission to access.
 * Excluding a token will yield only public items.
 */
export function search(query, numResults, sortField = "", sortOrder = "") {
    let portal = this;
    let url = `${portal.portalUrl}sharing/rest/search`;
    let parameters = {
        q: query,
        num: numResults,
        sortField: sortField,
        sortOrder: sortOrder,
        token: portal.token,
        f: "json"
    };
    let options = {
        withCredentials: portal.withCredentials
    };
    return request.get(url, parameters, options);
}
