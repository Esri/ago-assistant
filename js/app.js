function resizeContentAreas() {
    "use strict";
    var height = jQuery(window).height() - 50;
    jQuery("#itemsArea").height(height);
    jQuery("#dropArea").height(height);
}

 // Do stuff when DOM is ready.
jQuery(document).ready(function() {

    // Detect IE.
    if (navigator.appName == 'Microsoft Internet Explorer') {
        alert("This site uses HTML5 features which aren't supported yet in Internet Explorer.\n Try Firefox or Chrome for a better experience.");
    }

    jQuery("#logout").hide();

    resizeContentAreas(); // Resize the content areas based on the window size.

    jQuery("#sourceUrl").tooltip({
        trigger: "hover",
        title: "Use https://www.arcgis.com/ for AGOL Organization accounts.",
        placement: "bottom"
    });

    jQuery("#destinationAgolBtn").tooltip({
        trigger: "hover",
        title: "Use this for AGOL Organization accounts.",
        placement: "bottom"
    });

    // Preformat the copy login screen.
    jQuery("#destinationAgolBtn").button("toggle");
    jQuery("#destinationAgolBtn").addClass("btn-primary");
    jQuery("#destinationUrl").css({
        "visibility": "hidden"
    });

    jQuery("#destinationAgolBtn").click(function() {
        jQuery("#destinationUrl").attr({
            "placeholder": "",
            "value": "https://www.arcgis.com/"
        });
        jQuery("#destinationUrl").val("https://www.arcgis.com/");
        jQuery("#destinationUrl").css({
            "visibility": "hidden"
        });
        jQuery("#destinationAgolBtn").addClass("btn-primary active");
        jQuery("#destinationPortalBtn").removeClass("btn-primary active");
    });
    jQuery("#destinationPortalBtn").click(function() {
        jQuery("#destinationUrl").attr({
            "placeholder": "https://myportal.com/",
            "value": ""
        });
        jQuery("#destinationUrl").val("");
        jQuery("#destinationUrl").css({
            "visibility": "visible"
        });
        jQuery("#destinationPortalBtn").addClass("btn-primary active");
        jQuery("#destinationAgolBtn").removeClass("btn-primary active");
    });

});

 // Do stuff when the window is resized.
jQuery(window).resize(function() {
    resizeContentAreas(); // Resize the content areas based on the window size.
});

 // Validate the url when the input loses focus.
jQuery("#sourceUrl").blur(function() {
    validateUrl("#sourceUrl");
});
jQuery("#destinationUrl").blur(function() {
    // Give the DOM time to update before firing the validation.
    setTimeout(function() {
        if (jQuery("#destinationPortalBtn").hasClass("active")) {
            validateUrl("#destinationUrl");
        }
    }, 500);
});

 // Source Login.
jQuery("#sourceLoginBtn").click(function() {
    loginSource();
});

 // Destination Login.
jQuery("#destinationLoginBtn").click(function() {
    loginDestination();
});

 // Reset the destination login form when the modal is canceled.
jQuery("#destinationLoginBtn").click(function() {
    jQuery("#destinationLoginBtn").button("reset");
});

 // Add a listener for the enter key on the source login form.
jQuery("#sourceLoginForm").keypress(function(e) {
    if (e.which == 13) {
        jQuery("#sourceLoginBtn").focus().click();
    }
});

 // Add a listener for the enter key on the destination login form.
jQuery("#destinationLoginForm").keypress(function(e) {
    if (e.which == 13) {
        jQuery("#destinationLoginBtn").focus().click();
    }
});

 // Add a listener for the future logout button.
jQuery(document).on("click", "li[data-action='logout']", (function() {
    logout();
}));

 // Load the html templates.
jQuery.get("templates.html", function(templates) {
    jQuery("body").append(templates);
});

 // Clean up the lists when copy content is selected.
jQuery("#copyModal").on("show.bs.modal", function () {
    cleanUp();
});

 // Enable inspecting of content.
