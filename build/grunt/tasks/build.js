module.exports = function(grunt) {

    grunt.config.set('rootpath',        '../');
    grunt.config.set('preprocesspath',  '../build/.tmp/preprocess');
    grunt.config.set('path',            '../dist');
    grunt.config.set('samples',         '../samples');
    grunt.config.set('appDemoPlayer',   '../samples/DemoPlayer');
    grunt.config.set('appDashif',       '../samples/Dash-IF');

    grunt.registerTask('build_hasplayer', [
        'clean:distDir',            // Empty <%= path %> folder
        'preprocess:multifile',     // Preprocess some source files
        'replace:sourceForBuild',   // Use preprocessed files instead of the original ones
        'targethtml:hasplayer',     // Take the list element only for the build in index.html
        'revision',                 // Get git revision info
        'useminPrepare:hasplayer',  // Get sources files list from specified blocks in playerSrc.html
        'concat:generated',         // Merge all the sources files in one for each block
        'cssmin:generated',         // Minify the CSS in blocks
        //'umd:all',                  // package in universal module definition
        'uglify:generated',         // Uglify the JS in blocks
        'replace:infos',            // Add the git info in files
        'replace:copyright',        // Add the copyright
        'uglify:min',               // Minify the hasplayer.js into hasplayer.min.js
        'clean:tmpFiles'            // Remove temporary files
    ]);

    grunt.registerTask('build_dashif_sample', [
        'copy:dashif',               // Copy HTML files
        'replace:sourceByBuild',     // Replace sources by call to hasplayer.js
        'targethtml:dashif',         // Take the list element only for the build in index.html
        'revision',                  // Get git revision info
        'useminPrepare:dashif',      // Get sources files list from specified blocks in index.html
        'concat:generated',          // Merge all the files in one for each blocks
        'uglify:generated',          // Uglify the JS in blocks
        'cssmin:generated',          // Minify the CSS in blocks
        'json:main',                 // Get the json files into a json.js
        'uglify:json',               // Minify the json.js file
        'concat:jsonToIndex',        // Append json files to application js file
        'usemin:playerSrc',          // Replace the tags blocks by the result
        'usemin:dashif',             // Replace the tags blocks by the result
        'htmlbuild:dist',            // Inline the CSS
        'htmlmin:main',              // Minify the HTML
        'replace:dashifInfos',       // Add the git info in files
        'replace:dashifNoCopyright', // Remove tag from files where no copyright is needed
        'replace:chromecastId',      // Change to Online APP_ID for chromecast
        'clean:tmpFiles'             // Remove temporary files
    ]);
};
