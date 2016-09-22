/* eslint object-property-newline: "off" */

module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        // Metadata.
        pkg: grunt.file.readJSON("package.json"),
        cfg: grunt.file.readJSON("config.json"),
        // Task configuration.
        clean: {
            // Clean up build files and source maps.
            src: [
                "src/js/main_config.js",
                "src/js/main.min.js",
                "src/js/main.min.js.map",
                "src/js/lib/portal.min.js",
                "src/js/lib/portal.min.js.map"
            ],
            build: ["build/**"]
        },
        eslint: {
            // Validate the javascripts.
            options: {
                useEslintrc: true
            },
            all: ["src/js/*.js", "src/js/portal/*.js"]
        },
        "string-replace": {
            js: {
                files: {
                    "src/js/main_config.js": "src/js/main.js"
                },
                options: {
                    replacements: [
                        {
                            pattern: "<config.appId>",
                            replacement: "<%= cfg.appId %>"
                        },
                        {
                            pattern: "<config.portalUrl>",
                            replacement: "<%= cfg.portalUrl %>"
                        }
                    ]
                }
            }
        },
        concat: {
            // Combine files where it makes sense.
            options: {
                separator: ";"
            },
            build_index: {
                src: ["src/index.html", "src/templates.html"],
                dest: "build/index.html"
            }
        },
        uglify: {
            // Minify the javascript files.
            // Production build removes console statements and source maps.
            options: {
                banner: "/*! <%= pkg.name %> <%= pkg.version %> */\n"
            },
            prod: {
                options: {
                    preserveComments: false,
                    sourceMap: false
                },
                files: {
                    "src/js/main.min.js": ["src/js/main_config.js"]
                }
            },
            dev: {
                // Dev build includes source maps and console statements.
                options: {
                    preserveComments: "all",
                    report: "gzip",
                    sourceMap: true
                },
                files: {
                    "src/js/main.min.js": ["src/js/main_config.js"]
                }
            }
        },
        copy: {
            // Copy everything to the build directory for testing.
            main: {
                files: [
                    {expand: true, cwd: "src/", src: ["oauth-callback.html"], dest: "build/"},
                    {expand: true, cwd: "src/", src: ["assets/**"], dest: "build/"},
                    {expand: true, cwd: "src/", src: ["css/**"], dest: "build/"},
                    {expand: true, cwd: "src/", src: ["js/main.min.js"], dest: "build/"},
                    {expand: true, cwd: "src/", src: ["js/lib/**"], dest: "build/"}
                ]
            }
        },
        shell: {
            // Use rollup from the command line since grunt-rollup didn't work.
            command: "rollup -c"
        }
    });

    // These plugins provide necessary tasks.
    grunt.loadNpmTasks("grunt-contrib-clean");
    grunt.loadNpmTasks("grunt-contrib-concat");
    grunt.loadNpmTasks("grunt-contrib-copy");
    grunt.loadNpmTasks("grunt-contrib-uglify");
    grunt.loadNpmTasks("grunt-eslint");
    grunt.loadNpmTasks("grunt-shell");
    grunt.loadNpmTasks("grunt-string-replace");

    // Default task.
    grunt.registerTask("default", ["clean", "string-replace", "eslint", "shell", "concat", "uglify:prod", "copy", "clean:src"]);
    grunt.registerTask("dev", ["clean", "string-replace", "eslint", "shell", "concat", "uglify:dev", "copy", "clean:src"]);
    grunt.registerTask("lint", ["eslint"]);
    grunt.registerTask("cleanup", ["clean"]);

};
