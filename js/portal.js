function portalVersion(portal, callback) {
    $.ajax({
        url: portal + "sharing/rest?f=json",
        dataType: "json",
        success: function (data) {
            callback(data.currentVersion);
        },
        error: function (data, textStatus, xhr) {
            callback(textStatus);
        }
    });
}

function portalInfo(portal, token, callback) {
    $.getJSON(portal + "sharing/rest/portals/self?" + $.param({
        token: token,
        f: "json"
    }), function (info) {
        callback(info);
    });
}

function generateToken(portal, username, password, callback) {
    "use strict";
    // Define token parameters.
    var token,
        tokenParams = {
            username: username,
            password: password,
            referer: $(location).attr("href"), // URL of the app.
            expiration: 60,
            f: "json"
        };

    //Get session token.
    $.ajax({
        url: portal + "sharing/rest/generateToken?",
        type: "POST",
        dataType: "json",
        data: tokenParams,
        success: function (data) {
            callback(data)
        },
        error: function (response) {
            callback(response);
        }
    });
}

function userProfile(portal, username, token, callback) {
    $.getJSON(portal + "sharing/rest/community/users/" + username + "?" + $.param({
        token: token,
        f: "json"
    }), function (user) {
        callback(user);
    });
}

function userContent(portal, username, token, folder, callback) {
    $.getJSON(portal + "sharing/rest/content/users/" + username + "/" + folder + "?" + $.param({
        token: token,
        f: "json"
    }), function (content) {
        callback(content);
    });
}

function itemDescription(portal, id, token, callback) {
    $.getJSON(portal + "sharing/rest/content/items/" + id + "?" + $.param({
        token: token,
        f: "json"
    }), function (description) {
        callback(description);
    });
}

function itemData(portal, id, token, callback) {
    $.ajax({
        url: portal + "sharing/rest/content/items/" + id + "/data?f=json&token=" + token,
        type: "GET",
        dataType: "json",
        success: function (data) {
            callback(data);
        },
        error: function (response) {
            callback(response);
        }
    });
}

function addItem(portal, username, folder, token, description, data, thumbnailUrl, callback) {
    // Create a new item on the specified portal.
    
    // Clean up description items for posting.
    // This is necessary because some of the item descriptions (e.g. tags and extent)
    // are returned as arrays, but the post operation expects comma separated strings.
    $.each(description, function (item, value) {
        if (value === null) {
            description[item] = "";
        } else if (value instanceof Array) {
            description[item] = arrayToString(value);
        }
    });
    
    // Create a new item in a user's content.
    var itemParams = {
        item: description.title,
        text: data,
        overwrite: false,
        thumbnailurl: thumbnailUrl
    };
    var postParams = $.param(description) + "&" + $.param(itemParams);
    // Post it to the destination.
    $.ajax({
        url: portal + "sharing/rest/content/users/" + username + "/" + folder + "/addItem?f=json&token=" + token,
        type: "POST",
        data: postParams,
        dataType: "json",
        success: function (data) {
            callback(data);
        },
        error: function (data, textStatus, xhr) {
            callback(data, textStatus, xhr);
        }
    });
}

function arrayToString(array) {
    // Convert an array to a comma separated string.
    var arrayString;
    $.each(array, function (index, arrayValue) {
        if (index === 0) {
            arrayString = arrayValue;
        } else if (index > 0) {
            arrayString = arrayString + "," + arrayValue;
        }
    });
    return arrayString;
}
