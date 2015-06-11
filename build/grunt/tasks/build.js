module.exports = function(grunt) {

    grunt.config.set('rootpath',        '../');
    grunt.config.set('preprocesspath',  '../tmp/preprocess');
    grunt.config.set('path',            '../dist');
    grunt.config.set('samples',         '../samples');
    grunt.config.set('appDemoPlayer',   '../samples/DemoPlayer');
    grunt.config.set('app4Ever',        '../samples/4Ever');
    grunt.config.set('appDashif',       '../samples/Dash-IF');
    grunt.config.set('appABRTest',      '../samples/ABRTest/');

    grunt.registerTask('build', [
        'preprocess:multifile',     // Preprocess files
        'clean:start',              // Empty folder
        'copy',                     // Copy HTML files
        'replace:sourceByBuild',    // Replace source by call for hasplayer.js
        'replace:sourceForBuild',   // Prepare source file for hasplayer.js
        'targethtml',               // Take the list element only for the build in index.html
        'revision',                 // Get git info
        'useminPrepare',            // Get files in blocks tags
        'concat:generated',         // Merge all the files in one for each blocks
        'cssmin:generated',         // Minify the CSS in blocks (none)
        'uglify:generated',         // Uglify the JS in blocks
        'uglify:min',               // Minify the hasplayer.js into hasplayer.min.js
        'json',                     // Get the json files into a json.js
        'uglify:json',              // Minify the json.js file
        'concat:jsonToIndex',       // Merge the json.js file with index.js
        'usemin',                   // Replace the tags blocks by the result
        'htmlbuild:dist',           // Inline the CSS
        'htmlmin:main',             // Minify the HTML
        'replace:infos',            // Add the git info in files
        'replace:copyright',        // Add the copyright
        'replace:noCopyright',      // Remove tag from files where no copyright is needed
        'replace:chromecastId',     // Change to Online APP_ID for chromecast
        'clean:end'                 // Clean temp files
    ]);
};
