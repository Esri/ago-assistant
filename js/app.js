require([
    "jquery",
    "portal",
    "mustache"
], function (
    jquery,
    portal,
    mustache
){

    function resizeContentAreas() {
        "use strict";
        var height = jquery(window).height() - 50;
        jquery("#itemsArea").height(height);
        jquery("#dropArea").height(height);
    }

    // Do stuff when DOM is ready.
    jquery(document).ready(function () {

        /*// Detect IE.
        if (navigator.appName == 'Microsoft Internet Explorer') {
            alert("This site uses HTML5 features which aren't supported yet in Internet Explorer.\n Try Firefox or Chrome for a better experience.");
        }*/

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

    //Listener for group login validation
    jquery("#groupPassword").blur(function () {
        checkGroupToken();
    });

    $("#groupPrivateBtn, #groupOrganisationBtn, #groupPublicBtn").click(function () {
        $("#groupPrivateBtn, #groupOrganisationBtn, #groupPublicBtn").removeClass("btn-primary active");
        
        $(this).addClass("btn-primary active");
    });

    //Listener for the group creation button
    jquery("#groupSubmitBtn").click(function () {
        createGroup();
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

    // Add a listener for the future logout button.
    jquery(document).on("click", "li[data-action='logout']", (function () {
        logout();
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
        jquery("#currentAction").html("<a>View/Edit JSON</a>");
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
        jquery("#itemsArea").empty(); //Clear any old items.
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
            NProgress.start();
            listItems();
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
                        if (isSupportedFull(type)) {
                            jquery(this).addClass("btn-primary"); // Highlight supported content.
                            makeDraggable(jquery(this)); //Make the content draggable.
                        } else if (type == 'Feature Service'){
                            jquery(this).addClass("btn-primary"); // Highlight supported content.
                            makeDraggable(jquery(this)); //Make the content draggable.
                        } else if (isSupportedReferenced(type)) {
                            jquery(this).addClass("btn-info"); // Highlight supported content.
                            makeDraggable(jquery(this)); //Make the content draggable.
                        } else if (type == 'Groups') {
                            jquery(this).addClass("btn-info"); // Highlight supported content.
                            makeDraggable(jquery(this)); //Make the content draggable.
                        }
                        jquery(this).css("max-width", jquery("#itemsArea .panel-body").width()); // Set the max-width so it doesn't fill the body when dragging.
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
        jquery("#itemsArea").empty(); //Clear any old items.
        jquery("#dropArea").empty(); //Clear any old items.
        jquery("#sessionDropdown").remove();
        jquery("#loginSuccess").remove();
        jquery("#actionDropdown").css({
            "visibility": "hidden"
        });
        jquery("#sourceLoginForm").show();
        jquery("#sourceLoginBtn").show();
    }

    function inspectContent() {
        jquery(".content").addClass("data-toggle");
        jquery(".content").removeClass("disabled");
        jquery(".content").attr("data-toggle", "button");
        jquery(".content").addClass("btn-info"); // Highlight everything

        jquery("#inspectModal").modal("hide");
        jquery("#inspectBtn").button("reset");

        // Add a listener for clicking on content buttons.
        jquery(".content").click(function () {
            var itemDescription,
                itemData;
            
            NProgress.start();
            jquery(".content").removeClass("active");
            jquery(".content").removeClass("btn-primary");
            jquery(this).addClass("btn-primary");
            var id = jquery(this).attr("data-id"),
                title = jquery(this).text();
            portal.content.itemDescription(sessionStorage.sourceUrl, id, sessionStorage.sourceToken).done(function (description) {
                itemDescription = JSON.stringify(description, undefined, 2);
                portal.content.itemData(sessionStorage.sourceUrl, id, sessionStorage.sourceToken).done(function (data) {
                    itemData = data;
                }).always(function (data) {
                    var templateData = {
                        title: title,
                        description: itemDescription,
                        data: JSON.stringify(itemData, undefined, 2)
                    };
                    var html = mustache.to_html(jquery("#inspectTemplate").html(), templateData);
                    // Add the HTML container with the item JSON.
                    jquery("#dropArea").html(html);
                    // Color code the JSON to make it easier to read (uses highlight.js).
                    jquery("pre").each(function (i, e) {
                        hljs.highlightBlock(e);
                    });

                    //make the Json elements editable upon clicking (enables on mouse over and selects on click)
                    $(".hljs-string, .hljs-number, .hljs-literal").bind('mouseover', function () {
                        if (isJSONEditable($(this).parent().prev().html())) {
                            $(this).attr('contentEditable', true);
                            $(this).css("background-color", "#B2E0B2");
                        }
                        else {
                            $(this).css("background-color", "#E0B2B2");
                        }
                    }).mouseleave(
                        function () {
                            $(this).css("background-color", "transparent");
                    }).blur(
                        function () {
                            $(this).attr('contentEditable', false);

                            //Folder of the item (blank if root)
                            var folder = jquery(".content.active.btn-primary").parent().attr("data-folder");

                            //edited attribute and value
                            var val = $(this).html(),
                                attribute = $(this).parent().prev().html();        

                            // if the attribute is a json object (tags etc.) then create a comma separated string of all items
                            if ($(this).siblings()) {
                                val = '';
                                var sibs = $(this).siblings();
                                for (sibling in sibs) {
                                    if (sibs[sibling].textContent) {
                                        val = val + ', ' + sibs[sibling].textContent;
                                    }
                                };
                            }

                            value = val.replace(/\"/g, '').substring(1);  //value without the quotation marks and without the prevailing comma
                            console.log(attribute + ' : ' + value);

                            portal.commitJson(sessionStorage.sourceUrl, sessionStorage.sourceUsername, folder, sessionStorage.sourceToken, id, attribute, value).done(function (response) {
                                if (response.success) {
                                    console.log('success');
                                }
                                else {
                                    alert('Sorry, your edit could not be committed');
                                }
                            });
                        });
                    NProgress.done();
                });
            });
        });
    }

    function isJSONEditable(type) {
        var supportedTypes = ["title", "thumbnail", "thumbnailurl", "metadata", "type", "typeKeywords", "description",
                             "tags", "snippet", "extent", "spatialReference", "accessInformation", "licenseInfo",
                             "culture", "serviceUsername", "servicePassword"];
        if (jquery.inArray(type, supportedTypes) > -1) {
            return true;
        }
    }

    function createGroup() {
        $('#groupPortalUrl').val("https://www.arcgis.com/");

        var groupAccess = 'private',
            groupInvitation = 'true';

        if ($("#groupPrivateBtn").hasClass("btn-primary active")) { groupAccess = 'private' }
        else if ($("#groupOrganisationBtn").hasClass("btn-primary active")) { groupAccess = 'org' }
        else if ($("#groupPublicBtn").hasClass("btn-primary active")) { groupAccess = 'public' }

        //variables loaded in from the user's input
        var destinationPortal = $("#groupPortalUrl").val(),
            groupId = '',
            groupTitle = $("#groupTitleText").val(),

            groupDescription = $("#groupDescriptionText").val(),
            groupSnippet = $("#groupSnippetText").val(),
            groupTags = $("#groupTagsText").val(),
            groupPhone = '',
            groupThumbnail = '';
            
        //insert sharing button options here...
        if (jquery("#groupPrivateBtn").hasClass("active")) {
            validateUrl("#destinationUrl");
        }
        else if (jquery("#groupOrganisationBtn").hasClass("active")) {
            validateUrl("#destinationUrl");
        }
        else if (jquery("#groupPublicBtn").hasClass("active")) {
            validateUrl("#destinationUrl");
        }
        
        //Generate a token for the target account
        portal.generateToken(destinationPortal, $("#groupUsername").val(), $("#groupPassword").val()).done(function (response) {
            var destinationToken = response.token;

        //send off the create group request
            portal.processGroup(destinationPortal, destinationToken, groupId, groupTitle, groupInvitation, groupDescription, groupSnippet, groupTags, groupPhone, groupThumbnail, groupAccess).done(function (response) {
                if (response.success == true) {
                    jquery("#groupModal").modal("hide");
                    //and other stuff to reset the modal!

                } else if (response.error.code === 400) {
                    alert("Sorry, your group couldn't be created, but we're not sure exactly why.");

                } else if (response.error.code === 403) {
                    alert("Looks like your user details don't quite match up");
                }
            });
        });
    }

    //for checking login credentials in the group modal box and providing feedback on the fly
    function checkGroupToken() {
        portal.generateToken(jquery("#sourceUrl").val(), $("#groupUsername").val(), $("#groupPassword").val()).done(function (response) {
            $("#groupUserDetails").removeClass("has-success");
            $("#groupUserDetails").removeClass("has-error");

            if (response.token) {
                //set the ui green
                $("#groupUserDetails").addClass("has-success has-feedback");
                //$("#groupUserDetails").attr("has-success","has-feedback");
            }
            else if (response.error.code === 400) {
                //set the ui red
                $("#groupUserDetails").addClass("has-error has-feedback");
                //$("#groupUserDetails").addClass("has-feedback");
            }
        });
    }

    function updateWebmapServices() {
        var webmapData, // make a couple globals so we can access them in other parts of the function
            folder;
        jquery(".content").addClass("data-toggle");
        jquery(".content").removeClass("disabled");
        jquery(".content").attr("data-toggle", "button");
        jquery(".content[data-type='Web Map']").addClass("btn-info"); // Highlight Web Maps

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
                folder = jquery(".content.active.btn-primary").parent().attr("data-folder"),
                itemData = JSON.parse(webmapData);
            portal.content.updateWebmapData(sessionStorage.sourceUrl, sessionStorage.sourceUsername, folder, webmapId, itemData, sessionStorage.sourceToken).done(function (response) {
                var html;
                if (response.success) {
                    html = mustache.to_html(jquery("#updateSuccessTemplate").html());
                    jquery("#btnResetWebmapServices").before(html);
                } else if (response.error.code === 400) {
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
        supportedContent.removeClass("disabled");
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
        el.removeClass("disabled");
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
        jquery(".content").addClass("disabled");
    }

    function isSupportedFull(type) {
        // Check if the content type is supported.
        // List of types available here: http://resources.arcgis.com/en/help/arcgis-rest-api/index.html#//02r3000000ms000000
        var supportedTypes = ["CSV", "PDF", "Service Definition"];
        if (jquery.inArray(type, supportedTypes) > -1) {
            return true;
        }
    }

    function isSupportedReferenced(type) {
        // Check if the content type is supported.
        // List of types available here: http://resources.arcgis.com/en/help/arcgis-rest-api/index.html#//02r3000000ms000000
        var supportedTypes = ["Web Map", "Map Service", "Image Service", "WMS", "Feature Collection", "Feature Collection Template",
                          "Geodata Service", "Globe Service", "Geometry Service", "Geocoding Service", "Network Analysis Service",
                          "Geoprocessing Service", "Web Mapping Application", "Mobile Application", "Operation View", "Symbol Set",
                          "Color Set", "Document Link"];
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
        var urlTypes = ["Feature Service", "Map Service","Image Service", "KML", "WMS", "Geodata Service", "Globe Service", "Geometry Service",
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

    function listItems() {
        "use strict";
        var url = sessionStorage.sourceUrl,
            username = sessionStorage.sourceUsername,
            token = sessionStorage.sourceToken;

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
                    jquery("#itemsArea").append(html);
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
                    jquery("#collapse_" + content.currentFolder.id).collapse("hide");
                });
            });

            //Next list the groups in a new folder
            portal.getGroups(url, username, token).done(function (response) {
                var groupData = {
                    title: 'Groups',
                    id: 'group',
                    count: response.groups.length
                };
                // Append an accordion for the folder.
                var html = mustache.to_html(jquery("#folderTemplate").html(), groupData);
                jquery("#itemsArea").append(html);
                // Append the items to the folder.
                jquery.each(response.groups, function (item) {
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
                        "type": 'Groups',
                        "icon": icon
                    };
                    var html = mustache.to_html(jquery("#contentTemplate").html(), templateData);
                    jquery("#collapse_" + 'group').append(html);
                    storeActivity(content.items[item].modified);
                });
                // Collapse the accordion to avoid cluttering the display.
                jquery("#collapse_" + 'group').collapse("hide");
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
            destinationToken = sessionStorage.destinationToken,
            sourceUsername = $("#sourceUsername").val();
        var type = jquery("#" + id).attr("data-type");
        // Ensure the content type is supported before trying to copy it.
        if (isSupportedFull(type) && type != 'Groups') {

            copyFull(id, folder, sourcePortal, sourceToken, destinationPortal, destinationToken, destinationUsername, sourceUsername);

        } else if (type == 'Feature Service'){

            copyFeatureService(id, folder, sourcePortal, sourceToken, destinationPortal, destinationToken, destinationUsername, sourceUsername);

        } else if (type == 'Groups') { //initiate group copying
            
            copyGroup(id, folder, sourcePortal, sourceToken, destinationPortal, destinationToken, destinationUsername, sourceUsername);
            
        } else if (isSupportedReferenced(type) && type != 'Groups') { //for the old referencing style

            copyReferenced(id, folder, sourcePortal, sourceToken, destinationPortal, destinationToken, destinationUsername, sourceUsername);

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

    function copyReferenced(id, folder, sourcePortal, sourceToken, destinationPortal, destinationToken, destinationUsername, sourceUsername){

        // Get the full item description and data from the source.
        portal.content.itemDescription(sourcePortal, id, sourceToken).done(function (description) {
            var thumbnailUrl = sourcePortal + "sharing/rest/content/items/" + id + "/info/" + description.thumbnail + "?token=" + sourceToken;
            portal.content.itemData(sourcePortal, id, sourceToken).always(function (data) {
                // Post it to the destination.
                // Using always to ensure that it copies Web Mapping Applications
                // which don't have a data component (and generate a failed response).
                portal.content.addItemReferenced(destinationPortal, destinationUsername, folder, description, data, thumbnailUrl, destinationToken).done(function (response) {
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
    }

    function copyFull(id, folder, sourcePortal, sourceToken, destinationPortal, destinationToken, destinationUsername, sourceUsername){
        NProgress.start();
            
        // Get the full item description and data from the source.
        portal.content.itemDescription(sourcePortal, id, sourceToken).done(function (description) {
            var thumbnailUrl = sourcePortal + "sharing/rest/content/items/" + id + "/info/" + description.thumbnail + "?token=" + sourceToken;
            // Post it to the destination.
            $.when(portal.content.addItem(destinationPortal, id, sourceUsername, destinationUsername, folder, description, thumbnailUrl, sourceToken, destinationToken)).then(function(response){
                var message,
                    html;
                if (jQuery.parseJSON(response).success == true) {
                    jquery("#" + id + "_clone").addClass("btn-success");
                    NProgress.done();
                } else if (response.error) {
                    jquery("#" + id + "_clone").addClass("btn-danger");
                    NProgress.done();
                    message = response.error.message;
                    html = mustache.to_html(jquery("#contentCopyErrorTemplate").html(), {
                        id: id,
                        message: message
                    });
                    jquery("#" + id + "_clone").before(html);
                }
            }).fail(function (response) {
                NProgress.done();
                var message = "Something went wrong.",
                    html = mustache.to_html(jquery("#contentCopyErrorTemplate").html(), {
                        id: id,
                        message: message
                    });
                jquery("#" + id + "_clone").before(html);
            });
        });         
    }

    function copyFeatureService(id, folder, sourcePortal, sourceToken, destinationPortal, destinationToken, destinationUsername, sourceUsername){
        NProgress.start();
        portal.content.exportItemAsFGDB(sourcePortal, sourceUsername, id, sourceToken).done(function (response) {
            
            var interval = setInterval(function(){checkStatus()}, 3000); 

            function checkStatus() {
                portal.content.checkItemStatus(sourcePortal, sourceUsername, response.exportItemId, response.jobId, 'export', sourceToken).done(function (resp) {
                    
                    if (resp.status == 'completed'){

                        portal.content.itemDescription(sourcePortal, id, sourceToken).done(function (description) {

                            var thumbnailUrl = sourcePortal + "sharing/rest/content/items/" + id + "/info/" + description.thumbnail + "?token=" + sourceToken;
                            clearInterval(interval);
                            NProgress.set(0.35);
                            description.type = 'File Geodatabase';
                            description.name = response.jobId + '.zip'; //a unique name to use as the filename of the new item
                            description.title = description.title.replace(/\s+/g, ''); //remove the spaces from a title 
                            
                            $.when(portal.content.addItem(destinationPortal, response.exportItemId, sourceUsername, destinationUsername, folder, description, thumbnailUrl, sourceToken, destinationToken)).then(function(newItem){
                                var interval2 = setInterval(function(){checkUpload()}, 3000);

                                function checkUpload(){
                                    portal.content.checkUploadStatus(destinationPortal, destinationUsername, jQuery.parseJSON(newItem).id, destinationToken).done(function (resp2) {
                                        if (resp2.status == 'completed'){
                                            clearInterval(interval2);
                                            NProgress.set(0.5);

                                            portal.content.publishItem(destinationPortal, destinationUsername, jQuery.parseJSON(newItem).id, destinationToken, description.title).done(function(publishResp){
                                                var interval3 = setInterval(function(){checkPublish()}, 3000);
                                                NProgress.set(0.75);

                                                function checkPublish(){
                                                    portal.content.checkPublishStatus(destinationPortal, destinationUsername, publishResp.services[0].serviceItemId, publishResp.services[0].jobId, destinationToken).done(function(publishStatus){

                                                        if (publishStatus.status == 'completed'){
                                                            clearInterval(interval3);
                                                            jquery("#" + id + "_clone").addClass("btn-success");
                                                            portal.content.deleteFgdb(sourcePortal, sourceUsername, response.exportItemId, sourceToken); //for source
                                                            portal.content.deleteFgdb(destinationPortal, destinationUsername, jQuery.parseJSON(newItem).id, destinationToken); //for dest
                                                            NProgress.done();

                                                        } else if (publishResp.services[0].success == false){ 
                                                            jquery("#" + id + "_clone").addClass("btn-danger");
                                                            NProgress.done();
                                                            clearInterval(interval3);
                                                            portal.content.deleteFgdb(sourcePortal, sourceUsername, response.exportItemId, sourceToken); //for source
                                                            portal.content.deleteFgdb(destinationPortal, destinationUsername, jQuery.parseJSON(newItem).id, destinationToken); //for dest
                                                            var message = publishResp.services[0].error.message,
                                                            html = mustache.to_html(jquery("#contentCopyErrorTemplate").html(), {
                                                                id: id,
                                                                message: message
                                                            });
                                                            jquery("#" + id + "_clone").before(html);
                                                        }
                                                    });

                                                }
                                            });
                                        } else if (resp2.status == 'error') { 
                                            jquery("#" + id + "_clone").addClass("btn-danger"); 
                                            clearInterval(interval2); 
                                            NProgress.done();
                                        }
                                    });
                                }
                            });  
                        }).fail(function (response) {
                            var message = "Couldn't get the item description.",
                                html = mustache.to_html(jquery("#contentCopyErrorTemplate").html(), {
                                    id: id,
                                    message: message
                                });
                            jquery("#" + id + "_clone").before(html);
                        });
                    } else if (resp.status == 'error') { jquery("#" + id + "_clone").addClass("btn-danger"); NProgress.done();}
                });  
            }
        }).fail(function (response) {
            var message = "Exporting item to File Geodatabase failed.",
                html = mustache.to_html(jquery("#contentCopyErrorTemplate").html(), {
                    id: id,
                    message: message
                });
            jquery("#" + id + "_clone").before(html);
        });       
    }

    function copyGroup(id, folder, sourcePortal, sourceToken, destinationPortal, destinationToken, destinationUsername, sourceUsername){
        //get the group's attributes
        portal.getGroupDetails(sourcePortal, sourceToken, id).done(function (response) {
            var groupId = 'some id',
                groupTitle = response.title,
                groupInvitation = response.isInvitationOnly,
                groupDescription = response.description,
                groupSnippet = response.snippet,
                groupTags = response.tags,
                groupPhone = response.phone,
                groupThumbnail = response.thumbnail,
                groupAccess = response.access;

            //send off the group creation
            portal.processGroup(destinationPortal, destinationToken, groupId, groupTitle, groupInvitation, groupDescription, groupSnippet, groupTags, groupPhone, groupThumbnail, groupAccess).done(function (response) {
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
            });
        });          
    }
});