jQuery("li[data-action='inspectContent']").click(function() {
    cleanUp();
    jQuery("#currentAction").html("<a>inspect content</a>");
    inspectContent();
});

 // Add a listener for the "View my stats" action.
jQuery("li[data-action='stats']").click(function() {
    cleanUp();
    jQuery("#currentAction").html("<a>view stats</a>");
    viewStats();
});

 // Add a listener for the "Update map services" action.
jQuery("li[data-action='updateWebmapServices']").click(function() {
    cleanUp();
    jQuery("#currentAction").html("<a>update web map service URLs</a>");
    updateWebmapServices();
});

 // Add a listener for the "Update map services" action.
jQuery("li[data-action='updateContentUrl']").click(function() {
    cleanUp();
    jQuery("#currentAction").html("<a>update content URL</a>");
    updateContentUrls();
});





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
    var portal = jQuery.trim(jQuery(el).val()), // trim whitespace
        html = jQuery("#urlErrorTemplate").html();
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
        portal = portal + "/";
    }
    jQuery(el).val(portal);

    jQuery.when(portalVersion(portal, function (response) {
        if (response === "error") {
            jQuery(el).parent().after(html);
        } else {
            console.log("API v" + response);
        }
    }));
}

function loginSource() {
    jQuery("#sourceLoginBtn").button("loading");
    jQuery("#itemsArea").empty(); //Clear any old items.
    jQuery.when(generateToken(jQuery("#sourceUrl").val(), jQuery("#sourceUsername").val(), jQuery("#sourcePassword").val(), function (response) {
        jQuery("#sourceLoginBtn").button("reset");
        if (response.token) {
            // Store the portal info in the browser's sessionStorage.
            jQuery.when(storeCredentials("source", jQuery("#sourceUrl").val(), jQuery("#sourceUsername").val(), response.token, function (callback) {
                startSession();
            }));
        } else if (response.error.code === 400) {
            var html = jQuery("#loginErrorTemplate").html();
            jQuery("#sourceLoginForm").before(html);
        } else {
            console.log("Unhandled error.");
            console.log(response);
        }
    }));
}

function startSession() {
    "use strict";
    var portal = sessionStorage.sourceUrl,
        token = sessionStorage.sourceToken;
    jQuery.when(portalInfo(portal, token, function (info) {
        var template = jQuery("#sessionTemplate").html(),
            html = Mustache.to_html(template, info);
        jQuery("#sourceLoginForm").before(html);
        jQuery("#sourceLoginForm").hide();
        jQuery("#sourceLoginBtn").hide();
        jQuery("#logout").show();
        jQuery("#actionDropdown").css({
            "visibility": "visible"
        });
        NProgress.start();
        listItems();
        NProgress.done();
    }));
}

function storeCredentials(direction, portal, username, token, callback) {
    "use strict";
    sessionStorage[direction + "Token"] = token;
    sessionStorage[direction + "Url"] = portal;
    sessionStorage[direction + "Username"] = username;
    callback();
}

function loginDestination() {
    jQuery("#destinationLoginBtn").button("loading");
    jQuery("#dropArea").empty(); //Clear any old items.
    jQuery.when(generateToken(jQuery("#destinationUrl").val(), jQuery("#destinationUsername").val(), jQuery("#destinationPassword").val(), function (response) {
        jQuery("#destinationLoginBtn").button("reset");
        if (response.token) {
            jQuery.when(storeCredentials("destination", jQuery("#destinationUrl").val(), jQuery("#destinationUsername").val(), response.token, function (callback) {
                jQuery("#copyModal").modal("hide");
                jQuery(".content").each(function (i) {
                    var type = jQuery(this).attr("data-type");
                    if (isSupported(type)) {
                        jQuery(this).addClass("btn-info"); // Highlight supported content.
                        makeDraggable(jQuery(this)); //Make the content draggable.
                    }
                    jQuery(this).css("max-width", jQuery("#itemsArea .panel-body").width()); // Set the max-width so it doesn't fill the body when dragging.
                });
                jQuery("#currentAction").html("<a>copy content</a>");
                NProgress.start();
                showDestinationFolders();
                NProgress.done();
            }));
        } else if (response.error.code === 400) {
            var html = jQuery("#loginErrorTemplate").html();
            jQuery("#destinationLoginForm").before(html);
        } else {
            console.log("Unhandled error.");
            console.log(response);
        }
    }));
}

