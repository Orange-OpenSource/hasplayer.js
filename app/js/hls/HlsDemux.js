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
Hls.dependencies.HlsDemux = function() {
    "use strict";

    var _appendArray = function(array1, array2) {
        var tmp = new Uint8Array(array1.byteLength + array2.byteLength);
        tmp.set(array1, 0);
        tmp.set(array2, array1.byteLength);
        return tmp;
    };

    var pat = null,
        pmt = null,
        pidToTrackId = [],
        tracks = [],
        baseDts = -1,
        dtsOffset = -1,

        getTsPacket = function(data, offset, pid, pusi) {
            var i = offset,
                tsPacket;

            while (i < data.length) {
                tsPacket = new mpegts.ts.TsPacket();
                tsPacket.parse(data.subarray(i, i + mpegts.ts.TsPacket.prototype.TS_PACKET_SIZE));

                //this.debug.log("[HlsDemux] TS packet: pid=" + tsPacket.getPid() + ", pusi = " + tsPacket.getPusi());

                if ((tsPacket.getPid() === pid) && ((pusi === undefined) || (tsPacket.getPusi() === pusi))) {
                    return {
                        offset: i,
                        packet: tsPacket
                    };
                }

                i += mpegts.ts.TsPacket.prototype.TS_PACKET_SIZE;
            }

            return null;
        },

        getPAT = function(data) {
            var tsPacket = getTsPacket.call(this, data, 0, mpegts.ts.TsPacket.prototype.PAT_PID);

            if (tsPacket === null) {
                return null;
            }


            pat = new mpegts.si.PAT();
            pat.parse(tsPacket.packet.getPayload());

            this.debug.log("[HlsDemux] PAT: PMT_PID=" + pat.getPmtPid());

            return pat;
        },

        getPMT = function(data, pid) {
            var tsPacket = getTsPacket.call(this, data, 0, pid),
                i = 0,
                trackIdCounter = 1, // start at 1;
                elementStream,
                track,
                streamTypeDesc;

            if (tsPacket === null) {
                return null;
            }

            pmt = new mpegts.si.PMT();
            pmt.parse(tsPacket.packet.getPayload());

            this.debug.log("[HlsDemux] PMT");

            for (i = 0; i < pmt.m_listOfComponents.length; i++) {
                elementStream = pmt.m_listOfComponents[i];
                track = new MediaPlayer.vo.Mp4Track();
                streamTypeDesc = pmt.gStreamTypes[elementStream.m_stream_type];
                if (streamTypeDesc !== null) {
                    track.streamType = streamTypeDesc.name;
                    switch (streamTypeDesc.value) {
                        case 0xE0:
                            track.type = "video";
                            break;
                        case 0xC0:
                            track.type = "audio";
                            break;
                        case 0xFC:
                            track.type = "data";
                            break;
                        default:
                            track.type = "und";
                    }
                } else {
                    this.debug.log("[HlsDemux] Stream Type " + elementStream.m_stream_type + " unknown!");
                }

                //if (track.type === "video") {
                track.timescale = mpegts.Pts.prototype.SYSTEM_CLOCK_FREQUENCY;
                track.pid = elementStream.m_elementary_PID;
                track.trackId = trackIdCounter;
                pidToTrackId[elementStream.m_elementary_PID] = trackIdCounter;
                tracks.push(track);
                trackIdCounter++;
                //}
            }

            return pmt;
        },

        demuxTsPacket = function(data) {
            var tsPacket,
                pid,
                trackId,
                track,
                sample = null,
                sampleData = null,
                pesPacket;

            tsPacket = new mpegts.ts.TsPacket();
            tsPacket.parse(data);

            // If packet has only adaptation field, then ignore
            if (tsPacket.hasAdaptationFieldOnly()) {
                return;
            }

            // Get PID and corresponding track
            pid = tsPacket.getPid();
            trackId = pidToTrackId[pid];
            if (trackId === undefined) {
                return;
            }

            // Get track from tracks array (trackId start from 1)
            track = tracks[trackId - 1];

            // PUSI => start storing new AU
            if (tsPacket.getPusi()) {

                // Parse PES header
                pesPacket = new mpegts.pes.PesPacket();
                pesPacket.parse(tsPacket.getPayload());

                // Store new access unit
                sample = new MediaPlayer.vo.Mp4Track.Sample();
                sample.cts = pesPacket.getPts().getValue();
                sample.dts = (pesPacket.getDts() !== null) ? pesPacket.getDts().getValue() : sample.cts;
                sample.size = 0;
                sample.duration = 0;
                sample.subSamples = [];

                if (baseDts === -1) {
                    baseDts = sample.dts;
                }
                sample.dts -= baseDts;
                sample.cts -= baseDts;

                sample.dts += dtsOffset;
                sample.cts += dtsOffset;

                // Store payload of PES packet as a subsample
                sampleData = pesPacket.getPayload();

                sample.subSamples.push(sampleData);
                track.samples.push(sample);
            } else {
                // Get currently buffered access unit
                if (track.samples.length > 0) {
                    sample = track.samples[track.samples.length - 1];
                }

                // Store payload of TS packet as a subsample
                sample.subSamples.push(tsPacket.getPayload());
            }
        },

        postProcess = function(track) {
            var sample,
                length = 0,
                offset = 0,
                subSamplesLength,
                i, s;

            // Determine total length of track samples data
            // Set samples duration and size
            for (i = 0; i < track.samples.length; i++) {
                subSamplesLength = 0;
                sample = track.samples[i];

                for (s = 0; s < sample.subSamples.length; s++) {
                    subSamplesLength += sample.subSamples[s].length;
                }

                if (i > 0) {
                    track.samples[i - 1].duration = track.samples[i].dts - track.samples[i - 1].dts;
                }

                sample.size = subSamplesLength;
                length += subSamplesLength;
            }
            track.samples[track.samples.length - 1].duration = track.samples[track.samples.length - 2].duration;

            // Allocate track data
            track.data = new Uint8Array(length);

            for (i = 0; i < track.samples.length; i++) {
                sample = track.samples[i];

                // Copy all sub-sample parts into track data
                for (s = 0; s < sample.subSamples.length; s++) {
                    track.data.set(sample.subSamples[s], offset);
                    offset += sample.subSamples[s].length;
                }
            }

            // In case of H.264 stream, convert bytestream to MP4 format (NALU size field instead of start codes)
            if (track.streamType.search('H.264') !== -1) {
                mpegts.h264.bytestreamToMp4(track.data);
            }

            // In case of AAC-ADTS stream, demultiplex ADTS frames into AAC frames
            if (track.streamType.search('ADTS') !== -1) {
                demuxADTS(track);
            }

        },

        demuxADTS = function(track) {
            var aacFrames,
                aacSamples = [],
                length,
                offset,
                data,
                sample,
                cts,
                duration,
                i;

            // Parse AAC-ADTS access units and get AAC frames description
            aacFrames = mpegts.aac.parseADTS(track.data);

            // And determine total length of AAC frames
            length = 0;
            for (i = 0; i < aacFrames.length; i++) {
                length += aacFrames[i].length;
            }

            // Allocate new data section that will contains all AAC frames
            data = new Uint8Array(length);

            // Store first sample info
            cts = track.samples[0].cts;

            // Determine sample duration
            duration = track.timescale * 1024.0 / track.samplingRate;

            // Copy AAC frames data and create AAC samples
            offset = 0;
            for (i = 0; i < aacFrames.length; i++) {
                // Create sample
                sample = new MediaPlayer.vo.Mp4Track.Sample();
                sample.cts = sample.dts = cts;
                sample.size = aacFrames[i].length;
                sample.duration = duration;
                aacSamples.push(sample);

                // Copy AAC frame data
                data.set(track.data.subarray(aacFrames[i].offset, aacFrames[i].offset + aacFrames[i].length), offset);
                offset += aacFrames[i].length;
            }

            // Replace track data
            track.data = data;

            // Replace track's AAC-ADTS samples by demultiplexed AAC samples
            track.samples = aacSamples;
        },

        arrayToHexString = function(array) {
            var str = "",
                i = 0,
                h = 0;

            for (i = 0; i < array.length; i++) {
                h = array[i].toString(16);
                if (h.length < 2) {
                    h = "0" + h;
                }
                str += h;
            }
            return str;
        },

        doInit = function(startTime) {
            pat = null;
            pmt = null;
            tracks = [];

            if (dtsOffset === -1) {
                dtsOffset = startTime;
            }
        },

        getTrackCodecInfo = function(data, track) {
            var tsPacket,
                pesPacket,
                esBytes,
                sequenceHeader,
                nalHeader,
                codecPrivateData,
                objectType,
                samplingFrequencyIndex;

            if (track.codecs !== "") {
                return track;
            }

            // Get first TS packet containing start of a PES/sample
            tsPacket = getTsPacket.call(this, data, 0, track.pid, true);

            // We have no packet of track's PID , need some more packets to get track info
            if (tsPacket === null) {
                return null;
            }

            // Get PES packet
            pesPacket = new mpegts.pes.PesPacket();
            pesPacket.parse(tsPacket.packet.getPayload());
            esBytes = pesPacket.getPayload();

            // H264
            if (track.streamType.search('H.264') !== -1) {
                sequenceHeader = mpegts.h264.getSequenceHeader(esBytes);

                while (sequenceHeader === null) {
                    tsPacket = getTsPacket.call(this, data, (tsPacket.offset + mpegts.ts.TsPacket.prototype.TS_PACKET_SIZE), track.pid, false);
                    esBytes = _appendArray(esBytes, tsPacket.packet.getPayload());
                    sequenceHeader = mpegts.h264.getSequenceHeader(esBytes);
                }

                track.codecPrivateData = arrayToHexString(sequenceHeader.bytes);
                track.codecs = "avc1.";

                // Extract from the CodecPrivateData field the hexadecimal representation of the following
                // three bytes in the sequence parameter set NAL unit.
                // => Find the SPS nal header
                nalHeader = /00000001[0-9]7/.exec(track.codecPrivateData);
                if (nalHeader && nalHeader[0]) {
                    // => Take the 6 characters after the SPS nalHeader (if it exists)
                    track.codecs += track.codecPrivateData.substr(track.codecPrivateData.indexOf(nalHeader[0]) + 10, 6);
                }

                // Extract width and height from SPS
                track.width = sequenceHeader.width;
                track.height = sequenceHeader.height;
            }

            // AAC
            if (track.streamType.search('AAC') !== -1) {
                codecPrivateData = mpegts.aac.getAudioSpecificConfig(esBytes);
                objectType = (codecPrivateData[0] & 0xF8) >> 3;
                track.codecPrivateData = arrayToHexString(codecPrivateData);
                track.codecs = "mp4a.40." + objectType;

                samplingFrequencyIndex = (codecPrivateData[0] & 0x07) << 1 | (codecPrivateData[1] & 0x80) >> 7;
                track.samplingRate = mpegts.aac.SAMPLING_FREQUENCY[samplingFrequencyIndex];
                track.channels = (codecPrivateData[1] & 0x78) >> 3;
                track.bandwidth = 0;
                /* code for HE AAC v2 to be tested
                var arr16 = new Uint16Array(2);
                arr16[0] = (codecPrivateData[0] << 8) + codecPrivateData[1];
                arr16[1] = (codecPrivateData[2] << 8) + codecPrivateData[3];
                //convert decimal to hex value
                var codecPrivateDataHex = arr16[0].toString(16)+arr16[1].toString(16);
                track.codecPrivateData = codecPrivateDataHex.toUpperCase();*/
            }

            this.debug.log("[HlsDemux][" + track.trackId + "] track codecPrivateData = " + track.codecPrivateData);
            this.debug.log("[HlsDemux][" + track.trackId + "] track codecs = " + track.codecs);

            return track;
        },

        doGetTracks = function(data) {
            var i = 0;
            // Parse PSI (PAT, PMT) if not yet received
            if (pat === null) {
                pat = getPAT.call(this, data);
                if (pat === null) {
                    return;
                }
            }

            if (pmt === null) {
                pmt = getPMT.call(this, data, pat.getPmtPid());
                if (pmt === null) {
                    return;
                }
            }

            // Get track information and remove tracks for which we did not manage to get codec information (no packet ?!)
            for (i = tracks.length - 1; i >= 0; i--) {
                getTrackCodecInfo.call(this, data, tracks[i]);
                if (tracks[i].codecs === "") {
                    tracks.splice(i, 1);
                }
            }

            return tracks;
        },

        doDemux = function(data) {
            var nbPackets = data.length / mpegts.ts.TsPacket.prototype.TS_PACKET_SIZE,
                i = 0;

            this.debug.log("[HlsDemux] Demux chunk, size = " + data.length + ", nb packets = " + nbPackets);

            // Get PAT, PMT and tracks information if not yet received
            if (doGetTracks.call(this, data) === null) {
                return null;
            }

            // If PMT not received, then unable to demux
            if (pmt === null) {
                return tracks;
            }

            // Clear current tracks' data
            for (i = 0; i < tracks.length; i++) {
                tracks[i].samples = [];
                tracks[i].data = null;
            }

            // Parse and demux TS packets
            i = 0;
            while (i < data.length) {
                demuxTsPacket.call(this, data.subarray(i, i + mpegts.ts.TsPacket.prototype.TS_PACKET_SIZE));
                i += mpegts.ts.TsPacket.prototype.TS_PACKET_SIZE;
            }

            // Re-assemble samples from sub-samples
            this.debug.log("[HlsDemux] Demux: baseDts = " + baseDts + ", dtsOffset = " + dtsOffset);
            for (i = 0; i < tracks.length; i++) {
                postProcess.call(this, tracks[i]);
                this.debug.log("[HlsDemux][" + tracks[i].trackId + "] Demux: 1st PTS = " + tracks[i].samples[0].dts + " (" + (tracks[i].samples[0].dts / 90000) + ")");
            }

            return tracks;
        };

    return {
        debug: undefined,
        reset: doInit,
        getTracks: doGetTracks,
        demux: doDemux
    };
};

Hls.dependencies.HlsDemux.prototype = {
    constructor: Hls.dependencies.HlsDemux
};