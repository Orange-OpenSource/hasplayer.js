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
            ms = this.getMilliseconds().toString(),
            HH = h[1] ? h : "0" + h[0],
            MM = m[1] ? m : "0" + m[0],
            SS = s[1] ? s : "0" + s[0],
            mmm = ms[2] ? ms : "0" + (ms[1] ? ms : "0" + ms[0]);

        return HH + ":" + MM + ":" + SS + "." + mmm;
    };

    Date.prototype.MMSSmmm = function() {

        var m = this.getMinutes().toString(),
            s = this.getSeconds().toString(),
            ms = this.getMilliseconds().toString(),
            MM = m[1] ? m : "0" + m[0],
            SS = s[1] ? s : "0" + s[0],
            mmm = ms[2] ? ms : "0" + (ms[1] ? ms : "0" + ms[0]);

        return MM + ":" + SS + "." + mmm;
    };

    // MemoryLogger definition

    var MemoryLogger = function(){
        // array to store logs
        this.logArray= [];
        // boolean to set leve in message
        this.showLevel = true;
    };


    MemoryLogger.prototype.error =
    MemoryLogger.prototype.warn = 
    MemoryLogger.prototype.info =
    MemoryLogger.prototype.debug  = function(message){
        this.logArray.push(message);
    };

    MemoryLogger.prototype.getLogs = function(){
        return this.logArray;
    };

    // ORANGE: add level
    var NONE  = 0,
        ERROR = 1,
        WARN  = 2,
        INFO  = 3,
        DEBUG = 4,
        ALL   = 4,
        level = 0,
        showTimestamp = true,
        showElapsedTime = false,
        startTime = new Date(),
        // default logger set to console
        _logger = console,

        _log = function (logLevel, args) {
            if (logLevel <= getLevel()) {

                var message = _prepareLog(logLevel, args);

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

        },

        _prepareLog = function(logLevel, args){
            var message = "",
                logTime = null;

            if (showTimestamp) {
                logTime = new Date();
                message += "[" + logTime.HHMMSSmmm() + "]";
            }

            if(_logger && _logger.showLevel){
                 message += "["+_getStringLevel(logLevel)+"]";
            }

            if (showElapsedTime) {
                message += "[" + new Date(logTime - startTime).MMSSmmm() + "]";
            }

            Array.apply(null, args).forEach(function(item) {
                message += item + " ";
            });

            return message;
        },

        _getStringLevel = function(level){
            switch(level){
                case ERROR:
                return "ERROR";
                case WARN:
                return "WARN";
                case INFO:
                return "INFO";
                case DEBUG:
                return "DEBUG";
                default:
                return "";
            }
        },

        getLevel = function() {
            return level;
        },

        getLogger = function () {
            return _logger;
        };

    return {
        
        // ORANGE: add level
        NONE:   NONE,
        ERROR:  ERROR,
        WARN:   WARN,
        INFO:   INFO,
        DEBUG:  DEBUG,
        ALL:    ALL,

        getLevel: getLevel,
        getLogger: getLogger,

        setLevel: function(value) {
            level  = value;
        },

        setLogger: function(type){
           switch(type){
                case 'log4javascript' :
                    var appender = new log4javascript.PopUpAppender();
                    var layout = new log4javascript.PatternLayout("%d{HH:mm:ss.SSS} %-5p - %m%n");
                    appender.setLayout(layout);
                    _logger.addAppender(appender);
                    _logger.setLevel(log4javascript.Level.ALL);
                    _logger.initialized = true;
                break;

                case 'memory':
                    _logger = new MemoryLogger();
                break;

                case 'console':
                    _logger = console;
                break;

                default:
                    _logger = null;
           }
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
