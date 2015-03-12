module.exports = function(grunt) {

    grunt.config.set('path', '../dist');

    grunt.registerTask('zip', [
        'compress:main'
    ]);
};