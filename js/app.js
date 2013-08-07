var app = {
    user: {},
    stats: {
        activities: {}
    },
};

function validateUrl(el) {
    // Check the url for errors (e.g. no trailing slash)
    // and update it before sending.
    "use strict";
    var portal = $.trim($(el).val()), // trim whitespace
        html = $("#urlErrorTemplate").html();
    if (portal === "") {
        // Default to ArcGIS Online.
        portal = "https://arcgis.com/";
    } else if (portal.search("/home/") > 0) {
        // Strip the /home endpoint.
        portal = portal.substr(0, portal.search("/home/")) + "/";
    } else if (portal.search("/sharing/") > 0) {
        // Strip the /home endpoint.
        portal = portal.substr(0, portal.search("/sharing/")) + "/";
    } else if (portal.charAt(portal.length - 1) !== "/") {
        // Add the trailing slash.
        portal = portal + "/"
    }
    $(el).val(portal);

    $.when(portalVersion(portal, function (response) {
        if (response === "error") {
            $(el).parent().after(html);    
        }
        else {
            console.log("API v" + response);
        }
    }));
}

function loginSource() {
    $("#sourceLoginBtn").button("loading");
    $("#itemsArea").empty(); //Clear any old items.

    $.when(getToken($("#sourceUrl").val(), $("#sourceUsername").val(), $("#sourcePassword").val(), "#sourceLoginForm", function (token) {
        $("#sourceLoginBtn").button("reset");
        $.when(storeCredentials("source", $("#sourceUrl").val(), token, function (callback) {
            startSession();
        }));
    }));
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

function storeCredentials(direction, url, token, callback) {
    "use strict";
    $.getJSON(url + "sharing/rest/portals/self?f=json&token=" + token, function (data) {
        sessionStorage[direction + "Token"] = token;
        sessionStorage[direction + "Url"] = url;
        sessionStorage[direction + "Username"] = data.user.username;
        callback();
    });
}

function loginDestination() {
    $("#destinationLoginBtn").button("loading");
    $("#dropArea").empty(); //Clear any old items.
    $.when(getToken($("#destinationUrl").val(), $("#destinationUsername").val(), $("#destinationPassword").val(), "#destinationLoginForm", function (token) {
        $("#destinationLoginBtn").button("reset");
        $.when(storeCredentials("destination", $("#destinationUrl").val(), token, function (callback) {
            $("#copyModal").modal("hide");
            /*$(".content").addClass("disabled");
            $(".content").css({ "opacity" : 1 });*/
            $(".content").each(function (i) {
                makeDraggable($(this)); //Make the content draggable.
            });
            cleanUp();
            showDestinationFolders();
        }));
    }));
}

function logout() {
    sessionStorage.clear();
    $("#itemsArea").empty(); //Clear any old items.
    $("#dropArea").empty(); //Clear any old items.
    $("#sessionDropdown").remove();
    $("#actionDropdown").css({
        "visibility": "hidden"
    });
    $("#sourceLoginForm").show();
    $("#sourceLoginBtn").show();
}

function inspectContent() {
    $(".content").addClass("data-toggle");
    $(".content").removeClass("disabled");
    $(".content").attr("data-toggle", "button");

    $("#inspectModal").modal("hide");
    $("#inspectBtn").button("reset");
    // Add a listener for clicking on content buttons.
    $(".content").click(function () {
        $(".content").removeClass("active");
        $(".content").removeClass("btn-info");
        $(this).addClass("btn-info");
        var id = $(this).attr("data-id"),
            title = $(this).text();
        $.when(itemDescription(sessionStorage["sourceUrl"], id, sessionStorage["sourceToken"], function (description) {
            var descriptionString = JSON.stringify(description, undefined, 4);
            $.when(itemData(sessionStorage["sourceUrl"], id, sessionStorage["sourceToken"], function (data) {
                var dataString = JSON.stringify(data, undefined, 4);
                var templateData = {
                    title: title,
                    description: descriptionString,
                    data: dataString
                }
                var html = Mustache.to_html($("#inspectTemplate").html(), templateData);
                // Add the HTML container with the item JSON.
                $("#dropArea").html(html);
            }));
        }));
    });
}

function viewStats() {
    $.when(userProfile(sessionStorage["sourceUrl"], sessionStorage["sourceUsername"], sessionStorage["sourceToken"], function (user) {

        var template = $("#statsTemplate").html();
        var thumbnailUrl;
        // Check that the user has a thumbnail image.
        if (user.thumbnail) {
            thumbnailUrl = sessionStorage["sourceUrl"] + "sharing/rest/community/users/" + user.username + "/info/" + user.thumbnail + "?token=" + sessionStorage["sourceToken"];
        } else {
            thumbnailUrl = "assets/images/no-user-thumb.jpg";
        }
        var data = {
            username: user.username,
            thumbnail: thumbnailUrl
        }
        html = Mustache.to_html(template, data);
        $("body").append(html);
        statsCalendar(app.stats.activities);

        $("#statsModal").modal("show");

        $("#statsModal").on("shown", function () {
            // Apply CSS to style the calendar arrows.
            var calHeight = $(".calContainer").height();
            $(".calArrow").css("margin-top", (calHeight - 20) + "px");
        });

        $("#statsModal").on("hidden", function () {
            // Destroy the stats modal so it can be properly rendered next time.
            $("#statsModal").remove();
        });

    }));
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

function statsCalendar(activities) {

    // Create a date object for three months ago.
    var today = new Date();
    var startDate = new Date();
    startDate.setMonth(today.getMonth() - 2);
    if (today.getMonth() < 2) {
        startDate.setYear(today.getYear() - 1);
    }

    var cal = new CalHeatMap();
    cal.init({
        itemSelector: "#statsCalendar",
        domain: "month",
        subDomain: "day",
        data: activities,
        start: startDate,
        cellSize: 10,
        domainGutter: 10,
        range: 3,
        legend: [1, 2, 5, 10],
        displayLegend: false,
        itemNamespace: "cal",
        previousSelector: "#calPrev",
        nextSelector: "#calNext",
        domainLabelFormat: "%b '%y",
        subDomainTitleFormat: {
            empty: "No activity on {date}",
            filled: "Saved {count} {name} {connector} {date}"
        },
        domainDynamicDimension: false
    });

}

function storeActivity(activityTime) {
    seconds = activityTime / 1000;
    app.stats.activities[seconds] = 1;
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

function moveItem(item, destination) {
    // Move the content DOM element from the source to the destination container on the page.
    "use strict";
    item.prependTo(destination);
    var itemId = $(item).attr("data-id");
    var destinationFolder = $(item).parent().attr("data-folder");
    copyItem(itemId, destinationFolder);
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
