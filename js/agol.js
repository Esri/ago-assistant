var app = {
    user : {},
    stats : {
        activities : {}
    },
};

function validateUrl(el) {
    // Check the url for errors (e.g. no trailing slash)
    // and update it before sending.
    "use strict";
    var url = $(el).val();
    if (url === "") {
        url = "https://arcgis.com/";
        $(el).val(url);
    } else if (url.charAt(url.length - 1) !== "/") {
        url = url + "/"
        $(el).val(url);
    }

    var html = $("#urlErrorTemplate").html();
    $.getJSON(url + "sharing/rest?f=json", function (data) {
        console.log("API v" + data.currentVersion); // List the API version.
    })
        .error(function () {
        $(el).parent().after(html);
    });
}

function getToken(url, username, password, form, callback) {
    "use strict";
    // Define token parameters.
    var token, tokenParams = {
            username: username,
            password: password,
            referer: $(location).attr("href"),
            expiration: 60,
            f: "json"
        };

    //Get session token
    $.ajax({
        url: url + "sharing/rest/generateToken?",
        type: "POST",
        dataType: 'json',
        data: tokenParams,
        success: function (data) {
            if (data.token) {
                callback(data.token);
            } else if (data.error.code === 400) {
                var html = $("#loginErrorTemplate").html();
                $(form).before(html);
                callback();
            } else {
                console.log("Unhandled error.");
                console.log(data);
                callback();
            }
        },
        error: function (response) {
            console.log("Error");
            console.log(response);
        }
    });
}

function storeCredentials(direction, url, token, callback) {
    "use strict";
    $.getJSON(url + "sharing/rest/portals/self?f=json&token=" + token, function (data) {
        sessionStorage[direction + "Token"] = token;
        sessionStorage[direction + "Url"] = url;
        sessionStorage[direction + "Username"] = data.user.username;
        callback();
    });
}

function startSession() {
    "use strict";
    var url = sessionStorage["sourceUrl"],
        token = sessionStorage["sourceToken"],
        template,
        html;
    $.getJSON(url + "sharing/rest/portals/self?f=json&token=" + token, function (data) {
        $("#sourceLoginForm").hide();
        $("#sourceLoginBtn").hide();
        $("#logout").show();
        template = $("#sessionTemplate").html();
        html = Mustache.to_html(template, data);
        $("#sourceLoginForm").before(html);
        $("#actionDropdown").css({
            "visibility": "visible"
        });
        template = $("#loginSuccessTemplate").html();
        html = Mustache.to_html(template, data);
        $("#sessionDropdown").before(html);
        $("#loginSuccess").fadeOut(4000);
        listItems();
    });
}

function makeDraggable(el) {
    el.draggable({
        cancel: false,
        helper: "clone",
        appendTo: "body",
        revert: "invalid",
        opacity: 0.45
    });
}

function makeDroppable(id) {
    // Make the drop area accept content items.
    $("#dropFolder" + id).droppable({
        accept: ".content",
        activeClass: "ui-state-hover",
        hoverClass: "ui-state-active",
        drop: function (event, ui) {
            var destFolder = $(this).parent().parent().attr("data-folder");
            moveItem(ui.draggable, $(this).parent().parent());
        }
    });
}

function moveItem(item, destination) {
    // Move the content DOM element from the source to the destination container on the page.
    "use strict";
    item.prependTo(destination);
    var itemId = $(item).attr("data-id");
    var destinationFolder = $(item).parent().attr("data-folder");
    copyItem(itemId, destinationFolder);

}

