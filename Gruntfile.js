/*global module:false*/
module.exports = function (grunt) {

    // Project configuration.
    grunt.initConfig({
        // Metadata.
        pkg: grunt.file.readJSON('package.json'),
        // Task configuration.
        clean: {
            // Clean up build files.
            src: ['src/js/portal/*.min.js', 'src/js/main.min.js'],
            build: ['build/**']
        },
        jshint: {
            // Validate the javascripts.
            all: ['Gruntfile.js', 'src/js/*.js', 'src/js/portal/*.js']
        },
        concat: {
            // Combine files where it makes sense.
            options: {
                separator: ';'
            },
            build_index: {
                src: ['src/index.html', 'src/templates.html'],
                dest: 'build/index.html'
            }
        },  
        uglify: {
            // Minify the javascript files.
            options: {
                banner: '/*! <%= pkg.name %> <%= pkg.version %> */\n'
            },
            build: {
                files: {
                    'src/js/main.min.js': 'src/js/main.js',
                    'src/js/portal/portal.min.js': 'src/js/portal/portal.js',
                    'src/js/portal/util.min.js': 'src/js/portal/util.js'
                }
            }
        },
        copy: {
            // Copy everything to the build directory for testing.
            main: {
                files: [
                    {expand: true, cwd: 'src/', src: ['assets/**'], dest: 'build/'},
                    {expand: true, cwd: 'src/', src: ['css/**'], dest: 'build/'},
                    {expand: true, cwd: 'src/', src: ['js/*'], dest: 'build/',
                        rename: function(src, dest) {
                            return src + dest.replace('.min', '');
                        }
                    },
                    {expand: true, cwd: 'src/', src: 'js/portal/*', dest: 'build/',
                        rename: function(src, dest) {
                            return src + dest.replace('.min', '');
                        }
                    },
                    {expand: true, cwd: 'src/', src: ['js/lib/**'], dest: 'build/'}
                ]
            }
        },
    });

    // These plugins provide necessary tasks.
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-copy');

    // Default task.
    grunt.registerTask('default', ['clean', 'jshint', 'concat', 'uglify', 'copy']);
    grunt.registerTask('cleanup', ['clean']);

};