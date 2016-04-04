define([], function() {
    var types = [
        {
            type: "CityEngine Web Scene",
            icon: "webScene"
        },
        {
            type: "Color Set",
            icon: "datafilesGray"
        },
        {
            type: "Document Link",
            icon: "datafilesGray"
        },
        {
            type: "Image Service",
            icon: "imagery"
        },
        {
            type: "Feature Collection",
            icon: "features"
        },
        {
            type: "Feature Collection Template",
            icon: "maps"
        },
        {
            type: "Feature Layer",
            icon: "features"
        },
        {
            type: "Feature Service",
            icon: "features"
        },
        {
            type: "Geocoding Service",
            icon: "layers"
        },
        {
            type: "Geodata Service",
            icon: "layers"
        },
        {
            type: "Geometry Service",
            icon: "layers"
        },
        {
            type: "Geoprocessing Service",
            icon: "layers"
        },
        {
            type: "Globe Service",
            icon: "layers"
        },
        {
            type: "Network Analysis Service",
            icon: "layers"
        },
        {
            type: "Map Service",
            icon: "layers"
        },
        {
            type: "Mobile Application",
            icon: "apps"
        },
        {
            type: "Operation View",
            icon: "apps"
        },
        {
            type: "Scene Layer",
            icon: "sceneLayer"
        },
        {
            type: "Scene Service",
            icon: "sceneLayer"
        },
        {
            type: "Service Definition",
            icon: "datafiles"
        },
        {
            type: "Symbol Set",
            icon: "datafiles"
        },
        {
            type: "Web Map",
            icon: "maps"
        },
        {
            type: "Web Mapping Application",
            icon: "apps"
        },
        {
            type: "Web Scene",
            icon: "webScene"
        },
        {
            type: "WMS",
            icon: "layers"
        },
    ];
    return {
        items: function(type) {
            var info = types.filter(function(item) {
                return item.type === type;
            })[0];

            if (!info) {
                // Handle types not found in the above list.
                return {
                    icon: "datafilesGray"
                };
            }

            return info;
        }
    };
});
