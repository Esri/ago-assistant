require([
    "jquery",
    "portal",
    "mustache",
    "nprogress",
    "esri/arcgis/Portal",
    "esri/arcgis/OAuthInfo",
    "esri/IdentityManager",
    "highlight",
    "jquery.ui",
    "bootstrap-shim"
], function(
    jquery,
    portalSelf,
    mustache,
    NProgress,
    arcgisPortal,
    arcgisOAuthInfo,
    esriId,
    hljs
) {

    // *** ArcGIS OAuth ***
    var appInfo = new arcgisOAuthInfo({
        appId: "<config.appId>", // Set this in config.json.
        popup: true,
        portalUrl: "<config.portalUrl>" // Set this in config.json.
    });

    // Some app level variables.
    var app = {
        stats: {
            activities: {}
        },
        portals: {
            arcgisOnline: new portalSelf.Portal({
                portalUrl: "https://www.arcgis.com/"
            })
        }
    };

    /**
     * Check the url for errors (e.g. no trailing slash)
     * and update it before sending.
     */
    var validateUrl = function(el, portal) {
        "use strict";
        var inputUrl = jquery.trim(jquery(el).val());
        portalSelf.util.fixUrl(inputUrl).then(function(portalUrl) {
            jquery(el).val(portalUrl);
            var urlError = jquery("#urlErrorTemplate").html();
            var checkbox = jquery(el).parent().parent()
                .find("input[type='checkbox']");
            jquery(el).parent().removeClass("has-error");
            jquery(el).next().removeClass("glyphicon-ok");

            portal.portalUrl = portalUrl;
            portal.version()
                .then(function(data) {
                    console.log("API v" + data.currentVersion);
                    jquery(".alert-danger.alert-dismissable").remove();
                    jquery(el).next().addClass("glyphicon-ok");
                })
                .catch(function() {
                    // Try it again with enterprise auth.
                    portal.withCredentials = true;
                    portal.version()
                        .then(function(data) {
                            console.log("API v" + data.currentVersion);
                            jquery(".alert-danger.alert-dismissable").remove();
                            jquery(el).next().addClass("glyphicon-ok");
                            jquery(checkbox).trigger("click");
                        })
                        .catch(function() {
                            // Now try enterprise auth with jsonp so crossdomain will follow redirects.
                            portal.jsonp = true;
                            portal.version().then(function(data) {
                                // It worked so keep enterprise auth but turn jsonp back off.
                                portal.jsonp = false;
                                console.log("API v" + data.currentVersion);
                                jquery(".alert-danger.alert-dismissable").remove();
                                jquery(el).next().addClass("glyphicon-ok");
                            }).catch(function() {
                                // OK, it's really not working.
                                portal.withCredentials = false;
                                portal.jsonp = false;
                                jquery(".alert-danger.alert-dismissable").remove();
                                jquery(el).parent().parent().after(urlError);
                                jquery(el).parent().addClass("has-error");
                            });
                        });
                });
        });
    };

    var startSession = function() {
        "use strict";
        var searchHtml;
        app.portals.sourcePortal.self().then(function(data) {
            var template = jquery("#sessionTemplate").html();
            var html = mustache.to_html(template, data);
            app.portals.sourcePortal.username = data.user.username;
            if (data.isPortal === true) {
                // Portal.
                app.portals.sourcePortal.portalUrl = "https://" + data.portalHostname + "/";
            } else if (data.isPortal === false && data.id) {
                // ArcGIS Online Org.
                // Set it to the org's custom URL instead of www.arcgis.com.
                app.portals.sourcePortal.portalUrl = "https://" + data.urlKey + "." + data.customBaseUrl + "/";
            } else {
                // ArcGIS Online personal account.
                app.portals.sourcePortal.portalUrl = "https://www.arcgis.com/";
            }

            jquery(".nav.navbar-nav").after(html);
            jquery("#logout").show();
            jquery("#actionDropdown").css({
                visibility: "visible"
            });
            searchHtml = mustache.to_html(jquery("#searchTemplate").html(), {
                portal: app.portals.sourcePortal.portalUrl,
                name: data.name,
                id: data.id
            });
            jquery("#actionDropdown").before(searchHtml);

            // Add a listener for clicking the search icon.
            // Fix me.
            jquery(document).on("click", "i.glyphicon-search", function() {
                search();
            });

            // Add a listener for the enter key on the search form.
            jquery("#searchForm").keypress(function(e) {
                if (e.which == 13) {
                    search();
                }
            });

            NProgress.start();
            listUserItems();
            NProgress.done();
        });
    };

    var loginPortal = function() {
        var username = jquery("#portalUsername").val();
        var password = jquery("#portalPassword").val();
        jquery("#portalLoginBtn").button("loading");
        app.portals.sourcePortal.generateToken(username, password)
            .then(function(response) {
                if (response.token) {
                    app.portals.sourcePortal.token = response.token;
                    jquery("#portalLoginModal").modal("hide");
                    jquery("#splashContainer").css("display", "none");
                    jquery("#itemsContainer").css("display", "block");
                    startSession();
                } else if (response.error.code === 400) {
                    var html = jquery("#loginErrorTemplate").html();
                    jquery(".alert-danger.alert-dismissable").remove();
                    jquery("#portalLoginForm").before(html);
                }
                jquery("#portalLoginBtn").button("reset");
            })
            .catch(function() {
                jquery("#portalLoginBtn").button("reset");
                var html = jquery("#loginErrorTemplate").html();
                jquery(".alert-danger.alert-dismissable").remove();
                jquery("#portalLoginForm").before(html);
            })
            .then(function() {
                jquery("#portalLoginBtn").button("reset");
            });
    };

    var loginDestination = function() {
        var username = jquery("#destinationUsername").val();
        var password = jquery("#destinationPassword").val();
        var portalUrl = jquery("#destinationUrl").val();

        if (!app.portals.destinationPortal) {
            app.portals.destinationPortal = new portalSelf.Portal({
                portalUrl: portalUrl
            });
        }

        jquery("#destinationLoginBtn").button("loading");
        jquery("#dropArea").empty();
        app.portals.destinationPortal.generateToken(username, password)
            .then(function(response) {
                if (response.token) {
                    app.portals.destinationPortal.token = response.token;
                    app.portals.destinationPortal.self().then(function(data) {
                        app.portals.destinationPortal.username = data.user.username;
                        if (data.isPortal === true) {
                            // Portal.
                            app.portals.destinationPortal.portalUrl = "https://" + data.portalHostname + "/";
                        } else if (data.isPortal === false && data.id) {
                            // ArcGIS Online Org.
                            // Set it to the org's custom URL instead of www.arcgis.com.
                            app.portals.destinationPortal.portalUrl = "https://" + data.urlKey + "." + data.customBaseUrl + "/";
                        } else {
                            // ArcGIS Online personal account.
                            app.portals.destinationPortal.portalUrl = "https://www.arcgis.com/";
                        }

                        jquery("#copyModal").modal("hide");
                        highlightCopyableContent();
                        NProgress.start();
                        showDestinationFolders();
                        NProgress.done();

                    });
                } else if (response.error.code === 400) {
                    var html = jquery("#loginErrorTemplate").html();
                    jquery(".alert-danger.alert-dismissable").remove();
                    jquery("#destinationLoginForm").before(html);
                }
            })
            .catch(function() {
                var html = jquery("#loginErrorTemplate").html();
                jquery(".alert-danger.alert-dismissable").remove();
                jquery("#destinationLoginForm").before(html);
            })
            .then(function() {
                jquery("#destinationLoginBtn").button("reset");
            });
    };

    var logout = function() {
        sessionStorage.clear();
        app.stats.activities = {};
        jquery("#actionDropdown li").removeClass("active");
        jquery("#itemsArea").empty();
        jquery("#dropArea").empty();
        jquery("#sessionDropdown").remove();
        jquery("#searchForm").remove();
        jquery("#actionDropdown").css({
            visibility: "hidden"
        });
        esriId.destroyCredentials();
        delete app.portals.sourcePortal;
        delete app.portals.destinationPortal;
        window.location.reload();
    };

    var search = function() {

        var query = jquery("#searchText").val();
        var portalUrl = jquery("#searchMenu li.active").attr("data-url");
        var portal;

        // Add the org id for "My Portal" searches.
        if (jquery("#searchMenu li.active").attr("data-id")) {
            query += " accountid:" +
                jquery("#searchMenu li.active").attr("data-id");
        }

        // Add the username for "My Content" searches.
        if (jquery("#searchMenu li.active").text() === "Search My Content") {
            query += " owner:" + app.portals.sourcePortal.username;
        }

        /**
         * Prevent trying to pass a portal token when
         * searching ArcGIS Online.
         */
        if (portalUrl === "https://www.arcgis.com/" &&
            portalUrl !== app.portals.sourcePortal.portalUrl) {
            portal = app.portals.arcgisOnline;
        } else {
            portal = app.portals.sourcePortal;
        }

        NProgress.start();
        portal.search(query, 100, "numViews", "desc")
            .then(function(results) {
                listSearchItems(portal.portalUrl, results);
                NProgress.done();
            });
    };

    var inspectContent = function() {

        var portal;
        var jsonBackup;
        var jsonValid;

        var validateJson = function(jsonString) {
            try {
                var o = JSON.parse(jsonString);
                if (o && typeof o === "object" && o !== null) {
                    return o;
                }
            } catch (e) {}

            return false;
        };

        var startEditing = function(e) {

            // Allow removing the button active state.
            e.stopImmediatePropagation();

            var codeBlock = jquery(e.currentTarget)
                .parent()
                .next();
            var editButton = jquery(e.currentTarget);
            var saveButton = jquery(e.currentTarget)
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
                codeBlock.bind("input", function() {
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
                codeBlock.each(function(i, e) {
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
            saveButton.click(function() {
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
                        portal.updateDescription(itemInfo.owner, itemInfo.id, ownerFolder, newJson).then(function(response) {
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
                        portal.updateData(itemInfo.owner, itemInfo.id, ownerFolder, newJson).then(function(response) {
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
        jquery(".content").click(function() {
            var server = jquery(this).attr("data-portal");
            var id = jquery(this).attr("data-id");
            var title = jquery(this).text();
            var itemData;

            /**
             * Prevent trying to pass a portal token when
             * inspecting content from an ArcGIS Online search.
             */
            if (server === "https://www.arcgis.com/" &&
                server !== app.portals.sourcePortal.portalUrl) {
                portal = app.portals.arcgisOnline;
            } else {
                portal = app.portals.sourcePortal;
            }

            NProgress.start();
            jquery(".content").addClass("btn-info");
            jquery(".content").removeClass("active");
            jquery(".content").removeClass("btn-primary");
            jquery(this).addClass("btn-primary");
            jquery(this).removeClass("btn-info");
            portal.itemDescription(id)
                .then(function(description) {
                    portal.itemData(id)
                        .then(function(data) {
                            if (data) {
                                itemData = data;
                            }
                            var templateData = {
                                title: title,
                                url: portal.portalUrl,
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
                                    .downloadLink = portal.portalUrl +
                                    "sharing/rest/content/items/" +
                                    id +
                                    "/data?token=" + portal.token;
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
                            jquery("pre").each(function(i, e) {
                                hljs.highlightBlock(e);
                            });

                            jquery(".btn-default[data-action='startEdits']").click(function(e) {
                                if (!localStorage.hasOwnProperty("editsAllowed")) {
                                    // Show the caution modal.
                                    var editJsonBtn = jquery("#editJsonBtn");
                                    jquery("#editJsonModal").modal("show");
                                    jquery(".acknowledgeRisk").click(function(e) {
                                        if (jquery(e.currentTarget).prop("checked")) {
                                            editJsonBtn.removeClass("disabled");
                                        } else {
                                            editJsonBtn.addClass("disabled");
                                        }
                                    });
                                } else {
                                    startEditing(e);
                                }

                                jquery("#editJsonBtn").click(function() {
                                    jquery("#editJsonModal").modal("hide");
                                    localStorage.setItem("editsAllowed", true);
                                    startEditing(e);
                                });

                            });

                            NProgress.done();
                        });
                });
        });
    };

    var updateWebmapServices = function() {
        var webmapData;
        var owner;
        var folder;
        var supportedContent = jquery.merge(
            jquery(".content[data-type='Web Map']"),
            jquery(".content[data-type='Web Scene']")
        );
        var portal = app.portals.sourcePortal;

        // Highlight supported content.
        supportedContent.addClass("data-toggle btn-info");
        supportedContent.removeAttr("disabled");
        supportedContent.attr("data-toggle", "button");

        // Add a listener for clicking on content buttons.
        jquery(".content").click(function() {
            // Display the selected Web Map's operational layers.
            var id = jquery(this).attr("data-id");
            var webmapTitle = jquery(this).text();
            jquery(".content[data-type='Web Map']").addClass("btn-info");
            jquery(".content").removeClass("active");
            jquery(".content").removeClass("btn-primary");
            jquery(this).addClass("btn-primary");
            jquery(this).removeClass("btn-info");
            portal.itemDescription(id)
                .then(function(description) {
                    owner = description.owner;
                    if (!description.ownerFolder) {
                        // Handle content in the user's root folder.
                        folder = "";
                    } else {
                        folder = description.ownerFolder;
                    }
                });

            portal.itemData(id)
                .then(function(data) {
                    webmapData = JSON.stringify(data);
                    var operationalLayers = [];
                    jquery.each(data.operationalLayers, function(layer) {
                        if (data.operationalLayers[layer].hasOwnProperty("url")) {
                            operationalLayers.push(data.operationalLayers[layer]);
                        }
                    });

                    var tables = [];
                    if (data.tables) {
                        jquery.each(data.tables, function(table) {
                            if (data.tables[table].hasOwnProperty("url")) {
                                tables.push(data.tables[table]);
                            }
                        });
                    }

                    var basemapTitle = data.baseMap.title;
                    var basemapLayers = [];
                    jquery.each(data.baseMap.baseMapLayers, function(layer) {
                        if (data.baseMap.baseMapLayers[layer].hasOwnProperty("url")) {
                            basemapLayers.push(data.baseMap.baseMapLayers[layer]);
                        }
                    });

                    var template = jquery("#webmapServicesTemplate").html();
                    var templateData = {
                        webmapTitle: webmapTitle,
                        operationalLayers: operationalLayers,
                        tables: tables,
                        basemapTitle: basemapTitle,
                        basemapLayers: basemapLayers
                    };
                    var html = mustache.to_html(template, templateData);

                    // Add the HTML container with the item JSON.
                    jquery("#dropArea").html(html);

                    // Set up Quick Find/Replace.
                    var webmapServices = jquery("[data-original]");
                    var currentUniqueRootUrlVals = [];
                    jquery("#origServiceUrlList").empty();
                    jquery.each(webmapServices, function(service) {
                        var currentUrl = jquery(webmapServices[service]).val();
                        var rootOfCurrentUrl = getHostFromURL(currentUrl);

                        // Create unique list of Root URLs for the UI auto-complete dropdown list.
                        // User input also allows freehand strings.
                        if (jquery.inArray(rootOfCurrentUrl, currentUniqueRootUrlVals) === -1) {
                            currentUniqueRootUrlVals.push(rootOfCurrentUrl);
                            jquery("#origServiceUrlList").append("<option value=" + rootOfCurrentUrl + ">" + rootOfCurrentUrl + "</option>");
                        }
                    });

                    // This can be updated later if users want to be able to replace more than
                    // just the hostname with port section of map service URLs (e.g. the web adaptor name).
                    function getHostFromURL(href) {
                        var parsedUrl = href.match(/^(https?\:)\/\/(([^:\/?#]*)(?:\:([0-9]+))?)(\/[^?#]*)(\?[^#]*|)(#.*|)$/);
                        var protocol = parsedUrl[1];
                        var hostWithPort = parsedUrl[2];
                        return protocol + "//" + hostWithPort;
                    }

                    // Listener for checking user input string for matches in their webmap map service URLs in realtime
                    jquery("#originalTextUserInput").bind("input", function() {
                        var origTextUserInput = jquery("#originalTextUserInput").val();
                        var numFoundStringMatches = 0;
                        if (origTextUserInput.length > 0) {
                            var webmapServices = jquery("[data-original]");
                            jquery.each(webmapServices, function(service) {
                                var originalUrl = jquery(webmapServices[service]).val();
                                if (originalUrl.indexOf(origTextUserInput) > -1) {
                                    numFoundStringMatches += 1;
                                }
                            });
                        }

                        // Check for the case of 1 text match so our English grammar is correct (match vs. matches)
                        var matchText = (numFoundStringMatches === 1 ? "match" : "matches");
                        jquery("#stringMatchesFoundText").text("Found " + numFoundStringMatches.toString() + " text " + matchText + " in this web map's service URLs (case sensitive).");
                    });

                    jquery("#bulkUpdateWebmapServiceUrlsBtn").click(function(e) {
                        e.preventDefault();
                        var origTextUserInput = jquery("#originalTextUserInput").val();
                        var newTextUserInput = jquery("#newTextUserInput").val();

                        // Allow a zero length string for the new URL input for the use case of removing
                        // port designators (e.g. switching from 6080 endpoints to the web adaptor).
                        if (origTextUserInput.length > 0) {
                            var webmapServices = jquery("[data-original]");
                            var foundMatches = 0; // eslint-disable-line no-unused-vars
                            jquery.each(webmapServices, function(service) {
                                var originalUrl = jquery(webmapServices[service]).val();
                                if (originalUrl.indexOf(origTextUserInput) > -1) {
                                    var newCalculatedUrl = originalUrl.replace(origTextUserInput, newTextUserInput);
                                    jquery(webmapServices[service]).val(newCalculatedUrl);
                                    foundMatches += 1;
                                }
                            });
                        }

                        jquery("#originalTextUserInput").val("");
                        jquery("#newTextUserInput").val("");
                        jquery("#stringMatchesFoundText").text("");
                    });

                    // Event listener for update button.
                    jquery("#btnUpdateWebmapServices").click(function() {
                        var webmapServices = jquery("[data-original]");
                        jquery.each(webmapServices, function(service) {
                            var originalUrl = jquery(webmapServices[service])
                                .attr("data-original");
                            var newUrl = jquery(webmapServices[service]).val();

                            // Find and replace each URL.
                            webmapData = webmapData.replace("\"" + originalUrl + "\"", "\"" + newUrl + "\"");
                            jquery(webmapServices[service]).val(newUrl);
                        });

                        var webmapId = jquery(".content.active.btn-primary").attr("data-id");
                        var itemData = JSON.parse(webmapData);
                        portal.updateWebmapData(owner, folder, webmapId, itemData).then(function(response) {
                            var html;
                            if (response.success) {
                                // Set the stored original URL to the new value.
                                jquery.each(webmapServices, function(service) {
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
                    jquery("#btnResetWebmapServices").click(function() {
                        var webmapServices = jquery("[data-original]");
                        jquery.each(webmapServices, function(service) {
                            var originalUrl = jquery(webmapServices[service]).attr("data-original");
                            jquery(webmapServices[service]).val(originalUrl);
                        });
                    });
                });
        });

    };

    var updateContentUrls = function() {
        var owner;
        var folder;
        var supportedContent = jquery(".content[data-type='Feature Service'], .content[data-type='Map Service'], .content[data-type='Image Service'], .content[data-type='KML'], .content[data-type='WMS'], .content[data-type='Geodata Service'], .content[data-type='Globe Service'], .content[data-type='Geometry Service'], .content[data-type='Geocoding Service'], .content[data-type='Network Analysis Service'], .content[data-type='Geoprocessing Service'], .content[data-type='Web Mapping Application'], .content[data-type='Mobile Application'], .content[data-type='Scene Service']");
        var portal = app.portals.sourcePortal;

        // Highlight supported content.
        supportedContent.addClass("data-toggle btn-info");
        supportedContent.removeAttr("disabled");
        supportedContent.attr("data-toggle", "button");

        // Add a listener for clicking on content buttons.
        jquery(".content").click(function() {

            // Display the selected item's URL.
            var id = jquery(this).attr("data-id");

            // Highlight Web Maps.
            supportedContent.addClass("btn-info");
            jquery(".content").removeClass("active");
            jquery(".content").removeClass("btn-primary");
            jquery(this).addClass("btn-primary");
            jquery(this).removeClass("btn-info");
            portal.itemDescription(id).then(function(description) {
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
                jquery("#btnUpdateContentUrl").click(function() {
                    var contentId = jquery(".content.active.btn-primary").attr("data-id");
                    var url = jquery("[data-original]").val();
                    portal.updateUrl(owner, folder, contentId, url).then(function(response) {
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
                jquery("#btnResetContentUrl").click(function() {
                    var originalUrl = jquery("[data-original]").attr("data-original");
                    jquery("[data-original]").val(originalUrl);
                });
            });
        });
    };

    var viewStats = function() {

        var portal = app.portals.sourcePortal;

        var statsCalendar = function(activities) {
            require(["d3", "cal-heatmap"], function(d3, CalHeatMap) {
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

        portal.userProfile(portal.username)
            .then(function(user) {

                var template = jquery("#statsTemplate").html();
                var thumbnailUrl;

                // Check that the user has a thumbnail image.
                if (user.thumbnail) {
                    thumbnailUrl = portal.portalUrl +
                        "sharing/rest/community/users/" + user.username +
                        "/info/" + user.thumbnail + "?token=" +
                        portal.token;
                } else {
                    thumbnailUrl = "assets/images/no-user-thumb.jpg";
                }

                var templateData = {
                    username: user.username,
                    thumbnail: thumbnailUrl
                };

                var html = mustache.to_html(template, templateData);
                jquery("body").append(html);
                statsCalendar(app.stats.activities);

                jquery("#statsModal").modal("show");

                // Get the user's 3 most viewed items.
                var searchQuery = "owner:" + portal.username;
                portal.search(searchQuery, 3, "numViews", "desc")
                    .then(function(results) {
                        jquery.each(results.results, function(result) {
                            results.results[result].numViews =
                                results.results[result]
                                .numViews.toString()
                                .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                            results.results[result].itemUrl =
                                portal.portalUrl +
                                "home/item.html?id=" +
                                results.results[result].id;
                        });

                        var tableTemplate = jquery("#mostViewedContentTemplate").html();
                        jquery("#mostViewedContent").html(mustache.to_html(tableTemplate, {
                            searchResults: results.results
                        }));
                    });

                jquery("#statsModal").on("shown.bs.modal", function() {
                    // Apply CSS to style the calendar arrows.
                    var calHeight = jquery(".calContainer").height();

                    // Center the calendar.
                    jquery(".cal-heatmap-container").css("margin", "auto");

                    // Adjust the arrows.
                    jquery(".calArrow").css("margin-top", (calHeight - 20) + "px");
                });

                jquery("#statsModal").on("hidden.bs.modal", function() {
                    // Destroy the stats modal so it can be properly rendered next time.
                    jquery("#statsModal").remove();
                });

            });
    };

    // Check if the service name is available.
    var checkServiceName = function(destinationPortal) {
        var deferred = new jquery.Deferred();
        var nameInput = jquery("#serviceName");
        jquery("#serviceName").off("blur"); // Prevent duplicate listeners.
        nameInput.blur(function() {
            var name = nameInput.val();
            destinationPortal.self()
                .then(function(self) {
                    destinationPortal.checkServiceName(self.user.orgId, name, "Feature Service")
                        .then(function(available) {
                            if (available.available !== true) {
                                var nameError = mustache.to_html(jquery("#serviceNameErrorTemplate").html(), {
                                    name: name
                                });

                                // Prevent appending duplicate error messages.
                                jquery(".alert-danger.alert-dismissable").remove();
                                nameInput.parent().parent().after(nameError);
                                nameInput.parent().addClass("has-error");
                                nameInput.next().removeClass("glyphicon-ok");
                            } else {
                                name = nameInput.val();
                                jquery(".alert-danger.alert-dismissable").remove();
                                nameInput.parent().removeClass("has-error");
                                nameInput.next().addClass("glyphicon-ok");
                                jquery("#btnCopyService").removeClass("disabled");
                                deferred.resolve(name);
                            }
                        });
                });
        });

        return deferred.promise();
    };

    var showCopyError = function(id, message) {
        var html = mustache.to_html(jquery("#contentCopyErrorTemplate").html(), {
            id: id,
            message: message
        });
        jquery("#" + id + "_clone").before(html);
    };

    /**
     * simpleCopy() Copies a given item ID.
     * @id {String} id of the source item
     * @folder {String} id of the destination folder
     */
    var simpleCopy = function(id, folder) {
        var portalUrl = jquery("#" + id).attr("data-portal");
        var portal;
        /**
         * Prevent trying to pass a portal token when
         * copying content from ArcGIS Online.
         */
        if (portalUrl === "https://www.arcgis.com/" &&
            portalUrl !== app.portals.sourcePortal.portalUrl) {
            portal = app.portals.arcgisOnline;
        } else {
            portal = app.portals.sourcePortal;
        }

        var destinationPortal = app.portals.destinationPortal;
        var item = jquery.grep(portal.items, function(item) {
            return (item.id === id);
        });

        var description = item[0].description;
        var thumbnailUrl = portal.portalUrl + "sharing/rest/content/items/" + id + "/info/" +
            description.thumbnail + "?token=" + portal.token;
        portal.itemData(id).then(function(data) {
            /**
             * Post it to the destination using always
             * to ensure that it copies Web Mapping Applications
             * which don't have a data component and therefore
             * generate a failed response.
             */
            destinationPortal.addItem(destinationPortal.username, folder, description, data, thumbnailUrl)
                .then(function(response) {
                    var html;
                    if (response.success === true) {
                        // Swizzle the portal url and id parameter to reflect the url of new item.
                        if (description.url.indexOf("id=") > -1) {
                            var newUrl = destinationPortal.portalUrl + description.url.substring(description.url.indexOf("apps/"));
                            newUrl = newUrl.replace("id=" + description.id, "id=" + response.id);
                            var folder = response.folder || "";
                            destinationPortal.updateUrl(destinationPortal.username, folder, response.id, newUrl)
                                .then(function() {
                                    jquery("#" + id + "_clone").addClass("btn-success");
                                });
                        } else {
                            jquery("#" + id + "_clone").addClass("btn-success");
                        }
                    } else if (response.error) {
                        jquery("#" + id + "_clone").addClass("btn-danger");
                        html = mustache.to_html(jquery("#contentCopyErrorTemplate").html(), {
                            id: id,
                            message: response.error.message
                        });
                        jquery("#" + id + "_clone").before(html);
                    }
                })
                .catch(function() {
                    showCopyError(id, "Something went wrong.");
                });
        });
    };

    var deepCopyFeatureService = function(id, folder) {
        var portalUrl = jquery("#" + id).attr("data-portal");
        var portal;
        /**
         * Prevent trying to pass a portal token when
         * copying content from ArcGIS Online.
         */
        if (portalUrl === "https://www.arcgis.com/" &&
            portalUrl !== app.portals.sourcePortal.portalUrl) {
            portal = app.portals.arcgisOnline;
        } else {
            portal = app.portals.sourcePortal;
        }

        var destinationPortal = app.portals.destinationPortal;
        var name = jquery("#serviceName").val();
        var item = jquery.grep(portal.items, function(item) {
            return (item.id === id);
        });

        var description = item[0].description;
        var serviceDescription = item[0].serviceDescription;
        var layers = serviceDescription.layers;

        // Preserve the icon on the cloned button.
        var span = jquery("#" + id + "_clone > span");
        jquery("#" + id + "_clone").text(name);
        jquery("#" + id + "_clone").prepend(span);
        serviceDescription.name = name;
        var serviceDefinition = serviceDescription;
        delete serviceDefinition.layers;
        destinationPortal.createService(destinationPortal.username, folder, JSON.stringify(serviceDefinition)).then(function(service) {
            var clone = jquery("#" + id + "_clone");
            clone.addClass("btn-info");
            clone.append("<img src='css/grid.svg' class='harvester'/>");
            clone.attr("data-id", service.itemId);
            clone.attr("data-portal", destinationPortal.portalUrl);

            // Upgrade the service url to https to prevent mixed content errors.
            service.serviceurl = portalSelf.util.upgradeUrl(service.serviceurl);

            // Update the new item's tags to make it easier to trace its origins.
            var newTags = description.tags;
            newTags.push("source-" + description.id);
            destinationPortal.updateDescription(destinationPortal.username, service.itemId, folder, JSON.stringify({
                tags: newTags
            }));
            portal.serviceLayers(description.url)
                .then(function(definition) {
                    /*
                     * Force in the spatial reference.
                     * Don't know why this is necessary, but if you
                     * don't then any geometries not in 102100 end up
                     * on Null Island.
                     */
                    jquery.each(definition.layers, function(i, layer) {
                        layer.adminLayerInfo = {
                            geometryField: {
                                name: "Shape",
                                srid: 102100
                            }
                        };
                    });

                    destinationPortal.addToServiceDefinition(service.serviceurl, JSON.stringify(definition))
                        .then(function(response) {
                            if (!("error" in response)) {
                                jquery.each(layers, function(i, v) {
                                    var layerId = v.id;
                                    portal.layerRecordCount(description.url, layerId)
                                        .then(function(records) {
                                            var offset = 0;

                                            // Set the count manually in weird cases where maxRecordCount is negative.
                                            var count = definition.layers[layerId].maxRecordCount < 1 ? 1000 : definition.layers[layerId].maxRecordCount;
                                            var added = 0;
                                            var x = 1; // eslint-disable-line no-unused-vars
                                            while (offset <= records.count) {
                                                x++;
                                                portal.harvestRecords(description.url, layerId, offset, count)
                                                    // the linter doesn't like anonymous callback functions within loops
                                                    /* eslint-disable no-loop-func */
                                                    .then(function(serviceData) {
                                                        destinationPortal.addFeatures(service.serviceurl, layerId, JSON.stringify(serviceData.features))
                                                            .then(function() {
                                                                added += count;
                                                                if (added >= records.count) {
                                                                    jquery("#" + id + "_clone > img").remove();
                                                                    jquery("#" + id + "_clone").removeClass("btn-info");
                                                                    jquery("#" + id + "_clone").addClass("btn-success");
                                                                }
                                                            });
                                                    });
                                                    /* eslint-enable no-loop-func */
                                                offset += count;
                                            }
                                        });
                                });
                            } else {
                                jquery("#" + id + "_clone > img").remove();
                                jquery("#" + id + "_clone").removeClass("btn-info");
                                jquery("#" + id + "_clone").addClass("btn-danger");
                                var message = response.error.message;
                                showCopyError(id, message);
                            }
                        })
                        .catch(function() {
                            jquery("#" + id + "_clone > img").remove();
                            jquery("#" + id + "_clone").removeClass("btn-info");
                            jquery("#" + id + "_clone").addClass("btn-danger");
                            var message = "Something went wrong.";
                            showCopyError(id, message);
                        });
                });
        });
    };

    // Make the drop area accept content items.
    var makeDroppable = function(id) {

        var destinationPortal = app.portals.destinationPortal;
        var portal;

        /**
         * copyItem() Copies a given item ID.
         * @id {String} ID of the source item
         * @folder {String} id of the destination folder
         */
        var copyItem = function(id, folder) {
            var type = jquery("#" + id).attr("data-type");
            var portalUrl = jquery("#" + id).attr("data-portal");
            /**
             * Prevent trying to pass a portal token when
             * copying content from ArcGIS Online.
             */
            if (portalUrl === "https://www.arcgis.com/" &&
                portalUrl !== app.portals.sourcePortal.portalUrl) {
                portal = app.portals.arcgisOnline;
            } else {
                portal = app.portals.sourcePortal;
            }

            // Ensure the content type is supported before trying to copy it.
            if (isSupported(type)) {
                // Get the full item description and data from the source.
                portal.itemDescription(id).then(function(description) {
                    portal.cacheItem(description);
                    switch (type) {
                    case "Feature Service":

                        // Upgrade the service url to https to prevent mixed content errors.
                        description.url = portalSelf.util.upgradeUrl(description.url);

                        // Also update the cached url.
                        portal.items[portal.items.length - 1].description.url = description.url;

                        portal.serviceDescription(description.url).then(function(serviceDescription) {
                            var item = jquery.grep(portal.items, function(item) {
                                return (item.id === id);
                            });

                            var name = description.name;
                            if (name === null) {
                                name = description.title;
                            }

                            jquery("#serviceName").val(name);
                            item[0].serviceDescription = serviceDescription;
                            jquery("#btnCancelCopy").attr("data-id", description.id);
                            jquery("#btnCopyService").attr("data-id", description.id);
                            jquery("#deepCopyModal").modal("show");
                            jquery("#btnCopyService").removeClass("disabled");

                            // Add a listener for the service name form.
                            checkServiceName(destinationPortal);
                        });

                        break;
                    default:
                        simpleCopy(id, folder);
                    }
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
        /**
         * Move the content DOM element from the source
         * to the destination container on the page.
         */
        var moveItem = function(item, destination) {
            "use strict";
            var itemId = jquery(item).attr("data-id");

            // Clone the original item.
            var clone = jquery(item).clone();

            // Differentiate this object from the original.
            clone.attr("id", itemId + "_clone");
            clone.addClass("clone");

            // Remove the max-width property so it fills the folder.
            clone.css("max-width", "");

            // Move it to the destination folder.
            clone.insertAfter(destination.children(".dropArea"));

            // Remove the contextual highlighting.
            clone.removeClass("active btn-primary btn-info");

            // Get the folder the item was dragged into.
            var destinationFolder = clone.parent().attr("data-folder");

            copyItem(itemId, destinationFolder);
        };

        jquery("#dropFolder_" + id).droppable({
            accept: ".content",
            activeClass: "ui-state-hover",
            hoverClass: "ui-state-active",
            drop: function(event, ui) {
                moveItem(ui.draggable, jquery(this).parent().parent());
            }
        });
    };

    var cleanUp = function() {
        jquery("#dropArea").empty(); // Clear any old items.
        jquery(".content").unbind("click"); // Remove old event handlers.
        jquery(".content").removeClass("active btn-primary btn-info ui-draggable");
        jquery(".content").attr("disabled", "disabled");
    };

    var clearResults = function() {
        // Clean up any existing content in the left hand column.
        jquery("#itemsArea").empty();
    };

    var highlightCopyableContent = function() {

        var setMaxWidth = function(el) {
            // Set the max-width of folder items so they don't fill the body when dragging.
            var maxWidth = jquery("#itemsArea .in").width() ? jquery("#itemsArea .in").width() : 400;
            jquery(el).css("max-width", maxWidth); // Set the max-width so it doesn't fill the body when dragging.
        };

        jquery("#itemsArea .content").each(function() {

            var makeDraggable = function(el) {
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
                makeDraggable(jquery(this)); // Make the content draggable.
            }
        });
    };

    var highlightSupportedContent = function() {
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
    var isSupported = function(type) {
        // Check if the content type is supported.
        //
        var supportedTypes = [
            "Web Map",
            "Web Scene",
            "Map Service",
            "Image Service",
            "Scene Service",
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

//    var isTypeText = function(type) {
//        var textTypes = [
//            "Web Map",
//            "Feature Collection",
//            "Feature Collection Template",
//            "Operation View",
//            "Symbol Set",
//            "Color Set",
//            "Document Link"
//        ];
//        if (jquery.inArray(type, textTypes) > -1) {
//            return true;
//        }
//    };
//
//    var isTypeUrl = function(type) {
//        var urlTypes = [
//            "Feature Service",
//            "Map Service",
//            "Image Service",
//            "KML",
//            "WMS",
//            "Geodata Service",
//            "Globe Service",
//            "Geometry Service",
//            "Geocoding Service",
//            "Network Analysis Service",
//            "Geoprocessing Service",
//            "Web Mapping Application",
//            "Mobile Application"
//        ];
//        if (jquery.inArray(type, urlTypes) > -1) {
//            return true;
//        }
//    };

    var listSearchItems = function(portalUrl, results) {
        "use strict";
        clearResults();

        var folderData = {
            title: "Search Results (" + results.query + ")",
            id: "search",
            count: results.total
        };
        var html = mustache.to_html(jquery("#folderTemplate").html(), folderData);
        jquery("#itemsArea").append(html);

        // Append the root items to the Root folder.
        jquery.each(results.results, function() {
            var templateData = {
                id: this.id,
                title: this.title,
                type: this.type,
                icon: portalSelf.itemInfo(this.type).icon,
                portal: portalUrl
            };
            var html = mustache.to_html(jquery("#contentTemplate").html(), templateData);
            jquery("#collapse_search").append(html)
                .addClass("in");
        });

        highlightSupportedContent();
    };

    var listUserItems = function() {
        "use strict";
        var portal = app.portals.sourcePortal;

        cleanUp();
        clearResults();

        // Capture item creation times to be displayed in the user heatmap.
        function storeActivity(activityTime) {
            var seconds = activityTime / 1000;
            app.stats.activities[seconds] = 1;
        }

        function sortFoldersAlpha(container) {
            var folders = container.children(".panel").get();
            folders.sort(function(a, b) {
                return jquery(a).children("div.panel-heading").attr("data-title").toUpperCase().localeCompare(jquery(b).children("div.panel-heading").attr("data-title").toUpperCase());
            });

            jquery.each(folders, function(idx, folder) {
                container.append(folder);
            });

            container.prepend(jquery("[data-title='Root']").parent());
        }

        function sortItemsAlpha(folder) {
            var folderItems = folder.children("button").get();
            folderItems.sort(function(a, b) {
                return jquery(a).text().toUpperCase().localeCompare(jquery(b).text().toUpperCase());
            });

            jquery.each(folderItems, function(idx, item) {
                folder.append(item);
            });
        }

        portal.userContent(portal.username, "/").then(function(content) {
            // Append the root folder accordion.
            var folderData = {
                title: "Root",
                id: "",
                count: content.items.length
            };
            var html = mustache.to_html(jquery("#folderTemplate").html(), folderData);
            jquery("#itemsArea").append(html);

            // Append the root items to the Root folder.
            jquery.each(content.items, function(item) {
                var templateData = {
                    id: this.id,
                    title: this.title,
                    type: this.type,
                    icon: portalSelf.itemInfo(this.type).icon,
                    portal: portal.portalUrl
                };
                var html = mustache.to_html(jquery("#contentTemplate").html(), templateData);
                jquery("#collapse_").append(html);
                storeActivity(content.items[item].modified);
            });

            sortItemsAlpha(jquery("#collapse_"));
            jquery.each(content.folders, function(folder) {
                sortFoldersAlpha(jquery("#itemsArea"));
                portal.userContent(portal.username, content.folders[folder].id)
                    .then(function(content) {
                        var folderData = {
                            title: content.currentFolder.title,
                            id: content.currentFolder.id,
                            count: content.items.length
                        };

                        // Append an accordion for the folder.
                        var html = mustache.to_html(jquery("#folderTemplate").html(), folderData);
                        jquery("#itemsArea").append(html);

                        // Append the items to the folder.
                        jquery.each(content.items, function(item) {
                            var templateData = {
                                id: this.id,
                                title: this.title,
                                type: this.type,
                                icon: portalSelf.itemInfo(this.type).icon,
                                portal: portal.portalUrl
                            };
                            var html = mustache.to_html(jquery("#contentTemplate").html(), templateData);
                            jquery("#collapse_" + content.currentFolder.id).append(html);
                            storeActivity(content.items[item].modified);
                        });

                        sortItemsAlpha(jquery("#collapse_" + content.currentFolder.id));
                    });
            });

            setTimeout(function() {
                // Wait a second to let all of the items populate before sorting and highlighting them.
                sortFoldersAlpha(jquery("#itemsArea"));
                highlightSupportedContent();
            }, 1000);
        });
    };

    var listUserGroups = function() {
        "use strict";
        var portal = app.portals.sourcePortal;

        cleanUp();
        clearResults();

        function sortFoldersAlpha(container) {
            var folders = container.children(".panel").get();
            folders.sort(function(a, b) {
                return jquery(a).children("div.panel-heading").attr("data-title").toUpperCase().localeCompare(jquery(b).children("div.panel-heading").attr("data-title").toUpperCase());
            });

            jquery.each(folders, function(idx, folder) {
                container.append(folder);
            });

            container.prepend(jquery("[data-title='Root']").parent());
        }

        function sortItemsAlpha(folder) {
            var folderItems = folder.children("button").get();
            folderItems.sort(function(a, b) {
                return jquery(a).text().toUpperCase().localeCompare(jquery(b).text().toUpperCase());
            });

            jquery.each(folderItems, function(idx, item) {
                folder.append(item);
            });
        }

        portal.userProfile(portal.username).then(function(user) {
            jquery.each(user.groups, function() {
                sortFoldersAlpha(jquery("#itemsArea"));
                var group = this;
                var query = "group:" + this.id;

                portal.search(query, 100)
                    .then(function(search) {
                        var folderData = {
                            title: group.title,
                            id: group.id,
                            count: search.results.length
                        };

                        // Append an accordion for the folder.
                        var html = mustache.to_html(jquery("#folderTemplate").html(), folderData);
                        jquery("#itemsArea").append(html);

                        // Append the items to the folder.
                        jquery.each(search.results, function() {
                            var templateData = {
                                id: this.id,
                                title: this.title,
                                type: this.type,
                                icon: portalSelf.itemInfo(this.type).icon,
                                portal: portal.portalUrl
                            };
                            var html = mustache.to_html(jquery("#contentTemplate").html(), templateData);
                            jquery("#collapse_" + group.id).append(html);
                        });

                        sortItemsAlpha(jquery("#collapse_" + group.id));
                    });
            });

            setTimeout(function() {
                // Wait a second to let all of the items populate before sorting and highlighting them.
                sortFoldersAlpha(jquery("#itemsArea"));
                highlightSupportedContent();
            }, 1000);
        });
    };

    var showDestinationFolders = function() {
        "use strict";
        var portal = app.portals.destinationPortal;

        function sortItemsAlpha(folder) {
            var folderItems = folder.children("button").get();
            folderItems.sort(function(a, b) {
                return jquery(a).text().toUpperCase().localeCompare(jquery(b).text().toUpperCase());
            });

            jquery.each(folderItems, function(idx, item) {
                folder.append(item);
            });
        }

        portal.userContent(portal.username, "/").then(function(content) {
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

            // Append the root items to the Root folder.
            jquery.each(content.items, function() {
                var templateData = {
                    id: this.id,
                    title: this.title,
                    type: this.type,
                    icon: portalSelf.itemInfo(this.type).icon,
                    portal: portal.portalUrl
                };
                var html = mustache.to_html(jquery("#contentTemplate").html(), templateData);
                jquery("#collapseDest_").append(html);
            });

            sortItemsAlpha(jquery("#collapseDest_"));

            // Enable the droppable area.
            makeDroppable("");

            // Append the other folders.
            jquery.each(content.folders, function(folder) {
                portal.userContent(portal.username, content.folders[folder].id)
                    .then(function(content) {
                        var folderData = {
                            title: content.currentFolder.title,
                            id: content.currentFolder.id,
                            count: content.items.length
                        };

                        // Append an accordion for the folder.
                        var template = jquery("#dropFolderTemplate").html();
                        var html = mustache.to_html(template, folderData);
                        jquery("#dropArea").append(html);

                        // Append the items to the folder.
                        jquery.each(content.items, function() {
                            var templateData = {
                                id: this.id,
                                title: this.title,
                                type: this.type,
                                icon: portalSelf.itemInfo(this.type).icon,
                                portal: portal.portalUrl
                            };
                            var html = mustache.to_html(jquery("#contentTemplate").html(), templateData);
                            jquery("#collapseDest_" + content.currentFolder.id).append(html);
                        });

                        // Collapse the accordion to avoid cluttering the display.
                        jquery("#collapseDest_" + content.currentFolder.id)
                            .collapse("hide");
                        sortItemsAlpha(jquery("#collapseDest_" + content.currentFolder.id));

                        // Enable the droppable area.
                        makeDroppable(content.currentFolder.id);
                    });
            });
        });
    };

    // Do stuff when the DOM is ready.
    jquery(document).ready(function() {

        // Enable the login button.
        // Doing it here ensures all required libraries have loaded.
        jquery(".jumbotron > p > [data-action='login']")
            .removeAttr("disabled");
        jquery("a.portal-signin").attr("href", "#portalLoginModal");

        // Restore previous ArcGIS Online login if it was deleted
        // during interrupted destination login.
        if (sessionStorage.esriJSAPIOAuthBackup && sessionStorage.esriIdBackup) {
            esriId.destroyCredentials();
            esriId.initialize(JSON.parse(sessionStorage.getItem("esriIdBackup")));
            sessionStorage.setItem("esriJSAPIOAuth", sessionStorage.getItem("esriJSAPIOAuthBackup"));
        }

        // Check for previously authenticated sessions.
        esriId.registerOAuthInfos([appInfo]);
        portalSelf.util.fixUrl(appInfo.portalUrl).then(function(portalUrl) {
            /*
             * Build the sharingUrl. This is necessary because esriId automatically
             * appends /sharing to the portalUrl when it contains arcgis.com.
             */
            var sharingUrl = portalUrl;
            if (sharingUrl.indexOf("arcgis.com") === -1) {
                sharingUrl += "sharing/";
            }
            esriId.checkSignInStatus(sharingUrl)
                .then(
                    function(user) {
                        jquery("#splashContainer").css("display", "none");
                        jquery("#itemsContainer").css("display", "block");
                        app.portals.sourcePortal = new portalSelf.Portal({
                            portalUrl: portalUrl,
                            username: user.userId,
                            token: user.token
                        });
                        startSession();
                    })
                .otherwise(
                    function() {
                        jquery("#itemsContainer").css("display", "none");
                        jquery("#splashContainer").css("display", "block");
                    }
                );
        });

        // Resize the content areas to fill the window.
        var resizeContentAreas = function() {
            "use strict";
            jquery(".itemArea").height(jquery(window).height() - 50);
        };

        resizeContentAreas();

        // Disable the enter key to prevent accidentally firing forms.
        // Disable it for everything except the code edit windows.
        var disableEnterKey = function() {
            "use strict";
            jquery("html").bind("keypress", function(e) {
                if (e.keyCode === 13 &&
                    jquery(e.target).attr("contenteditable") !== "true") {
                    return false;
                }
            });
        };

        disableEnterKey();

        // Preformat the copy login screen.
        jquery("#destinationUrl").css({
            display: "none"
        });
        jquery("#destinationWebTierAuth").css({
            display: "none"
        });
        jquery("#destinationLoginForm").css({
            display: "none"
        });

        // *** Global Listeners ***
        jquery("#destinationAgolBtn").click(function() {
            jquery(".alert-danger.alert-dismissable").remove();
            jquery("#destinationUrl").next().removeClass("glyphicon-ok");
            jquery("#destinationUrl").parent().removeClass("has-error");
            jquery("#destinationUrl").attr({
                placeholder: "",
                value: "https://www.arcgis.com/"
            });
            jquery("#destinationUrl").val("https://www.arcgis.com/");
            jquery("#destinationUrl").css({
                display: "none"
            });
            jquery("#destinationWebTierAuth").css({
                display: "none"
            });
            jquery("#destinationLoginForm").css({
                display: "none"
            });
            jquery("#destinationLoginBtn").css({
                display: "none"
            });
            jquery("#destinationEnterpriseBtn").css({
                display: "inline"
            });
            jquery("#destinationAgolBtn").addClass("btn-primary active");
            jquery("#destinationPortalBtn").removeClass("btn-primary active");
            if (app.portals.destinationPortal) {
                app.portals.destinationPortal.portalUrl = "https://www.arcgis.com/";
            }
        });

        jquery("#destinationPortalBtn").click(function() {
            jquery("#destinationUrl").attr({
                placeholder: "https://myportal.com/",
                value: ""
            });
            jquery("#destinationUrl").val("");
            jquery("#destinationUrl").css({
                display: "block"
            });
            jquery("#destinationWebTierAuth").css({
                display: "block"
            });
            jquery("#destinationLoginForm").css({
                display: "block"
            });
            jquery("#destinationLoginBtn").css({
                display: "inline"
            });
            jquery("#destinationEnterpriseBtn").css({
                display: "none"
            });
            jquery("#destinationPortalBtn").addClass("btn-primary active");
            jquery("#destinationAgolBtn").removeClass("btn-primary active");
        });

        // Make DOM adjustments when the browser is resized.
        jquery(window).resize(function() {
            resizeContentAreas();
        });

        // Validate the entered url when the input loses focus.
        jquery("#portalUrl").blur(function() {

            if (!app.portals.sourcePortal) {
                app.portals.sourcePortal = new portalSelf.Portal();
            }

            // Give the DOM time to update before firing the validation.
            setTimeout(function() {
                validateUrl("#portalUrl", app.portals.sourcePortal);
            }, 500);
        });

        // Validate the url when the input loses focus.
        jquery("#destinationUrl").blur(function() {

            if (!app.portals.destinationPortal) {
                app.portals.destinationPortal = new portalSelf.Portal();
            }

            // Give the DOM time to update before firing the validation.
            setTimeout(function() {
                if (jquery("#destinationPortalBtn").hasClass("active")) {
                    validateUrl("#destinationUrl", app.portals.destinationPortal);
                }
            }, 500);
        });

        // Disable username and password if web tier auth is selected.
        jquery("#sourceWebTierAuth").click(function(e) {
            var checkboxState = jquery(e.currentTarget).prop("checked");
            if (checkboxState === true) {
                jquery("#portalUsername").attr("disabled", true);
                jquery("#portalPassword").attr("disabled", true);
                jquery("#portalLoginBtn").text("Proceed");
                app.portals.sourcePortal.withCredentials = true;
            } else {
                jquery("#portalUsername").removeAttr("disabled");
                jquery("#portalPassword").removeAttr("disabled");
                jquery("#portalLoginBtn").text("Log in");
                app.portals.sourcePortal.withCredentials = false;
            }
        });

        // Disable username and password if web tier auth is selected.
        jquery("#destWebTierAuthChk").click(function(e) {
            var checkboxState = jquery(e.currentTarget).prop("checked");
            if (checkboxState === true) {
                jquery("#destinationUsername").attr("disabled", true);
                jquery("#destinationPassword").attr("disabled", true);
                jquery("#destinationLoginBtn").text("Proceed");
                app.portals.destinationPortal.withCredentials = true;
            } else {
                jquery("#destinationUsername").removeAttr("disabled");
                jquery("#destinationPassword").removeAttr("disabled");
                jquery("#destinationLoginBtn").text("Log in");
                app.portals.destinationPortal.withCredentials = false;
            }
        });

        // Login.
        jquery("[data-action='login']").click(function() {
            esriId.getCredential(appInfo.portalUrl, {
                oAuthPopupConfirmation: false
            })
            .then(function(user) {
                jquery("#splashContainer").css("display", "none");
                jquery("#itemsContainer").css("display", "block");
                app.portals.sourcePortal = new portalSelf.Portal({
                    portalUrl: user.server + "/",
                    username: user.userId,
                    token: user.token
                });
                startSession();
            });
        });

        // Destination ArcGIS Online login.
        jquery("[data-action='logindestination']").click(function() {

            // Save esriId and esriJSAPIOAuth to restore after logging in
            var appIdJson = esriId.toJson();
            var esriJSAPIOAuth = sessionStorage.esriJSAPIOAuth;

            // Store backup in case page is refreshed in the middle of logging in
            sessionStorage.setItem("esriJSAPIOAuthBackup", esriJSAPIOAuth);
            sessionStorage.setItem("esriIdBackup", JSON.stringify(appIdJson));

            // Destroy credentials and remove esriJSAPIOAuth sessions storage
            esriId.destroyCredentials();
            sessionStorage.removeItem("esriJSAPIOAuth");

            esriId.getCredential(appInfo.portalUrl, {
                oAuthPopupConfirmation: false
            }).then(function(user) {
                // If there is no destination or the destination is not the same as ArcGIS Online
                if (!app.portals.destinationPortal || (app.portals.destinationPortal.portalUrl !== appInfo.portalUr)) {
                    app.portals.destinationPortal = new portalSelf.Portal({
                        portalUrl: user.server + "/",
                        username: user.userId,
                        token: user.token
                    });
                }

                // Re-hydrate identify manager and restore session storage of esriJSAPIOAuth
                esriId.initialize(appIdJson);
                sessionStorage.setItem("esriJSAPIOAuth", esriJSAPIOAuth);

                app.portals.destinationPortal.self().then(function() {
                    jquery("#copyModal").modal("hide");
                    highlightCopyableContent();
                    NProgress.start();
                    showDestinationFolders();
                    NProgress.done();
                });
            });
        });

        // Log into a Portal.
        jquery("#portalLoginBtn").click(function() {
            loginPortal();
        });

        /**
         * Use the existing credentials when "My Account"
         * is selected as the copy target.
         */
        jquery("[data-action='copyMyAccount']").click(function() {
            app.portals.destinationPortal = app.portals.sourcePortal;
            jquery("#copyModal").modal("hide");
            highlightCopyableContent();
            NProgress.start();
            showDestinationFolders();
            NProgress.done();
        });

        /**
         * Show other destination form when "Another Account"
         * is selected as the copy target.
         */
        jquery("[data-action='copyOtherAccount']").click(function() {
            jquery("#destinationChoice").css("display", "none");
            jquery("#destinationForm").css("display", "block");
        });

        // Log in to the destination account.
        jquery("#destinationLoginBtn").click(function() {
            loginDestination();
        });

        // Reset the destination login form when the modal is canceled.
        jquery("#destinationLoginBtn").click(function() {
            jquery("#destinationLoginBtn").button("reset");
        });

        // Clear the copy action when the cancel button is clicked.
        jquery("#destinationCancelBtn").click(function() {
            jquery("#actionDropdown li").removeClass("active");
        });

        // Add a listener for the enter key on the destination login form.
        jquery("#destinationLoginForm").keypress(function(e) {
            if (e.which == 13) {
                jquery("#destinationLoginBtn").focus().click();
            }
        });

        // Add a listener for the future search bar picker.
        jquery(document).on("click", "#searchMenu li", function(e) {
            var selectedAction = jquery(e.target).parent().attr("data-action");
            if (selectedAction !== "viewMyContent" && selectedAction !== "viewMyGroups") {
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
            } else if (selectedAction == "viewMyGroups") {
                // View My Groups.
                NProgress.start();
                listUserGroups();
                NProgress.done();
            } else {
                // View My Content.
                NProgress.start();
                listUserItems();
                NProgress.done();
            }
        });

        jquery(document).on("click", "#btnSimpleCopy", function() {
            jquery("#serviceNameForm").hide();
            jquery(".alert-danger.alert-dismissable").remove();
            jquery("#btnCopyService").removeClass("disabled");
            jquery("#btnSimpleCopy").addClass("btn-primary active");
            jquery("#btnFullCopy").removeClass("btn-primary active");
            jquery("#btnFullCopy").addClass("btn-default");
        });

        jquery(document).on("click", "#btnFullCopy", function() {
            jquery("#serviceNameForm").show();
            jquery("#btnCopyService").addClass("disabled");
            jquery("#btnFullCopy").addClass("btn-primary active");
            jquery("#btnSimpleCopy").removeClass("btn-primary active");
            jquery("#btnSimpleCopy").addClass("btn-default");
            jquery("#serviceName").blur();
        });

        // Add a listener for the future cancel copy button.
        jquery(document).on("click", "#btnCancelCopy", function(e) {
            var id = jquery(e.currentTarget).attr("data-id");
            jquery(".clone[data-id='" + id + "']").remove();
            jquery("#btnCancelCopy").attr("data-id", "");
            jquery("#serviceName").attr("value", "");
            jquery("#btnSimpleCopy").click(); // Reset everything.
            jquery("#deepCopyModal").modal("hide");
        });

        // Add a listener for the future copy button.
        jquery(document).on("click", "#btnCopyService", function(e) {
            var id = jquery(e.currentTarget).attr("data-id");
            var folder = jquery(".clone[data-id='" + id + "']").parent().attr("data-folder");
            var copyType = jquery("#copySelector > .btn-primary").text();
            switch (copyType) {
            case "Simple":
                simpleCopy(id, folder);
                break;
            case "Full":
                deepCopyFeatureService(id, folder);
                break;
            }
            jquery("#btnCancelCopy").attr("data-id", "");
            jquery("#serviceName").attr("value", "");
            jquery("#btnSimpleCopy").click(); // Reset everything.
            jquery("#deepCopyModal").modal("hide");
        });

        jquery(document).on("click", "li [data-action]", function(e) {
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
        jquery("#copyModal").on("show.bs.modal", function() {
            cleanUp();
            jquery("#destinationChoice").css("display", "block");
            jquery("#destinationForm").css("display", "none");
        });

    });

});
