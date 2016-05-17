/**
 * The copyright in this software module is being made available under the BSD License, included below. This software module may be subject to other third party and/or contributor rights, including patent rights, and no such rights are granted under this license.
 * The whole software resulting from the execution of this software module together with its external dependent software modules from dash.js project may be subject to Orange and/or other third party rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2016, Orange
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * •  Neither the name of the Orange nor the names of its contributors may be used to endorse or promote products derived from this software module without specific prior written permission.
 *
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 * @constructs DebugController
 * @description A class which allow to download debug data on specific keybord shortcut
 */
MediaPlayer.utils.DebugController = function() {
    'use strict';
    
    // debug data configuration
    var debugData = {
        isInDebug:false,
        level:0,
        loggerType:'console'
    };
    
    var _handleKeyPressedEvent = function(e) {
        // if we press ctrl + alt + maj + z we activate debug mode
        if ((e.altKey === true) && (e.ctrlKey === true) && (e.shiftKey === true) &&
            ((e.keyCode === 68) || (e.keyCode === 90))) {
            if (debugData.isInDebug) {
                debugData.isInDebug = false;
                console.log("debug mode desactivated");
                if (e.keyCode === 90) {
                    _downloadDebug(this.debug.getLogger().getLogs());
                }
                this.debug.setLevel(debugData.level);
                this.debug.setLogger(debugData.loggerType);
            } else {
                debugData.isInDebug = true;
                console.log("debug mode activated");
                debugData.level = this.debug.getLevel();
                this.debug.setLevel((e.keyCode === 68) ? 4 : 3);
                this.debug.setLogger((e.keyCode === 68) ? 'console' : 'memory');
            }
        }
    };
    
    var _downloadDebug = function(array) {
        if (array && array.length > 0) {
            var filename = 'hasplayer_logs.txt',
                data = JSON.stringify(array, null, '\r\n'),
                blob = new Blob([data], {
                    type: 'text/json'
                });

            if (navigator.msSaveBlob) { // For IE10+ and edge
                navigator.msSaveBlob(blob, filename);
            } else {
                var e = document.createEvent('MouseEvents'),
                    a = document.createElement('a');
                a.download = filename;
                a.href = window.URL.createObjectURL(blob);
                a.dataset.downloadurl = ['text/json', a.download, a.href].join(':');
                e.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
                a.dispatchEvent(e);
            }
        }
    };
    

    return {
        debug: undefined,

        setup: function() {
            window.addEventListener('keydown', _handleKeyPressedEvent.bind(this));
        }
    };
};

MediaPlayer.utils.DebugController.prototype = {
    constructor: MediaPlayer.utils.DebugController
};