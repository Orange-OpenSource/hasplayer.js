module.exports = function(grunt) {

    grunt.registerTask('version', function () {
        var mediaPlayer = grunt.file.read('../app/js/streaming/MediaPlayer.js');
        var regex = /VERSION[\s*]=[\s*]"(\d.\d.\d)/g;
        var version = regex.exec(mediaPlayer)[1];
        var versionProp = 'VERSION=' + version;
        console.log(versionProp);

        grunt.file.write('../dist/version.properties', versionProp);
    });
};
