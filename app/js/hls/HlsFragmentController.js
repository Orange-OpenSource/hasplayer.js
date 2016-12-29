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

    var generateMediaSegment = function(data, request) {
            var i = 0,
                // Demultiplex HLS chunk to get samples
                tracks = rslt.hlsDemux.demux(new Uint8Array(data), request);

            // Update fragment start time (=tfdt)
            for (i = 0; i < tracks.length; i += 1) {
                if (tracks[i].type === "video") {
                    request.startTime = tracks[i].samples[0].dts / tracks[i].timescale;
                }
            }

            // Generate init (moov) and media segment (moof)
            return rslt.mp4Processor.generateInitMediaSegment(tracks);
        },

        createInitializationVector = function(segmentNumber) {
            var uint8View = new Uint8Array(16),
                i = 0;

            for (i = 12; i < 16; i++) {
                uint8View[i] = (segmentNumber >> 8 * (15 - i)) & 0xff;
            }

            return uint8View;
        },

        decrypt = function(data, decryptionInfo) {

            var view = new DataView(decryptionInfo.key.buffer);
            var key = new Uint32Array([
                view.getUint32(0),
                view.getUint32(4),
                view.getUint32(8),
                view.getUint32(12)
            ]);

            view = new DataView(createInitializationVector(decryptionInfo.iv).buffer);
            var iv = new Uint32Array([
                view.getUint32(0),
                view.getUint32(4),
                view.getUint32(8),
                view.getUint32(12)
            ]);

            var decrypter = new Hls.dependencies.AES128Decrypter(key, iv);
            return decrypter.decrypt(data);
        };

    var rslt = MediaPlayer.utils.copyMethods(MediaPlayer.dependencies.FragmentController);

    rslt.manifestModel = undefined;
    rslt.hlsDemux = undefined;
    rslt.mp4Processor = undefined;

    rslt.process = function(bytes, request, representations) {
        var result = null;

        if ((bytes === null) || (bytes === undefined) || (bytes.byteLength === 0)) {
            return bytes;
        }

        // Media segment => generate corresponding moof data segment from demultiplexed MPEG2-TS chunk
        if (request && (request.type === "Media Segment") && representations && (representations.length > 0)) {

            // Decrypt the segment if encrypted
            if (request.decryptionInfo && request.decryptionInfo.method !== "NONE") {
                var t = new Date();
                bytes = decrypt(bytes, request.decryptionInfo);
                rslt.debug.log("[HlsFragmentController] decrypted chunk (" + (((new Date()).getTime() - t.getTime()) / 1000).toFixed(3) + "s.)");
                //console.saveBinArray(bytes, request.url.substring(request.url.lastIndexOf('/') + 1));
            }

            // Generate media segment (moof)
            result = generateMediaSegment(bytes, request);

            rslt.sequenceNumber++;
        }

        return result;
    };

    return rslt;
};

Hls.dependencies.HlsFragmentController.prototype = {
    constructor: Hls.dependencies.HlsFragmentController
};