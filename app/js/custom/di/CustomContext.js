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
 Custom.di.CustomContext = function () {
    "use strict";

    return {
        system : undefined,
           
        setup : function () {
            //call parent setup
            Custom.di.CustomContext.prototype.setup.call(this);

            // erase the "parser" with CustomParser.
            this.system.mapClass('parser', Custom.dependencies.CustomParser);
            // Then, our parser will choose which parser call between Dash, Mss and Hls. To do that, it need references
            this.system.mapClass('dashParser', Dash.dependencies.DashParser);
            this.system.mapClass('mssParser', Mss.dependencies.MssParser);

            // creation of a context manager to plug some specific parts of the code
            this.system.mapSingleton('contextManager', Custom.modules.ContextManager);
            
            // here replace dash or streaming modules by ours
            this.system.mapClass('fragmentLoader', Custom.dependencies.CustomFragmentLoader);
            this.system.mapSingleton('metricsModel', Custom.models.CustomMetricsModel);
            this.system.mapSingleton('metricsExt', Custom.dependencies.CustomMetricsExtensions);
            this.system.mapClass('metrics', Custom.models.CustomMetricsList);
            this.system.mapSingleton('abrController', Custom.dependencies.CustomAbrController);
            this.system.mapClass('bufferController', Custom.dependencies.CustomBufferController);
            this.system.mapSingleton('sourceBufferExt', Custom.dependencies.CustomSourceBufferExtensions);
            this.system.mapSingleton('debug', Custom.utils.CustomDebug);
            this.system.mapSingleton('config', MediaPlayer.utils.Config);

            // overload ABR rules
            this.system.mapClass('downloadRatioRule', Custom.rules.CustomDownloadRatioRule);

            // plug message handler. When the message is notify, the contextManager is called
            this.system.mapHandler('setContext', 'contextManager', 'setContext');
        }
    };
};

Custom.di.CustomContext.prototype = new Dash.di.DashContext();
Custom.di.CustomContext.prototype.constructor = Custom.di.CustomContext;
