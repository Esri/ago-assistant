define(["jquery", "util"], function (jquery, util) {
    return {
        version: function (portal) {
            // Returns the version of the portal.
            return jquery.ajax({
                type: "GET",
                url: portal + "sharing/rest?f=json",
                dataType: "json"
            });
        },
        self: function (portal, token) {
            // Return the view of the portal as seen by the current user, anonymous or logged in.
            return jquery.ajax({
                type: "GET",
                url: portal + "sharing/rest/portals/self?" + jquery.param({
                    token: token,
                    f: "json"
                }),
                dataType: "json"
            });
        },
        generateToken: function (portal, username, password) {
            // Generates an access token in exchange for user credentials that can be used by clients when working with the ArcGIS Portal API.
            return jquery.ajax({
                type: "POST",
                url: portal + "sharing/rest/generateToken?",
                data: {
                    username: username,
                    password: password,
                    referer: jquery(location).attr("href"), // URL of the sending app.
                    expiration: 60, // Lifetime of the token in minutes.
                    f: "json"
                },
                dataType: "json"
            });
        },
        search: function (portal, query, numResults, sortField, sortOrder, token) {
            // Searches for content items in the portal.
            // The results of a search only contain items that the user (token) has permission to access.
            // Excluding a token will yield only public items.
            return jquery.ajax({
                type: "GET",
                url: portal + "sharing/rest/search?",
                data: {
                    q: query,
                    num: numResults,
                    sortField: sortField,
                    sortOrder: sortOrder,
                    token: token,
                    f: "json"
                },
                dataType: "json"
            });
        },
        processGroup: function (destinationPortal, destinationToken, groupId, groupTitle, groupInvitation, groupDescription, groupSnippet, groupTags, groupPhone, groupThumbnail, groupAccess) {
            //send a request to create the new group
            return jquery.ajax({
                type: "POST",
                url: destinationPortal + "sharing/rest/community/createGroup?",
                data: {
                    title: groupTitle,
                    isInvitationOnly: groupInvitation,
                    description: groupDescription,
                    snippet: groupSnippet,
                    tags: groupTags,
                    phone: groupPhone,
                    thumbnail: groupThumbnail,
                    access: groupAccess,
                    token: destinationToken,
                    f: "json"
                },
                dataType: "json"
            });
           
        },
        getGroups: function (portal, username, token) {
            // 
            return jquery.ajax({
                type: "GET",
                url: 'http://localhost/proxy/proxy.ashx?' + portal + "/sharing/rest/community/users/" + username + "?",
                data: {
                    token: token,
                    f: "json",
                },
                dataType: "json"
            });
        },
        getGroupDetails: function (portal, token, id){  
            return jquery.ajax({
                type: "GET",
                url: 'http://localhost/proxy/proxy.ashx?' + portal + 'sharing/rest/community/groups/' + id + '?',
                data: {
                    token: token,
                    f: "json",
                    q: "collector",
                },
                dataType: "json"
            });
        },
        commitJson: function (portal, username, folder, token, id, attribute, value) {

            //create the data object externally to the Ajax to enable using the attribute as an index
            dataObj = {
                token: token,
                f: "json",
            },
            dataObj[attribute.toString()] = value;

            return jquery.ajax({
                type: "POST",
                url: 'http://localhost/proxy/proxy.ashx?' + portal + 'sharing/rest/content/users/' + username + '/' + folder + '/items/' + id + '/update?',
                data: dataObj,
                dataType: "json"
            });
        },
        user: {
            profile: function (portal, username, token) {
                // 
                return jquery.ajax({
                    type: "GET",
                    url: portal + "sharing/rest/community/users/" + username + "?",
                    data: {
                        token: token,
                        f: "json"
                    },
                    dataType: "json"
                });
            },
            content: function (portal, username, folder, token) {
                // 
                return jquery.ajax({
                    type: "GET",
                    url: portal + "sharing/rest/content/users/" + username + "/" + folder + "?",
                    data: {
                        token: token,
                        f: "json"
                    },
                    dataType: "json"
                });
            },
        },
        content: {
            
            itemDescription: function (portal, id, token) {
                // 
                return jquery.ajax({
                    type: "GET",
                    url: 'http://localhost/proxy/proxy.ashx?' + portal + "sharing/rest/content/items/" + id + "?",
                    data: {
                        token: token,
                        f: "json"
                    },
                    dataType: "json"
                });
            },
            itemData: function (portal, id, token) {
                // 
                return jquery.ajax({
                    type: "GET",
                    url: 'http://localhost/proxy/proxy.ashx?' + portal + "sharing/rest/content/items/" + id + "/data?",
                    data: {
                        token: token,
                        f: "json"
                    },
                    dataType: "json"
                });
            },
            addItem: function (portal, id, sUsername, dUsername, folder, description, thumbnailUrl, sToken, dToken) {
                // Create a new item on the specified portal.

                // Clean up description items for posting.
                // This is necessary because some of the item descriptions (e.g. tags and extent)
                // are returned as arrays, but the post operation expects comma separated strings.

                var dfd = $.Deferred();

                jquery.each(description, function (item, value) {
                    if (value === null) {
                        description[item] = "";
                    } else if (value instanceof Array) {
                        description[item] = util.arrayToString(value);
                    }
                });

                xhr = new XMLHttpRequest();
                xhr.open('POST', 'http://localhost/proxy/proxy.ashx?http://arcgis.com/sharing/rest/content/items/' + id + "/data?f=json&token=" + sToken, true);
                xhr.responseType = "blob";

                xhr.onload = function (xhrEvent) {

                   
                    //Get the downloaded blob (the file of the agol item)
                    var blob = xhr.response;

                    //Create a formData object in order to upload the file in a multi-part upload format
                    var data = new FormData();
                    data.append('itemType', 'file');
                    data.append('file', blob, description.name);
                    data.append('url', null );
                    data.append('title', description.title);
                    data.append('type', description.type);
                    data.append('description', description.description);
                    data.append('tags', description.tags);
                    data.append('snippet', description.snippet);
                    data.append('extent', description.extent);
                    data.append('spatialReference', description.spatialReference);
                    data.append('accessInformation', description.accessInformation);
                    data.append('thumbnail', thumbnailUrl);
                    data.append('overwrite', false);
                    data.append('async', true);
                    data.append('f', 'json');
                    data.append('token', dToken);
                    data.append('folder', folder);

                    //Upload the item to the destination agol account
                    jquery.ajax({
                        type: 'POST',
                        url: portal + "sharing/rest/content/users/" + dUsername + "/" + folder + "/addItem?f=json&token=" + dToken,
                        data: data,
                        cache: false,
                        contentType: false,
                        processData: false,
                        
                        success: function (data) {
                            console.log(data);
                            dfd.resolve(data);
                        }
                    });
                };

                //Request the file download
                xhr.send();
                return dfd.promise();

            },
            addItemReferenced: function (portal, username, folder, description, data, thumbnailUrl, token) {
                // Create a new item on the specified portal.

                // Clean up description items for posting.
                // This is necessary because some of the item descriptions (e.g. tags and extent)
                // are returned as arrays, but the post operation expects comma separated strings.
                jquery.each(description, function (item, value) {
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
                    token: token
                };
                return jquery.ajax({
                    type: "POST",
                    url: portal + "sharing/rest/content/users/" + username + "/" + folder + "/addItem?",
                    data: jquery.extend(description, params), // Merge the description and params JSON objects.
                    dataType: "json"
                });
            },
            updateWebmapData: function (portal, username, folder, id, data, token) {
                // Update the content in a web map.
                return jquery.ajax({
                    type: "POST",
                    url: portal + "sharing/rest/content/users/" + username + "/" + folder + "/items/" + id + "/update?",
                    data: {
                        text: JSON.stringify(data), // Stringify the Javascript object so it can be properly sent.
                        token: token,
                        f: "json"
                    },
                    dataType: "json"
                });
            },
            updateUrl: function (portal, username, folder, id, url, token) {
                // Update the URL of a registered service or web application.
                return $.ajax({
                    type: "POST",
                    url: portal + "sharing/rest/content/users/" + username + "/" + folder + "/items/" + id + "/update?",
                    data: {
                        url: url,
                        token: token,
                        f: "json"
                    },
                    dataType: "json"
                });
            },
            exportItemAsFGDB: function(portal, username, id, token) {
                return $.ajax({
                    type: "POST",
                    url: portal + "sharing/rest/content/users/" + username + "/export?",
                    data: {
                        itemID: id,
                        title: id,
                        exportFormat: 'File Geodatabase',
                        f: 'json',
                        token: token
                    },
                    dataType: "json"
                });
            },
            checkItemStatus: function(portal, username, itemId, jobID, type, token) {
                return $.ajax({
                    type: "POST",
                    url: portal + "sharing/rest/content/users/" + username + "/items/" + itemId + "/status?",
                    data: {
                        jobId: jobID,
                        jobType: type,
                        f: 'json',
                        token: token
                    },
                    dataType: "json"
                });
            },
            checkUploadStatus: function(portal, username, itemId, token) {
                return $.ajax({
                    type: "POST",
                    url: portal + "sharing/rest/content/users/" + username + "/items/" + itemId + "/status?",
                    data: {
                        f: 'json',
                        token: token
                    },
                    dataType: "json"
                });
            },
            checkPublishStatus: function(portal, username, itemId, jobID, token) {
                return $.ajax({
                    type: "POST",
                    url: portal + "sharing/rest/content/users/" + username + "/items/" + itemId + "/status?",
                    data: {
                        jobId: jobID,
                        f: 'json',
                        token: token
                    },
                    dataType: "json"
                });
            },
            deleteFgdb: function(portal, username, itemId, token) {
                return $.ajax({
                    type: "POST",
                    url: portal + "sharing/rest/content/users/" + username + "/items/" + itemId + "/delete?",
                    data: {
                        f: 'json',
                        token: token
                    },
                    dataType: "json"
                });
            },
            publishItem: function(portal, username, itemID, token, itemName) {
                var layerInformation={
                        capabilities: 'query'
                    };   

                var publishParams = {
                        hasStaticData: true,
                        name: itemName,
                        maxRecordCount: 2000,
                        layerInfo: layerInformation
                    };

                return $.ajax({
                    type: "POST",
                    url: portal + "sharing/rest/content/users/" + username + "/publish?",
                    data: {
                        f: 'json',
                        token: token,
                        itemId: itemID,
                        filetype: 'filegeodatabase',
                        publishParameters: JSON.stringify(publishParams)
                    },
                    dataType: "json"
                });
            }
        }
    };
});