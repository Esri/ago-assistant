define(["jquery"], function(jquery) {
    return {
        // Convert an array to a comma separated string.
        arrayToString: function(array) {
            var arrayString;
            jquery.each(array, function(index, arrayValue) {
                if (index === 0) {
                    arrayString = arrayValue;
                } else if (index > 0) {
                    arrayString = arrayString + "," + arrayValue;
                }
            });

            return arrayString;
        },

        // Clean up common issues with user entered portal URLs.
        fixUrl: function(portalUrl) {
            var deferred = jquery.Deferred();
            if (portalUrl === "") {
                // Default to ArcGIS Online.
                portalUrl = "https://www.arcgis.com/";
            } else if (portalUrl.search("/home/") > 0) {
                // Strip the /home endpoint.
                portalUrl = portalUrl.
                substr(0, portalUrl.search("/home/")) + "/";
            } else if (portalUrl.search("/sharing/") > 0) {
                // Strip the /sharing endpoint.
                portalUrl = portalUrl.
                substr(0, portalUrl.search("/sharing/")) + "/";
            } else if (portalUrl.charAt(portalUrl.length - 1) !== "/") {
                // Add the trailing slash.
                portalUrl = portalUrl + "/";
            }

            deferred.resolve(portalUrl);
            return deferred.promise();
        }
    };
});