function logout() {
    sessionStorage.clear();
    jQuery("#currentAction").html("");
    jQuery("#itemsArea").empty(); //Clear any old items.
    jQuery("#dropArea").empty(); //Clear any old items.
    jQuery("#sessionDropdown").remove();
    jQuery("#loginSuccess").remove();
    jQuery("#actionDropdown").css({
        "visibility": "hidden"
    });
    jQuery("#sourceLoginForm").show();
    jQuery("#sourceLoginBtn").show();
}

function inspectContent() {
    jQuery(".content").addClass("data-toggle");
    jQuery(".content").removeClass("disabled");
    jQuery(".content").attr("data-toggle", "button");
    jQuery(".content").addClass("btn-info"); // Highlight everything

    jQuery("#inspectModal").modal("hide");
    jQuery("#inspectBtn").button("reset");
    // Add a listener for clicking on content buttons.
    jQuery(".content").click(function () {
        NProgress.start();
        jQuery(".content").removeClass("active");
        jQuery(".content").removeClass("btn-primary");
        jQuery(this).addClass("btn-primary");
        var id = jQuery(this).attr("data-id"),
            title = jQuery(this).text();
        jQuery.when(itemDescription(sessionStorage.sourceUrl, id, sessionStorage.sourceToken, function (description) {
            var descriptionString = JSON.stringify(description, undefined, 2);
            jQuery.when(itemData(sessionStorage.sourceUrl, id, sessionStorage.sourceToken, function (data) {
                if (data.statusText) {
                    // No data was returned.
                    data = "";
                }
                var templateData = {
                    title: title,
                    description: descriptionString,
                    data: JSON.stringify(data, undefined, 2)
                };
                var html = Mustache.to_html(jQuery("#inspectTemplate").html(), templateData);
                // Add the HTML container with the item JSON.
                jQuery("#dropArea").html(html);
                // Color code the JSON to make it easier to read (uses highlight.js).
                jQuery("pre").each(function (i, e) {
                    hljs.highlightBlock(e);
                });
                NProgress.done();
            }));
        }));
    });
}

