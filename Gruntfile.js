/*global module:false*/
module.exports = function (grunt) {

    // Project configuration.
    grunt.initConfig({
        // Metadata.
        pkg: grunt.file.readJSON('package.json'),
        // Task configuration.
        jshint: {
            all: ['Gruntfile.js', 'src/js/*.js', 'src/js/portal/*.js']
        },
        concat: {
            options: {
                separator: ';'
            },
            dist: {
                src: ['src/index.html', 'src/templates.html'],
                dest: 'build/index.html'
            }
        },
        copy: {
            main: {
                files: [
                    {expand: true, cwd: 'src/', src: ['assets/**'], dest: 'build/'},
                    {expand: true, cwd: 'src/', src: ['css/**'], dest: 'build/'},
                    {expand: true, cwd: 'src/', src: ['js/**'], dest: 'build/'},
                ]
            }
        },
    });

    // These plugins provide necessary tasks.
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-copy');

    // Default task.
    grunt.registerTask('default', ['jshint', 'concat', 'copy']);

};