requirejs.config({
    baseUrl: './',
    paths: {
        "jquery": "js/lib/jquery-1.10.2.min",
        "jquery.bootstrap": "js/lib/bootstrap/js/bootstrap-3.2.0.min",
        "jquery.ui": "js/lib/jquery-ui-1.9.2.min",
        "mustache": "js/lib/mustache-0.7.2",
        "d3": "js/lib/d3.v3-3.2.7.min",
        "nprogress": "js/lib/nprogress-0.1.6",
        "cal-heatmap": "js/lib/cal-heatmap-3.3.10.min",
        "highlight": "js/lib/highlight.min",
        "portal": "js/portal/portal",
        "util": "js/portal/util"
    },
    shim: {
        "jquery.bootstrap": {
            // Ensure jquery-ui loads first.
            // This is necessary so bootstrap stuff still works.
            deps: ["jquery", "jquery.ui"],
        },
        "jquery.ui": {
            deps: ["jquery"],
        },
        "nprogress": {
            deps: ["jquery"],
            exports: "NProgress"
        },
        "cal-heatmap": {
            deps: ["d3"]
        },
        "portal": {
            deps: ["jquery", "util"]
        }
    }
});

require([
    "jquery",
    "portal",
    "mustache",
    "d3",
    "nprogress",
    "jquery.bootstrap",
    "jquery.ui",
    "cal-heatmap",
    "highlight"
], function (jquery, portal, mustache, d3, NProgress) {

    function resizeContentAreas() {
        "use strict";
        jquery(".itemArea").height(jquery(window).height() - 50);
    }

    // Do stuff when DOM is ready.
    jquery(document).ready(function () {

        jquery("#logout").hide();

        resizeContentAreas(); // Resize the content areas based on the window size.

        jquery("#sourceUrl").tooltip({
            trigger: "hover",
            title: "Use https://www.arcgis.com/ for AGOL Organization accounts.",
            placement: "bottom"
        });

        jquery("#destinationAgolBtn").tooltip({
            trigger: "hover",
            title: "Use this for AGOL Organization accounts.",
            placement: "bottom"
        });

        // Preformat the copy login screen.
        jquery("#destinationAgolBtn").button("toggle");
        jquery("#destinationAgolBtn").addClass("btn-primary");
        jquery("#destinationUrl").css({
            "visibility": "hidden"
        });

        jquery("#destinationAgolBtn").click(function () {
            jquery("#destinationUrl").attr({
                "placeholder": "",
                "value": "https://www.arcgis.com/"
            });
            jquery("#destinationUrl").val("https://www.arcgis.com/");
            jquery("#destinationUrl").css({
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
            jquery("#destinationPortalBtn").addClass("btn-primary active");
            jquery("#destinationAgolBtn").removeClass("btn-primary active");
        });

    });

    jquery(window).resize(function () { // Do stuff when the window is resized.
        resizeContentAreas(); // Resize the content areas based on the window size.
    });

    // Validate the url when the input loses focus.
    jquery("#sourceUrl").blur(function () {
        validateUrl("#sourceUrl");
    });
    jquery("#destinationUrl").blur(function () {
        // Give the DOM time to update before firing the validation.
        setTimeout(function () {
            if (jquery("#destinationPortalBtn").hasClass("active")) {
                validateUrl("#destinationUrl");
            }
        }, 500);
    });

    // Source Login.
    jquery("#sourceLoginBtn").click(function () {
        loginSource();
    });

    // Destination Login.
    jquery("#destinationLoginBtn").click(function () {
        loginDestination();
    });

    // Reset the destination login form when the modal is canceled.
    jquery("#destinationLoginBtn").click(function () {
        jquery("#destinationLoginBtn").button("reset");
    });

    // Add a listener for the enter key on the source login form.
    jquery("#sourceLoginForm").keypress(function (e) {
        if (e.which == 13) {
            jquery("#sourceLoginBtn").focus().click();
        }
    });

    // Add a listener for the enter key on the destination login form.
    jquery("#destinationLoginForm").keypress(function (e) {
        if (e.which == 13) {
            jquery("#destinationLoginBtn").focus().click();
        }
    });

    // Add a listener for the enter key on the search form.
    jquery("#searchForm").keypress(function (e) {
        if (e.which == 13) {
            jquery("#search").focus().click();
        }
    });

    // Add a listener for the future logout button.
    jquery(document).on("click", "li[data-action='logout']", (function () {
        logout();
    }));

    // Add a listener for the future search bar picker.
    jquery(document).on("click", "li[id='searchAGO']", (function () {
        jquery("#searchMenu li").removeClass("active");
        jquery("#searchAGO").addClass("active");
    }));

    // Add a listener for the future search bar picker.
    jquery(document).on("click", "li[id='searchPortal']", (function () {
        jquery("#searchMenu li").removeClass("active");
        jquery("#searchPortal").addClass("active");
    }));

    // Add a listener for the future search bar picker.
    jquery(document).on("click", "li[id='searchContent']", (function () {
        jquery("#searchMenu li").removeClass("active");
        jquery("#searchContent").addClass("active");
    }));

    // Add a listener for the future search button.
    jquery(document).on("click", "#search", (function () {
        var query = jquery("#searchText").val();
        var portalUrl = jquery("#searchMenu li.active").attr("data-url");
        // Add the org id for "My Portal" searches.
        if (jquery("#searchMenu li.active").attr("data-id")) {
            query = query + " accountid:" + jquery("#searchMenu li.active").attr("data-id");
        }
        // Add the username for "My Content" searches.
        if (jquery("#searchMenu li.active").text() === "My Content") {
            query = query + " owner:" + sessionStorage.sourceUsername;
        }

        portal.search(portalUrl, query, 100, "numViews", "desc", sessionStorage.sourceToken).done(function (results) {
            listSearchItems(results);
        });
    }));

    // Load the html templates.
    jquery.get("templates.html", function (templates) {
        jquery("body").append(templates);
    });

    // Clean up the lists when copy content is selected.
    jquery("#copyModal").on("show.bs.modal", function () {
        cleanUp();
    });

    // Enable inspecting of content.
    jquery("li[data-action='inspectContent']").click(function () {
        cleanUp();
        jquery("#currentAction").html("<a>inspect content</a>");
        inspectContent();
    });

    // Add a listener for the "View my stats" action.
    jquery("li[data-action='stats']").click(function () {
        cleanUp();
        jquery("#currentAction").html("<a>view stats</a>");
        viewStats();
    });

    // Add a listener for the "Update map services" action.
    jquery("li[data-action='updateWebmapServices']").click(function () {
        cleanUp();
        jquery("#currentAction").html("<a>update web map service URLs</a>");
        updateWebmapServices();
    });

    // Add a listener for the "Update map services" action.
    jquery("li[data-action='updateContentUrl']").click(function () {
        cleanUp();
        jquery("#currentAction").html("<a>update content URL</a>");
        updateContentUrls();
    });

    function setMaxWidth(el) {
        // Set the max-width of folder items so they don't fill the body when dragging.
        function setWidth() {
            jquery(el).children(".content").each(function (i) {
                var maxWidth = jquery("#userContent .in").width() ? jquery("#userContent .in").width() : 400;
                jquery(this).css("max-width", maxWidth); // Set the max-width so it doesn't fill the body when dragging.
            });
        }
        setWidth();
        jquery(el).on("shown.bs.collapse", function () {
            setWidth();
        });
    }

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
        var portalUrl = jquery.trim(jquery(el).val()), // trim whitespace
            html = jquery("#urlErrorTemplate").html(),
            fixUrl = function (url) {
                var deferred = jquery.Deferred();
                if (portalUrl === "") {
                    // Default to ArcGIS Online.
                    portalUrl = "https://www.arcgis.com/";
                } else if (portalUrl.search("/home/") > 0) {
                    // Strip the /home endpoint.
                    portalUrl = portalUrl.substr(0, portalUrl.search("/home/")) + "/";
                } else if (portalUrl.search("/sharing/") > 0) {
                    // Strip the /home endpoint.
                    portalUrl = portalUrl.substr(0, portalUrl.search("/sharing/")) + "/";
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
    }

    function loginSource() {
        jquery("#sourceLoginBtn").button("loading");
        jquery("#userContent").empty(); //Clear any old items.
        portal.generateToken(jquery("#sourceUrl").val(), jquery("#sourceUsername").val(), jquery("#sourcePassword").val()).done(function (response) {
            jquery("#sourceLoginBtn").button("reset");
            if (response.token) {
                // Store the portal info in the browser's sessionStorage.
                jquery.when(storeCredentials("source", jquery("#sourceUrl").val(), jquery("#sourceUsername").val(), response.token, function (callback) {
                    startSession();
                }));
            } else if (response.error.code === 400) {
                var html = jquery("#loginErrorTemplate").html();
                jquery("#sourceLoginForm").before(html);
            }
        }).fail(function (response) {
            console.log(response.statusText);
            var html = jquery("#loginErrorTemplate").html();
            jquery("#sourceLoginForm").before(html);
        });
    }

    function startSession() {
        "use strict";
        var portalUrl = sessionStorage.sourceUrl,
            token = sessionStorage.sourceToken;
        portal.self(portalUrl, token).done(function (data) {
            var template = jquery("#sessionTemplate").html(),
                html = mustache.to_html(template, data);
            jquery("#sourceLoginForm").before(html);
            jquery("#sourceLoginForm").hide();
            jquery("#sourceLoginBtn").hide();
            jquery("#logout").show();
            jquery("#actionDropdown").css({
                "visibility": "visible"
            });
            var search = mustache.to_html(jquery("#searchTemplate").html(), {
                portal: portalUrl,
                name: data.name,
                id: data.id
            });
            jquery("#actionDropdown").before(search);
            NProgress.start();
            listUserItems();
            NProgress.done();
        });
    }

    function storeCredentials(direction, portal, username, token, callback) {
        "use strict";
        sessionStorage[direction + "Token"] = token;
        sessionStorage[direction + "Url"] = portal;
        sessionStorage[direction + "Username"] = username;
        callback();
    }

    function loginDestination() {
        jquery("#destinationLoginBtn").button("loading");
        jquery("#dropArea").empty(); //Clear any old items.
        portal.generateToken(jquery("#destinationUrl").val(), jquery("#destinationUsername").val(), jquery("#destinationPassword").val()).done(function (response) {
            jquery("#destinationLoginBtn").button("reset");
            if (response.token) {
                jquery.when(storeCredentials("destination", jquery("#destinationUrl").val(), jquery("#destinationUsername").val(), response.token, function (callback) {
                    jquery("#copyModal").modal("hide");
                    jquery(".content").each(function (i) {
                        var type = jquery(this).attr("data-type");
                        if (isSupported(type)) {
                            jquery(this).addClass("btn-info"); // Highlight supported content.
                            makeDraggable(jquery(this)); //Make the content draggable.
                        }
                    });
                    jquery("#currentAction").html("<a>copy content</a>");
                    NProgress.start();
                    showDestinationFolders();
                    NProgress.done();
                }));
            } else if (response.error.code === 400) {
                var html = jquery("#loginErrorTemplate").html();
                jquery("#destinationLoginForm").before(html);
            }
        }).fail(function (response) {
            console.log(response.statusText);
            var html = jquery("#loginErrorTemplate").html();
            jquery("#destinationLoginForm").before(html);
        });
    }

    function logout() {
        sessionStorage.clear();
        app.user = {};
        app.stats.activities = {};
        jquery("#currentAction").html("");
        jquery("#userContent").empty(); //Clear any old items.
        jquery("#dropArea").empty(); //Clear any old items.
        jquery("#sessionDropdown").remove();
        jquery("#searchForm").remove();
        jquery("#loginSuccess").remove();
        jquery("#actionDropdown").css({
            "visibility": "hidden"
        });
        jquery("#sourceLoginForm").show();
        jquery("#sourceLoginBtn").show();
    }

    function inspectContent() {
        jquery(".content").addClass("data-toggle");
        jquery(".content").removeAttr("disabled");
        jquery(".content").attr("data-toggle", "button");
        jquery(".content").addClass("btn-info"); // Highlight everything

        jquery("#inspectModal").modal("hide");
        jquery("#inspectBtn").button("reset");
        // Add a listener for clicking on content buttons.
        jquery(".content").click(function () {
            var itemDescription,
                itemData;
            NProgress.start();
            jquery(".content").addClass("btn-info"); // Highlight everything again.
            jquery(".content").removeClass("active");
            jquery(".content").removeClass("btn-primary");
            jquery(this).addClass("btn-primary");
            jquery(this).removeClass("btn-info");
            var id = jquery(this).attr("data-id"),
                title = jquery(this).text();
            portal.content.itemDescription(sessionStorage.sourceUrl, id, sessionStorage.sourceToken).done(function (description) {
                portal.content.itemData(sessionStorage.sourceUrl, id, sessionStorage.sourceToken).done(function (data) {
                    itemData = data;
                }).always(function (data) {
                    var templateData = {
                        title: title,
                        description: JSON.stringify(description, undefined, 2), // Stringify it for display in the json window.
                        data: JSON.stringify(itemData, undefined, 2)
                    };
                    // Add a download link for files (i.e. no data and not a service).
                    if (templateData.data === undefined && description.typeKeywords.indexOf("Service") === -1) {
                        templateData.downloadLink = sessionStorage.sourceUrl + "sharing/rest/content/items/" + id + "/data?token=" + sessionStorage.sourceToken;
                    }
                    var html = mustache.to_html(jquery("#inspectTemplate").html(), templateData);
                    // Add the HTML container with the item JSON.
                    jquery("#dropArea").html(html);
                    // Color code the JSON to make it easier to read (uses highlight.js).
                    jquery("pre").each(function (i, e) {
                        hljs.highlightBlock(e);
                    });
                    NProgress.done();
                });
            });
        });
    }

    function updateWebmapServices() {
        var webmapData, // make a couple globals so we can access them in other parts of the function
            owner,
            folder,
            supportedContent = jquery(".content[data-type='Web Map']");
        supportedContent.addClass("data-toggle btn-info"); // Highlight supported content.
        supportedContent.removeAttr("disabled");
        supportedContent.attr("data-toggle", "button");

        // Add a listener for clicking on content buttons.
        jquery(".content").click(function () {
            // Display the selected Web Map's operational layers with a URL component.
            jquery(".content[data-type='Web Map']").addClass("btn-info"); // Highlight Web Maps
            jquery(".content").removeClass("active");
            jquery(".content").removeClass("btn-primary");
            jquery(this).addClass("btn-primary");
            jquery(this).removeClass("btn-info");
            var id = jquery(this).attr("data-id"),
                webmapTitle = jquery(this).text();
            portal.content.itemDescription(sessionStorage.sourceUrl, id, sessionStorage.sourceToken).done(function (description) {
                owner = description.owner;
                if (!description.ownerFolder) {
                    folder = ""; // Handle content in the user's root folder.
                } else {
                    folder = description.ownerFolder;
                }
            });
            portal.content.itemData(sessionStorage.sourceUrl, id, sessionStorage.sourceToken).done(function (data) {
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

                var templateData = {
                    webmapTitle: webmapTitle,
                    operationalLayers: operationalLayers,
                    basemapTitle: basemapTitle,
                    basemapLayers: basemapLayers
                };
                var html = mustache.to_html(jquery("#webmapServicesTemplate").html(), templateData);
                // Add the HTML container with the item JSON.
                jquery("#dropArea").html(html);
            });
        });

        jquery(document).on("click", "#btnUpdateWebmapServices", (function () {
            var webmapServices = jquery("[data-original]");
            jquery.each(webmapServices, function (service) {
                var originalUrl = jquery(webmapServices[service]).attr("data-original"),
                    newUrl = jquery(webmapServices[service]).val();
                // Find and replace each URL.
                webmapData = webmapData.replace(originalUrl, newUrl);
                jquery(webmapServices[service]).val(newUrl);
            });
            var webmapId = jquery(".content.active.btn-primary").attr("data-id"),
                itemData = JSON.parse(webmapData);
            portal.content.updateWebmapData(sessionStorage.sourceUrl, owner, folder, webmapId, itemData, sessionStorage.sourceToken).done(function (response) {
                var html;
                if (response.success) {
                    html = mustache.to_html(jquery("#updateSuccessTemplate").html());
                    jquery("#btnResetWebmapServices").before(html);
                } else if (response.error.code === 400) {
                    jquery("#btnResetWebmapServices").click(); // Reset the displayed URLs to their original values.
                    html = mustache.to_html(jquery("#updateErrorTemplate").html(), response);
                    jquery("#btnResetWebmapServices").before(html);
                } else if (response.error.code === 403) {
                    jquery("#btnResetWebmapServices").click(); // Reset the displayed URLs to their original values.
                    html = mustache.to_html(jquery("#updateErrorTemplate").html(), response);
                    jquery("#btnResetWebmapServices").before(html);
                }
            });
        }));

        jquery(document).on("click", "#btnResetWebmapServices", (function () {
            var webmapServices = jquery("[data-original]");
            jquery.each(webmapServices, function (service) {
                var originalUrl = jquery(webmapServices[service]).attr("data-original"),
                    currentUrl = jquery(webmapServices[service]).val();
                jquery(webmapServices[service]).val(originalUrl);
                jquery(webmapServices[service]).attr("data-original", currentUrl);
            });
        }));

    }

    function updateContentUrls() {
        var folder,
            supportedContent = jquery(".content[data-type='Feature Service'], .content[data-type='Map Service'], .content[data-type='Image Service'], .content[data-type='KML'], .content[data-type='WMS'], .content[data-type='Geodata Service'], .content[data-type='Globe Service'], .content[data-type='Geometry Service'], .content[data-type='Geocoding Service'], .content[data-type='Network Analysis Service'], .content[data-type='Geoprocessing Service'], .content[data-type='Web Mapping Application'], .content[data-type='Mobile Application']");
        supportedContent.addClass("data-toggle btn-info"); // Highlight support content
        supportedContent.removeAttr("disabled");
        supportedContent.attr("data-toggle", "button");

        // Add a listener for clicking on content buttons.
        jquery(".content").click(function () {
            // Display the selected item's URL.
            supportedContent.addClass("btn-info"); // Highlight Web Maps
            jquery(".content").removeClass("active");
            jquery(".content").removeClass("btn-primary");
            jquery(this).addClass("btn-primary");
            jquery(this).removeClass("btn-info");
            var id = jquery(this).attr("data-id"),
                title = jquery(this).text();
            portal.content.itemDescription(sessionStorage.sourceUrl, id, sessionStorage.sourceToken).done(function (description) {
                var html = mustache.to_html(jquery("#itemContentTemplate").html(), description);
                // Add the HTML container with the item JSON.
                jquery("#dropArea").html(html);
            });
        });

        jquery(document).on("click", "#btnUpdateContentUrl", (function () {
            var contentId = jquery(".content.active.btn-primary").attr("data-id"),
                folder = jquery(".content.active.btn-primary").parent().attr("data-folder"),
                url = jquery("[data-original]").val();
            portal.content.updateUrl(sessionStorage.sourceUrl, sessionStorage.sourceUsername, folder, contentId, url, sessionStorage.sourceToken).done(function (response) {
                var html;
                if (response.success) {
                    jquery("[data-original]").attr("data-original", url);
                    html = mustache.to_html(jquery("#updateSuccessTemplate").html());
                    jquery("#btnResetContentUrl").before(html);
                } else if (response.error.code === 400) {
                    jquery("#btnResetContentUrl").click(); // Reset the displayed URLs to their original values.
                    html = mustache.to_html(jquery("#updateErrorTemplate").html(), response);
                    jquery("#btnResetContentUrl").before(html);
                }
            });
        }));

        jquery(document).on("click", "#btnResetContentUrl", (function () {
            var originalUrl = jquery("[data-original]").attr("data-original"),
                currentUrl = jquery("[data-original]").val();
            jquery("[data-original]").val(originalUrl);
        }));

    }

    function viewStats() {
        portal.user.profile(sessionStorage.sourceUrl, sessionStorage.sourceUsername, sessionStorage.sourceToken).done(function (user) {

            var template = jquery("#statsTemplate").html();
            var thumbnailUrl;
            // Check that the user has a thumbnail image.
            if (user.thumbnail) {
                thumbnailUrl = sessionStorage.sourceUrl + "sharing/rest/community/users/" + user.username + "/info/" + user.thumbnail + "?token=" + sessionStorage.sourceToken;
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
            var searchQuery = "owner:" + sessionStorage.sourceUsername;
            portal.search(sessionStorage.sourceUrl, searchQuery, 3, "numViews", "desc", sessionStorage.sourceToken).done(function (results) {
                jquery.each(results.results, function (result) {
                    results.results[result].numViews = results.results[result].numViews.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                    results.results[result].itemUrl = sessionStorage.sourceUrl + "home/item.html?id=" + results.results[result].id;
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
                jquery("#currentAction").html("");
                // Destroy the stats modal so it can be properly rendered next time.
                jquery("#statsModal").remove();
            });

        });
    }

    function makeDraggable(el) {
        el.draggable({
            cancel: false,
            helper: "clone",
            appendTo: "body",
            revert: true,
            opacity: 0.7
        });
        el.removeAttr("disabled");
    }

    function makeDroppable(id) {
        // Make the drop area accept content items.
        jquery("#dropFolder_" + id).droppable({
            accept: ".content",
            activeClass: "ui-state-hover",
            hoverClass: "ui-state-active",
            drop: function (event, ui) {
                moveItem(ui.draggable, jquery(this).parent().parent());
            }
        });
    }

    function cleanUp() {
        jquery("#dropArea").empty(); //Clear any old items.
        jquery(".content").unbind("click"); // Remove old event handlers.
        jquery(".content").removeClass("active btn-primary btn-info ui-draggable");
        jquery(".content").attr("disabled", "disabled");
    }

    function clearResults() {
        // Clean up any existing content in the left hand column.
        jquery("#userContent").remove();
    }

    function isSupported(type) {
        // Check if the content type is supported.
        // List of types available here: http://resources.arcgis.com/en/help/arcgis-rest-api/index.html#//02r3000000ms000000
        var supportedTypes = ["Web Map", "Map Service", "Image Service", "WMS", "Feature Collection", "Feature Collection Template",
                          "Geodata Service", "Globe Service", "Geometry Service", "Geocoding Service", "Network Analysis Service",
                          "Geoprocessing Service", "Web Mapping Application", "Mobile Application", "Operation View", "Symbol Set",
                          "Color Set", "Document Link", "Feature Service"];
        if (jquery.inArray(type, supportedTypes) > -1) {
            return true;
        }
    }

    function isTypeText(type) {
        var textTypes = ["Web Map", "Feature Collection", "Feature Collection Template", "Operation View", "Symbol Set", "Color Set", "Document Link"];
        if (jquery.inArray(type, textTypes) > -1) {
            return true;
        }
    }

    function isTypeUrl(type) {
        var urlTypes = ["Feature Service", "Map Service", "Image Service", "KML", "WMS", "Geodata Service", "Globe Service", "Geometry Service",
                   "Geocoding Service", "Network Analysis Service", "Geoprocessing Service", "Web Mapping Application", "Mobile Application"];
        if (jquery.inArray(type, urlTypes) > -1) {
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

    function listSearchItems(results) {
        "use strict";

        clearResults();

        var userContent = mustache.to_html(jquery("#userContentTemplate").html());
        jquery("#itemsArea").append(userContent);

        var folderData = {
            title: "Search Results (" + results.query + ")",
            id: "search",
            count: results.total
        };
        var html = mustache.to_html(jquery("#folderTemplate").html(), folderData);
        jquery("#userContent").append(html);
        // Append the root items to the Root folder.
        jquery.each(results.results, function (item) {
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
            var html = mustache.to_html(jquery("#contentTemplate").html(), templateData);
            jquery("#collapse_search").append(html);
            setMaxWidth("#collapse_search");
        });
    }

    function listUserItems() {
        "use strict";

        clearResults();

        var url = sessionStorage.sourceUrl,
            username = sessionStorage.sourceUsername,
            token = sessionStorage.sourceToken;

        var userContent = mustache.to_html(jquery("#userContentTemplate").html());
        jquery("#itemsArea").append(userContent);

        portal.user.content(url, username, "/", token).done(function (content) {
            // Append the root folder accordion.
            var folderData = {
                title: "Root",
                id: "",
                count: content.items.length
            };
            var html = mustache.to_html(jquery("#folderTemplate").html(), folderData);
            jquery("#userContent").append(html);
            // Append the root items to the Root folder.
            jquery.each(content.items, function (item) {
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
                var html = mustache.to_html(jquery("#contentTemplate").html(), templateData);
                jquery("#collapse_").append(html);
                setMaxWidth("#collapse_");
                storeActivity(content.items[item].modified);
            });
            jquery.each(content.folders, function (folder) {
                portal.user.content(url, username, content.folders[folder].id, token).done(function (content) {
                    var folderData = {
                        title: content.currentFolder.title,
                        id: content.currentFolder.id,
                        count: content.items.length
                    };
                    // Append an accordion for the folder.
                    var html = mustache.to_html(jquery("#folderTemplate").html(), folderData);
                    jquery("#userContent").append(html);
                    // Append the items to the folder.
                    jquery.each(content.items, function (item) {
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
                        var html = mustache.to_html(jquery("#contentTemplate").html(), templateData);
                        jquery("#collapse_" + content.currentFolder.id).append(html);
                        storeActivity(content.items[item].modified);
                    });
                    // Collapse the accordion to avoid cluttering the display.
                    setMaxWidth("#collapse_" + content.currentFolder.id);
                    jquery("#collapse_" + content.currentFolder.id).collapse("hide");
                });
            });
        });
    }

    function showDestinationFolders() {
        "use strict";
        var url = sessionStorage.destinationUrl,
            username = sessionStorage.destinationUsername,
            token = sessionStorage.destinationToken;

        portal.user.content(url, username, "/", token).done(function (content) {
            var folderData = {
                title: "Root",
                id: "",
                count: content.items.length
            };
            // Append the root folder accordion.
            var html = mustache.to_html(jquery("#dropFolderTemplate").html(), folderData);
            jquery("#dropArea").append(html);
            makeDroppable(""); // Enable the droppable area.
            // Append the other folders.
            jquery.each(content.folders, function (folder) {
                portal.user.content(url, username, content.folders[folder].id, token).done(function (content) {
                    var folderData = {
                        title: content.currentFolder.title,
                        id: content.currentFolder.id,
                        count: content.items.length
                    };
                    // Append an accordion for the folder.
                    var html = mustache.to_html(jquery("#dropFolderTemplate").html(), folderData);
                    jquery("#dropArea").append(html);
                    // Collapse the accordion to avoid cluttering the display.
                    jquery("#collapse" + content.currentFolder.id).collapse("hide");
                    makeDroppable(content.currentFolder.id); // Enable the droppable area.
                });
            });
        });
    }

    function moveItem(item, destination) {
        // Move the content DOM element from the source to the destination container on the page.
        "use strict";
        var itemId = jquery(item).attr("data-id");
        var clone = jquery(item).clone();                           // Clone the original item.
        clone.attr("id", itemId + "_clone");                        // Differentiate this object from the original.
        clone.css("max-width", "");                                 // Remove the max-width property so it fills the folder.
        clone.prependTo(destination);                               // Move it to the destination folder.
        clone.removeClass("active btn-primary btn-info");           // Remove the contextual highlighting.
        var destinationFolder = clone.parent().attr("data-folder"); // Get the folder the item was dragged into.
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
        var type = jquery("#" + id).attr("data-type");
        // Ensure the content type is supported before trying to copy it.
        if (isSupported(type)) {
            // Get the full item description and data from the source.
            portal.content.itemDescription(sourcePortal, id, sourceToken).done(function (description) {
                var thumbnailUrl = sourcePortal + "sharing/rest/content/items/" + id + "/info/" + description.thumbnail + "?token=" + sourceToken;
                portal.content.itemData(sourcePortal, id, sourceToken).always(function (data) {
                    // Post it to the destination.
                    // Using always to ensure that it copies Web Mapping Applications
                    // which don't have a data component (and generate a failed response).
                    portal.content.addItem(destinationPortal, destinationUsername, folder, description, data, thumbnailUrl, destinationToken).done(function (response) {
                        var message,
                            html;
                        if (response.success === true) {
                            jquery("#" + id + "_clone").addClass("btn-success");
                        } else if (response.error) {
                            jquery("#" + id + "_clone").addClass("btn-danger");
                            message = response.error.message;
                            html = mustache.to_html(jquery("#contentCopyErrorTemplate").html(), {
                                id: id,
                                message: message
                            });
                            jquery("#" + id + "_clone").before(html);
                        }
                    }).fail(function (response) {
                        var message = "Something went wrong.",
                            html = mustache.to_html(jquery("#contentCopyErrorTemplate").html(), {
                                id: id,
                                message: message
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
    }

});