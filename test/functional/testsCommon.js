define(function(require) {

    var intern = require('intern');

    var seleniumConfigs = require('./config/selenium');
    var browsersConfig = require('./config/browsers');
    var applications = require('./config/applications');
    var testsConfig = require('./config/testsConfig');

    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Selenium configuration

    var seleniumConfig = seleniumConfigs.remote;

    var conf = {
        // Browsers to run integration testing against. Note that version numbers must be strings if used with Sauce
        // OnDemand. Options that will be permutated are browserName, version; any other
        // capabilities options specified for an environment will be copied as-is
        environments: browsersConfig.all,

        // Maximum number of simultaneous integration tests that should be executed on the remote WebDriver service
        maxConcurrency: 1,

        // Functional test suite(s) to run in each browser once non-functional tests are completed
        functionalSuites: [
            'test/functional/tests/play/play',
            'test/functional/tests/play/zapping',
            // 'test/functional/tests/play/seek',
            // 'test/functional/tests/play/seekDVR',
            // 'test/functional/tests/play/pause',
            // 'test/functional/tests/play/stop',
            // 'test/functional/tests/play/trickMode',
            // 'test/functional/tests/error/errorManifest',
            // 'test/functional/tests/api/getVideoBitrates',
            // 'test/functional/tests/api/getAudioLanguages',
            // 'test/functional/tests/api/getSubtitleLanguages',
            // 'test/functional/tests/api/getDuration',
            // 'test/functional/tests/api/isLive',
            // 'test/functional/tests/audio/setAudioLanguage',
            // 'test/functional/tests/subtitle/setSubtitleLanguage',
            // 'test/functional/tests/subtitle/changeSubtitleVisibility'
        ],

        // The amount of time, in milliseconds, an asynchronous test can run before it is considered timed out. By default this value is 30 seconds.
        defaultTimeout: 60000,

        // A regular expression matching URLs to files that should not be included in code coverage analysis
        excludeInstrumentation : /^tests|test|node_modules/
    };

    // Selenium configuration from command line

    if (intern.args.selenium) {
        seleniumConfig = seleniumConfigs[intern.args.selenium];
    }

    if (intern.args.browsers) {
        conf.environments = browsersConfig[intern.args.browsers];
    }

    conf = Object.assign(conf, seleniumConfig);

    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Tests configuration parameters

    // Tests configuration from command line

    // application=<development|master>
    testsConfig.testPage = intern.args.application ? [applications.DashIF[intern.args.application]] : [applications.DashIF.development];

    // drm=<true|false>
    testsConfig.drm = intern.args.drm ? (intern.args.drm !== 'false') : true;

    return conf;
});
