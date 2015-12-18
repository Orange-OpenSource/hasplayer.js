'use strict';

module.exports = function(grunt) {


    grunt.config.init({
       useminPrepare: {
            options: {
              flow: {
                steps: {
                  js: ['concat', 'uglify']
                },
                post: {
                  js: [{
                    name: 'concat',
                            createConfig: function(context, block) {
                      context.options.generated = {};
                    }
                  },
                  {
                    name: 'uglify',
                    createConfig: function (context, block) {
                      context.options.generated = {};
                    }
                  }]
                }
              }
            }
          }
    });

	require('load-grunt-tasks')(grunt);
};