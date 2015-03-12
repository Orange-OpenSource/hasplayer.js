module.exports = function(grunt) {

    grunt.config.set('path',            '../dist');
    grunt.config.set('samples',         '../samples');
    grunt.config.set('appDemoPlayer',   '../samples/DemoPlayer');
    grunt.config.set('app4Ever',        '../samples/4Ever');
    grunt.config.set('appDashif',       '../samples/Dash-IF');
    grunt.config.set('appABRTest',      '../samples/ABRTest/');

    grunt.registerTask('source', [
        'replace:source'
    ]);
};