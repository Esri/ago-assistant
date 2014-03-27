requirejs.config({
    baseUrl: './',
    paths: {
        "jquery": "js/lib/jquery-1.10.2.min",
        "jquery.bootstrap": "js/lib/bootstrap/js/bootstrap.min",
        "jquery.ui": "js/lib/jquery-ui-1.9.2.min",
        "mustache": "js/lib/mustache-0.7.2",
        "d3": "js/lib/d3.v3-3.2.7.min",
        "nprogress": "js/lib/nprogress/nprogress-0.1.2",
        "cal-heatmap": "js/lib/cal-heatmap/cal-heatmap-3.3.10.min",
        "highlight": "js/lib/highlight/highlight.min",
        "portal": "js/portal/portal",
        "util": "js/portal/util",
        "app": "js/app"
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
        },
        "app": {
            deps: ["jquery", "jquery.bootstrap", "mustache", "highlight", "nprogress", "cal-heatmap", "portal"]
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
], function () {

});