function updateWebmapServices() {
    var webmapData, // make a couple globals so we can access them in other parts of the function
        folder;
    jQuery(".content").addClass("data-toggle");
    jQuery(".content").removeClass("disabled");
    jQuery(".content").attr("data-toggle", "button");
    jQuery(".content[data-type='Web Map']").addClass("btn-info"); // Highlight Web Maps

    // Add a listener for clicking on content buttons.
    jQuery(".content").click(function () {
        // Display the selected Web Map's operational layers with a URL component.
        jQuery(".content[data-type='Web Map']").addClass("btn-info"); // Highlight Web Maps
        jQuery(".content").removeClass("active");
        jQuery(".content").removeClass("btn-primary");
        jQuery(this).addClass("btn-primary");
        jQuery(this).removeClass("btn-info");
        var id = jQuery(this).attr("data-id"),
            webmapTitle = jQuery(this).text();
        jQuery.when(itemData(sessionStorage.sourceUrl, id, sessionStorage.sourceToken, function (data) {
            if (data.statusText) {
                // No data was returned.
                data = "";
            } else {
                webmapData = JSON.stringify(data);
                var operationalLayers = [];
                jQuery.each(data.operationalLayers, function (layer) {
                    if (data.operationalLayers[layer].hasOwnProperty("url")) {
                        operationalLayers.push(data.operationalLayers[layer]);
                    }
                });
                var basemapTitle = data.baseMap.title,
                    basemapLayers = [];
                jQuery.each(data.baseMap.baseMapLayers, function (layer) {
                    if (data.baseMap.baseMapLayers[layer].hasOwnProperty("url")) {
                        basemapLayers.push(data.baseMap.baseMapLayers[layer]);
                    }
                });

                var templateData = {
                    webmapTitle: webmapTitle,
                    operationalLayers: operationalLayers,
                    basemapTitle: basemapTitle,
                    basemapLayers: basemapLayers
                };
                var html = Mustache.to_html(jQuery("#webmapServicesTemplate").html(), templateData);
                // Add the HTML container with the item JSON.
                jQuery("#dropArea").html(html);
            }
        }));
    });

    jQuery(document).on("click", "#btnUpdateWebmapServices", (function () {
        var webmapServices = jQuery("[data-original]");
        jQuery.each(webmapServices, function (service) {
            var originalUrl = jQuery(webmapServices[service]).attr("data-original"),
                newUrl = jQuery(webmapServices[service]).val();
            // Find and replace each URL.
            webmapData = webmapData.replace(originalUrl, newUrl);
            jQuery(webmapServices[service]).val(newUrl);
        });
        var webmapId = jQuery(".content.active.btn-primary").attr("data-id"),
            folder = jQuery(".content.active.btn-primary").parent().attr("data-folder"),
            itemData = JSON.parse(webmapData);
        jQuery.when(updateWebmapData(sessionStorage.sourceUrl, sessionStorage.sourceUsername, folder, webmapId, itemData, sessionStorage.sourceToken, function (response) {
            var html;
            if (response.success) {
                html = Mustache.to_html(jQuery("#updateSuccessTemplate").html());
                jQuery("#btnResetWebmapServices").before(html);
            } else if (response.error.code === 400) {
                html = Mustache.to_html(jQuery("#updateErrorTemplate").html());
                jQuery("#btnResetWebmapServices").before(html);
            }
        }));
    }));

    jQuery(document).on("click", "#btnResetWebmapServices", (function () {
        var webmapServices = jQuery("[data-original]");
        jQuery.each(webmapServices, function (service) {
            var originalUrl = jQuery(webmapServices[service]).attr("data-original"),
                currentUrl = jQuery(webmapServices[service]).val();
            jQuery(webmapServices[service]).val(originalUrl);
            jQuery(webmapServices[service]).attr("data-original", currentUrl);
        });
    }));

}

function updateContentUrls() {
    var folder,
        supportedContent = jQuery(".content[data-type='Feature Service'], .content[data-type='Map Service'], .content[data-type='Image Service'], .content[data-type='KML'], .content[data-type='WMS'], .content[data-type='Geodata Service'], .content[data-type='Globe Service'], .content[data-type='Geometry Service'], .content[data-type='Geocoding Service'], .content[data-type='Network Analysis Service'], .content[data-type='Geoprocessing Service'], .content[data-type='Web Mapping Application'], .content[data-type='Mobile Application']");
    supportedContent.addClass("data-toggle btn-info"); // Highlight support content
    supportedContent.removeClass("disabled");
    supportedContent.attr("data-toggle", "button");

    // Add a listener for clicking on content buttons.
    jQuery(".content").click(function () {
        // Display the selected item's URL.
        supportedContent.addClass("btn-info"); // Highlight Web Maps
        jQuery(".content").removeClass("active");
        jQuery(".content").removeClass("btn-primary");
        jQuery(this).addClass("btn-primary");
        jQuery(this).removeClass("btn-info");
        var id = jQuery(this).attr("data-id"),
            title = jQuery(this).text();
        jQuery.when(itemDescription(sessionStorage.sourceUrl, id, sessionStorage.sourceToken, function (description) {
            if (description.statusText) {
                // No description was returned.
                description = "";
            } else {
                var html = Mustache.to_html(jQuery("#itemContentTemplate").html(), description);
                // Add the HTML container with the item JSON.
                jQuery("#dropArea").html(html);
            }
        }));
    });

    jQuery(document).on("click", "#btnUpdateContentUrl", (function () {
        var contentId = jQuery(".content.active.btn-primary").attr("data-id"),
            folder = jQuery(".content.active.btn-primary").parent().attr("data-folder"),
            url = jQuery("[data-original]").val();
        jQuery.when(updateContentUrl(sessionStorage.sourceUrl, sessionStorage.sourceUsername, folder, contentId, url, sessionStorage.sourceToken, function (response) {
            var html;
            if (response.success) {
                html = Mustache.to_html(jQuery("#updateSuccessTemplate").html());
                jQuery("#btnResetContentUrl").before(html);
            } else if (response.error.code === 400) {
                html = Mustache.to_html(jQuery("#updateErrorTemplate").html());
                jQuery("#btnResetContentUrl").before(html);
            }
        }));
    }));

    jQuery(document).on("click", "#btnResetContentUrl", (function () {
        var originalUrl = jQuery("[data-original]").attr("data-original"),
            currentUrl = jQuery("[data-original]").val();
        jQuery("[data-original]").val(originalUrl);
        jQuery("[data-original]").attr("data-original", currentUrl);
    }));

}

