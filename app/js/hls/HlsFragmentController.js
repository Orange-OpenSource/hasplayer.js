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

    var decryptionInfos = {},

        generateMediaSegment = function(data, request) {
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

            var t = new Date();

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
            rslt.debug.log("[HlsFragmentController] decrypted chunk (" + (((new Date()).getTime() - t.getTime()) / 1000).toFixed(3) + "s.)");

            return decrypter.decrypt(data);
        },

        loadDecryptionKey = function(decryptionInfo) {
            var deferred = Q.defer();

            this.debug.log("[HlsFragmentController]", "Load decryption key: " + decryptionInfo.uri);
            var xhr = new MediaPlayer.dependencies.XHRLoader();
            // Do not retry for encrypted key, we assume the key file has to be present if playlist if present
            xhr.initialize('arraybuffer', 0, 0);
            xhr.load(decryptionInfo.uri).then(
                function (request) {
                    decryptionInfo.key = new Uint8Array(request.response);
                    deferred.resolve();
                },
                function(request) {
                    if (!request || request.aborted) {
                        deferred.reject();
                    } else {
                        deferred.reject({
                            name: MediaPlayer.dependencies.ErrorHandler.prototype.DOWNLOAD_ERR_MANIFEST,
                            message: "Failed to download HLS decryption key",
                            data: {
                                url: decryptionInfo.uri,
                                status: request.status
                            }
                        });
                    }
                }
            );

            return deferred.promise;
        },

        decryptSegment = function(bytes, request) {
            var deferred = Q.defer(),
                decryptionInfo,
                self = this;

            if (!request.decryptionInfo || request.decryptionInfo.method === "NONE") {
                deferred.resolve(bytes);
                return deferred.promise;
            }

            // check if decryption key has not been already downloaded
            // if (!manifest.decryptionInfos) {
            //     manifest.decryptionInfos = {};
            // }
            decryptionInfo = decryptionInfos[request.decryptionInfo.uri];
            if (decryptionInfo) {
                deferred.resolve(decrypt.call(this, bytes, decryptionInfo));
            } else {
                decryptionInfo = request.decryptionInfo;
                loadDecryptionKey.call(this, decryptionInfo).then(
                    function() {
                        decryptionInfos[decryptionInfo.uri] = decryptionInfo;
                        deferred.resolve(decrypt.call(self, bytes, decryptionInfo));
                    },
                    function (e) {
                        deferred.reject(e);
                    }
                );
            }

            return deferred.promise;
        };

    var rslt = MediaPlayer.utils.copyMethods(MediaPlayer.dependencies.FragmentController);

    rslt.manifestModel = undefined;
    rslt.hlsDemux = undefined;
    rslt.mp4Processor = undefined;

    rslt.process = function(bytes, request/*, representation*/) {
        var deferred = Q.defer(),
            result = null;

        if ((bytes === null) || (bytes === undefined) || (bytes.byteLength === 0)) {
            deferred.resolve(null);
            return deferred.promise;
        }

        // Media segment => generate corresponding moof data segment from demultiplexed MPEG2-TS chunk
        if (request && (request.type === "Media Segment")) {
                // Decrypt the segment if encrypted
                decryptSegment.call(rslt, bytes, request).then(function(data) {
                    //console.saveBinArray(data, request.url.substring(request.url.lastIndexOf('/') + 1));
                    try {
                        // Generate media segment (moof)
                        result = generateMediaSegment(data, request);
                        rslt.sequenceNumber++;
                        deferred.resolve(result);
                    } catch (e) {
                        deferred.reject(e);
                    }
                }, function (e) {
                    deferred.reject(e);
                });

        } else {
            deferred.resolve(result);
        }

        //return result;
        return deferred.promise;
    };

    return rslt;
};

Hls.dependencies.HlsFragmentController.prototype = {
    constructor: Hls.dependencies.HlsFragmentController
};