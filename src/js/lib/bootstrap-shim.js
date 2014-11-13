define(["require", "dojo/Deferred"], function (require, Deferred) {
    // Use this shim to ensure that jquery and jquery-ui load before bootstrap.
    var def = new Deferred();
    require(
        {async: 0},
        ["jquery", "jquery.ui", "jquery.bootstrap"],
        function () {
            def.resolve();
        });
    return def;
});