function viewStats() {
    jQuery.when(userProfile(sessionStorage.sourceUrl, sessionStorage.sourceUsername, sessionStorage.sourceToken, function (user) {

        var template = jQuery("#statsTemplate").html();
        var thumbnailUrl;
        // Check that the user has a thumbnail image.
        if (user.thumbnail) {
            thumbnailUrl = sessionStorage.sourceUrl + "sharing/rest/community/users/" + user.username + "/info/" + user.thumbnail + "?token=" + sessionStorage.sourceToken;
        } else {
            thumbnailUrl = "assets/images/no-user-thumb.jpg";
        }
        // Calculate storage quota stats.
        var gigabyteConstant = 0.000000000931322574615479,
            usage = (user.storageUsage * gigabyteConstant).toFixed(2),
            quota = (user.storageQuota * gigabyteConstant).toFixed(2),
            usageRate = (usage / quota).toFixed(2) * 100;

        var templateData = {
            username: user.username,
            thumbnail: thumbnailUrl,
            usage: usage,
            quota: quota,
            usageRate: usageRate
        };

        html = Mustache.to_html(template, templateData);
        jQuery("body").append(html);
        statsCalendar(app.stats.activities);

        jQuery("#statsModal").modal("show");

        // Get the user's 3 most viewed items.
        var searchQuery = "owner:" + sessionStorage.sourceUsername;
        jQuery.when(searchPortal(sessionStorage.sourceUrl, searchQuery, 3, "numViews", "desc", sessionStorage.sourceToken, function (results) {
            jQuery.each(results.results, function (result) {
                results.results[result].numViews = results.results[result].numViews.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                results.results[result].itemUrl = sessionStorage.sourceUrl + "home/item.html?id=" + results.results[result].id;
            });
            var tableTemplate = jQuery("#mostViewedContentTemplate").html();
            jQuery("#mostViewedContent").html(Mustache.to_html(tableTemplate, {
                searchResults: results.results
            }));
        }));

        jQuery("#statsModal").on("shown.bs.modal", function () {
            // Apply CSS to style the calendar arrows.
            var calHeight = jQuery(".calContainer").height();
            // Center the calendar.
            jQuery(".cal-heatmap-container").css("margin", "auto");
            // Adjust the arrows.
            jQuery(".calArrow").css("margin-top", (calHeight - 20) + "px");
        });

        jQuery("#statsModal").on("hidden.bs.modal", function () {
            jQuery("#currentAction").html("");
            // Destroy the stats modal so it can be properly rendered next time.
            jQuery("#statsModal").remove();
        });

    }));
}

function makeDraggable(el) {
    el.draggable({
        cancel: false,
        helper: "clone",
        appendTo: "body",
        revert: "invalid",
        opacity: 0.7
    });
    el.removeClass("disabled");
}

function makeDroppable(id) {
    // Make the drop area accept content items.
    jQuery("#dropFolder_" + id).droppable({
        accept: ".content",
        activeClass: "ui-state-hover",
        hoverClass: "ui-state-active",
        drop: function (event, ui) {
            moveItem(ui.draggable, jQuery(this).parent().parent());
        }
    });
}

