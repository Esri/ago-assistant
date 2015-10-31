define(["jquery", "portal/util"], function(jquery, util) {
    return {
        Portal: function(config) {
            config = typeof config !== "undefined" ? config : {};
            this.portalUrl = config.portalUrl;
            this.username = config.username;
            this.token = config.token;
            this.withCredentials = false;
            /**
             * Return the version of the portal.
             */
            this.version = function() {
                return jquery.ajax({
                    type: "GET",
                    url: this.portalUrl + "sharing/rest?f=json",
                    dataType: "json",
                    xhrFields: {
                        withCredentials: this.withCredentials
                    }
                });
            };
            /**
             * Return the view of the portal as seen by the current user,
             * anonymous or logged in.
             */
            this.self = function() {
                return jquery.ajax({
                    type: "GET",
                    url: this.portalUrl + "sharing/rest/portals/self?" + jquery.param({
                        token: this.token,
                        f: "json"
                    }),
                    dataType: "json",
                    xhrFields: {
                        withCredentials: this.withCredentials
                    }
                });
            };
            /**
             * Generates an access token in exchange for user credentials that
             * can be used by clients when working with the ArcGIS Portal API.
             */
            this.generateToken = function(username, password) {
                return jquery.ajax({
                    type: "POST",
                    url: this.portalUrl + "sharing/rest/generateToken?",
                    data: {
                        username: username,
                        password: password,
                        referer: jquery(location).attr("href"), // URL of the sending app.
                        expiration: 60, // Lifetime of the token in minutes.
                        f: "json"
                    },
                    dataType: "json",
                    xhrFields: {
                        withCredentials: this.withCredentials
                    }
                });
            };
            /**
             * Searches for content items in the portal.
             * The results of a search only contain items that the user
             * (token) has permission to access.
             * Excluding a token will yield only public items.
             */
            this.search = function(query, numResults, sortField, sortOrder) {
                return jquery.ajax({
                    type: "GET",
                    url: this.portalUrl + "sharing/rest/search?",
                    data: {
                        q: query,
                        num: numResults,
                        sortField: sortField,
                        sortOrder: sortOrder,
                        token: this.token,
                        f: "json"
                    },
                    dataType: "json",
                    xhrFields: {
                        withCredentials: this.withCredentials
                    }
                });
            };

            this.userProfile = function(username) {
                return jquery.ajax({
                    type: "GET",
                    url: this.portalUrl + "sharing/rest/community/users/" + username + "?",
                    data: {
                        token: this.token,
                        f: "json"
                    },
                    dataType: "json",
                    xhrFields: {
                        withCredentials: this.withCredentials
                    }
                });
            };

            this.userContent = function(username, folder) {
                return jquery.ajax({
                    type: "GET",
                    url: this.portalUrl + "sharing/rest/content/users/" + username + "/" + folder + "?",
                    data: {
                        token: this.token,
                        f: "json"
                    },
                    dataType: "json",
                    xhrFields: {
                        withCredentials: this.withCredentials
                    }
                });
            };

            this.itemDescription = function(id) {
                return jquery.ajax({
                    type: "GET",
                    url: this.portalUrl + "sharing/rest/content/items/" + id + "?",
                    data: {
                        token: this.token,
                        f: "json"
                    },
                    dataType: "json",
                    xhrFields: {
                        withCredentials: this.withCredentials
                    }
                });
            };

            this.itemData = function(id) {
                return jquery.ajax({
                    type: "GET",
                    url: this.portalUrl + "sharing/rest/content/items/" + id + "/data?",
                    data: {
                        token: this.token,
                        f: "json"
                    },
                    dataType: "json",
                    xhrFields: {
                        withCredentials: this.withCredentials
                    }
                });
            };

            /**
             * Create a new item on the specified portal.
             */
            this.addItem = function(username, folder, description, data, thumbnailUrl) {
                // Clean up description items for posting.
                // This is necessary because some of the item descriptions (e.g. tags and extent)
                // are returned as arrays, but the post operation expects comma separated strings.
                jquery.each(description, function(item, value) {
                    if (value === null) {
                        description[item] = "";
                    } else if (value instanceof Array) {
                        description[item] = util.arrayToString(value);
                    }
                });

                // Create a new item in a user's content.
                var params = {
                    item: description.title,
                    text: JSON.stringify(data), // Stringify the Javascript object so it can be properly sent.
                    overwrite: false, // Prevent users from accidentally overwriting items with the same name.
                    thumbnailurl: thumbnailUrl,
                    f: "json",
                    token: this.token
                };
                return jquery.ajax({
                    type: "POST",
                    url: this.portalUrl + "sharing/rest/content/users/" + username + "/" + folder + "/addItem?",
                    data: jquery.extend(description, params), // Merge the description and params JSON objects.
                    dataType: "json",
                    xhrFields: {
                        withCredentials: this.withCredentials
                    }
                });
            };
            /**
             * Update the content in a web map.
             */
            this.updateWebmapData = function(username, folder, id, data) {
                return jquery.ajax({
                    type: "POST",
                    url: this.portalUrl + "sharing/rest/content/users/" + username + "/" + folder + "/items/" + id + "/update?",
                    data: {
                        text: JSON.stringify(data), // Stringify the Javascript object so it can be properly sent.
                        token: this.token,
                        f: "json"
                    },
                    dataType: "json",
                    xhrFields: {
                        withCredentials: this.withCredentials
                    }
                });
            };
            /**
             * Update the description for an item.
             */
            this.updateDescription = function(username, id, folder, description) {
                var postData = JSON.parse(description);
                /**
                 * Clean up description items for posting.
                 * This is necessary because some of the item descriptions
                 * (e.g. tags and extent) are returned as arrays, but the post
                 * operation expects comma separated strings.
                 */
                jquery.each(postData, function(item, value) {
                    if (value === null) {
                        postData[item] = "";
                    } else if (value instanceof Array) {
                        postData[item] = value.join(",");
                    }
                });

                postData.token = this.token;
                postData.f = "json";
                return jquery.ajax({
                    type: "POST",
                    url: this.portalUrl + "sharing/rest/content/users/" + username + "/" + folder + "/items/" + id + "/update?",
                    data: postData,
                    dataType: "json",
                    xhrFields: {
                        withCredentials: this.withCredentials
                    }
                });
            };

            this.updateData = function(username, id, folder, data) {
                // Update the content in a web map.
                return jquery.ajax({
                    type: "POST",
                    url: this.portalUrl + "sharing/rest/content/users/" + username + "/" + folder + "/items/" + id + "/update?",
                    data: {
                        text: data, // Stringify the Javascript object so it can be properly sent.
                        token: this.token,
                        f: "json"
                    },
                    dataType: "json",
                    xhrFields: {
                        withCredentials: this.withCredentials
                    }
                });
            };
            /**
             * Update the URL of a registered service or web application.
             */
            this.updateUrl = function(username, folder, id, url) {
                return jquery.ajax({
                    type: "POST",
                    url: this.portalUrl + "sharing/rest/content/users/" + username + "/" + folder + "/items/" + id + "/update?",
                    data: {
                        url: url,
                        token: this.token,
                        f: "json"
                    },
                    dataType: "json",
                    xhrFields: {
                        withCredentials: this.withCredentials
                    }
                });
            };
        }
    };
});
