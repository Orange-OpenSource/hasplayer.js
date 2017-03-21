define(function(require) {

    var intern = require('intern');

    var seleniumConfigs = require('./config/selenium');
    var browsersConfig = require('./config/browsers');
    var applications = require('./config/applications');
    var testsConfig = require('./config/testsConfig');
    var testsSuites = require('./config/testsSuites');

    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Selenium configuration

    var seleniumConfig = seleniumConfigs.remote;

    var conf = {
        // Browsers to run integration testing against. Note that version numbers must be strings if used with Sauce
        // OnDemand. Options that will be permutated are browserName, version, platform, and platformVersion; any other
        // capabilities options specified for an environment will be copied as-is
        environments: browsersConfig.all,

        // Maximum number of simultaneous integration tests that should be executed on the remote WebDriver service
        maxConcurrency: 1,

        // Functional test suite(s) to run in each browser once non-functional tests are completed
        functionalSuites: testsSuites.all,

        // The amount of time, in milliseconds, an asynchronous test can run before it is considered timed out. By default this value is 30 seconds.
        defaultTimeout: 60000,

        // A regular expression matching URLs to files that should not be included in code coverage analysis
        excludeInstrumentation : /^tests|bower_components|node_modules|testIntern/,
    };

    // Selenium configuration from command line
    if (intern.args.selenium) {
        seleniumConfig = seleniumConfigs[intern.args.selenium];
    }

    if (intern.args.browsers) {
        var browsers = intern.args.browsers.split('&');

        conf.environments = [];
        browsers.forEach(function(browser) {
            conf.environments = conf.environments.concat(browsersConfig[browser]);
        });
    }

    if(intern.args.tests) {
        var tests = intern.args.tests.split('&');

        conf.functionalSuites = [];
        tests.forEach(function(test) {
            conf.functionalSuites = conf.functionalSuites.concat(testsSuites[test]);
        });
    }

    conf = Object.assign(conf, seleniumConfig);
    // console.log("Selenium configuration:\n", conf);


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Tests configuration parameters

    // Tests configuration from command line

    // application=<development|master>
    testsConfig.testPage = intern.args.application ? [applications.DashIF[intern.args.application]] : [applications.DashIF.development];

    // drm=<true|false>
    testsConfig.drm = intern.args.drm ? (intern.args.drm !== 'false') : true;

    return conf;
});
