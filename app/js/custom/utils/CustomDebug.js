/*
 * The copyright in this software module is being made available under the BSD License, included below. This software module may be subject to other third party and/or contributor rights, including patent rights, and no such rights are granted under this license.
 * The whole software resulting from the execution of this software module together with its external dependent software modules from dash.js project may be subject to Orange and/or other third party rights, including patent rights, and no such rights are granted under this license.
 * 
 * Copyright (c) 2014, Orange
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * •  Neither the name of the Orange nor the names of its contributors may be used to endorse or promote products derived from this software module without specific prior written permission.
 * 
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
Custom.utils.CustomDebug = function () {
    "use strict";

    var rslt = Custom.utils.copyMethods(MediaPlayer.utils.Debug);

    rslt.getLogger = function () {
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

    rslt._log = function (level, args) {
        if (this.getLogToBrowserConsole() && DEBUG) {
            var _logger = this.getLogger();
            if ((_logger === undefined) || (_logger === null)) {
                _logger = console;
            }

            switch (level) {
                case "error":
                    _logger.error.apply(_logger, args);
                    break;
                case "warn":
                    _logger.warn.apply(_logger, args);
                    break;
                case "info":
                    _logger.info.apply(_logger, args);
                    break;
                case "debug":
                    _logger.debug.apply(_logger, args);
                    break;
            }
        }
        this.eventBus.dispatchEvent({
            type: "log",
            message: arguments[0]
        });
    };

    rslt.error = function () {
        this._log("error", arguments);
    };

    rslt.warn = function () {
        this._log("warn", arguments);
    };

    rslt.info = function () {
        this._log("info", arguments);
    };

    rslt.trace = function () {
        this._log("debug", arguments);
    };


    // Keep this function for compatibility
    rslt.log = function () {
        if (this.getLogToBrowserConsole() && DEBUG) {
            var _logger = this.getLogger();
            if (_logger) {
                _logger.debug.apply(_logger, arguments);
                
            } else {
                console.debug.apply(console, arguments);
            }
        }
        this.eventBus.dispatchEvent({
            type: "log",
            message: arguments[0]
        });
    };

    return rslt;
};

