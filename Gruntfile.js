/* eslint object-property-newline: "off" */

module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        // Metadata.
        pkg: grunt.file.readJSON("package.json"),
        cfg: grunt.file.readJSON("config.json"),
        node_modules: ".\\node_modules\\.bin\\",
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
            prettier: "<%= node_modules %>prettier --write Gruntfile.js rollup.config.js src/js/main.js src/js/portal/**/*.js",
            rollup: "<%= node_modules %>rollup -c"
        },
        connect: {
            server: {
                options: {
                    port: 8080,
                    livereload: true,
                    open: true,
                    base: ['build']
                }
            }
          },
        "watch": {
            options: {
                livereload: true
            },
            src: {
                files: [
                  'Gruntfile.js',
                  'config.json',
                  'src/**/*',
                  '!src/**/*.min.js',
                  '!src/**/*_config*',
                  '!src/**/*.map'
                ],
                tasks: ['build-dev']
            }
        }
    });

    // These plugins provide necessary tasks.
    grunt.loadNpmTasks("grunt-contrib-clean");
    grunt.loadNpmTasks("grunt-contrib-concat");
    grunt.loadNpmTasks("grunt-contrib-copy");
    grunt.loadNpmTasks("grunt-contrib-uglify");
    grunt.loadNpmTasks("grunt-contrib-watch");
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks("grunt-shell");
    grunt.loadNpmTasks("grunt-string-replace");


    // Default task.
    grunt.registerTask("default", ["clean", "string-replace", "shell", "concat", "uglify:prod", "copy:prod", "clean:src"]);
    grunt.registerTask("build-dev", ["clean", "string-replace", "shell", "concat", "uglify:dev", "copy:prod", "copy:dev", "clean:src"]);
    grunt.registerTask("dev", ["build-dev", "connect", "watch"]);
    grunt.registerTask("serve", ["connect"]);
    grunt.registerTask("cleanup", ["clean"]);
    grunt.registerTask("prettier", ["shell:prettier"]);
    grunt.registerTask("rollup", ["shell:rollup"]);

};