function listItems() {
    "use strict";
    var sourcePortal = {
        url: sessionStorage["sourceUrl"],
        username: sessionStorage["sourceUsername"],
        params: {
            token: sessionStorage["sourceToken"],
            f: "json"
        }
    };

    //Get user contents
    $.getJSON(sourcePortal.url + "sharing/rest/content/users/" + sourcePortal.username + "?" + $.param(sourcePortal.params), function (data) {
        var folderTemplate = $("#folderTemplate").html(),
            contentTemplate = $("#contentTemplate").html();

        // Add an entry for the root folder.
        var folderData = {
            name: "Root (Top Level)",
            elName: "source" + "Root",
            id: "Root",
            count: data.items.length
        };
        var folderHtml = Mustache.to_html(folderTemplate, folderData);
        $("#itemsArea").append(folderHtml);

        //Append the root items to the list
        $.each(data.items, function (item) {
            var contentData = {
                id: data.items[item].id,
                title: data.items[item].title,
                type: data.items[item].type
            };
            var contentHtml = Mustache.to_html(contentTemplate, contentData);
            $("#collapseRoot").append(contentHtml);
            storeActivity(data.items[item].modified);
        });
        $.each(data.folders, function (folder) {
            $.getJSON(sourcePortal.url + "sharing/rest/content/users/" + sourcePortal.username + "/" + data.folders[folder].id + "?" + $.param(sourcePortal.params), function (folderItems) {
                // Append the folder.
                var folderData = {
                    name: data.folders[folder].title,
                    elName: "source" + data.folders[folder].title,
                    id: data.folders[folder].id,
                    count: folderItems.items.length
                };
                var folderHtml = Mustache.to_html(folderTemplate, folderData);
                $("#itemsArea").append(folderHtml);

                // Append the folder content to each folder.
                $.each(folderItems.items, function (folderItem) {
                    var contentData = {
                        id: folderItems.items[folderItem].id,
                        title: folderItems.items[folderItem].title,
                        type: folderItems.items[folderItem].type
                    };
                    storeActivity(folderItems.items[folderItem].modified);
                    var contentHtml = Mustache.to_html(contentTemplate, contentData);
                    $("#collapse" + folderData.id).append(contentHtml);
                    // Collapse the accordion to avoid cluttering the display.
                    $("#collapse" + folderData.id).collapse("hide");
                });
            });
        });
    });

}

function showDestinationFolders(url, token) {
    "use strict";

    var destinationPortal = {
        url: sessionStorage["destinationUrl"],
        username: sessionStorage["destinationUsername"],
        params: {
            token: sessionStorage["destinationToken"],
            f: "json"
        }
    };

    // Show folders in the destination.
    $.getJSON(destinationPortal.url + "sharing/rest/content/users/" + destinationPortal.username + "?" + $.param(destinationPortal.params), function (data) {
        var folderTemplate = $("#destinationFolderTemplate").html();
        var contentTemplate = $("#contentTemplate").html();

        // Add an entry for the root folder.
        var folderData = {
            name: "Root (Top Level)",
            id: "",
            count: data.items.length
        };
        var folderHtml = Mustache.to_html(folderTemplate, folderData);
        $("#dropArea").append(folderHtml);
        makeDroppable("Dest" + folderData.id); // Enable the droppable area.

        $.each(data.folders, function (folder) {
            $.getJSON(destinationPortal.url + "sharing/rest/content/users/" + destinationPortal.username + "/" + data.folders[folder].id + "?" + $.param(destinationPortal.params), function (folderItems) {
                // Append the folder.
                var folderData = {
                    name: data.folders[folder].title,
                    id: data.folders[folder].id,
                    count: folderItems.items.length
                };
                var folderHtml = Mustache.to_html(folderTemplate, folderData);
                $("#dropArea").append(folderHtml);
                // Collapse the accordion to avoid cluttering the display.
                $("#collapse" + folderData.id).collapse("hide");
                makeDroppable("Dest" + folderData.id); // Enable the droppable area.
            });
        });
    });

}

