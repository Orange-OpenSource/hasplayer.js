module.exports = function(grunt) {
  grunt.initConfig({
    connect: {
      default_options: {}
    },
    watch: {},
    jshint: {
      all: ["app/js/*/**/*.js"],
      options: {
        jshintrc: ".jshintrc"
      }
    },
    uglify : {
      all : {
        options: {
          compress:{
            pure_funcs: [
              'self.debug.log',   /* set this function « no side effects » so  you can remove it ! */
              'this.debug.log',
              'rslt.debug.log'
            ],
            global_defs: {
              DEBUG: false        /* conditionned code by DEBUG will be remove at build */
            },
            drop_console : true,  /* remove console statements */
            drop_debugger: true,  /* remove debugger statements */
            warnings: true       /* display compress warnings (lines removal for example) */
          },
          banner: '/* Last build : @@TIMESTAMPTOREPLACE / git revision : @@REVISIONTOREPLACE */\n' /* add this line at dash.all.js start */
          // ,
          // beautify : {        /* to debug purpose : code is more human readable  */
          //   beautify : true
          // },
          // mangle: false       /* to debug purpose : variable names are unchanged */
        },
        files: {
          "dash.all.js" : [
            "./app/lib/q.js",
            "./app/lib/xml2json.js",
            "./app/lib/objectiron.js",
            "./app/lib/dijon.js",
            "./app/lib/Math.js",
            "./app/lib/long.js",
            "./app/lib/base64.js",
            "./app/lib/mp4lib/mp4lib.js",
            "./app/lib/mp4lib/mp4lib-boxes.js",
            "./app/lib/mp4lib/mp4lib-fieldProcessors.js",
            "./app/lib/mp4lib/mp4lib-fields.js",
            "./app/js/streaming/MediaPlayer.js",
            "./app/js/streaming/Context.js",
            "./app/js/dash/Dash.js",
            "./app/js/dash/DashContext.js",
            "./app/js/mss/Mss.js",
            "./app/js/custom/Custom.js",
            "./app/js/custom/di/CustomContext.js",
            "./app/js/*/**/*.js"]
        }
      }
    },
    jasmine: {
      tests: {
        src: [
            "./app/js/streaming/MediaPlayer.js",
            "./app/js/streaming/Context.js",
            "./app/js/dash/Dash.js",
            "./app/js/dash/DashContext.js",
            "./app/js/*/**/*.js"],

        options: {
          host: 'http://127.0.0.1:8000/',
          specs: [
            './test/js/dash/DashParser_Suite.js',
            './test/js/dash/FragmentExtensions_Suite.js',
            './test/js/dash/DashMetricsExtensions_Suite.js',
            './test/js/dash/DashMetricsConverter_Suite.js',
            './test/js/dash/DashManifestExtensions_Suite.js',
            './test/js/dash/DashManifestExtensionsNeg_Suite.js',
            './test/js/dash/DashHandler_Suite.js',
            './test/js/streaming/MediaPlayer_Suite.js',
            './test/js/streaming/Stream_Suite.js',
            './test/js/streaming/AbrController_Suite.js',
            './test/js/streaming/BufferController_Suite.js',
            './test/js/streaming/Capabilities_Suite.js',
            './test/js/streaming/MetricsModel_Suite.js',
            './test/js/streaming/FragmentController_Suite.js',
            './test/js/streaming/VideoModel_Suite.js',
            './test/js/streaming/ManifestLoader_Suite.js',
            './test/js/dash/BaseURLExtensions_Suite.js',
            './test/js/streaming/BufferExtensions_Suite.js',
            './test/js/streaming/Context_Suite.js',
            './test/js/streaming/DashMetricsConverter_Suite.js',
            './test/js/streaming/DashMetricsExtensions_Suite.js',
            './test/js/streaming/EventBus_Suite.js',
            './test/js/streaming/FragmentModel_Suite.js',
            './test/js/streaming/RequestScheduler_Suite.js',
            './test/js/streaming/Scenario_Suite.js',
            './test/js/streaming/StreamController_Suite.js',
            './test/js/streaming/TextTrackExtensions_Suite.js',
            './test/js/streaming/VideoModelExtensions_Suite.js'],
          vendor: [
            "./app/lib/jquery/js/jquery-1.8.3.min.js",
            "./app/lib/jquery/js/jquery-ui-1.9.2.custom.min.js",
            "./app/lib/q.min.js",
            "./app/lib/xml2json.js",
            "./app/lib/objectiron.js",
            "./app/lib/Math.js",
            "./app/lib/long.js",
            "./test/js/utils/MPDfiles.js",
            "./test/js/utils/Main.js",
            "./test/js/utils/ValidateUrl.js",
            "./app/lib/kendo/kendo.web.min.js",
            "./app/lib/dijon.js",
            "./app/lib/base64.js"],
          template : require('grunt-template-jasmine-istanbul'),
          templateOptions: {
            coverage: 'reports/coverage.json',
            report: 'reports/coverage'},
          junit: {
              path: grunt.option('jsunit-path'),
              consolidate: true
            }
        }
      }
    },
    revision: {
      options: {
        property: 'meta.revision',
        ref: 'development',
        short: true
      }
    },
    replace: {
      dist: {
        options: {
          patterns: [
            {
              match: 'REVISIONTOREPLACE',
              replacement: '<%= meta.revision %>'
            },
            {
              match: 'TIMESTAMPTOREPLACE',
              replacement: '<%= (new Date().getDate())+"."+(new Date().getMonth()+1)+"."+(new Date().getFullYear())+"_"+(new Date().getHours())+":"+(new Date().getMinutes())+":"+(new Date().getSeconds()) %>'
            }
          ]
        },
        files: [
          {expand: true, flatten: true, src: ['dash.all.js'], dest: ''}
        ]
      }
    }
  });

  // Require needed grunt-modules
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-jasmine');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-git-revision');
  grunt.loadNpmTasks('grunt-replace');


  // Define tasks
  grunt.registerTask('default', ['jshint','connect','jasmine','uglify','revision','replace']);
  grunt.registerTask('build', ['uglify','revision','replace']);
};