function cleanUp() {
    jQuery("#dropArea").empty(); //Clear any old items.
    jQuery(".content").unbind("click"); // Remove old event handlers.
    jQuery(".content").removeClass("active btn-primary btn-info ui-draggable");
    jQuery(".content").addClass("disabled");
}

function isSupported(type) {
    // Check if the content type is supported.
    // List of types available here: http://resources.arcgis.com/en/help/arcgis-rest-api/index.html#//02r3000000ms000000
    var supportedTypes = ["Web Map", "Map Service", "Image Service", "WMS", "Feature Collection", "Feature Collection Template",
                          "Geodata Service", "Globe Service", "Geometry Service", "Geocoding Service", "Network Analysis Service",
                          "Geoprocessing Service", "Web Mapping Application", "Mobile Application", "Operation View", "Symbol Set",
                          "Color Set", "Document Link"];
    if (jQuery.inArray(type, supportedTypes) > -1) {
        return true;
    }
}

function isTypeText(type) {
    var textTypes = ["Web Map", "Feature Collection", "Feature Collection Template", "Operation View", "Symbol Set", "Color Set", "Document Link"];
    if (jQuery.inArray(type, textTypes) > -1) {
        return true;
    }
}

function isTypeUrl(type) {
    var urlTypes = ["Feature Service", "Map Service", "Image Service", "KML", "WMS", "Geodata Service", "Globe Service", "Geometry Service",
                   "Geocoding Service", "Network Analysis Service", "Geoprocessing Service", "Web Mapping Application", "Mobile Application"];
    if (jQuery.inArray(type, urlTypes) > -1) {
        return true;
    }
}