function copyItem(id, folder) {
    "use strict";
    var sourcePortal = {
        url: sessionStorage["sourceUrl"],
        username: sessionStorage["sourceUsername"],
        params: {
            token: sessionStorage["sourceToken"],
            f: "json"
        }
    };

    var destinationPortal = {
        url: sessionStorage["destinationUrl"],
        username: sessionStorage["destinationUsername"],
        params: {
            token: sessionStorage["destinationToken"],
            f: "json"
        }
    };

    var type = $("#" + id).attr("data-type");
    // Ensure the content type is supported before trying to copy it.
    if (isSupported(type)) {
        // Get the full item description from the source.
        $.getJSON(sourcePortal.url + "sharing/rest/content/items/" + id + "?" + $.param(sourcePortal.params), function (description) {

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
            var thumbUrl = sourcePortal.url + "sharing/rest/content/items/" + id + "/info/" + description.thumbnail + "?" + $.param(sourcePortal.params).replace("&f=json", "");

            // Get the item's data.
            $.get(sourcePortal.url + "sharing/rest/content/items/" + id + "/data" + "?" + $.param(sourcePortal.params), function (data) {
                var itemParams = {
                    item: description.title,
                    text: data,
                    overwrite: false,
                    thumbnailurl: thumbUrl
                };
                var addItemParams = $.param(description) + "&" + $.param(itemParams);
                // Post it to the destination.
                $.post(destinationPortal.url + "sharing/rest/content/users/" + destinationPortal.username + "/" + folder + "/addItem?" + $.param(destinationPortal.params), addItemParams, function (response) {
                    var responseJson = $.parseJSON(response);
                    if (responseJson.success === true) {
                        $("#" + id).addClass("btn-success");
                    } else if (responseJson.error) {
                        $("#" + id).addClass("btn-danger");
                        var message = responseJson.error.message
                        var html = Mustache.to_html($("#contentCopyErrorTemplate").html(), {
                            id: id,
                            message: message
                        });
                        $("#" + id).before(html);
                    } else {
                        var message = "Something went wrong."
                        var html = Mustache.to_html($("#contentCopyErrorTemplate").html(), {
                            id: id,
                            message: message
                        });
                        $("#" + id).before(html);
                    }
                });
            });

        });
    } else {
        // Not supported.
        $("#" + id).addClass("btn-warning");
        var html = Mustache.to_html($("#contentTypeErrorTemplate").html(), {
            id: id,
            type: type
        });
        $("#" + id).before(html);
        $("#" + id + "_alert").fadeOut(6000);
    }

}

function userContent(portal, user, token, callback) {
    var content;
    $.getJSON(portal + "sharing/rest/content/users/" + user + "?" + $.param({
        token: token,
        f: "json"
    }), function (content) {
        $.each(data.items, function (item) {
            var contentData = {
                id: data.items[item].id,
                title: data.items[item].title,
                type: data.items[item].type
            };
            var contentHtml = Mustache.to_html(contentTemplate, contentData);
            $("#collapseRoot").append(contentHtml);
        });
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
    $.getJSON(portal + "sharing/rest/content/items/" + id + "/data?" + $.param({
        token: token,
        f: "json"
    }), function (data) {
        callback(data);
    });
}

function cleanUp() {
    $("#dropArea").empty(); //Clear any old items.
    $(".content").unbind("click"); // Remove old event handlers.
}

function isSupported(type) {
    // Check if the content type is supported.
    // List of types available here: http://resources.arcgis.com/en/help/arcgis-rest-api/index.html#//02r3000000ms000000
    var supportedTypes = ["Web Map", "Map Service", "Image Service", "WMS", "Feature Collection", "Feature Collection Template",
                          "Geodata Service", "Globe Service", "Geometry Service", "Geocoding Service", "Network Analysis Service",
                          "Geoprocessing Service", "Web Mapping Application", "Mobile Application", "Operation View", "Symbol Set",
                          "Color Set", "Document Link"];
    if ($.inArray(type, supportedTypes) > -1) {
        return true;
    }
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

function storeActivity(activityTime) {
    seconds = activityTime / 1000;
    app.stats.activities[seconds] = 1;
}

function userProfile(portal, username, token, callback) {
    $.getJSON(portal + "sharing/rest/community/users/" + username + "?" + $.param({
        token: token,
        f: "json"
    }), function (user) {
        callback(user);
    });
}

function statsCalendar(activities) {

    // Create a date object for tomorrow's date, last year.
    // e.g. July 30th, 2013 becomes July 31st, 2012.
    var today = new Date();
    var startDate = new Date();
    startDate.setDate(today.getDate() - 120);
    
    var cal = new CalHeatMap();
    cal.init({
        itemSelector: "#statsCalendar",
        domain: "month",
        subDomain: "day",
        data: activities,
        start: startDate,
        cellSize: 10,
        domainGutter: 10,
        range: 4,
        legend: [1, 2, 5, 10],
        displayLegend: false,
        itemNamespace: "cal",
        previousSelector: "#calPrev",
        nextSelector: "#calNext",
        domainLabelFormat: "%b '%y",
        onComplete: function() {
            console.log($("svg.graph").width());
        }
    });

}