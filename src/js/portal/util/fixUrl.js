export function fixUrl(portalUrl) {
    // Clean up common issues with user entered portal URLs.
    return new Promise(function(resolve) {
        if (portalUrl === "") {
            // Default to ArcGIS Online.
            portalUrl = "https://www.arcgis.com/";
        } else if (portalUrl.search("/home/") > 0) {
            // Strip the /home endpoint.
            portalUrl = `${portalUrl.substr(0, portalUrl.search("/home"))}/`;
        } else if (portalUrl.search("/sharing") > 0) {
            // Strip the /sharing endpoint.
            portalUrl = `${portalUrl.substr(0, portalUrl.search("/sharing"))}/`;
        } else if (portalUrl.charAt(portalUrl.length - 1) !== "/") {
            // Add the trailing slash.
            portalUrl = `${portalUrl}/`;
        }
        if (portalUrl.indexOf("http://") === 0 && window.location.href.indexOf("https://") === 0) {
            // Upgrade the URL to https.
            portalUrl = portalUrl.replace("http://", "https://");
        }

        resolve(portalUrl);
    });
}
