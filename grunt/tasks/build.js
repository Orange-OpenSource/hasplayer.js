module.exports = function(grunt) {

	grunt.config.set('path', 'build');
	grunt.config.set('orangeApps', 'samples');
	grunt.config.set('appDemoPlayer', 'samples/DemoPlayer');
	grunt.config.set('app4Ever', 'samples/4Ever');
	grunt.config.set('appDashif', 'samples/Dash-IF');
	grunt.config.set('appABRTest', 'samples/ABRTest/');
	
    

	grunt.registerTask('build', [
    'clean:start',            //empty folder
    'copy',                   //copy HTML files
    'replace:sourceByBuild',  //replace source by call for hasplayer.js
    'replace:sourceForBuild', //prepare source file for hasplayer.js
    'targethtml',             //Take the list element only for the build in index.html
    'revision',               //get git info
    'useminPrepare',          //get files in blocks tags
    'concat:generated',       //merge all the files in one for each blocks
    'cssmin:generated',       //minify the CSS in blocks (none)
    'uglify:generated',       //minify the JS in blocks
    'json',                   //get the json files into a json.js
    'uglify:json',            //minify the json.js file
    'concat:jsonToIndex',     //merge the json.js file with index.js
    'usemin',                 //replace the tags blocks by the result
    'htmlbuild:dist',         //inline the CSS
    'htmlmin:main',           //Minify the HTML
    'replace:infos',          //Add the git info in files
    'replace:copyright',      //Add the copyright
    'replace:noCopyright',    //Remove tag from files where no copyright is needed
    'replace:chromecastId',   //Change to Online APP_ID for chromecast
    'clean:end'               //Clean temp files
    ]);

};