function statsCalendar(activities) {

    // Create a date object for three months ago.
    var today = new Date();
    var startDate = new Date();
    startDate.setMonth(today.getMonth() - 2);
    if (today.getMonth() < 2) {
        startDate.setYear(today.getFullYear() - 1);
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
        tooltip: true,
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
    var url = sessionStorage.sourceUrl,
        username = sessionStorage.sourceUsername,
        token = sessionStorage.sourceToken;

    jQuery.when(userContent(url, username, token, "/", function (content) {
        // Append the root folder accordion.
        var folderData = {
            title: "Root",
            id: "",
            count: content.items.length
        };
        var html = Mustache.to_html(jQuery("#folderTemplate").html(), folderData);
        jQuery("#itemsArea").append(html);
        // Append the root items to the Root folder.
        jQuery.each(content.items, function (item) {
            var icon;
            if (isTypeText(this.type)) {
                icon = "globe";
            } else if (isTypeUrl(this.type)) {
                icon = "link";
            } else {
                icon = "file";
            }
            var templateData = {
                "id": this.id,
                "title": this.title,
                "type": this.type,
                "icon": icon
            };
            var html = Mustache.to_html(jQuery("#contentTemplate").html(), templateData);
            jQuery("#collapse_").append(html);
            storeActivity(content.items[item].modified);
        });
        jQuery.each(content.folders, function (folder) {
            jQuery.when(userContent(url, username, token, content.folders[folder].id, function (content) {
                var folderData = {
                    title: content.currentFolder.title,
                    id: content.currentFolder.id,
                    count: content.items.length
                };
                // Append an accordion for the folder.
                var html = Mustache.to_html(jQuery("#folderTemplate").html(), folderData);
                jQuery("#itemsArea").append(html);
                // Append the items to the folder.
                jQuery.each(content.items, function (item) {
                    var icon;
                    if (isTypeText(this.type)) {
                        icon = "globe";
                    } else if (isTypeUrl(this.type)) {
                        icon = "link";
                    } else {
                        icon = "file";
                    }
                    var templateData = {
                        "id": this.id,
                        "title": this.title,
                        "type": this.type,
                        "icon": icon
                    };
                    var html = Mustache.to_html(jQuery("#contentTemplate").html(), templateData);
                    jQuery("#collapse_" + content.currentFolder.id).append(html);
                    storeActivity(content.items[item].modified);
                });
                // Collapse the accordion to avoid cluttering the display.
                jQuery("#collapse_" + content.currentFolder.id).collapse("hide");
            }));
        });
    }));
}

function showDestinationFolders() {
    "use strict";
    var url = sessionStorage.destinationUrl,
        username = sessionStorage.destinationUsername,
        token = sessionStorage.destinationToken;

    jQuery.when(userContent(url, username, token, "/", function (content) {
        var folderData = {
            title: "Root",
            id: "",
            count: content.items.length
        };
        // Append the root folder accordion.
        var html = Mustache.to_html(jQuery("#dropFolderTemplate").html(), folderData);
        jQuery("#dropArea").append(html);
        makeDroppable(""); // Enable the droppable area.
        // Append the other folders.
        jQuery.each(content.folders, function (folder) {
            jQuery.when(userContent(url, username, token, content.folders[folder].id, function (content) {
                var folderData = {
                    title: content.currentFolder.title,
                    id: content.currentFolder.id,
                    count: content.items.length
                };
                // Append an accordion for the folder.
                var html = Mustache.to_html(jQuery("#dropFolderTemplate").html(), folderData);
                jQuery("#dropArea").append(html);
                // Collapse the accordion to avoid cluttering the display.
                jQuery("#collapse" + content.currentFolder.id).collapse("hide");
                makeDroppable(content.currentFolder.id); // Enable the droppable area.
            }));
        });
    }));
}

function moveItem(item, destination) {
    // Move the content DOM element from the source to the destination container on the page.
    "use strict";
    jQuery(item).css("max-width", ""); // Remove the max-width property so it fills the folder.
    item.prependTo(destination);
    var itemId = jQuery(item).attr("data-id");
    var destinationFolder = jQuery(item).parent().attr("data-folder");
    jQuery(item).removeClass("active btn-primary btn-info");
    copyItem(itemId, destinationFolder);
}

function copyItem(id, folder) {
    // id: id of the source item
    // folder: id of the destination folder
    "use strict";
    var sourcePortal = sessionStorage.sourceUrl,
        sourceToken = sessionStorage.sourceToken,
        destinationPortal = sessionStorage.destinationUrl,
        destinationUsername = sessionStorage.destinationUsername,
        destinationToken = sessionStorage.destinationToken;

    var type = jQuery("#" + id).attr("data-type");
    // Ensure the content type is supported before trying to copy it.
    if (isSupported(type)) {
        // Get the full item description and data from the source.
        jQuery.when(itemDescription(sourcePortal, id, sourceToken, function (description) {
            var thumbnailUrl = sourcePortal + "sharing/rest/content/items/" + id + "/info/" + description.thumbnail + "?token=" + sourceToken;
            jQuery.when(itemData(sourcePortal, id, sourceToken, function (data) {
                // Replace response object for items with no data component.
                if (data.responseText === "") {
                    data = "";
                }
                // Post it to the destination.
                jQuery.when(addItem(destinationPortal, destinationUsername, folder, destinationToken, description, data, thumbnailUrl, function (response) {
                    var message,
                        html;
                    if (response.success === true) {
                        jQuery("#" + id).addClass("btn-success");
                    } else if (response.error) {
                        jQuery("#" + id).addClass("btn-danger");
                        message = response.error.message;
                        html = Mustache.to_html(jQuery("#contentCopyErrorTemplate").html(), {
                            id: id,
                            message: message
                        });
                        jQuery("#" + id).before(html);
                    } else {
                        message = "Something went wrong.";
                        html = Mustache.to_html(jQuery("#contentCopyErrorTemplate").html(), {
                            id: id,
                            message: message
                        });
                        jQuery("#" + id).before(html);
                    }
                }));
            }));
        }));
    } else {
        // Not supported.
        jQuery("#" + id).addClass("btn-warning");
        var html = Mustache.to_html(jQuery("#contentTypeErrorTemplate").html(), {
            id: id,
            type: type
        });
        jQuery("#" + id).before(html);
        jQuery("#" + id + "_alert").fadeOut(6000);
    }
}