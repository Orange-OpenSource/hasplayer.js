/*
 * The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
 * 
 * Copyright (c) 2014, Orange
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * •  Neither the name of the Digital Primates nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
MediaPlayer.vo.Mp4Track = function () {
    "use strict";

    this.type = 'und';
    this.trackId = 0;
    this.timescale = 0;
    this.duration = 0;
    this.codecs = "";
    this.codecPrivateData = "";
    this.bandwidth = "";

    // Video related fields
    this.width = 0;
    this.height = 0;

    // Audio related fields
    this.language = 'und';
    this.channels = 0;
    this.samplingRate = 0;

    // Content protection
    this.contentProtection = undefined;

    // Samples description and data
    this.samples = [];
    this.data = null;
};

MediaPlayer.vo.Mp4Track.prototype = {
    constructor: MediaPlayer.vo.Mp4Track
};


MediaPlayer.vo.Mp4Track.Sample = function () {
    "use strict";

    this.dts = 0;
    this.cts = 0;
    this.duration = 0;
    this.flags = 0;
    this.data = null;
    this.size = 0;
};

MediaPlayer.vo.Mp4Track.Sample.prototype = {
    constructor: MediaPlayer.vo.Mp4Track.Sample
};

