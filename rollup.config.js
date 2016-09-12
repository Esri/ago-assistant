import json from "rollup-plugin-json";
import babel from "rollup-plugin-babel";
import uglify from "rollup-plugin-uglify";

export default {
    entry: "src/js/portal/portal.js",
    exports: "named",
    moduleName: "portal",
    format: "umd",
    plugins: [
        json(),
        babel(),
        uglify()
    ],
    dest: "src/js/lib/portal.min.js",
    sourceMap: "src/js/lib/portal.min.js.map"
};
