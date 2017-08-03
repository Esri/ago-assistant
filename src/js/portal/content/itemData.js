import request from "../request";

export function itemData(id, name) {
    // If name is passed as an optional parameter, check to see if it
    //  contains a period.  This is to handle instances where file based
    //  items aren't displaying JSON properly, trying to download instead.
    if ((name !== null) && (name !== undefined)) // should handle null and undefined
    {
        if (name.indexOf('.') > -1)
        {
            console.info("Skipping /data since name is " + name);
            return Promise.resolve(null);
        }
    }
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
