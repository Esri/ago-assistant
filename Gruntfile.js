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
                "src/index_config.html",
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
            config: {
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
            },
            version: {
                files: {
                    "src/index_config.html": "src/index.html"
                },
                options: {
                    replacements: [
                        {
                            pattern: "<package.version>",
                            replacement: "<%= pkg.version %>"
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
                src: ["src/index_config.html", "src/templates.html"],
                dest: "build/index.html"
            },
            polyfill_portaljs: {
                src: ["node_modules/babel-polyfill/dist/polyfill.min.js", "src/js/lib/portal.min.js"],
                dest: "src/js/lib/portal.min.js"
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
            prod: {
                files: [
                    {expand: true, cwd: "src/", src: ["oauth-callback.html"], dest: "build/"},
                    {expand: true, cwd: "src/", src: ["assets/**"], dest: "build/"},
                    {expand: true, cwd: "src/", src: ["css/**"], dest: "build/"},
                    {expand: true, cwd: "src/", src: ["js/main.min.js"], dest: "build/"},
                    {expand: true, cwd: "src/", src: ["js/lib/**"], dest: "build/"}
                ]
            },
            dev: {
                files: [
                    {expand: true, cwd: "src/", src: ["js/main*"], dest: "build/"}
                ]
            }
        },
        shell: {
            // Use rollup from the command line since grunt-rollup didn't work.
            command: "rollup -c"
        },
        "http-server": {
            dev: {
                root: "build",
                host: "0.0.0.0",
                port: 8080,
                openBrowser: false
            }
        }
    });

    // These plugins provide necessary tasks.
    grunt.loadNpmTasks("grunt-contrib-clean");
    grunt.loadNpmTasks("grunt-contrib-concat");
    grunt.loadNpmTasks("grunt-contrib-copy");
    grunt.loadNpmTasks("grunt-contrib-uglify");
    grunt.loadNpmTasks("grunt-eslint");
    grunt.loadNpmTasks("grunt-http-server");
    grunt.loadNpmTasks("grunt-shell");
    grunt.loadNpmTasks("grunt-string-replace");

    // Default task.
    grunt.registerTask("default", ["clean", "string-replace", "eslint", "shell", "concat", "uglify:prod", "copy:prod", "clean:src"]);
    grunt.registerTask("dev", ["clean", "string-replace", "eslint", "shell", "concat", "uglify:dev", "copy:prod", "copy:dev", "clean:src", "http-server"]);
    grunt.registerTask("lint", ["eslint"]);
    grunt.registerTask("serve", ["http-server"]);
    grunt.registerTask("cleanup", ["clean"]);

};
