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

    Date.prototype.HHMMSSmmm = function() {

        var h = this.getHours().toString(),
            m = this.getMinutes().toString(),
            s = this.getSeconds().toString(),
            ms = this.getSeconds().toString(),
            HH = h[1] ? h : "0" + h[0],
            MM = m[1] ? m : "0" + m[0],
            SS = s[1] ? s : "0" + s[0],
            mmm = ms[2] ? ms : "0" + (ms[1] ? ms : "0" + ms[0]);

        return HH + ":" + MM + ":" + SS + "." + mmm;
    };

    Date.prototype.MMSSmmm = function() {

        var m = this.getMinutes().toString(),
            s = this.getSeconds().toString(),
            ms = this.getSeconds().toString(),
            MM = m[1] ? m : "0" + m[0],
            SS = s[1] ? s : "0" + s[0],
            mmm = ms[2] ? ms : "0" + (ms[1] ? ms : "0" + ms[0]);

        return MM + ":" + SS + "." + mmm;
    };

    var logToBrowserConsole = true,
        // ORANGE: add level
        NONE  = 0,
        ERROR = 1,
        WARN  = 2,
        INFO  = 3,
        DEBUG = 4,
        ALL   = 4,
        level = 4,
        showTimestamp = true,
        showElapsedTime = false,
        startTime = new Date(),

        _log = function (logLevel, args) {
            var self = this;
            if (getLogToBrowserConsole() && (logLevel <= getLevel())) {
                var _logger = getLogger(),
                    message = "",
                    logTime = null;

                if ((_logger === undefined) || (_logger === null)) {
                    _logger = console;
                }

                if (showTimestamp) {
                    logTime = new Date();
                    message += "[" + logTime.HHMMSSmmm() + "]";
                }

                if (showElapsedTime) {
                    message += "[" + new Date(logTime - startTime).MMSSmmm() + "]";
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

        getLogToBrowserConsole = function() {
            return logToBrowserConsole;
        },

        getLevel = function() {
            return level;
        },

        getLogger = function () {
            var _logger = null;//('undefined' !== typeof(log4javascript)) ? log4javascript.getLogger() : null;
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
