'use strict';
var gulp = require('gulp'),
    nopt = require('nopt');
// The actual option data.
var options = {};

var upperCase = function(obj) {
    var newObj = {};

    for (var name in obj) {
        newObj[name.toUpperCase()] = obj[name];
    }

    return newObj;
};

// Get or set an option value.
var option = gulp.option = module.exports = function(key, value) {
    key = key.toUpperCase();
    if (arguments.length === 2) {
        return (options[key] === value);
    } else {
        return options[key];
    }
};

// Initialize option data.
option.init = function(cmdLineArgs, defaultOptions) {
    
    options = defaultOptions || {};

    // Get options from command line arguments
    var cmdLineOptions = nopt(null, null, cmdLineArgs, 2);
    delete cmdLineOptions.argv;

    // Merge default options with command line options
    Object.assign(options, cmdLineOptions);

    // Set to upper case
    // (for comparison purpose and since some options are used in gulp for preprocessing task) 
    options = upperCase(options);

    return options;
};

option.all = function() {
    return options;
};