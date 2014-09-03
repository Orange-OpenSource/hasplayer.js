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
MediaPlayer.utils.Logger = function () {
    "use strict";

    //var container = document.querySelector(".dash-video-player video");
    //var container = document.getElementById("logs");
    //console.log(container);
    var _logger = ('undefined' !== typeof(log4javascript)) ? log4javascript.getLogger() : null;
    var appender = null;
    var logToBrowserConsole = true;
    var _debug = function(){
        if(_logger){
            _logger.debug.apply(_logger,arguments);
        }else{
            console.debug.apply(console,arguments);
        }
    };

    var _error = function(){
        if(_logger){
            _logger.error.apply(_logger,arguments);
        }else{
            console.error.apply(console,arguments);
        }
    };

    var _addAppender = function(){
        if('undefined' !== typeof(log4javascript)){
            appender = new log4javascript.PopUpAppender();
            var layout = new log4javascript.PatternLayout("%d{HH:mm:ss.SSS} %-5p - %m%n");
            appender.setLayout(layout);
            _logger.addAppender(appender);
            _logger.setLevel(log4javascript.Level.ALL);
        }
    };

    var _info = function(){
        if(_logger){
            _logger.info.apply(_logger,arguments);
        }else{
            console.info.apply(console,arguments);
        }
    };

    var _trace = function(){
        if(_logger){
            _logger.trace.apply(_logger,arguments);
        }else{
            console.trace.apply(console,arguments);
        }
    };

    //var appender = new log4javascript.InPageAppender(container);
    //var layout = new log4javascript.PatternLayout("%d{HH:mm:ss.SSS} %-5p - %m%n");
    //appender.setLayout(layout);
    //_logger.addAppender(appender);
    return {
        debug:_debug,
        error: _error,
        addAppender:_addAppender,
        info:_info,
        trace:_trace,
        eventBus:undefined,
        setLogToBrowserConsole: function(value) {
            logToBrowserConsole = value;
        },
        getLogToBrowserConsole: function() {
            return logToBrowserConsole;
        },
        log: function (message) {
            if (logToBrowserConsole){
                console.log(message);
            }

            this.eventBus.dispatchEvent({
                type: "log",
                message: message
            });
        }
    };
};

MediaPlayer.utils.Logger.prototype = {
    constructor: MediaPlayer.utils.Logger
};