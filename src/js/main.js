require([
    "jquery",
    "portal/portal",
    "portal/info",
    "mustache",
    "nprogress",
    "esri/arcgis/Portal",
    "esri/arcgis/OAuthInfo",
    "esri/IdentityManager",
    "highlight",
    "jquery.ui",
    "bootstrap-shim"
], function (
    jquery,
    portal,
    info,
    mustache,
    NProgress,
    arcgisPortal,
    arcgisOAuthInfo,
    esriId,
    hljs
) {

    // *** ArcGIS OAuth ***
    var appInfo = new arcgisOAuthInfo({
        appId: "4E1s0Mv5r0c2l6W8",
        popup: true,
        portalUrl: "https://www.arcgis.com/"
    });

    // Some app level variables.
    var app = {
        user: {},
        stats: {
            activities: {}
        },
    };

    /**
     * Check the url for errors (e.g. no trailing slash)
     * and update it before sending.
     */
    var validateUrl = function (el) {
        "use strict";
        var portalUrl = jquery.trim(jquery(el).val());
        var html = jquery("#urlErrorTemplate").html();
        var fixUrl = function (url) {
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
            jquery(el).val(portalUrl);
            deferred.resolve(portalUrl);
            return deferred.promise();
        };

        fixUrl(jquery.trim(jquery(el).val())).done(function (url) {
            portal.version(url).done(function (data) {
                console.log("API v" + data.currentVersion);
            }).fail(function (response) {
                jquery(el).parent().after(html);
            });
        });
    };

    var startSession = function (portalUrl, user) {
        "use strict";
        var searchHtml;
        var token = user.token;
        app.user = user;
        portal.self(portalUrl, token).done(function (data) {
            var template = jquery("#sessionTemplate").html();
            var html = mustache.to_html(template, data);
            app.user.userId = data.user.username;
            app.user.server = "https://" + data.portalHostname + "/";
            jquery(".nav.navbar-nav").after(html);
            jquery("#logout").show();
            jquery("#actionDropdown").css({
                "visibility": "visible"
            });
            searchHtml = mustache.to_html(jquery("#searchTemplate").html(), {
                portal: app.user.server,
                name: data.name,
                id: data.id
            });
            jquery("#actionDropdown").before(searchHtml);

            // Add a listener for clicking the search icon.
            // Fix me.
            jquery(document).on("click", "i.glyphicon-search", function () {
                search();
            });

            // Add a listener for the enter key on the search form.
            jquery("#searchForm").keypress(function (e) {
                if (e.which == 13) {
                    search();
                }
            });

            NProgress.start();
            listUserItems();
            NProgress.done();
        });
    };

    var storeCredentials = function (direction, portal, username, token) {
        var deferred = jquery.Deferred();
        sessionStorage[direction + "Token"] = token;
        sessionStorage[direction + "Url"] = portal;
        sessionStorage[direction + "Username"] = username;
        deferred.resolve();
        return deferred.promise();
    };

    var loginPortal = function () {
        var portalUrl = jquery("#portalUrl").val();
        var username = jquery("#portalUsername").val();
        var password = jquery("#portalPassword").val();
        jquery("#portalLoginBtn").button("loading");
        portal.generateToken(portalUrl, username, password)
            .done(function (response) {
                if (response.token) {
                    var user = {
                        token: response.token,
                        expires: response.expires,
                        ssl: response.ssl
                    };
                    jquery("#portalLoginModal").modal("hide");
                    jquery("#splashContainer").css("display", "none");
                    jquery("#itemsContainer").css("display", "block");
                    startSession(portalUrl, user);
                } else if (response.error.code === 400) {
                    var html = jquery("#loginErrorTemplate").html();
                    jquery("#portalLoginForm").before(html);
                }
            })
            .fail(function (response) {
                console.log(response.statusText);
                var html = jquery("#loginErrorTemplate").html();
                jquery("#portalLoginForm").before(html);
            })
            .always(function () {
                jquery("#portalLoginBtn").button("reset");
            });
    };

    var loginDestination = function () {
        var portalUrl = jquery("#destinationUrl").val();
        var username = jquery("#destinationUsername").val();
        var password = jquery("#destinationPassword").val();
        jquery("#destinationLoginBtn").button("loading");
        jquery("#dropArea").empty();
        portal.generateToken(portalUrl, username, password)
            .done(function (response) {
                if (response.token) {
                    var token = response.token;
                    portal.self(portalUrl, token).done(function (data) {
                        username = data.user.username;
                        portalUrl = "https://" + data.portalHostname + "/";
                        storeCredentials("destination", portalUrl, username,
                                token)
                            .then(function () {
                                jquery("#copyModal").modal("hide");
                                highlightCopyableContent();
                                NProgress.start();
                                showDestinationFolders();
                                NProgress.done();
                            });
                    });
                } else if (response.error.code === 400) {
                    var html = jquery("#loginErrorTemplate").html();
                    jquery("#destinationLoginForm").before(html);
                }
            })
            .fail(function (response) {
                console.log(response.statusText);
                var html = jquery("#loginErrorTemplate").html();
                jquery("#destinationLoginForm").before(html);
            })
            .always(function () {
                jquery("#destinationLoginBtn").button("reset");
            });
    };

    var logout = function () {
        sessionStorage.clear();
        app.user = {};
        app.stats.activities = {};
        jquery("#actionDropdown li").removeClass("active");
        jquery("#itemsArea").empty();
        jquery("#dropArea").empty();
        jquery("#sessionDropdown").remove();
        jquery("#searchForm").remove();
        jquery("#actionDropdown").css({
            "visibility": "hidden"
        });
        esriId.destroyCredentials();
        window.location.reload();
    };

    var search = function () {

        var query = jquery("#searchText").val();
        var portalUrl = jquery("#searchMenu li.active").attr("data-url");
        var token;

        // Append the token only for searches in the user's portal.
        if (portalUrl === app.user.server) {
            token = app.user.token;
        }

        // Add the org id for "My Portal" searches.
        if (jquery("#searchMenu li.active").attr("data-id")) {
            query += " accountid:" +
                jquery("#searchMenu li.active").attr("data-id");
        }
        // Add the username for "My Content" searches.
        if (jquery("#searchMenu li.active").text() === "Search My Content") {
            query += " owner:" + app.user.userId;
        }

        NProgress.start();
        portal.search(portalUrl, query, 100, "numViews", "desc", token)
            .done(function (results) {
                listSearchItems(portalUrl, results);
                NProgress.done();
            });

    };

    var inspectContent = function () {
        require(["nprogress", "portal/portal", "highlight"],
            function (NProgress, portal, hljs) {

                var validateJson = function (jsonString) {
                    try {
                        var o = JSON.parse(jsonString);
                        if (o && typeof o === "object" && o !== null) {
                            return o;
                        }
                    } catch (e) {}
                    return false;
                };

                var startEditing = function (e) {

                    // Allow removing the button active state.
                    e.stopImmediatePropagation();

                    var codeBlock = jquery(e.currentTarget)
                        .parent()
                        .next();
                    editButton = jquery(e.currentTarget);
                    saveButton = jquery(e.currentTarget)
                        .parent()
                        .children("[data-action='saveEdits']");

                    // Reset the save button.
                    saveButton
                        .children("span")
                        .attr("class", "fa fa-lg fa-save");

                    if (codeBlock.attr("contentEditable") !== "true") {
                        // Start editing.
                        editButton
                            .children("span")
                            .attr("class", "fa fa-lg fa-undo");
                        editButton.attr("data-toggle", "tooltip");
                        editButton.attr("data-placement", "bottom");
                        editButton.attr("title", "Discard your edits");
                        editButton.tooltip();
                        jsonBackup = codeBlock.text();
                        codeBlock.attr("contentEditable", "true");
                        codeBlock.bind("input", function (e) {
                            // Validate the JSON as it is edited.
                            jsonValid = validateJson(codeBlock.text());
                            saveButton.tooltip("destroy");
                            if (jsonValid) {
                                // Valid. Allow saving.
                                saveButton.removeClass("disabled");
                                saveButton.css("color", "green");
                                saveButton.attr("data-toggle", "tooltip");
                                saveButton.attr("data-placement", "bottom");
                                saveButton.attr("title",
                                    "JSON is valid. Click to save."
                                );
                            } else {
                                // Invalid. Prevent saving.
                                saveButton.css("color", "red");
                                saveButton.attr("data-toggle", "tooltip");
                                saveButton.attr("data-placement", "bottom");
                                saveButton.attr("title",
                                    "JSON is invalid. Saving not allowed."
                                );
                            }
                            saveButton.tooltip({
                                container: "body"
                            });
                        });
                        editButton.attr("class", "btn btn-default");
                        saveButton.attr("class", "btn btn-default");
                    } else {
                        // Let the user back out of editing without saving.
                        // End editing and restore the original json.
                        codeBlock.attr("contentEditable", "false");
                        codeBlock.text(jsonBackup);
                        codeBlock.each(function (i, e) {
                            hljs.highlightBlock(e);
                        });
                        editButton.attr("class", "btn btn-default");
                        editButton.children("span")
                            .attr("class", "fa fa-lg fa-pencil");
                        editButton.tooltip("destroy");
                        saveButton.attr("class", "btn btn-default disabled");
                        saveButton.css("color", "black");
                    }

                    // Post the edited JSON.
                    saveButton.click(function (e) {
                        if (jsonValid) {
                            // JSON is valid. Allow saving.
                            var newJson = codeBlock.text();
                            var itemInfo = JSON.parse(
                                jquery("#descriptionJson").text()
                            );
                            editButton.attr("class", "btn btn-default");
                            editButton.children("span")
                                .attr("class", "fa fa-lg fa-pencil");
                            saveButton.attr("class",
                                "btn btn-default disabled"
                            );
                            saveButton.css("color", "black");
                            codeBlock.attr("contentEditable", "false");

                            // Post the changes.
                            saveButton.children("span")
                                .attr("class", "fa fa-lg fa-spinner fa-spin");
                            var ownerFolder;
                            if (itemInfo.ownerFolder) {
                                ownerFolder = itemInfo.ownerFolder;
                            } else {
                                ownerFolder = "/";
                            }
                            if (editButton.attr("data-container") === "Description") {
                                portal.content.updateDescription(app.user.server, itemInfo.owner, itemInfo.id, ownerFolder, newJson, app.user.token).done(function (response) {
                                    if (response.success) {
                                        saveButton.children("span").attr("class", "fa fa-lg fa-check");
                                        saveButton.css("color", "green");
                                    } else {
                                        saveButton.children("span").attr("class", "fa fa-lg fa-times");
                                        saveButton.css("color", "red");
                                    }
                                });
                            } else if (editButton.attr("data-container") === "Data") {
                                saveButton.children("span").attr("class", "fa fa-lg fa-spinner fa-spin");
                                portal.content.updateData(app.user.server, itemInfo.owner, itemInfo.id, ownerFolder, newJson, app.user.token).done(function (response) {
                                    if (response.success) {
                                        saveButton.children("span").attr("class", "fa fa-lg fa-check");
                                        saveButton.css("color", "green");
                                    } else {
                                        saveButton.children("span").attr("class", "fa fa-lg fa-times");
                                        saveButton.css("color", "red");
                                    }
                                });
                            }
                        } else {
                            saveButton.removeClass("active");
                        }
                    });
                };

                jquery(".content").addClass("data-toggle");
                jquery(".content").removeAttr("disabled");
                jquery(".content").attr("data-toggle", "button");
                jquery(".content").addClass("btn-info");

                jquery("#inspectModal").modal("hide");
                jquery("#inspectBtn").button("reset");

                // Add a listener for clicking on content buttons.
                jquery(".content").click(function () {
                    var server = jquery(this).attr("data-portal");
                    var id = jquery(this).attr("data-id");
                    var title = jquery(this).text();
                    var itemDescription;
                    var itemData;
                    var token;
                    
                    /**
                     * Append the token only for content in the user's portal.
                     * This prevents trying to pass a portal token when 
                     * inspecting content from an ArcGIS Online search.
                     */
                    if (server === app.user.server) {
                        token = app.user.token;
                    }
                    
                    NProgress.start();
                    jquery(".content").addClass("btn-info");
                    jquery(".content").removeClass("active");
                    jquery(".content").removeClass("btn-primary");
                    jquery(this).addClass("btn-primary");
                    jquery(this).removeClass("btn-info");
                    portal.content.itemDescription(server, id, token)
                        .done(function (description) {
                            portal.content.itemData(server, id, token)
                                .done(function (data) {
                                    itemData = data;
                                })
                                .always(function (data) {
                                    var templateData = {
                                        title: title,
                                        url: app.user.server,
                                        id: id,
                                        description: JSON.stringify(
                                            description, undefined, 2
                                        ),
                                        data: JSON.stringify(
                                            itemData, undefined, 2
                                        )
                                    };
                                    // Add a download link for files.
                                    if (templateData.data === undefined &&
                                        description.typeKeywords
                                        .indexOf("Service") === -1) {
                                        templateData
                                            .downloadLink = app.user.server +
                                            "sharing/rest/content/items/" +
                                            id +
                                            "/data?token=" + app.user.token;
                                    }
                                    var html = mustache.to_html(
                                        jquery("#inspectTemplate").html(),
                                        templateData
                                    );
                                    // Add the HTML container with the JSON.
                                    jquery("#dropArea").html(html);
                                    /**
                                     * Color code the JSON to make it easier
                                     * to read (uses highlight.js).
                                     */
                                    jquery("pre").each(function (i, e) {
                                        hljs.highlightBlock(e);
                                    });
                                    var jsonBackup;
                                    var jsonValid;
                                    var editButton;
                                    var saveButton;
                                    jquery(".btn-default[data-action='startEdits']").click(function (e) {
                                        if (!localStorage.hasOwnProperty("editsAllowed")) {
                                            // Show the caution modal.
                                            var editJsonBtn = jquery("#editJsonBtn");
                                            jquery("#editJsonModal").modal("show");
                                            jquery(".acknowledgeRisk").click(function (e) {
                                                if (jquery(e.currentTarget).prop("checked")) {
                                                    editJsonBtn.removeClass("disabled");
                                                } else {
                                                    editJsonBtn.addClass("disabled");
                                                }
                                            });
                                        } else {
                                            startEditing(e);
                                        }
                                        jquery("#editJsonBtn").click(function () {
                                            jquery("#editJsonModal").modal("hide");
                                            localStorage.setItem("editsAllowed", true);
                                            startEditing(e);
                                        });

                                    });
                                    NProgress.done();
                                });
                        });
                });
            });
    };

    var updateWebmapServices = function () {
        var webmapData;
        var owner;
        var folder;
        var supportedContent = jquery(".content[data-type='Web Map']");
        // Highlight supported content.
        supportedContent.addClass("data-toggle btn-info");
        supportedContent.removeAttr("disabled");
        supportedContent.attr("data-toggle", "button");

        // Add a listener for clicking on content buttons.
        jquery(".content").click(function () {
            // Display the selected Web Map's operational layers.
            var id = jquery(this).attr("data-id");
            var webmapTitle = jquery(this).text();
            jquery(".content[data-type='Web Map']").addClass("btn-info");
            jquery(".content").removeClass("active");
            jquery(".content").removeClass("btn-primary");
            jquery(this).addClass("btn-primary");
            jquery(this).removeClass("btn-info");
            portal.content.itemDescription(app.user.server, id, app.user.token)
                .done(function (description) {
                    owner = description.owner;
                    if (!description.ownerFolder) {
                        // Handle content in the user's root folder.
                        folder = "";
                    } else {
                        folder = description.ownerFolder;
                    }
                });
            portal.content.itemData(app.user.server, id, app.user.token)
                .done(function (data) {
                    webmapData = JSON.stringify(data);
                    var operationalLayers = [];
                    jquery.each(data.operationalLayers, function (layer) {
                        if (data.operationalLayers[layer].hasOwnProperty("url")) {
                            operationalLayers.push(data.operationalLayers[layer]);
                        }
                    });
                    var basemapTitle = data.baseMap.title,
                        basemapLayers = [];
                    jquery.each(data.baseMap.baseMapLayers, function (layer) {
                        if (data.baseMap.baseMapLayers[layer].hasOwnProperty("url")) {
                            basemapLayers.push(data.baseMap.baseMapLayers[layer]);
                        }
                    });

                    var template = jquery("#webmapServicesTemplate").html();
                    var templateData = {
                        webmapTitle: webmapTitle,
                        operationalLayers: operationalLayers,
                        basemapTitle: basemapTitle,
                        basemapLayers: basemapLayers
                    };
                    var html = mustache.to_html(template, templateData);
                    // Add the HTML container with the item JSON.
                    jquery("#dropArea").html(html);

                    // Event listener for update button.
                    jquery("#btnUpdateWebmapServices").click(function (e) {
                        var webmapServices = jquery("[data-original]");
                        jquery.each(webmapServices, function (service) {
                            var originalUrl = jquery(webmapServices[service])
                                .attr("data-original");
                            var newUrl = jquery(webmapServices[service]).val();
                            // Find and replace each URL.
                            webmapData = webmapData.replace(originalUrl, newUrl);
                            jquery(webmapServices[service]).val(newUrl);
                        });
                        var webmapId = jquery(".content.active.btn-primary").attr("data-id");
                        var itemData = JSON.parse(webmapData);
                        portal.content.updateWebmapData(app.user.server, owner, folder, webmapId, itemData, app.user.token).done(function (response) {
                            var html;
                            if (response.success) {
                                // Set the stored original URL to the new value.
                                jquery.each(webmapServices, function (service) {
                                    jquery(webmapServices[service]).attr("data-original", jquery(webmapServices[service]).val());
                                });
                                html = mustache.to_html(jquery("#updateSuccessTemplate").html());
                                jquery("#btnResetWebmapServices").before(html);
                            } else if (response.error.code === 400 || response.error.code === 403) {
                                jquery("#btnResetWebmapServices").click(); // Reset the displayed URLs to their original values.
                                html = mustache.to_html(jquery("#updateErrorTemplate").html(), response);
                                jquery("#btnResetWebmapServices").before(html);
                            }
                        });
                    });

                    // Event listener for reset button.
                    jquery("#btnResetWebmapServices").click(function (e) {
                        var webmapServices = jquery("[data-original]");
                        jquery.each(webmapServices, function (service) {
                            var originalUrl = jquery(webmapServices[service]).attr("data-original"),
                                currentUrl = jquery(webmapServices[service]).val();
                            jquery(webmapServices[service]).val(originalUrl);
                        });
                    });
                });
        });

    };

    var updateContentUrls = function () {
        var owner;
        var folder;
        var supportedContent = jquery(".content[data-type='Feature Service'], .content[data-type='Map Service'], .content[data-type='Image Service'], .content[data-type='KML'], .content[data-type='WMS'], .content[data-type='Geodata Service'], .content[data-type='Globe Service'], .content[data-type='Geometry Service'], .content[data-type='Geocoding Service'], .content[data-type='Network Analysis Service'], .content[data-type='Geoprocessing Service'], .content[data-type='Web Mapping Application'], .content[data-type='Mobile Application']");
        // Highlight supported content.
        supportedContent.addClass("data-toggle btn-info");
        supportedContent.removeAttr("disabled");
        supportedContent.attr("data-toggle", "button");

        // Add a listener for clicking on content buttons.
        jquery(".content").click(function () {
            // Display the selected item's URL.
            var id = jquery(this).attr("data-id");
            var title = jquery(this).text();
            // Highlight Web Maps.
            supportedContent.addClass("btn-info");
            jquery(".content").removeClass("active");
            jquery(".content").removeClass("btn-primary");
            jquery(this).addClass("btn-primary");
            jquery(this).removeClass("btn-info");
            portal.content.itemDescription(app.user.server, id, app.user.token).done(function (description) {
                owner = description.owner;
                if (!description.ownerFolder) {
                    folder = ""; // Handle content in the user's root folder.
                } else {
                    folder = description.ownerFolder;
                }
                var html = mustache.to_html(jquery("#itemContentTemplate").html(), description);
                // Add the HTML container with the item JSON.
                jquery("#dropArea").html(html);

                // Event listener for update button.
                jquery("#btnUpdateContentUrl").click(function (e) {
                    var contentId = jquery(".content.active.btn-primary").attr("data-id"),
                        url = jquery("[data-original]").val();
                    portal.content.updateUrl(app.user.server, owner, folder, contentId, url, app.user.token).done(function (response) {
                        var html;
                        if (response.success) {
                            // Set the stored original URL to the new value.
                            jquery("[data-original]").attr("data-original", url);
                            html = mustache.to_html(jquery("#updateSuccessTemplate").html());
                            jquery("#btnResetContentUrl").before(html);
                        } else if (response.error.code === 400 || response.error.code === 403) {
                            jquery("#btnResetContentUrl").click(); // Reset the displayed URLs to their original values.
                            html = mustache.to_html(jquery("#updateErrorTemplate").html(), response);
                            jquery("#btnResetContentUrl").before(html);
                        }
                    });
                });

                // Event listener for reset button.
                jquery("#btnResetContentUrl").click(function (e) {
                    var originalUrl = jquery("[data-original]").attr("data-original");
                    var currentUrl = jquery("[data-original]").val();
                    jquery("[data-original]").val(originalUrl);
                });
            });
        });

    };

    var viewStats = function () {

        var statsCalendar = function (activities) {
            require(["d3", "cal-heatmap"], function (d3, CalHeatMap) {
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
            });
        };

        portal.user.profile(app.user.server, app.user.userId, app.user.token)
            .done(function (user) {

                var template = jquery("#statsTemplate").html();
                var thumbnailUrl;
                // Check that the user has a thumbnail image.
                if (user.thumbnail) {
                    thumbnailUrl = app.user.server +
                        "sharing/rest/community/users/" + user.username +
                        "/info/" + user.thumbnail + "?token=" + app.user.token;
                } else {
                    thumbnailUrl = "assets/images/no-user-thumb.jpg";
                }

                var templateData = {
                    username: user.username,
                    thumbnail: thumbnailUrl
                };

                html = mustache.to_html(template, templateData);
                jquery("body").append(html);
                statsCalendar(app.stats.activities);

                jquery("#statsModal").modal("show");

                // Get the user's 3 most viewed items.
                var searchQuery = "owner:" + app.user.userId;
                portal.search(app.user.server, searchQuery, 3, "numViews",
                        "desc", app.user.token)
                    .done(function (results) {
                        jquery.each(results.results, function (result) {
                            results.results[result].numViews =
                                results.results[result]
                                .numViews.toString()
                                .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                            results.results[result].itemUrl =
                                app.user.server +
                                "home/item.html?id=" +
                                results.results[result].id;
                        });
                        var tableTemplate = jquery("#mostViewedContentTemplate").html();
                        jquery("#mostViewedContent").html(mustache.to_html(tableTemplate, {
                            searchResults: results.results
                        }));
                    });

                jquery("#statsModal").on("shown.bs.modal", function () {
                    // Apply CSS to style the calendar arrows.
                    var calHeight = jquery(".calContainer").height();
                    // Center the calendar.
                    jquery(".cal-heatmap-container").css("margin", "auto");
                    // Adjust the arrows.
                    jquery(".calArrow").css("margin-top", (calHeight - 20) + "px");
                });

                jquery("#statsModal").on("hidden.bs.modal", function () {
                    // Destroy the stats modal so it can be properly rendered next time.
                    jquery("#statsModal").remove();
                });

            });
    };

    // Make the drop area accept content items.
    var makeDroppable = function (id) {

        /**
         * Move the content DOM element from the source
         * to the destination container on the page.
         */
        var moveItem = function (item, destination) {
            "use strict";
            var itemId = jquery(item).attr("data-id");

            // Clone the original item.
            var clone = jquery(item).clone();

            // Differentiate this object from the original.
            clone.attr("id", itemId + "_clone");

            // Remove the max-width property so it fills the folder.
            clone.css("max-width", "");

            // Move it to the destination folder.
            clone.prependTo(destination);

            // Remove the contextual highlighting.
            clone.removeClass("active btn-primary btn-info");

            // Get the folder the item was dragged into.
            var destinationFolder = clone.parent().attr("data-folder");

            /**
             * copyItem() Copies a given item ID.
             * @id {String} ID of the source item
             * @folder {String} id of the destination folder
             */
            var copyItem = function (id, folder) {
                var sourcePortal = app.user.server;
                var sourceToken = app.user.token;
                var destinationPortal = sessionStorage.destinationUrl;
                var destinationUsername = sessionStorage.destinationUsername;
                var destinationToken = sessionStorage.destinationToken;
                var type = jquery("#" + id).attr("data-type");
                // Ensure the content type is supported before trying to copy it.
                if (isSupported(type)) {
                    // Get the full item description and data from the source.
                    portal.content.itemDescription(sourcePortal, id, sourceToken).done(function (description) {
                        var thumbnailUrl = sourcePortal + "sharing/rest/content/items/" + id + "/info/" + description.thumbnail + "?token=" + sourceToken;
                        portal.content.itemData(sourcePortal, id, sourceToken).always(function (data) {
                            /**
                             * Post it to the destination using always
                             * to ensure that it copies Web Mapping Applications
                             * which don't have a data component and therefore
                             f* generate a failed response.
                             */
                            portal.content.addItem(destinationPortal, destinationUsername, folder, description, data, thumbnailUrl, destinationToken).done(function (response) {
                                var html;
                                if (response.success === true) {
                                    jquery("#" + id + "_clone").addClass("btn-success");
                                } else if (response.error) {
                                    jquery("#" + id + "_clone").addClass("btn-danger");
                                    html = mustache.to_html(jquery("#contentCopyErrorTemplate").html(), {
                                        id: id,
                                        message: response.error.message
                                    });
                                    jquery("#" + id + "_clone").before(html);
                                }
                            }).fail(function (response) {
                                html = mustache.to_html(jquery("#contentCopyErrorTemplate").html(), {
                                    id: id,
                                    message: "Something went wrong."
                                });
                                jquery("#" + id + "_clone").before(html);
                            });
                        });
                    });
                } else {
                    // Not supported.
                    jquery("#" + id).addClass("btn-warning");
                    var html = mustache.to_html(jquery("#contentTypeErrorTemplate").html(), {
                        id: id,
                        type: type
                    });
                    jquery("#" + id).before(html);
                    jquery("#" + id + "_alert").fadeOut(6000);
                }
            };

            copyItem(itemId, destinationFolder);
        };

        jquery("#dropFolder_" + id).droppable({
            accept: ".content",
            activeClass: "ui-state-hover",
            hoverClass: "ui-state-active",
            drop: function (event, ui) {
                moveItem(ui.draggable, jquery(this).parent().parent());
            }
        });
    };

    var cleanUp = function () {
        jquery("#dropArea").empty(); //Clear any old items.
        jquery(".content").unbind("click"); // Remove old event handlers.
        jquery(".content").removeClass("active btn-primary btn-info ui-draggable");
        jquery(".content").attr("disabled", "disabled");
    };

    var clearResults = function () {
        // Clean up any existing content in the left hand column.
        jquery("#itemsArea").empty();
    };

    var highlightCopyableContent = function () {

        var setMaxWidth = function (el) {
            // Set the max-width of folder items so they don't fill the body when dragging.
            var maxWidth = jquery("#itemsArea .in").width() ? jquery("#itemsArea .in").width() : 400;
            jquery(el).css("max-width", maxWidth); // Set the max-width so it doesn't fill the body when dragging.
        };

        jquery("#itemsArea .content").each(function (i) {

            var makeDraggable = function (el) {
                el.draggable({
                    cancel: false,
                    helper: "clone",
                    appendTo: "body",
                    revert: true,
                    opacity: 0.7
                });
                el.removeAttr("disabled");
            };

            var type = jquery(this).attr("data-type");
            if (isSupported(type)) {
                jquery(this).addClass("btn-info"); // Highlight supported content.
                setMaxWidth(this);
                makeDraggable(jquery(this)); //Make the content draggable.
            }
        });
    };

    var highlightSupportedContent = function () {
        // Highlight content supported by the currently selected action.
        switch (jquery("#actionDropdown li.active").attr("data-action")) {
        case "copyContent":
            highlightCopyableContent();
            break;
        case "updateWebmapServices":
            cleanUp();
            updateWebmapServices();
            break;
        case "updateContentUrl":
            cleanUp();
            updateContentUrls();
            break;
        case "inspectContent":
            cleanUp();
            inspectContent();
            break;
        }
    };

    /**
     * isSupported() returns true if the content type is supported
     * @type (String) type
     * @return (Boolean)
     * List of types available here: http://resources.arcgis.com/en/help/arcgis-rest-api/index.html#//02r3000000ms000000
     */
    var isSupported = function (type) {
        // Check if the content type is supported.
        //
        var supportedTypes = [
            "Web Map",
            "Map Service",
            "Image Service",
            "WMS",
            "Feature Collection",
            "Feature Collection Template",
            "Geodata Service",
            "Globe Service",
            "Geometry Service",
            "Geocoding Service",
            "Network Analysis Service",
            "Geoprocessing Service",
            "Web Mapping Application",
            "Mobile Application",
            "Operation View",
            "Symbol Set",
            "Color Set",
            "Document Link",
            "Feature Service"
        ];
        if (jquery.inArray(type, supportedTypes) > -1) {
            return true;
        }
    };

    var isTypeText = function (type) {
        var textTypes = [
            "Web Map",
            "Feature Collection",
            "Feature Collection Template",
            "Operation View",
            "Symbol Set",
            "Color Set",
            "Document Link"
        ];
        if (jquery.inArray(type, textTypes) > -1) {
            return true;
        }
    };

    var isTypeUrl = function (type) {
        var urlTypes = [
            "Feature Service",
            "Map Service",
            "Image Service",
            "KML",
            "WMS",
            "Geodata Service",
            "Globe Service",
            "Geometry Service",
            "Geocoding Service",
            "Network Analysis Service",
            "Geoprocessing Service",
            "Web Mapping Application",
            "Mobile Application"
        ];
        if (jquery.inArray(type, urlTypes) > -1) {
            return true;
        }
    };

    var listSearchItems = function (portalUrl, results) {
        "use strict";
        clearResults();
        cleanUp();

        var folderData = {
            title: "Search Results (" + results.query + ")",
            id: "search",
            count: results.total
        };
        var html = mustache.to_html(jquery("#folderTemplate").html(), folderData);
        jquery("#itemsArea").append(html);
        // Append the root items to the Root folder.
        jquery.each(results.results, function (item) {
            var templateData = {
                "id": this.id,
                "title": this.title,
                "type": this.type,
                "icon": info.items(this.type).icon,
                "portal": portalUrl
            };
            var html = mustache.to_html(jquery("#contentTemplate").html(), templateData);
            jquery("#collapse_search").append(html)
                .addClass("in");
        });

        highlightSupportedContent();
    };

    var listUserItems = function () {
        "use strict";
        cleanUp();
        clearResults();

        // Capture item creation times to be displayed in the user heatmap.
        function storeActivity(activityTime) {
            var seconds = activityTime / 1000;
            app.stats.activities[seconds] = 1;
        }

        var url = app.user.server;
        var username = app.user.userId;
        var token = app.user.token;

        function sortFoldersAlpha(container) {
            var folders = container.children(".panel").get();
            folders.sort(function (a, b) {
                return jquery(a).children("div.panel-heading").attr("data-title").toUpperCase().localeCompare(jquery(b).children("div.panel-heading").attr("data-title").toUpperCase());
            });
            jquery.each(folders, function (idx, folder) {
                container.append(folder);
            });
            container.prepend(jquery("[data-title='Root']").parent());
        }

        function sortItemsAlpha(folder) {
            var folderItems = folder.children("button").get();
            folderItems.sort(function (a, b) {
                return jquery(a).text().toUpperCase().localeCompare(jquery(b).text().toUpperCase());
            });
            jquery.each(folderItems, function (idx, item) {
                folder.append(item);
            });
        }

        portal.user.content(url, username, "/", token).done(function (content) {
            // Append the root folder accordion.
            var folderData = {
                title: "Root",
                id: "",
                count: content.items.length
            };
            var html = mustache.to_html(jquery("#folderTemplate").html(), folderData);
            jquery("#itemsArea").append(html);
            // Append the root items to the Root folder.
            jquery.each(content.items, function (item) {
                var templateData = {
                    "id": this.id,
                    "title": this.title,
                    "type": this.type,
                    "icon": info.items(this.type).icon,
                    "portal": url
                };
                var html = mustache.to_html(jquery("#contentTemplate").html(), templateData);
                jquery("#collapse_").append(html);
                storeActivity(content.items[item].modified);
            });
            sortItemsAlpha(jquery("#collapse_"));
            jquery.each(content.folders, function (folder) {
                sortFoldersAlpha(jquery("#itemsArea"));
                portal.user.content(url, username, content.folders[folder].id, token).done(function (content) {
                    var folderData = {
                        title: content.currentFolder.title,
                        id: content.currentFolder.id,
                        count: content.items.length
                    };
                    // Append an accordion for the folder.
                    var html = mustache.to_html(jquery("#folderTemplate").html(), folderData);
                    jquery("#itemsArea").append(html);
                    // Append the items to the folder.
                    jquery.each(content.items, function (item) {
                        var templateData = {
                            "id": this.id,
                            "title": this.title,
                            "type": this.type,
                            "icon": info.items(this.type).icon,
                            "portal": url
                        };
                        var html = mustache.to_html(jquery("#contentTemplate").html(), templateData);
                        jquery("#collapse_" + content.currentFolder.id).append(html);
                        storeActivity(content.items[item].modified);
                    });
                    sortItemsAlpha(jquery("#collapse_" + content.currentFolder.id));
                });
            });
            setTimeout(function () {
                // Wait a second to let all of the items populate before sorting and highlighting them.
                sortFoldersAlpha(jquery("#itemsArea"));
                highlightSupportedContent();
            }, 1000);
        });
    };

    var showDestinationFolders = function () {
        "use strict";
        var url = sessionStorage.destinationUrl;
        var username = sessionStorage.destinationUsername;
        var token = sessionStorage.destinationToken;

        portal.user.content(url, username, "/", token).done(function (content) {
            var folderData = {
                title: "Root",
                id: "",
                count: content.items.length
            };
            // Append the root folder accordion.
            var html = mustache.to_html(jquery("#dropFolderTemplate").html(),
                folderData
            );
            jquery("#dropArea").append(html);
            makeDroppable(""); // Enable the droppable area.
            // Append the other folders.
            jquery.each(content.folders, function (folder) {
                portal.user.content(
                    url, username, content.folders[folder].id, token
                ).done(function (content) {
                    var folderData = {
                        title: content.currentFolder.title,
                        id: content.currentFolder.id,
                        count: content.items.length
                    };
                    // Append an accordion for the folder.
                    var template = jquery("#dropFolderTemplate").html();
                    var html = mustache.to_html(template, folderData);
                    jquery("#dropArea").append(html);
                    // Collapse the accordion to avoid cluttering the display.
                    jquery("#collapse" + content.currentFolder.id)
                        .collapse("hide");
                    // Enable the droppable area.
                    makeDroppable(content.currentFolder.id);
                });
            });
        });
    };

    // Do stuff when the DOM is ready.
    jquery(document).ready(function () {

        // Load the html templates.
        jquery.get("templates.html", function (templates) {
            jquery("body").append(templates);

            // Enable the login button.
            // Doing it here ensures all required libraries have loaded.
            jquery(".jumbotron > p > [data-action='login']")
                .removeAttr("disabled");

            // Check for previously authenticated sessions.
            esriId.registerOAuthInfos([appInfo]);
            esriId.checkSignInStatus(appInfo.portalUrl)
                .then(
                    function (user) {
                        jquery("#splashContainer").css("display", "none");
                        jquery("#itemsContainer").css("display", "block");
                        app.user = user;
                        startSession(appInfo.portalUrl, user);
                    })
                .otherwise(
                    function () {
                        jquery("#itemsContainer").css("display", "none");
                        jquery("#splashContainer").css("display", "block");
                    }
                );
        });

        // Resize the content areas to fill the window.
        var resizeContentAreas = function () {
            "use strict";
            jquery(".itemArea").height(jquery(window).height() - 50);
        };
        resizeContentAreas();

        // Disable the enter key to prevent accidentally firing forms.
        // Disable it for everything except the code edit windows.
        var disableEnterKey = function () {
            "use strict";
            jquery("html").bind("keypress", function (e) {
                if (e.keyCode === 13 &&
                    jquery(e.target).attr("contenteditable") !== "true") {
                    return false;
                }
            });
        };
        disableEnterKey();

        // Preformat the copy login screen.
        jquery("#destinationAgolBtn").button("toggle");
        jquery("#destinationAgolBtn").addClass("btn-primary");
        jquery("#destinationUrl").css({
            "visibility": "hidden"
        });
        jquery("#destinationWebTierAuth").css({
            "visibility": "hidden"
        });

        // *** Global Listeners ***
        jquery("#destinationAgolBtn").click(function () {
            jquery("#destinationUrl").attr({
                "placeholder": "",
                "value": "https://www.arcgis.com/"
            });
            jquery("#destinationUrl").val("https://www.arcgis.com/");
            jquery("#destinationUrl").css({
                "visibility": "hidden"
            });
            jquery("#destinationWebTierAuth").css({
                "visibility": "hidden"
            });
            jquery("#destinationAgolBtn").addClass("btn-primary active");
            jquery("#destinationPortalBtn").removeClass("btn-primary active");
        });
        jquery("#destinationPortalBtn").click(function () {
            jquery("#destinationUrl").attr({
                "placeholder": "https://myportal.com/",
                "value": ""
            });
            jquery("#destinationUrl").val("");
            jquery("#destinationUrl").css({
                "visibility": "visible"
            });
            jquery("#destinationWebTierAuth").css({
                "visibility": "visible"
            });
            jquery("#destinationPortalBtn").addClass("btn-primary active");
            jquery("#destinationAgolBtn").removeClass("btn-primary active");
        });

        // Make DOM adjustments when the browser is resized.
        jquery(window).resize(function () {
            resizeContentAreas();
        });

        // Validate the entered url when the input loses focus.
        jquery("#portalUrl").blur(function () {

            // Give the DOM time to update before firing the validation.
            setTimeout(function () {
                validateUrl("#portalUrl");
            }, 500);
        });

        // Validate the url when the input loses focus.
        jquery("#destinationUrl").blur(function () {

            // Give the DOM time to update before firing the validation.
            setTimeout(function () {
                if (jquery("#destinationPortalBtn").hasClass("active")) {
                    validateUrl("#destinationUrl");
                }
            }, 500);
        });

        // Disable username and password if web tier auth is selected.
        jquery("#sourceWebTierAuth").click(function (e) {
            var checkboxState = jquery(e.currentTarget).prop("checked");
            if (checkboxState === true) {
                jquery("#portalUsername").attr("disabled", true);
                jquery("#portalPassword").attr("disabled", true);
                jquery("#portalLoginBtn").text("Proceed");
                jquery.ajaxSetup({
                    xhrFields: {
                        withCredentials: true
                    }
                });
            } else {
                jquery("#portalUsername").removeAttr("disabled");
                jquery("#portalPassword").removeAttr("disabled");
                jquery("#portalLoginBtn").text("Log in");
                jquery.ajaxSetup({
                    xhrFields: {
                        withCredentials: false
                    }
                });
            }
        });

        // Disable username and password if web tier auth is selected.
        jquery("#destWebTierAuthChk").click(function (e) {
            var checkboxState = jquery(e.currentTarget).prop("checked");
            if (checkboxState === true) {
                jquery("#destinationUsername").attr("disabled", true);
                jquery("#destinationPassword").attr("disabled", true);
                jquery("#destinationLoginBtn").text("Proceed");
                jquery.ajaxSetup({
                    xhrFields: {
                        withCredentials: true
                    }
                });
            } else {
                jquery("#destinationUsername").removeAttr("disabled");
                jquery("#destinationPassword").removeAttr("disabled");
                jquery("#destinationLoginBtn").text("Log in");
                jquery.ajaxSetup({
                    xhrFields: {
                        withCredentials: false
                    }
                });
            }
        });

        // Login.
        jquery("[data-action='login']").click(function () {
            esriId.getCredential(appInfo.portalUrl, {
                    oAuthPopupConfirmation: false
                })
                .then(function (user) {
                    jquery("#splashContainer").css("display", "none");
                    jquery("#itemsContainer").css("display", "block");
                    startSession(appInfo.portalUrl, user);
                });
        });

        // Log into a Portal.
        jquery("#portalLoginBtn").click(function () {
            loginPortal();
        });

        /**
         * Use the existing credentials when "My Account"
         * is selected as the copy target.
         */
        jquery("[data-action='copyMyAccount']").click(function () {
            storeCredentials("destination", app.user.server, app.user.userId,
                    app.user.token)
                .then(function () {
                    jquery("#copyModal").modal("hide");
                    highlightCopyableContent();
                    NProgress.start();
                    showDestinationFolders();
                    NProgress.done();
                });
        });

        /**
         * Show other destination form when "Another Account"
         * is selected as the copy target.
         */
        jquery("[data-action='copyOtherAccount']").click(function () {
            jquery("#destinationChoice").css("display", "none");
            jquery("#destinationForm").css("display", "block");
        });

        // Log in to the destination account.
        jquery("#destinationLoginBtn").click(function () {
            loginDestination();
        });

        // Reset the destination login form when the modal is canceled.
        jquery("#destinationLoginBtn").click(function () {
            jquery("#destinationLoginBtn").button("reset");
        });

        // Clear the copy action when the cancel button is clicked.
        jquery("#destinationCancelBtn").click(function () {
            jquery("#actionDropdown li").removeClass("active");
        });

        // Add a listener for the enter key on the destination login form.
        jquery("#destinationLoginForm").keypress(function (e) {
            if (e.which == 13) {
                jquery("#destinationLoginBtn").focus().click();
            }
        });

        // Add a listener for the future search bar picker.
        jquery(document).on("click", "#searchMenu li", function (e) {
            var selectedAction = jquery(e.target).parent().attr("data-action");
            if (selectedAction !== "viewMyContent") {
                jquery("#searchMenu li").removeClass("active");
                jquery(e.target).parent().addClass("active");
                if (jquery("#searchText").val()) {
                    // If a search term already exists, then perform the search.
                    search();
                } else {
                    // Change the placeholder.
                    jquery("#searchText").attr("placeholder",
                        jquery(e.currentTarget).text());
                }
            } else {
                NProgress.start();
                listUserItems();
                NProgress.done();
            }
        });

        jquery(document).on("click", "li [data-action]", function (e) {
            // Highlight the selected action except for "View My Stats."
            var selectedAction = jquery(e.target).parent().attr("data-action");
            if (selectedAction !== "stats") {
                jquery("#actionDropdown li").removeClass("active");
                jquery(e.target).parent().addClass("active");
            }
            // Choose what to do based on the selection.
            switch (selectedAction) {
            case "inspectContent":
                // Enable inspecting of content.
                cleanUp();
                inspectContent();
                break;
            case "updateWebmapServices":
                cleanUp();
                updateWebmapServices();
                break;
            case "updateContentUrl":
                cleanUp();
                updateContentUrls();
                break;
            case "stats":
                viewStats();
                break;
            case "logout":
                logout();
                break;
            }
        });

        // Clean up the lists when copy content is selected.
        jquery("#copyModal").on("show.bs.modal", function () {
            cleanUp();
            jquery("#destinationChoice").css("display", "block");
            jquery("#destinationForm").css("display", "none");
        });

    });

});