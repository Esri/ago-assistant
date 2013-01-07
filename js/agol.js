function validateUrl(el) {
    "use strict";
    var url = $(el).val()
        if (url === "") {
            $(el).val("https://arcgis.com/");
        } else if (url.charAt(url.length - 1) !== "/") {
            $(el).val(url + "/");
        }
    
    var html = $("#urlErrorTemplate").html();
    $.getJSON(url + "sharing?f=json", function (data) {
        console.log("API v" + data.currentVersion); // List the API version.
    })
        .error(function () { $(el).parent().after(html); });
}

function getToken(url, username, password, form, callback) {
    "use strict";
    // Define token parameters.
    var token, tokenParams = {
        username : username,
        password : password,
        referer : $(location).attr("href"),
        expiration : 60,
        f : "json"
    };

    //Get session token
    $.ajax({
        url : url + "sharing/generateToken?",
        type : "POST",
        dataType : 'json',
        data : tokenParams,
        success : function (data) {
            if (data.token) {
                callback(data.token);
            } else if (data.error.code === 400) {
                var html = $("#loginErrorTemplate").html();
                $(form).before(html);
            } else {
                console.log("Unhandled error.");
                console.log(data);
            }
        },
        error : function (response) {
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
        $("#actionDropdown").css({"visibility": "visible"});
        template = $("#loginSuccessTemplate").html();
        html = Mustache.to_html(template, data);
        $("#sessionDropdown").before(html);
        $("#loginSuccess").fadeOut(5000);
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
        accept : ".content",
        activeClass: "ui-state-hover",
        hoverClass: "ui-state-active",
        drop : function (event, ui) {
            var destFolder = $(this).parent().parent().attr("data-folder");
            moveItem(ui.draggable, $(this).parent().parent());
        }
    });
}

function moveItem(item, destination) {
    "use strict";
    item.prependTo(destination);
    var itemId = $(item).attr("data-id");
    var destinationFolder = $(item).parent().attr("data-folder");
    copyItem(itemId, destinationFolder);

}

function listItems() {
    "use strict";
    var sourcePortal = {
        url : sessionStorage["sourceUrl"],
        username : sessionStorage["sourceUsername"],
        params : {
            token : sessionStorage["sourceToken"],
            f : "json"
        }
    };

    //Get user contents
    $.getJSON(sourcePortal.url + "sharing/content/users/" + sourcePortal.username + "?" + $.param(sourcePortal.params), function (data) {
        var folderTemplate = $("#folderTemplate").html(),
            contentTemplate = $("#contentTemplate").html();
        
        // Add an entry for the root folder.
        var folderData = { 
            name : "Root (Top Level)",
            elName : "source" + "Root",
            id : "Root",
            count : data.items.length 
        };
        var folderHtml = Mustache.to_html(folderTemplate, folderData);
        $("#itemsArea").append(folderHtml);
        
        //Append the root items to the list
        $.each(data.items, function(item) {
            var contentData = { 
                id : data.items[item].id,
                title : data.items[item].title,
                item : data.items[item].item,
                itemType : data.items[item].itemType,
                type : data.items[item].type 
            };
            var contentHtml = Mustache.to_html(contentTemplate, contentData);
            $("#collapseRoot").append(contentHtml);
        });
        $.each(data.folders, function(folder) {
            $.getJSON(sourcePortal.url + "sharing/content/users/" + sourcePortal.username + "/" + data.folders[folder].id + "?" + $.param(sourcePortal.params), function(folderItems) {
                // Append the folder.
                var folderData = { 
                    name : data.folders[folder].title,
                    elName : "source" + data.folders[folder].title,
                    id : data.folders[folder].id,
                    count : folderItems.items.length 
                };
                var folderHtml = Mustache.to_html(folderTemplate, folderData);
                $("#itemsArea").append(folderHtml);
                
                // Append the folder content to each folder.
                $.each(folderItems.items, function(folderItem) {
                    var contentData = { 
                        id : folderItems.items[folderItem].id,
                        title : folderItems.items[folderItem].title,
                        item : folderItems.items[folderItem].item,
                        itemType : folderItems.items[folderItem].itemType,
                        type : folderItems.items[folderItem].type 
                    };
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
        url : sessionStorage["destinationUrl"],
        username : sessionStorage["destinationUsername"],
        params : {
            token : sessionStorage["destinationToken"],
            f : "json"
        }
    };

    // Show folders in the destination.
    $.getJSON(destinationPortal.url + "sharing/content/users/" + destinationPortal.username + "?" + $.param(destinationPortal.params), function(data) {
        var folderTemplate = $("#destinationFolderTemplate").html();
        var contentTemplate = $("#contentTemplate").html();
        
        // Add an entry for the root folder.
        var folderData = { 
            name : "Root (Top Level)",
            id : "",
            count : data.items.length 
        };
        var folderHtml = Mustache.to_html(folderTemplate, folderData);
        $("#dropArea").append(folderHtml);
        makeDroppable("Dest" + folderData.id); // Enable the droppable area.
    
        $.each(data.folders, function(folder) {
            $.getJSON(destinationPortal.url + "sharing/content/users/" + destinationPortal.username + "/" + data.folders[folder].id + "?" + $.param(destinationPortal.params), function(folderItems) {
                // Append the folder.
                var folderData = { 
                    name : data.folders[folder].title,
                    id : data.folders[folder].id,
                    count : folderItems.items.length 
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
        url : sessionStorage["sourceUrl"],
        username : sessionStorage["sourceUsername"],
        params : {
            token : sessionStorage["sourceToken"],
            f : "json"
        }
    };
        
    var destinationPortal = {
        url : sessionStorage["destinationUrl"],
        username : sessionStorage["destinationUsername"],
        params : {
            token : sessionStorage["destinationToken"],
            f : "json"
        }
    };
    
    if ($("#" + id).attr("data-itemType") === "text" || $("#" + id).attr("data-itemType") === "url") {
        // Item is text or url.
        // Get the full item description from the source.
        $.getJSON(sourcePortal.url + "sharing/rest/content/items/" + id + "?" + $.param(sourcePortal.params), function(description) {
            
            // Clean up description items for posting.
            $.each(description, function(item, value) {
                if (value === null) {
                    value = "";
                } else if ( value instanceof Array) {
                    //convert the array to a comma separated string
                    var arrayString;
                    $.each(value, function(index, arrayValue) {
                        if (index === 0) {
                            arrayString = arrayValue;
                        } else if (index > 0) {
                            arrayString = arrayString + "," + arrayValue;
                        }
                    });
                    value = arrayString;
                }
            });
            var thumbUrl = sourcePortal.url + "sharing/content/items/" + id + "/info/" + description.thumbnail + "?" + $.param(sourcePortal.params).replace("&f=json", "");
            
            // Get the item's data.
            $.get(sourcePortal.url + "sharing/rest/content/items/" + id + "/data" + "?" + $.param(sourcePortal.params), function (data) {
                var itemParams = {
                    item : description.title,
                    text : data,
                    overwrite : false,
                    thumbnailurl : thumbUrl
                };
                var addItemParams = $.param(description) + "&" + $.param(itemParams);
                // Post it to the destination.
                $.post(destinationPortal.url + "sharing/rest/content/users/" + destinationPortal.username + "/" + folder + "/addItem?" + $.param(destinationPortal.params), addItemParams, function(response) {
                    var responseJson = $.parseJSON(response);
                    if (responseJson.success === true) {
                        $("#" + id).addClass("btn-success");
                    } else if (responseJson.error) {
                        $("#" + id).addClass("btn-danger");
                        alert("Copying failed: " + responseJson.error.message);
                    } else {
                        alert("Something went wrong.");
                    }
                });
            });
            
        });
        
    } else {
        // Item is file.
        alert("Copying files is not yet supported, but it's on the shortlist of new functionality.")
        $("#" + id).addClass("btn-warning");
    }
    
}