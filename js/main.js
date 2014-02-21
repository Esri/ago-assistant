requirejs.config({
    baseUrl: './',
    paths: {
        "jquery": "lib/jquery-1.10.2.min",
        "jquery.bootstrap": "lib/bootstrap/js/bootstrap.min",
        "jquery.ui": "lib/jquery-ui-1.9.2.min",
        "mustache": "lib/mustache-0.7.2",
        "d3": "lib/d3.v3-3.2.7.min",
        "nprogress": "lib/nprogress/nprogress-0.1.2",
        "cal-heatmap": "lib/cal-heatmap/cal-heatmap-3.3.10.min",
        "highlight": "lib/highlight/highlight.min",
        "portal": "js/portal/portal",
        "util": "js/portal/util",
        "app": "js/app"
    },
    shim: {
        "jquery": {
            exports: "jQuery"
        },
        "jquery.bootstrap": {
            // Ensure jquery-ui loads first.
            // This is necessary so bootstrap stuff still works.
            deps: ["jquery", "jquery.ui"],
        },
        "jquery.ui": {
            deps: ["jquery"],
        },
        "mustache": {
            exports: "Mustache"
        },
        "d3": {
            exports: "d3"
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
        },
        "app": {
            deps: ["jquery", "jquery.bootstrap", "mustache", "nprogress", "cal-heatmap", "portal"]
        }
    }
});

require([
    "jquery",
    "jquery.bootstrap",
    "jquery.ui",
    "mustache",
    "d3",
    "nprogress",
    "cal-heatmap",
    "highlight",
    "portal",
    "app"
], function (
    jquery,
    bootstrap,
    jqueryui,
    mustache,
    d3,
    nprogress,
    calheatmap,
    highlight,
    portal,
    app
) {
        
    // Reassign Mustache globally.
    // This is a hack and should be fixed to properly use Mustache with requirejs.
    window.Mustache = mustache;

});