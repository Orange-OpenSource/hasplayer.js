/*
 * The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Digital Primates
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * •  Neither the name of the Digital Primates nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
MediaPlayer.utils.Debug = function () {
    "use strict";

    var logToBrowserConsole = true,
        // ORANGE: add level
        NONE  = 0,
        ERROR = 1,
        WARN  = 2,
        INFO  = 3,
        DEBUG = 4,
        ALL   = 4,
        level = 4,
        showLogTimestamp = true,
        startTime = new Date().getTime(),

        _log = function (logLevel, args) {
            var self = this;
            if (getLogToBrowserConsole() && (logLevel <= getLevel())) {
                var _logger = getLogger(),
                    message = "",
                    logTime = null;

                if ((_logger === undefined) || (_logger === null)) {
                    _logger = console;
                }

                if (showLogTimestamp) {
                    logTime = new Date().getTime();
                    message += "[" + toHHMMSSmmm(logTime - startTime) + "] ";
                }

                Array.apply(null, args).forEach(function(item) {
                    message += item + " ";
                });

                switch (logLevel) {
                    case ERROR:
                        _logger.error(message);
                        break;
                    case WARN:
                        _logger.warn(message);
                        break;
                    case INFO:
                        _logger.info(message);
                        break;
                    case DEBUG:
                        _logger.debug(message);
                        break;
                }
            }

            self.eventBus.dispatchEvent({
                type: "log",
                message: arguments[0]
            });
        },

        toHHMMSSmmm = function (time) {
            var str,
                h,
                m,
                s,
                ms = time;

            h = Math.floor(ms / 3600000);
            ms -= (h * 3600000);
            m = Math.floor(ms / 60000);
            ms -= (m * 60000);
            s = Math.floor(ms / 1000);
            ms -= (s * 1000);

            if (h < 10) {h = "0"+h;}
            if (m < 10) {m = "0"+m;}
            if (s < 10) {s = "0"+s;}
            if (ms < 10) {ms = "0"+ms;}
            if (ms < 100) {ms = "0"+ms;}

            str = h+':'+m+':'+s+':'+ms;
            return str;
        },

        getLogToBrowserConsole = function() {
            return logToBrowserConsole;
        },

        getLevel = function() {
            return level;
        },

        getLogger = function () {
            var _logger = ('undefined' !== typeof(log4javascript)) ? log4javascript.getLogger() : null;
            if (_logger) {
                if(!_logger.initialized) {
                    var appender = new log4javascript.PopUpAppender();
                    var layout = new log4javascript.PatternLayout("%d{HH:mm:ss.SSS} %-5p - %m%n");
                    appender.setLayout(layout);
                    _logger.addAppender(appender);
                    _logger.setLevel(log4javascript.Level.ALL);
                    _logger.initialized = true;
                }
            }
            return _logger;
        };

    return {
        eventBus: undefined,

        // ORANGE: add level
        NONE:   NONE,
        ERROR:  ERROR,
        WARN:   WARN,
        INFO:   INFO,
        DEBUG:  DEBUG,
        ALL:    ALL,

        getLevel: getLevel,
        getLogToBrowserConsole: getLogToBrowserConsole,
        getLogger: getLogger,

        setLogToBrowserConsole: function(value) {
            logToBrowserConsole = value;
        },

        setLevel: function(value) {
            level  = value;
        },

        error: function () {
            _log.call(this, ERROR, arguments);
        },

        warn: function () {
            _log.call(this, WARN, arguments);
        },

        info: function () {
            _log.call(this, INFO, arguments);
        },

        // Keep this function for compatibility
        log: function () {
            _log.call(this, DEBUG, arguments);
        }
    };
};
