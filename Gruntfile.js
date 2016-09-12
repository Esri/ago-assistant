/* eslint object-property-newline: "off" */

module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        // Metadata.
        pkg: grunt.file.readJSON("package.json"),
        // Task configuration.
        clean: {
            // Clean up build files.
            src: ["src/js/main.min.js"],
            build: ["build/**"]
        },
        eslint: {
            // Validate the javascripts.
            options: {
                useEslintrc: "true"
                // configFile: "./.eslintrc.js"
            },
            all: ["src/js/*.js", "src/js/portal/*.js"]
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
            options: {
                banner: "/*! <%= pkg.name %> <%= pkg.version %> */\n"
            },
            build: {
                files: {
                    "src/js/main.min.js": "src/js/main.js"
                }
            }
        },
        copy: {
            // Copy everything to the build directory for testing.
            main: {
                files: [
                    {expand: true, cwd: "src/", src: ["*.html"], dest: "build/"},
                    {expand: true, cwd: "src/", src: ["assets/**"], dest: "build/"},
                    {expand: true, cwd: "src/", src: ["css/**"], dest: "build/"},
                    {expand: true, cwd: "src/", src: ["js/*"], dest: "build/",
                        rename: function(src, dest) {
                            return src + dest.replace(".min", "");
                        }
                    },
                    {expand: true, cwd: "src/", src: ["js/lib/**"], dest: "build/"}
                ]
            }
        },
        aws_s3: {
            // Copy the latest build to an AWS S3 bucket.
            options: {
                region: "us-east-1",
                sslEnabled: true
                // Omit the following options by setting equivalent environment variables.
                // AWS_ACCESS_KEY_ID: <YOUR_KEY>,
                // AWS_SECRET_ACCESS_KEY: <YOUR_KEY>
            },
            backup: {
                options: {
                    bucket: "ago-assistant"
                },
                files: [
                    {cwd: "backup/", dest: "/", action: "download"}
                ]
            },
            simulate: {
                options: {
                    bucket: "ago-assistant-staging",
                    debug: true
                },
                files: [
                    {dest: "/", action: "delete"},
                    {expand: true, cwd: "build/", src: ["**"], dest: ""}
                ]
            },
            staging: {
                options: {
                    bucket: "ago-assistant-staging"
                },
                files: [
                    {dest: "/", action: "delete"}, // Delete all existing files.
                    {expand: true, cwd: "build/", src: ["**"], dest: ""}
                ]
            },
            production: {
                options: {
                    bucket: "ago-assistant"
                },
                files: [
                    {dest: "/", action: "delete"}, // Delete all existing files.
                    {expand: true, cwd: "build/", src: ["**"], dest: ""}
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
    grunt.loadNpmTasks("grunt-eslint");
    grunt.loadNpmTasks("grunt-contrib-concat");
    grunt.loadNpmTasks("grunt-contrib-uglify");
    grunt.loadNpmTasks("grunt-contrib-copy");
    grunt.loadNpmTasks("grunt-aws-s3");
    grunt.loadNpmTasks("grunt-shell");

    // Default task.
    grunt.registerTask("default", ["clean", "eslint", "shell", "concat", "uglify", "copy"]);
    grunt.registerTask("build_portal", ["shell"]);
    grunt.registerTask("cleanup", ["clean"]);
    grunt.registerTask("s3_backup", ["aws_s3:backup"]);
    grunt.registerTask("s3_simulate", ["aws_s3:simulate"]);
    grunt.registerTask("s3_staging", ["aws_s3:staging"]);
    grunt.registerTask("s3_production", ["aws_s3:production"]);

};
