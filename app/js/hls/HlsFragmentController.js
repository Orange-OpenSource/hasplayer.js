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
Hls.dependencies.HlsFragmentController = function() {
    "use strict";
    var lastRequestQuality = null;

    var generateInitSegment = function(data) {
            var i = 0,
                manifest = rslt.manifestModel.getValue(),
                // Process the HLS chunk to get media tracks description
                tracks = rslt.hlsDemux.getTracks(new Uint8Array(data));

            // Add track duration
            for (i = 0; i < tracks.length; i += 1) {
                tracks[i].duration = manifest.mediaPresentationDuration;
            }
            // Generate init segment (moov)
            return rslt.mp4Processor.generateInitSegment(tracks);
        },

        generateMediaSegment = function(data) {
            // Process the HLS chunk to get media tracks description
            //var tracks = rslt.hlsDemux.getTracks(new Uint8Array(data));
            var i = 0,
                tracks = rslt.hlsDemux.demux(new Uint8Array(data));

            for (i = 0; i < tracks.length; i += 1) {
                if (tracks[i].type === "video") {
                    rslt.startTime = tracks[i].samples[0].cts / tracks[i].timescale;
                }
            }
            // Generate media segment (moov)
            return rslt.mp4Processor.generateMediaSegment(tracks, rslt.sequenceNumber);
        };

    var rslt = MediaPlayer.utils.copyMethods(MediaPlayer.dependencies.FragmentController);

    rslt.manifestModel = undefined;
    rslt.hlsDemux = undefined;
    rslt.mp4Processor = undefined;

    rslt.sequenceNumber = 1;

    rslt.segmentStartTime = null;

    rslt.process = function(bytes, request, representations) {
        var result = null,
            InitSegmentData = null,
            catArray = null;

        if ((bytes === null) || (bytes === undefined) || (bytes.byteLength === 0)) {
            return Q.when(bytes);
        }

        // Media segment => generate corresponding moof data segment from demultiplexed mpeg-2 ts chunk
        if (request && (request.type === "Media Segment") && representations && (representations.length > 0)) {
            if (lastRequestQuality === null || lastRequestQuality !== request.quality) {
                rslt.hlsDemux.reset(request.startTime * 90000);
                InitSegmentData = generateInitSegment(bytes);
                request.index = undefined;
                lastRequestQuality = request.quality;
            }

            result = generateMediaSegment(bytes);

            //new quality => append init segment + media segment in Buffer
            if (InitSegmentData !== null) {
                catArray = new Uint8Array(InitSegmentData.length + result.length);
                catArray.set(InitSegmentData, 0);
                catArray.set(result, InitSegmentData.length);
                result = catArray;
            }

            rslt.sequenceNumber++;
        }

        return Q.when(result);
    };

    rslt.getStartTime = function() {
        return rslt.startTime;
    };

    return rslt;
};

Hls.dependencies.HlsFragmentController.prototype = {
    constructor: Hls.dependencies.HlsFragmentController
};