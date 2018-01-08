require([
    "jquery",
    "portal",
    "mustache",
    "nprogress",
    "esri/arcgis/Portal",
    "esri/arcgis/OAuthInfo",
    "esri/IdentityManager",
    "clipboard",
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
    Clipboard
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

    // used for reading portal and appid from url string
    var getUrlParameter = function getUrlParameter(sParam) {
        var sPageURL = decodeURIComponent(window.location.search.substring(1)),
            sURLVariables = sPageURL.split("&"),
            sParameterName,
            i;

        for (i = 0; i < sURLVariables.length; i++) {
            sParameterName = sURLVariables[i].split("=");

            if (sParameterName[0].toLowerCase() === sParam.toLowerCase()) {
                return sParameterName[1] === undefined ? true : sParameterName[1];
            }
        }
    };

    // used to store and populate drop down of portals in portal login forms
    var storedPortals = localStorage.getItem("storedPortals");

    // remove a portal from the stored portals list
    var removePortal = function(portalUrl) {
        var foundIndex;
        portalUrl = portalUrl.trim();
        storedPortals.some(function(itm, n) {
            if (itm.portalUrl == portalUrl) {
                foundIndex = n;
                return true;
            }
        });
        if (foundIndex >= 0) {
            storedPortals.splice(foundIndex, 1);
        }
        localStorage.setItem("storedPortals", JSON.stringify(storedPortals));
        jquery("#portalList").children().each(function(n, itm) {
            var pUrl = jquery(itm).first().text().trim();
            if (pUrl == portalUrl) {
                jquery(itm).remove();
            }
        });
        jquery("#portalList2").children().each(function(n, itm) {
            var pUrl = jquery(itm).first().text().trim();
            if (pUrl == portalUrl) {
                jquery(itm).remove();
            }
        });
        if (!jquery("#portalList").children().length) {
            jquery("#portalListBtn").attr("disabled", true);
        }
        if (!jquery("#portalList2").children().length) {
            jquery("#portalList2Btn").attr("disabled", true);
        }
    };

    // add a portal to the stored portals list
    var storePortal = function(portalItm) {
        var portalUrl = portalItm.portalUrl;
        var appId = portalItm.appId;
        var usePkiIwa = portalItm.usePkiIwa;
        var useOauth = portalItm.useOauth;
        var useUserPass = portalItm.useUserPass;
        var found = false;
        storedPortals.some(function(itm, n) {
            if (itm.portalUrl == portalUrl) {
                itm.appId = appId;
                found = true;
                return true;
            }
        });
        if (!found) {
            storedPortals.push({
                portalUrl: portalUrl,
                appId: appId,
                usePkiIwa: usePkiIwa,
                useOauth: useOauth,
                useUserPass: useUserPass
            });
        }
        localStorage.setItem("storedPortals", JSON.stringify(storedPortals));
        jquery("#portalList").empty();
        jquery("#portalList2").empty();
        storedPortals.forEach(function(itm) {
            jquery("#portalListBtn").removeAttr("disabled");
            jquery("#portalList2Btn").removeAttr("disabled");
            var removeBtn = jquery(
                "<a href=\"#\" class=\"removePortalBtn btn-xs pull-right\">" +
                "   <span class=\"text-danger glyphicon glyphicon-remove\" aria-hidden=\"true\"></span>" +
                "</a>"
            );
            var removeBtn2 = jquery(
                "<a href=\"#\" class=\"removePortalBtn btn-xs pull-right\">" +
                "   <span class=\"text-danger glyphicon glyphicon-remove\" aria-hidden=\"true\"></span>" +
                "</a>"
            );
            var portal = jquery("<a href=\"#\">" + itm.portalUrl + "</a>");
            var portal2 = jquery("<a href=\"#\">" + itm.portalUrl + "</a>");
            var li = jquery("<li></li>");
            var li2 = jquery("<li></li>");
            li.append(portal);
            li.append(removeBtn);
            li2.append(portal2);
            li2.append(removeBtn2);
            jquery("#portalList").append(li);
            jquery("#portalList2").append(li2);
            portal.on("click", function() {
                jquery("#portalAppId").val(itm.appId);
                jquery("#portalUrl").val(itm.portalUrl);
                if (!app.portals.sourcePortal) {
                    app.portals.sourcePortal = new portalSelf.Portal();
                }
                validateUrl("#portalUrl", app.portals.sourcePortal, "#portalLoginBtn");
                if (itm.appId) {
                    jquery("#oauthTabBtn").trigger("click");
                } else {
                    jquery("#userPassTabBtn").trigger("click");
                    jquery("#portalUsername").focus();
                }
            });
            portal2.on("click", function() {
                jquery("#portalAppId2").val(itm.appId);
                jquery("#destinationUrl").val(itm.portalUrl);
                if (!app.portals.destinationPortal) {
                    app.portals.destinationPortal = new portalSelf.Portal();
                }
                validateUrl("#destinationUrl", app.portals.destinationPortal, "#destinationLoginBtn");
                if (itm.appId) {
                    jquery("#oauthTab2Btn").trigger("click");
                } else {
                    jquery("#userPassTab2Btn").trigger("click");
                    jquery("#destinationUsername").focus();
                }
            });
            removeBtn.on("click", function() {
                removePortal(itm.portalUrl);
            });
            removeBtn2.on("click", function() {
                removePortal(itm.portalUrl);
            });
        });
    };

    storedPortals = storedPortals ? JSON.parse(storedPortals) : [];
    storedPortals.forEach(function(itm) {
        storePortal(itm);
    });

    /**
     * Check the url for errors (e.g. no trailing slash)
     * and update it before sending.
     */
    var validateUrl = function(el, portal, loginBtnEl) {
        // loginBtnEl is used to disable the login button when portal url is invalid
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
                    console.info("API v" + data.currentVersion);
                    jquery(".alert-danger.alert-dismissable").remove();
                    jquery(el).next().addClass("glyphicon-ok");
                    jquery(loginBtnEl).removeAttr("disabled");
                })
                .catch(function() {
                    // Try it again with enterprise auth.
                    portal.withCredentials = true;
                    portal.version()
                        .then(function(data) {
                            console.info("API v" + data.currentVersion);
                            jquery(".alert-danger.alert-dismissable").remove();
                            jquery(el).next().addClass("glyphicon-ok");
                            jquery(loginBtnEl).removeAttr("disabled");
                            jquery(checkbox).trigger("click");
                        })
                        .catch(function() {
                            // Now try enterprise auth with jsonp so crossdomain will follow redirects.
                            portal.jsonp = true;
                            portal.version().then(function(data) {
                                // It worked so keep enterprise auth but turn jsonp back off.
                                portal.jsonp = false;
                                console.info("API v" + data.currentVersion);
                                jquery(".alert-danger.alert-dismissable").remove();
                                jquery(el).next().addClass("glyphicon-ok");
                                jquery(loginBtnEl).removeAttr("disabled");
                            }).catch(function() {
                                // OK, it's really not working.
                                portal.withCredentials = false;
                                portal.jsonp = false;
                                jquery(".alert-danger.alert-dismissable").remove();
                                jquery(el).parent().parent().after(urlError);
                                jquery(el).parent().addClass("has-error");
                                jquery(loginBtnEl).attr("disabled", true);
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

            // Set the default state to view and edit JSON.
            jquery("li[data-action='inspectContent'").addClass("active");
            inspectContent();
        });
    };

    var loginPortal = function() {
        // determine which method of login to use (direct, oauth, or pki/iwa)
        if (jquery("#oauthTab").hasClass("active")) {
            loginPortalOAuth();
            return;
        } else if (jquery("#pkiIwaTab").hasClass("active")) {
            app.portals.sourcePortal.withCredentials = true;
        } else {
            app.portals.sourcePortal.withCredentials = false;
        }
        // if login is successful, this method will be used to store the portal info
        var store = function() {
            var portalItm = {
                portalUrl: app.portals.sourcePortal.portalUrl,
                appId: "",
                usePkiIwa: app.portals.sourcePortal.withCredentials,
                useOauth: false,
                useUserPass: !app.portals.sourcePortal.withCredentials
            };
            storePortal(portalItm);
        };
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
                    store();
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
            });
    };

    var loginPortalOAuth = function() {
        var portalInfo = new arcgisOAuthInfo({
            appId: jquery("#portalAppId").val(),
            popup: true,
            portalUrl: app.portals.sourcePortal.portalUrl
        });
        // if login is successful, this method will be used to store the portal info
        var store = function() {
            var portalItm = {
                portalUrl: portalInfo.portalUrl,
                appId: portalInfo.appId,
                usePkiIwa: false,
                useOauth: true,
                useUserPass: false
            };
            storePortal(portalItm);
        };
        esriId.registerOAuthInfos([portalInfo]);
        portalSelf.util.fixUrl(portalInfo.portalUrl).then(function(portalUrl) {
            var sharingUrl = portalUrl;
            if (sharingUrl.indexOf("arcgis.com") === -1) {
                sharingUrl += "sharing/";
            }
            esriId.checkSignInStatus(sharingUrl)
                .then(
                    function(data) {
                        jquery("#portalLoginModal").modal("hide");
                        jquery("#splashContainer").css("display", "none");
                        jquery("#itemsContainer").css("display", "block");
                        app.portals.sourcePortal.username = data.userId;
                        app.portals.sourcePortal.token = data.token;
                        startSession();
                        store();
                    })
                .otherwise(
                    function() {
                        esriId.getCredential(portalUrl, {
                            oAuthPopupConfirmation: false
                        })
                        .then(function(data) {
                            jquery("#portalLoginModal").modal("hide");
                            jquery("#splashContainer").css("display", "none");
                            jquery("#itemsContainer").css("display", "block");
                            app.portals.sourcePortal.username = data.userId;
                            app.portals.sourcePortal.token = data.token;
                            startSession();
                            store();
                        });
                    }
                );
        });
    };

    var loginDestination = function() {
        // determine which method of login to use (direct, oauth, or pki/iwa)
        if (jquery("#oauthTab2").hasClass("active")) {
            loginDestinationOAuth();
            return;
        }
        var username = jquery("#destinationUsername").val();
        var password = jquery("#destinationPassword").val();
        var portalUrl = jquery("#destinationUrl").val();

        if (!app.portals.destinationPortal) {
            app.portals.destinationPortal = new portalSelf.Portal({
                portalUrl: portalUrl
            });
        }
        if (jquery("#pkiIwaTab2").hasClass("active")) {
            app.portals.destinationPortal.withCredentials = true;
        } else {
            app.portals.destinationPortal.withCredentials = false;
        }
        // if login is successful, this method will be used to store the portal info
        var store = function() {
            var portalItm = {
                portalUrl: app.portals.destinationPortal.portalUrl,
                appId: "",
                usePkiIwa: app.portals.destinationPortal.withCredentials,
                useOauth: false,
                useUserPass: !app.portals.destinationPortal.withCredentials
            };
            storePortal(portalItm);
        };        jquery("#destinationLoginBtn").button("loading");
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
                            app.portals.destinationPortal.portalUrl = "https://" + data.portalHostname + "/";
                        }

                        jquery("#copyModal").modal("hide");
                        highlightCopyableContent();
                        NProgress.start();
                        showDestinationFolders();
                        NProgress.done();
                        store();
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

    var loginDestinationOAuth = function() {
        var portalInfo = new arcgisOAuthInfo({
            appId: jquery("#portalAppId2").val(),
            popup: true,
            portalUrl: app.portals.destinationPortal.portalUrl
        });
        esriId.registerOAuthInfos([portalInfo]);
        // if login is successful, this method will be used to store the portal info
        var store = function() {
            var portalItm = {
                portalUrl: portalInfo.portalUrl,
                appId: portalInfo.appId,
                usePkiIwa: false,
                useOauth: true,
                useUserPass: false
            };
            storePortal(portalItm);
        };
        // Save esriId and esriJSAPIOAuth to restore after logging in
        var appIdJson = esriId.toJson();
        var esriJSAPIOAuth = sessionStorage.esriJSAPIOAuth;

        // Store backup in case page is refreshed in the middle of logging in
        sessionStorage.setItem("esriJSAPIOAuthBackup", esriJSAPIOAuth);
        sessionStorage.setItem("esriIdBackup", JSON.stringify(appIdJson));

        // Destroy credentials and remove esriJSAPIOAuth sessions storage
        esriId.destroyCredentials();
        sessionStorage.removeItem("esriJSAPIOAuth");

        portalSelf.util.fixUrl(portalInfo.portalUrl).then(function(portalUrl) {
            var sharingUrl = portalUrl;
            if (sharingUrl.indexOf("arcgis.com") === -1) {
                sharingUrl += "sharing/";
            }
            esriId.checkSignInStatus(sharingUrl)
                .then(
                    function(data) {
                        // If there is no destination or the destination is not the same as ArcGIS Online
                        if (!app.portals.destinationPortal || (app.portals.destinationPortal.portalUrl !== portalInfo.portalUrl)) {
                            app.portals.destinationPortal = new portalSelf.Portal({
                                portalUrl: portalInfo.portalUrl,
                                username: data.userId,
                                token: data.token
                            });
                        } else {
                            app.portals.destinationPortal.username = data.userId;
                            app.portals.destinationPortal.token = data.token;
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
                            store();
                        });
                    })
                .otherwise(
                    function() {
                        esriId.getCredential(portalUrl, {
                            oAuthPopupConfirmation: false
                        })
                        .then(function(data) {
                            // If there is no destination or the destination is not the same as ArcGIS Online
                            if (!app.portals.destinationPortal || (app.portals.destinationPortal.portalUrl !== portalInfo.portalUrl)) {
                                app.portals.destinationPortal = new portalSelf.Portal({
                                    portalUrl: portalInfo.portalUrl,
                                    username: data.userId,
                                    token: data.token
                                });
                            } else {
                                app.portals.destinationPortal.username = data.userId;
                                app.portals.destinationPortal.token = data.token;
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
                                store();
                            });
                        });
                    }
                );
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
        var jsonBackup = {};
        var jsonValid;
        var descEditor;
        var dataEditor;

        // Copy JSON with clipboard.js.
        var clipboard = new Clipboard(".btn", {
            text: function(trigger) {
                // explicitly set the text to be copied, by getting the ACE editor's JSON value
                var targetId = jquery(trigger).attr("data-clipboard-target");
                if (targetId == "#descriptionJson") {
                    // description was edited
                    return descEditor.getValue();
                } else if (targetId == "#dataJson") {
                    // data was edited
                    return dataEditor.getValue();
                }
                return "";
            }
        });
        clipboard.on("success", function(e) {

            var el = jquery(e.trigger);
            setTimeout(function() {
                // update the tooltip, uses setTimeout to ensure tooltip does "show"
                el.attr("title", "Copied!").tooltip("fixTitle").tooltip("show");
                setTimeout(function() {
                    // update the tooltip, uses setTimeout to allow tooltip to reset after short delay
                    el.attr("title", "Copy JSON").tooltip("fixTitle").tooltip("hide");
                }, 1000);
            }, 300);
            e.clearSelection();
        });

        var validateJson = function(elId) {
            var editor = elId == "descriptionJson" ? descEditor : dataEditor;
            // get any annotation messages from ACE editor (these are the errors)
            var messages = editor.session.getAnnotations();
            if (messages.length) {
                // return the error message
                return messages[0].text + " [line " + (messages[0].row + 1) + ", col " + messages[0].column + "]";
            }
            return true;
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
            var editor = codeBlock[0].id == "descriptionJson" ? descEditor : dataEditor;
            // Reset the save button.
            saveButton
                .css("color", "")
                .children("span")
                .attr("class", "fa fa-lg fa-save");
            if (editor.getReadOnly()) {
                // Start editing.
                saveButton.attr("title", "No changes").tooltip("fixTitle");
                editButton
                    .children("span")
                    .attr("class", "fa fa-lg fa-undo");
                editButton.tooltip("hide").attr("title", "Discard your edits").tooltip("fixTitle");
                jsonBackup[codeBlock[0].id] = editor.getValue();
                editor.setReadOnly(false);
                editor.setTheme("ace/theme/tomorrow_night");
                editor.getSession().on("changeAnnotation", function() {
                    // Validate the JSON as it is edited.
                    if (editor.getReadOnly()) return;
                    jsonValid = validateJson(codeBlock[0].id);
                    saveButton.attr("title", "").tooltip("fixTitle");
                    if (jsonValid === true) {
                        // Valid. Allow saving.
                        saveButton.removeClass("disabled");
                        saveButton.css("color", "green");
                        saveButton.attr("title", "JSON is valid. Click to save.").tooltip("fixTitle");
                    } else {
                        // Invalid. Prevent saving.
                        saveButton.css("color", "red");
                        saveButton.attr("title", jsonValid).tooltip("fixTitle");
                    }
                });

                editButton.attr("class", "btn btn-default");
                saveButton.attr("class", "btn btn-default");
            } else {
                // Let the user back out of editing without saving.
                // End editing and restore the original json.
                editor.setValue(jsonBackup[codeBlock[0].id], -1);
                editor.setReadOnly(true);
                editor.setTheme("ace/theme/tomorrow");

                editButton.attr("class", "btn btn-default");
                editButton.children("span")
                    .attr("class", "fa fa-lg fa-pencil");
                editButton.tooltip("hide").attr("title", "Edit JSON").tooltip("fixTitle");
                saveButton.attr("class", "btn btn-default disabled");
                saveButton.css("color", "black");
            }

            // Post the edited JSON.
            saveButton.off("click");
            saveButton.click(function() {
                if (jsonValid === true) {
                    // JSON is valid. Allow saving.
                    var newJson = editor.getValue();
                    var itemInfo = JSON.parse(descEditor.getValue());
                    editButton.attr("class", "btn btn-default");
                    editButton.children("span")
                        .attr("class", "fa fa-lg fa-pencil");
                    saveButton.attr("class",
                        "btn btn-default disabled"
                    );
                    saveButton.css("color", "black");
                    editor.setReadOnly(true);
                    editor.setTheme("ace/theme/tomorrow");
                    editButton.attr("title", "Edit JSON").tooltip("fixTitle");

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
                    saveButton.blur();
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
            // title is only the first part of the text, remove everything starting at "Type: "
            title = title.substring(0, title.search("Type:")).trim();
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

            /*
             * Determine if /data should be returned for an item
             *  based on the Sharing API name key value for that
             *  item.  Looks for a period in the name to indicate
             *  that it is a file based item, e.g. roads.kmz.
             */
            var checkData = function(id, name){
                return new Promise(function(resolve, reject) {
                    if ((!name) || ((name) && (name.indexOf('.') < 0))) {
                        resolve(portal.itemData(id));
                    }
                    else { resolve(null); }
                });
            };

            portal.itemDescription(id)
                .then(function(description) {
                    checkData(id, description.name)
                        .then(function(data) {
                            if (data) {
                                itemData = data;
                            }
                            var templateData = {
                                title: title,
                                url: portal.portalUrl,
                                id: id,
                                description: JSON.stringify(
                                    description, undefined, 4
                                ),
                                data: JSON.stringify(
                                    itemData, undefined, 4
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
                            // Initialize the button tooltips
                            jquery("#dropArea").find("button")
                                .attr("data-toggle", "tooltip")
                                .attr("data-placement", "bottom")
                                .tooltip({
                                    container: "body",
                                    placement: "bottom"
                                });
                            /**
                             * Color code the JSON to make it easier
                             * to read and edit (uses Ace editor: https://ace.c9.io/).
                             */
                            jquery(".jsonViewer").each(function(i, e) {
                                var editor = window.ace.edit(e.id);
                                if (e.id == "descriptionJson") {
                                    descEditor = editor;
                                } else if (e.id == "dataJson") {
                                    dataEditor = editor;
                                }
                                editor.getSession().setUseWrapMode(true);
                                editor.setOptions({
                                    maxLines: Infinity,
                                    mode: "ace/mode/json",
                                    readOnly: true,
                                    showPrintMargin: false,
                                    tabSize: 4,
                                    theme: "ace/theme/tomorrow"
                                });
                                editor.$blockScrolling = Infinity;
                                editor.setReadOnly(true);
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
                    jquery.each(data.operationalLayers, function() {
                        if (this.hasOwnProperty("url")) {
                            operationalLayers.push(this);
                        } else if (this.hasOwnProperty("styleUrl")) {
                            // Support updating Vector Tile Styles.
                            this.url = this.styleUrl;
                            operationalLayers.push(this);
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
                    jquery.each(data.baseMap.baseMapLayers, function() {
                        if (this.hasOwnProperty("url")) {
                            basemapLayers.push(this);
                        } else if (this.hasOwnProperty("styleUrl")) {
                            // Support updating Vector Tile Styles.
                            this.url = this.styleUrl;
                            basemapLayers.push(this);
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
        var supportedContent = jquery(".content[data-type='Feature Service'], .content[data-type='Map Service'], .content[data-type='Image Service'], .content[data-type='KML'], .content[data-type='WMS'], .content[data-type='Geodata Service'], .content[data-type='Globe Service'], .content[data-type='Geometry Service'], .content[data-type='Geocoding Service'], .content[data-type='Network Analysis Service'], .content[data-type='Geoprocessing Service'], .content[data-type='Web Mapping Application'], .content[data-type='Mobile Application'], .content[data-type='Scene Service'], .content[data-type='Vector Tile Service']");
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
        var cloneDiv = jquery("#" + id + "_clone");
        cloneDiv.addClass("btn-info");
        cloneDiv.find(".copyInProgress").css("display", "inline-block");
        cloneDiv.find(".itemId a").css("display", "none");
        portal.itemData(id).then(function(data) {
            var thenFunction = function(response) {
                var html,
                    oldLink,
                    newLink;
                if (response.success === true) {
                    // Swizzle the portal url and id parameter to reflect the url of new item.
                    if (description.url.indexOf("id=") > -1) {
                        var newUrl = destinationPortal.portalUrl + description.url.substring(description.url.indexOf("apps/"));
                        newUrl = newUrl.replace("id=" + description.id, "id=" + response.id);
                        var folder2 = response.folder || "";
                        destinationPortal.updateUrl(destinationPortal.username, folder2, response.id, newUrl)
                            .then(function() {
                                cloneDiv.removeClass("btn-info");
                                cloneDiv.addClass("btn-success");
                                oldLink = cloneDiv.find(".itemId a").attr("href");
                                newLink = oldLink.replace(description.id, response.id);
                                cloneDiv.find(".copyInProgress").css("display", "none");
                                cloneDiv.find(".itemId a").css("display", "inline-block");
                                cloneDiv.find(".itemId a").attr("href", newLink);
                                cloneDiv.find(".itemId a").html("<abbr title=\"" + response.id + "\">" + response.id.substring(0, 6) + "</abbr>");
                            });
                    } else {
                        cloneDiv.removeClass("btn-info");
                        cloneDiv.addClass("btn-success");
                        oldLink = cloneDiv.find(".itemId a").attr("href");
                        newLink = oldLink.replace(description.id, response.id);
                        cloneDiv.find(".copyInProgress").css("display", "none");
                        cloneDiv.find(".itemId a").css("display", "inline-block");
                        cloneDiv.find(".itemId a").attr("href", newLink);
                        cloneDiv.find(".itemId a").html("<abbr title=\"" + response.id + "\">" + response.id.substring(0, 6) + "</abbr>");
                    }
                } else if (response.error) {
                    if (response.error.message.search(" already exists.") >= 0) {
                        description = Object.assign({}, description, {title: description.title + "-Copy"});
                        cloneDiv.find(".itemTitle").text(description.title);
                        destinationPortal.addItem(destinationPortal.username, folder, description, data, thumbnailUrl)
                            .then(thenFunction)
                            .catch(catchFunction);
                    } else {
                        cloneDiv.addClass("btn-danger");
                        html = mustache.to_html(jquery("#contentCopyErrorTemplate").html(), {
                            id: id,
                            message: response.error.message
                        });
                        cloneDiv.before(html);
                        cloneDiv.fadeOut(2000, function() {
                            jquery(this).remove();
                        });
                        jquery("#" + id + "_alert").fadeOut(3000, function() {
                            jquery(this).remove();
                        });
                    }
                }
            };
            var catchFunction = function() {
                if (!jquery("#" + id + "_alert")) {
                    showCopyError(id, "Something went wrong.");
                }
                cloneDiv.fadeOut(2000, function() {
                    jquery(this).remove();
                });
                jquery("#" + id + "_alert").fadeOut(3000, function() {
                    jquery(this).remove();
                });
            };
            destinationPortal.addItem(destinationPortal.username, folder, description, data, thumbnailUrl)
                .then(thenFunction)
                .catch(catchFunction);
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

        // Preserve the icon and label on the cloned button.
        var clone = jquery("#" + id + "_clone");
        var span = jquery("#" + id + "_clone > span");

        clone.text(name);
        clone.prepend(span);
        clone.addClass("btn-info");
        clone.append("<div class='message'><p class='messages'></p></div>");

        var messages = jquery("#" + id + "_clone").find(".messages");
        serviceDescription.name = name;
        var serviceDefinition = serviceDescription;
        delete serviceDefinition.layers;
        messages.text("creating service");
        messages.after("<img src='css/grid.svg' class='harvester'/>");
        destinationPortal.createService(destinationPortal.username, folder, JSON.stringify(serviceDefinition)).then(function(service) {
            clone.attr("data-id", service.itemId);
            clone.attr("data-portal", destinationPortal.portalUrl);

            // Upgrade the service url to https to prevent mixed content errors.
            service.serviceurl = portalSelf.util.upgradeUrl(service.serviceurl);

            // Update the new item's tags to make it easier to trace its origins.
            var newTags = description.tags;
            newTags.push("sourceId-" + description.id);
            newTags.push("copied with ago-assistant");
            destinationPortal.updateDescription(destinationPortal.username, service.itemId, folder, JSON.stringify({tags: newTags}));

            portal.serviceLayers(description.url)
                .then(function(definition) {
                    var layerCount = definition.layers.length;
                    var layerJobs = {};
                    var layerSummary = {};
                    // var totalRecords = 0; // Keep track of the total records for the entire service.
                    // var totalAdded = 0; // Keep track of the total successfully added records.
                    var reportResult = function(layerId) {
                        // Check if the current layer's requests have all finished.
                        // Using 'attempted' handles both successes and failures.
                        if (layerJobs[layerId].attempted >= layerJobs[layerId].recordCount) {
                            layerSummary[layerId] = layerJobs[layerId];
                            delete layerJobs[layerId];
                        }

                        // Check if all layers have completed.
                        if (Object.keys(layerJobs).length === 0) {
                            var errors = false;
                            console.info("Copy summary for " + name);
                            Object.keys(layerSummary).forEach(function(k) {
                                // Check for errors and log to the console.
                                var layer = layerSummary[k];
                                if (layer.added !== layer.recordCount) {
                                    errors = true;
                                    console.warn(k + " (" + layer.name + "): Added " + layer.added.toLocaleString([]) + "/" + layer.recordCount.toLocaleString([]) + " records");
                                } else {
                                    console.info(k + " (" + layer.name + "): Added " + layer.added.toLocaleString([]) + "/" + layer.recordCount.toLocaleString([]) + " records");
                                }
                            });

                            clone.find("img").remove();
                            clone.removeClass("btn-info");
                            if (errors) {
                                clone.addClass("btn-warning");
                                messages.text("Incomplete--check console");
                            } else {
                                clone.addClass("btn-success");
                                messages.text("Copy OK");
                            }
                        }
                    };

                    jquery.each(definition.layers, function(i, layer) {

                        // Set up an object to track the copy status for this layer.
                        layerJobs[layer.id] = {name: layer.name, recordCount: 0, attempted: 0, added: 0};

                        /*
                        * Force in the spatial reference.
                        * Don't know why this is necessary, but if you
                        * don't then any geometries not in 102100 end up
                        * on Null Island.
                        */
                        layer.adminLayerInfo = {
                            geometryField: {
                                name: "Shape",
                                srid: 102100
                            }
                        };

                        /*
                         * Clear out the layer's indexes.
                         * This prevents occasional critical  errors on the addToServiceDefinition call.
                         * The indexes will automatically be created when the new service is published.
                         */
                        layer.indexes = [];
                    });


                    messages.text("updating definition");
                    destinationPortal.addToServiceDefinition(service.serviceurl, JSON.stringify(definition))
                        .then(function(response) {
                            if (!("error" in response)) {
                                jquery.each(layers, function(i, v) {
                                    var layerId = v.id;
                                    portal.layerRecordCount(description.url, layerId)
                                        .then(function(records) {
                                            var offset = 0;
                                            layerJobs[layerId].recordCount = records.count;
                                            // Set the count manually in weird cases where maxRecordCount is negative.
                                            var count = definition.layers[layerId].maxRecordCount < 1 ? 1000 : definition.layers[layerId].maxRecordCount;
                                            var x = 1; // eslint-disable-line no-unused-vars
                                            while (offset <= records.count) {
                                                x++;
                                                messages.text("harvesting data");
                                                portal.harvestRecords(description.url, layerId, offset, count)
                                                    // the linter doesn't like anonymous callback functions within loops
                                                    /* eslint-disable no-loop-func */
                                                    .then(function(serviceData) {
                                                        messages.text("adding features for " + layerCount + " layers");
                                                        destinationPortal.addFeatures(service.serviceurl, layerId, JSON.stringify(serviceData.features))
                                                            .then(function(result) {
                                                                layerJobs[layerId].attempted += serviceData.features.length;
                                                                layerJobs[layerId].added += result.addResults.length;
                                                                reportResult(layerId);
                                                            })
                                                            .catch(function() { // Catch on addFeatures.
                                                                layerJobs[layerId].attempted += serviceData.features.length;
                                                                reportResult(layerId);
                                                            });
                                                    })
                                                    .catch(function() { // Catch on harvestRecords.
                                                        messages.text("Incomplete—check console");
                                                        console.info("Errors creating service " + name);
                                                        console.info("Failed to retrieve all records.");
                                                    });
                                                    /* eslint-enable no-loop-func */
                                                offset += count;
                                            }
                                        });
                                });
                            } else {
                                clone.find("img").remove();
                                clone.removeClass("btn-info");
                                clone.addClass("btn-danger");
                                messages.text("Failed—check console");
                                console.info("Copy summary for " + name);
                                console.warn(response.error.message);
                                response.error.details.forEach(function(detail) {
                                    console.warn(detail);
                                });
                            }
                        })
                        .catch(function() { // Catch on addToServiceDefinition.
                            clone.find("img").remove();
                            clone.removeClass("btn-info");
                            clone.addClass("btn-danger");
                            messages.text("Failed—check console");
                            console.info("Errors creating service " + name);
                            console.warn("Failed to create the service.");
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
                jquery("#" + id + "_alert").fadeOut(6000, function() {
                    jquery(this).remove();
                });
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
        jquery("#searchText").val(""); // Clear the search bar.
        // jquery(".content").attr("disabled", "disabled");
    };

    var clearResults = function() {
        // Clean up any existing content in the left hand column.
        jquery("#itemsArea").empty();
    };

    var highlightCopyableContent = function() {

        var setMaxWidth = function(el) {
            // Set the max-width of folder items so they don't fill the body when dragging.
            var maxWidth = jquery("#itemsArea .in").width() ? jquery("#itemsArea .in").width() : (jquery("#itemsArea").width() ? $("#itemsArea").width() - 49 : 400);
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
        case "startOver":
            // Reset everything to the default view with inspect content selected.
            cleanUp();
            listUserItems();
            inspectContent();
            jquery("li[data-action='startOver'").removeClass("active");
            jquery("li[data-action='inspectContent'").addClass("active");
            break;
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
            "Dashboard",
            "Symbol Set",
            "Color Set",
            "Document Link",
            "Feature Service",
            "Vector Tile Service"
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

    /**
     * sortArrayAlpha() sorts an array of objects in-place alphabetically based on a specified object property.
     * @param (array) array - array of objects to sort
     * @param (string) key - object property to base the sort on
     */
    var sortArrayAlpha = function(array, key) {
        array.sort(function(a, b) {
            var titleA = null;
            var titleB = null;
            if (a[key])  {
                titleA = a[key].toUpperCase();
            }
            if (b[key]) {
                titleB = b[key].toUpperCase();
            }
            if (titleA < titleB) {
                return -1;
            }
            if (titleA > titleB) {
                return 1;
            }
            // Names are equal.
            return 0;
        });
    };

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
                portal: portalUrl,
                user: this.owner,
                idAbbrev: this.id.substring(0, 6),
                idLink: portalUrl + "home/item.html?id=" + this.id,
                agoType: this.type + (this.typeKeywords.indexOf("Hosted Service") >= 0 ? " (Hosted)" : "")
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

        // display the portal name and user info on the top of #itemsArea column
        var portalIdDom = jquery("<h4></h4>");
        var userIdDom = jquery("<h6></h6>");
        var refreshBtn = jquery("<a class=\"pull-right\" href=\"#\">Refresh <span class=\"glyphicon glyphicon-refresh\" aria-hidden=\"true\"></span>");
        refreshBtn.on("click", listUserItems);
        jquery("#itemsArea").append(portalIdDom);
        jquery("#itemsArea").append(userIdDom);
        app.portals.sourcePortal.self().then(function(data) {
            var userData = data.user;
            var email = userData.email;
            var fullName = userData.fullName;
            var username = userData.username;
            var portalName = data.name || data.portalName;
            portalName += " - <a href=\"" + app.portals.sourcePortal.portalUrl + "\" target=\"_blank\">" + app.portals.sourcePortal.portalUrl + "</a>";
            portalIdDom.html(portalName);
            userIdDom.text("Current User: " + fullName + " (" + username + ")");
            userIdDom.append(refreshBtn);
        });

        // Capture item creation times to be displayed in the user heatmap.
        function storeActivity(activityTime) {
            var seconds = activityTime / 1000;
            app.stats.activities[seconds] = 1;
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

            // Sort the items alphabetically.
            sortArrayAlpha(content.items, "title");

            // Append the root items to the Root folder.
            jquery.each(content.items, function(item) {
                var templateData = {
                    id: this.id,
                    title: this.title,
                    type: this.type,
                    icon: portalSelf.itemInfo(this.type).icon,
                    portal: portal.portalUrl,
                    idAbbrev: this.id.substring(0, 6),
                    idLink: portal.portalUrl + "home/item.html?id=" + this.id,
                    agoType: this.type + (this.typeKeywords.indexOf("Hosted Service") >= 0 ? " (Hosted)" : "")
                };
                var html = mustache.to_html(jquery("#contentTemplate").html(), templateData);
                jquery("#collapse_").append(html);
                storeActivity(content.items[item].modified);
            });

            // Sort the folders alphabetically.
            sortArrayAlpha(content.folders, "title");

            // Add the other folders.
            jquery.each(content.folders, function() {
                var folderData = {
                    title: this.title,
                    id: this.id,
                    count: 0
                };

                // Append an accordion for the folder.
                var html = mustache.to_html(jquery("#folderTemplate").html(), folderData);
                jquery("#itemsArea").append(html);
                portal.userContent(portal.username, this.id)
                    .then(function(content) {

                        // Update the folder count.
                        jquery("#collapse_" + content.currentFolder.id).parent().find("span.badge")[0].innerHTML = content.total;

                        // Sort the items alphabetically.
                        sortArrayAlpha(content.items, "title");

                        // Append the items to the folder.
                        jquery.each(content.items, function(item) {
                            var templateData = {
                                id: this.id,
                                title: this.title,
                                type: this.type,
                                icon: portalSelf.itemInfo(this.type).icon,
                                portal: portal.portalUrl,
                                idAbbrev: this.id.substring(0, 6),
                                idLink: portal.portalUrl + "home/item.html?id=" + this.id,
                                agoType: this.type + (this.typeKeywords.indexOf("Hosted Service") >= 0 ? " (Hosted)" : "")
                            };
                            var html = mustache.to_html(jquery("#contentTemplate").html(), templateData);
                            jquery("#collapse_" + this.ownerFolder).append(html);
                            storeActivity(content.items[item].modified);
                        });
                    });
            });

            setTimeout(function() {
                // Wait a second to let all of the items populate before highlighting them.
                highlightSupportedContent();
            }, 1000);
        });
    };

    var listUserGroups = function() {
        "use strict";
        var portal = app.portals.sourcePortal;

        cleanUp();
        clearResults();

        // display the portal name and user info on the top of #itemsArea column
        var portalIdDom = jquery("<h4></h4>");
        var userIdDom = jquery("<h6></h6>");
        jquery("#itemsArea").append(portalIdDom);
        jquery("#itemsArea").append(userIdDom);
        portal.self().then(function(data) {
            var userData = data.user;
            var fullName = userData.fullName;
            var username = userData.username;
            var portalName = data.name || data.portalName;
            portalName += " - <a href=\"" + portal.portalUrl + "\" target=\"_blank\">" + portal.portalUrl + "</a>";
            portalIdDom.html(portalName);
            userIdDom.text("Current User: " + fullName + " (" + username + ")");

            portal.userProfile(portal.username).then(function(user) {

                // Sort the groups alphabetically.
                sortArrayAlpha(user.groups, "title");

                // Add the groups.
                jquery.each(user.groups, function() {
                    var group = this;
                    var query = "group:" + this.id;
                    var folderData = {
                        title: this.title,
                        id: this.id,
                        count: 0
                    };

                    // Append an accordion for the folder.
                    var html = mustache.to_html(jquery("#folderTemplate").html(), folderData);
                    jquery("#itemsArea").append(html);

                    // Get the items in the group (sorted alphabetically).
                    portal.search(query, 100, "title", "asc")
                        .then(function(search) {

                            // Update the folder count.
                            jquery("#collapse_" + group.id).parent().find("span.badge")[0].innerHTML = search.total;

                            // Append the items to the folder.
                            jquery.each(search.results, function() {
                                var templateData = {
                                    id: this.id,
                                    title: this.title,
                                    type: this.type,
                                    icon: portalSelf.itemInfo(this.type).icon,
                                    portal: portal.portalUrl,
                                    user: this.owner,
                                    idAbbrev: this.id.substring(0, 6),
                                    idLink: portal.portalUrl + "home/item.html?id=" + this.id,
                                    agoType: this.type + (this.typeKeywords.indexOf("Hosted Service") >= 0 ? " (Hosted)" : "")
                                };
                                var html = mustache.to_html(jquery("#contentTemplate").html(), templateData);
                                jquery("#collapse_" + group.id).append(html);
                            });
                        });
                });

                setTimeout(function() {
                    // Wait a second to let all of the items populate before highlighting them.
                    highlightSupportedContent();
                }, 1000);
            });
        });
    };

    var showDestinationFolders = function() {
        "use strict";
        var portal = app.portals.destinationPortal;

        // display the portal name and user info on the top of #dropArea column
        var portalIdDom = jquery("<h4></h4>");
        var userIdDom = jquery("<h6></h6>");
        jquery("#dropArea").append(portalIdDom);
        jquery("#dropArea").append(userIdDom);
        app.portals.destinationPortal.self().then(function(data) {
            var userData = data.user;
            var email = userData.email;
            var fullName = userData.fullName;
            var username = userData.username;
            var portalName = data.name || data.portalName;
            portalName += " - <a href=\"" + app.portals.destinationPortal.portalUrl + "\" target=\"_blank\">" + app.portals.destinationPortal.portalUrl + "</a>";
            portalIdDom.html(portalName);
            userIdDom.text("Current User: " + fullName + " (" + username + ")");
        });

        portal.userContent(portal.username, "/").then(function(content) {
            var folderData;
            var html;
            // Append the root folder accordion.
            folderData = {
                title: "Root",
                id: "",
                count: content.items.length
            };
            html = mustache.to_html(
                jquery("#dropFolderTemplate").html(),
                folderData
            );
            jquery("#dropArea").append(html);

            // Sort the items alphabetically.
            sortArrayAlpha(content.items, "title");

            // Append the root items to the Root folder.
            jquery.each(content.items, function() {
                var itemData = {
                    id: this.id,
                    title: this.title,
                    type: this.type,
                    icon: portalSelf.itemInfo(this.type).icon,
                    portal: portal.portalUrl,
                    idAbbrev: this.id.substring(0, 6),
                    idLink: portal.portalUrl + "home/item.html?id=" + this.id,
                    agoType: this.type + (this.typeKeywords.indexOf("Hosted Service") >= 0 ? " (Hosted)" : "")
                };
                var html = mustache.to_html(jquery("#contentTemplate").html(), itemData);
                jquery("#collapseDest_").append(html);
            });

            // Enable the droppable area.
            makeDroppable("");

            // Sort the folders alphabetically.
            sortArrayAlpha(content.folders, "title");

            // Append the other folders.
            jquery.each(content.folders, function() {
                folderData = {
                    title: this.title,
                    id: this.id,
                    count: 0
                };
                html = mustache.to_html(
                    jquery("#dropFolderTemplate").html(),
                    folderData
                );
                jquery("#dropArea").append(html);
                portal.userContent(portal.username, this.id)
                    .then(function(content) {

                        // Sort the items alphabetically.
                        sortArrayAlpha(content.items, "title");

                        // Append the items to the folder.
                        jquery.each(content.items, function() {
                            var templateData = {
                                id: this.id,
                                title: this.title,
                                type: this.type,
                                icon: portalSelf.itemInfo(this.type).icon,
                                portal: portal.portalUrl,
                                idAbbrev: this.id.substring(0, 6),
                                idLink: portal.portalUrl + "home/item.html?id=" + this.id,
                                agoType: this.type + (this.typeKeywords.indexOf("Hosted Service") >= 0 ? " (Hosted)" : "")
                            };
                            var html = mustache.to_html(jquery("#contentTemplate").html(), templateData);
                            jquery("#collapseDest_" + content.currentFolder.id).append(html);
                        });

                        // Collapse the accordion to avoid cluttering the display.
                        jquery("#collapseDest_" + content.currentFolder.id).collapse("hide");

                        // Enable the droppable area.
                        makeDroppable(content.currentFolder.id);
                    });
            });
        });
    };

    // Do stuff when the DOM is ready.
    jquery(document).ready(function() {

        // Enable the login buttons.
        // Doing it here ensures all required libraries have loaded.
        jquery(".loginButtons > p > button")
            .removeAttr("disabled");

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

                        // check url for portal and appid parameters, and show the login form pre-populated (if found)
                        var portal = getUrlParameter("portal");
                        var appid = getUrlParameter("appid");
                        if (portal) {
                            app.portals.sourcePortal = new portalSelf.Portal({
                                portalUrl: portal
                            });
                            jquery("#portalUrl").val(portal);
                            validateUrl("#portalUrl", app.portals.sourcePortal, "#portalLoginBtn");
                            jquery("[data-action='login-portal']").trigger("click");
                            if (appid) {
                                jquery("#portalAppId").val(appid);
                                jquery("#oauthTabBtn").trigger("click");
                            }
                        }
                    }
                );
        });

        // Resize the content areas to fill the window.
        var resizeContentAreas = function() {
            "use strict";
            jquery(".itemArea").height(jquery(window).height() - 60);
        };

        resizeContentAreas();

        // Disable the enter key to prevent accidentally firing forms.
        // Disable it for everything except the code edit windows.
        var disableEnterKey = function() {
            "use strict";
            jquery("html").bind("keypress", function(e) {
                if (e.keyCode === 13 &&
                    jquery(e.target).attr("contenteditable") !== "true" &&
                    jquery(e.target).parents(".jsonViewer").length === 0
                ) {
                    return false;
                }
            });
        };

        disableEnterKey();

        // Preformat the copy login screen.
        jquery("#portalDestinationGroup").css({
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
            jquery("#portalDestinationGroup").css({
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
                placeholder: "https://myportal.domain.com/",
                value: ""
            });
            jquery("#portalAppId2").val("");
            jquery("#destinationUrl").val("");
            jquery("#portalDestinationGroup").css({
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
            jquery("#userPassTab2Btn").trigger("click");
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
                validateUrl("#portalUrl", app.portals.sourcePortal, "#portalLoginBtn");
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
                    validateUrl("#destinationUrl", app.portals.destinationPortal, "#destinationLoginBtn");
                }
            }, 500);
        });

        // Login.
        jquery("[data-action='login-agol']").click(function() {
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
                if (!app.portals.destinationPortal || (app.portals.destinationPortal.portalUrl !== appInfo.portalUrl)) {
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

        // Add a listener for the enter key on the portal login form.
        jquery("#portalLoginForm").keypress(function(e) {
            if (e.which == 13) {
                jquery("#portalLoginBtn").focus().click();
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
                jquery("#actionDropdown li").removeClass("active");
                listUserGroups();
                NProgress.done();
            } else {
                // View My Content.
                NProgress.start();
                jquery("#actionDropdown li").removeClass("active");
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
            case "startOver":
                cleanUp();
                jquery("#searchText").val("");
                listUserItems();
                break;
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


        jquery("#currentUrl").text(window.location.origin + window.location.pathname);
        jquery("#currentUrl2").text(window.location.origin + window.location.pathname);

    });

});
