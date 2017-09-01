import resolve from "rollup-plugin-node-resolve";
import json from "rollup-plugin-json";
import babel from "rollup-plugin-babel";
import uglify from "rollup-plugin-uglify";

export default {
    input: "src/js/portal/portal.js",
    output: {
        file: "src/js/lib/portal.min.js",
        format: "umd",
        name: "portal",
        sourcemap: "src/js/lib/portal.min.js.map"
    },
    plugins: [
        resolve(),
        json(),
        babel(),
        uglify()
    ]
};
