'use strict';
var gulp = require('gulp'),
    nopt = require('nopt');
// The actual option data.
var data = {};

var uppCase = function(obj) {
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
        return (data[key] = value);
    } else {
        return data[key];
    }
};

// Initialize option data.
option.init = function(obj, defaultParams) {
    data = nopt(null, null, obj, 2);
    delete data.argv;
    if (defaultParams) {
        data = Object.assign(data, defaultParams);
    }
    data = uppCase(data);
    return data;
};

option.all = function() {
    return data;
};