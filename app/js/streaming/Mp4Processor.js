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
MediaPlayer.dependencies.Mp4Processor = function() {
    "use strict";

    ///////////////////////////////////////////////////////////////////////////////////////////
    // MOOV
    ///////////////////////////////////////////////////////////////////////////////////////////

    var createMovieHeaderBox = function(tracks) {

            // Movie Header Box
            // This box defines overall information which is media-independent, and relevant to the
            // entire presentation considered as a whole.

            // Create MovieHeader box (mvhd)
            var mvhd = new mp4lib.boxes.MovieHeaderBox(),
                track = tracks[tracks.length - 1]; // take last track to determine get track id

            mvhd.version = 1; // version = 1  in order to have 64bits duration value
            mvhd.creation_time = 0; // the creation time of the presentation => ignore (set to 0)
            mvhd.modification_time = 0; // the most recent time the presentation was modified => ignore (set to 0)
            mvhd.timescale = track.timescale; // the time-scale for the entire presentation => take timescale of current adaptationSet
            mvhd.duration = Math.round(track.duration * track.timescale); // the length of the presentation (in the indicated timescale) =>  take duration of period
            mvhd.rate = 0x00010000; // 16.16 number, "1.0" = normal playback
            mvhd.volume = 0x0100; // 8.8 number, "1.0" = full volume
            mvhd.reserved = 0;
            mvhd.reserved_2 = [0x0, 0x0];
            mvhd.matrix = [0x00010000, 0x0, 0x0, 0x0, 0x00010000, 0x0, 0x0, 0x0, 0x40000000]; // provides a transformation matrix for the video; (u,v,w) are restricted here to (0,0,1),
            // hex values (0,0,0x40000000)
            mvhd.pre_defined = [0x0, 0x0, 0x0, 0x0, 0x0, 0x0];
            mvhd.next_track_ID = track.trackId + 1; // indicates a value to use for the track ID of the next track to be added to this presentation
            mvhd.flags = 0; //default value

            return mvhd;
        },

        createTrackBox = function(track) {

            // Track Box: This is a container box for a single track of a presentation
            // Track Header Box: This box specifies the characteristics of a single track
            var trak,
                tkhd,
                mdia;

            // Create Track box (trak)
            trak = new mp4lib.boxes.TrackBox();

            // Create and add TrackHeader box (trak)
            tkhd = new mp4lib.boxes.TrackHeaderBox();

            tkhd.version = 1; // version = 1  in order to have 64bits duration value
            tkhd.flags = 0x1 | 0x2 | 0x4; //Track_enabled: Indicates that the track is enabled. Flag value is 0x000001. A disabled track (the low
            //bit is zero) is treated as if it were not present.
            //Track_in_movie: Indicates that the track is used in the presentation. Flag value is 0x000002.
            //Track_in_preview: Indicates that the track is used when previewing the presentation. Flag value is 0x000004.
            tkhd.creation_time = 0; // the creation time of the presentation => ignore (set to 0)
            tkhd.modification_time = 0; // the most recent time the presentation was modified => ignore (set to 0)
            tkhd.track_id = track.trackId; // uniquely identifies this track over the entire life-time of this presentation
            tkhd.reserved = 0;
            tkhd.duration = Math.round(track.duration * track.timescale); // the duration of this track (in the timescale indicated in the Movie Header Box) =>  take duration of period
            tkhd.reserved_2 = [0x0, 0x0];
            tkhd.layer = 0; // specifies the front-to-back ordering of video tracks; tracks with lower numbers are closer to the viewer => 0 since only one video track
            tkhd.alternate_group = 0; // specifies a group or collection of tracks => ignore
            tkhd.volume = 0x0100; // 8.8 number, "1.0" = full volume
            tkhd.reserved_3 = 0;
            tkhd.matrix = [0x00010000, 0x0, 0x0, 0x0, 0x00010000, 0x0, 0x0, 0x0, 0x40000000]; // provides a transformation matrix for the video; (u,v,w) are restricted here to (0,0,1),
            tkhd.width = track.width << 16; // visual presentation size as fixed-point 16.16 values
            tkhd.height = track.height << 16; // visual presentation size as fixed-point 16.16 values

            trak.boxes.push(tkhd);

            //Create container for the track information in a track (mdia)
            mdia = new mp4lib.boxes.MediaBox();

            //Create and add Media Header Box (mdhd)
            mdia.boxes.push(createMediaHeaderBox(track));

            //Create and add Handler Reference Box (hdlr)
            mdia.boxes.push(createHandlerReferenceBox(track));

            //Create and add Media Information Box (minf)
            mdia.boxes.push(createMediaInformationBox(track));

            trak.boxes.push(mdia);

            return trak;
        },

        getLanguageCode = function(language) {

            // Declares the language code for this track. See ISO 639-2/T for the set of three character
            // codes. Each character is packed as the difference between its ASCII value and 0x60. Since the code
            // is confined to being three lower-case letters, these values are strictly positive.
            var firstLetterCode,
                secondLetterCode,
                thirdLetterCode,
                result = 0;

            // If lang member is define, get it. if not language is 'und'
            // If current adaptation is video type, return 'und'.
            // var language = adaptation.lang ? adaptation.lang : 'und' ;

            // Return value is packed on 15 bits, each character is defined on 5 bits
            // there is a padding value to align on 16 bits
            firstLetterCode = (language.charCodeAt(0) - 96) << 10; //96 decimal base = 0x60
            secondLetterCode = (language.charCodeAt(1) - 96) << 5;
            thirdLetterCode = language.charCodeAt(2) - 96;

            result = firstLetterCode | secondLetterCode | thirdLetterCode;

            return result;
        },

        createMediaHeaderBox = function(track) {

            // mdhd : The media header declares overall information that is media-independent, and relevant to characteristics of
            // the media in a track.
            var mdhd = new mp4lib.boxes.MediaHeaderBox();

            mdhd.flags = 0;
            mdhd.version = 1; // version = 1  in order to have 64bits duration value
            mdhd.creation_time = 0; // the creation time of the presentation => ignore (set to 0)
            mdhd.modification_time = 0; // the most recent time the presentation was modified => ignore (set to 0)
            mdhd.timescale = track.timescale; // the time-scale for the entire presentation => take timescale of current adaptationSet
            mdhd.duration = Math.round(track.duration * track.timescale); //integer that declares the duration of this media (in the scale of the timescale). If the
            //duration cannot be determined then duration is set to all 1s.
            mdhd.pad = 0; // padding for language value
            mdhd.language = getLanguageCode(track.language);

            mdhd.pre_defined = 0; // default value

            return mdhd;
        },

        stringToCharCode = function(str) {
            var code = 0,
                i;

            for (i = 0; i < str.length; i += 1) {
                code |= str.charCodeAt(i) << ((str.length - i - 1) * 8);
            }
            return code;
        },

        createHandlerReferenceBox = function(track) {

            // This box within a Media Box declares the process by which the media-data in the track is presented, and thus,
            // the nature of the media in a track. For example, a video track would be handled by a video handler. 
            var hdlr = new mp4lib.boxes.HandlerBox();

            hdlr.version = 0; // default value version = 0 
            hdlr.pre_defined = 0; //default value.
            switch (track.type) {
                case 'video':
                    hdlr.handler_type = stringToCharCode(hdlr.HANDLERTYPEVIDEO);
                    hdlr.name = hdlr.HANDLERVIDEONAME;
                    break;
                case 'audio':
                    hdlr.handler_type = stringToCharCode(hdlr.HANDLERTYPEAUDIO);
                    hdlr.name = hdlr.HANDLERAUDIONAME;
                    break;
                default:
                    hdlr.handler_type = stringToCharCode(hdlr.HANDLERTYPETEXT);
                    hdlr.name = hdlr.HANDLERTEXTNAME;
            }
            hdlr.name += '\0';
            hdlr.reserved = [0x0, 0x0, 0x0]; //default value
            hdlr.flags = 0; //default value

            return hdlr;
        },

        createMediaInformationBox = function(track) {

            // This box contains all the objects that declare characteristic information of the media in the track.
            var minf = new mp4lib.boxes.MediaInformationBox();

            //Create and add the adapted media header box (vmhd, smhd or nmhd) for audio, video or text.
            switch (track.type) {
                case 'video':
                    minf.boxes.push(createVideoMediaHeaderBox(track));
                    break;
                case 'audio':
                    minf.boxes.push(createSoundMediaHeaderBox(track));
                    break;
                default:
                    //minf.boxes.push(createNullMediaHeaderBox(track));
            }

            //Create and add Data Information Box (dinf)
            minf.boxes.push(createDataInformationBox(track));

            //Create and add Sample Table Box (stbl)
            minf.boxes.push(createSampleTableBox(track));

            return minf;

        },

        createDataInformationBox = function() {
            var dinf,
                dref,
                url;

            // The data information box contains objects that declare the location of the media information in a track.
            dinf = new mp4lib.boxes.DataInformationBox();

            // The data reference object contains a table of data references (normally URLs) that declare the location(s) of
            // the media data used within the presentation
            dref = new mp4lib.boxes.DataReferenceBox();

            dref.version = 0; // is an integer that specifies the version of this box default = 0
            dref.entry_count = 1; // is an integer that counts the actual entries
            dref.flags = 0; // default value

            // The DataEntryBox within the DataReferenceBox shall be either a DataEntryUrnBox or a DataEntryUrlBox.           
            // (not used, but mandatory)
            url = new mp4lib.boxes.DataEntryUrlBox();
            url.location = "";
            url.version = 0;
            url.flags = 1;

            //add data Entry Url Box in data Reference box
            dref.boxes.push(url);

            //add data Reference Box in data information box
            dinf.boxes.push(dref);

            return dinf;
        },

        createDecodingTimeToSampleBox = function() {

            // This box contains a compact version of a table that allows indexing from decoding time to sample number.

            var stts = new mp4lib.boxes.TimeToSampleBox();

            stts.version = 0; // is an integer that specifies the version of this box. default value = 0
            stts.entry_count = 0; // is an integer that gives the number of entries in the following table. not used in fragmented content
            stts.flags = 0; // default value = 0

            stts.entry = [];

            return stts;
        },

        createSampleToChunkBox = function() {

            // Samples within the media data are grouped into chunks.
            var stsc = new mp4lib.boxes.SampleToChunkBox();

            stsc.flags = 0;
            stsc.version = 0; // is an integer that specifies the version of this box. default value = 0.
            stsc.entry_count = 0; // is an integer that gives the number of entries in the following table

            stsc.entry = [];

            return stsc;
        },

        createChunkOffsetBox = function() {

            // The chunk offset table gives the index of each chunk into the containing file
            var stco = new mp4lib.boxes.ChunkOffsetBox();

            stco.version = 0; // is an integer that specifies the version of this box. default value = 0
            stco.entry_count = 0; // is an integer that gives the number of entries in the following table
            stco.flags = 0; // default value

            stco.chunk_offset = [];

            return stco;
        },

        createSampleSizeBox = function() {

            // This box contains the sample count and a table giving the size in bytes of each sample. This allows the media
            // data itself to be unframed. The total number of samples in the media is always indicated in the sample count.
            var stsz = new mp4lib.boxes.SampleSizeBox();

            stsz.version = 0; // default value = 0
            stsz.flags = 0; //default value = 0
            stsz.sample_count = 0; //is an integer that gives the number of samples in the track; if sample-size is 0, then it is
            //also the number of entries in the following table         
            stsz.sample_size = 0; //is integer specifying the default sample size.

            return stsz;
        },

        _hexstringtoBuffer = function(a) {
            var res = new Uint8Array(a.length / 2),
                i;

            for (i = 0; i < a.length / 2; i += 1) {
                res[i] = parseInt("" + a[i * 2] + a[i * 2 + 1], 16);
            }
            return res;
        },

        _mergeArrays = function(oldBuffer, newPart) {
            var res = new Uint8Array(oldBuffer.length + newPart.length);
            res.set(oldBuffer, 0);
            res.set(newPart, oldBuffer.length);
            return res;
        },

        createAVCConfigurationBox = function(track) {
            var avcC,
                NALDatabuffer,
                codecPrivateData,
                NALArray,
                SPS_index,
                PPS_index,
                i,
                NALBuffer,
                tempBuffer,
                regexpSPS = new RegExp("^[A-Z0-9]7", "gi"),
                regexpPPS = new RegExp("^[A-Z0-9]8", "gi");

            //Create an AVC Configuration Box
            avcC = new mp4lib.boxes.AVCConfigurationBox();

            avcC.configurationVersion = 1; //unsigned int(8) configurationVersion = 1;
            avcC.lengthSizeMinusOne = 3; //indicates the length in bytes of the NALUnitLength field in an AVC video
            //sample or AVC parameter set sample of the associated stream minus one

            avcC.reserved = 0x3F; //bit(6) reserved = ‘111111’b;

            avcC.SPS_NAL = []; //SPS NAL Array
            avcC.PPS_NAL = []; //PPS NAL Array

            NALDatabuffer = new Uint8Array(0);

            codecPrivateData = track.codecPrivateData;

            NALArray = codecPrivateData.split("00000001");

            NALArray.splice(0, 1);

            SPS_index = 0;
            PPS_index = 0;
            for (i = 0; i < NALArray.length; i += 1) {
                NALBuffer = _hexstringtoBuffer(NALArray[i]);

                if (NALArray[i].match(regexpSPS)) {
                    avcC.SPS_NAL[SPS_index++] = {
                        "NAL_length": NALBuffer.length,
                        "NAL": NALBuffer
                    };
                    avcC.AVCProfileIndication = parseInt(NALArray[i].substr(2, 2), 16); //contains the profile code as defined in ISO/IEC 14496-10.
                    avcC.profile_compatibility = parseInt(NALArray[i].substr(4, 2), 16); //is a byte defined exactly the same as the byte which occurs between the
                    //profile_IDC and level_IDC in a sequence parameter set (SPS), as defined in ISO/IEC 14496-10.
                    avcC.AVCLevelIndication = parseInt(NALArray[i].substr(6, 2), 16); //contains the level code as defined in ISO/IEC 14496-10.
                }
                if (NALArray[i].match(regexpPPS)) {
                    avcC.PPS_NAL[PPS_index++] = {
                        "NAL_length": NALBuffer.length,
                        "NAL": NALBuffer
                    };
                }

                tempBuffer = new Uint8Array(NALBuffer.length + 4);
                tempBuffer[3] = NALBuffer.length;
                tempBuffer.set(NALBuffer, 4);

                NALDatabuffer = _mergeArrays(NALDatabuffer, tempBuffer);
            }
            avcC.numOfSequenceParameterSets = SPS_index; // number of SPSs that are used as the initial set of SPSs for decoding the AVC elementary stream.
            avcC.numOfPictureParameterSets = PPS_index; // number of PPSs that are used as the initial set of PPSs for decoding the AVC elementary stream.

            return avcC;
        },

        createAVCVisualSampleEntry = function(track) {
            var avc1 = null;

            //An AVC visual sample entry shall contain an AVC Configuration Box
            if (track.contentProtection !== undefined) {
                avc1 = new mp4lib.boxes.EncryptedVideoBox();
            } else {
                avc1 = new mp4lib.boxes.AVC1VisualSampleEntryBox();
            }

            avc1.data_reference_index = 1; //To DO... ??
            avc1.compressorname = "AVC Coding"; //is a name, for informative purposes. It is formatted in a fixed 32-byte field, with the first
            //byte set to the number of bytes to be displayed, followed by that number of bytes of displayable data,
            //and then padding to complete 32 bytes total (including the size byte). The field may be set to 0.
            avc1.depth = 0x0018; //takes one of the following values 0x0018 – images are in colour with no alpha.
            avc1.reserved = [0x0, 0x0, 0x0, 0x0, 0x0, 0x0]; //default value = 0
            avc1.reserved_2 = 0; //default value = 0
            avc1.reserved_3 = 0; //default value = 0
            avc1.pre_defined = 0; //unsigned int(16) pre_defined = 0;
            avc1.pre_defined_2 = [0x0, 0x0, 0x0]; //unsigned int(32)[3] pre_defined = 0;
            avc1.pre_defined_3 = 65535; //int(16) pre_defined = -1;
            avc1.frame_count = 1; //template unsigned int(16) frame_count = 1;indicates how many frames of compressed video are stored in each sample. The default is
            //1, for one frame per sample; it may be more than 1 for multiple frames per sample
            avc1.horizresolution = 0x00480000; // 72 dpi
            avc1.vertresolution = 0x00480000; // 72 dpi

            avc1.height = track.height; //are the maximum visual width and height of the stream described by this sample
            avc1.width = track.width; //description, in pixels

            //create and add AVC Configuration Box (avcC)
            avc1.boxes.push(createAVCConfigurationBox(track));

            if (track.contentProtection !== undefined) {
                // create and add Protection Scheme Info Box
                avc1.boxes.push(createProtectionSchemeInfoBox(track));
            }

            return avc1;
        },

        createOriginalFormatBox = function(track) {
            var frma = new mp4lib.boxes.OriginalFormatBox();
            frma.data_format = stringToCharCode(track.codecs.substring(0, track.codecs.indexOf('.')));
            return frma;
        },

        createSchemeTypeBox = function() {
            var schm = new mp4lib.boxes.SchemeTypeBox();

            schm.flags = 0;
            schm.version = 0;
            schm.scheme_type = 0x63656E63; //'cenc' => common encryption
            schm.scheme_version = 0x00010000; // version set to 0x00010000 (Major version 1, Minor version 0)

            return schm;
        },

        createSchemeInformationBox = function(track) {
            var schi = new mp4lib.boxes.SchemeInformationBox();

            //create and add Track Encryption Box
            schi.boxes.push(createTrackEncryptionBox(track));

            return schi;
        },

        createTrackEncryptionBox = function(track) {
            var tenc = new mp4lib.boxes.TrackEncryptionBox();

            tenc.flags = 0; //default value
            tenc.version = 0; //default value

            tenc.default_IsEncrypted = 0x1; //default value
            tenc.default_IV_size = 8; //default value, NA => à préciser
            tenc.default_KID = (track.contentProtection && (track.contentProtection.length) > 0 && track.contentProtection[0]["cenc:default_KID"]) ?
                track.contentProtection[0]["cenc:default_KID"] :
                [0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0];

            return tenc;
        },

        createProtectionSchemeInfoBox = function(track) {
            //create Protection Scheme Info Box
            var sinf = new mp4lib.boxes.ProtectionSchemeInformationBox();

            //create and add Original Format Box => indicate codec type of the encrypted content         
            sinf.boxes.push(createOriginalFormatBox(track));

            //create and add Scheme Type box            
            sinf.boxes.push(createSchemeTypeBox());

            //create and add Scheme Information Box
            sinf.boxes.push(createSchemeInformationBox(track));

            return sinf;
        },

        createVisualSampleEntry = function(track) {
            var codec = track.codecs.substring(0, track.codecs.indexOf('.'));

            switch (codec) {
                case "avc1":
                    return createAVCVisualSampleEntry(track);
                default:
                    throw {
                        name: MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_ERR_CODEC_UNSUPPORTED,
                        message: "Codec is not supported",
                        data: {
                            codec: codec
                        }
                    };
            }
        },

        parseHexString = function(str) {
            var bytes = [];
            while (str.length >= 2) {
                bytes.push(parseInt(str.substring(0, 2), 16));
                str = str.substring(2, str.length);
            }

            return bytes;
        },

        createMPEG4AACESDescriptor = function(track) {
            var audioSpecificConfig,
                dsiLength,
                decoderSpecificInfo,
                dcdLength,
                decoderConfigDescriptor,
                esdLength,
                esDescriptor;

            // AudioSpecificConfig
            // defined in ISO/IEC 14496-3, subpart 1
            // => AudioSpecificConfig corresponds to hex bytes contained in "codecPrivateData" field
            audioSpecificConfig = parseHexString(track.codecPrivateData);

            // DecoderSpecificInfo
            // defined in ISO/IEC 14496-1 (Systems), extends a BaseDescriptor
            dsiLength = audioSpecificConfig.length;
            decoderSpecificInfo = new Uint8Array(2 + dsiLength); // 2 = tag + size bytes
            decoderSpecificInfo[0] = 0x05; // bit(8), tag=0x05 (DecSpecificInfoTag)
            decoderSpecificInfo[1] = dsiLength; // bit(8), size
            decoderSpecificInfo.set(audioSpecificConfig, 2); // AudioSpecificConfig bytes

            // DecoderConfigDescriptor
            // defined in ISO/IEC 14496-1 (Systems), extends a BaseDescriptor
            dcdLength = 13 + decoderSpecificInfo.length; // 2 = tag + size bytes
            decoderConfigDescriptor = new Uint8Array(2 + dcdLength);
            decoderConfigDescriptor[0] = 0x04; // bit(8), tag=0x04 (DecoderConfigDescrTag)
            decoderConfigDescriptor[1] = dcdLength; // bit(8), size
            decoderConfigDescriptor[2] = 0x40; // bit(8), objectTypeIndication=0x40 (MPEG-4 AAC)
            decoderConfigDescriptor[3] = 0x05 << 2; // bit(6), streamType=0x05 (Audiostream)
            decoderConfigDescriptor[3] |= 0 << 1; // bit(1), upStream=0
            decoderConfigDescriptor[3] |= 1; // bit(1), reserved=1
            decoderConfigDescriptor[4] = 0xFF; // bit(24), buffersizeDB=undefined
            decoderConfigDescriptor[5] = 0xFF; // ''
            decoderConfigDescriptor[6] = 0xFF; // ''
            decoderConfigDescriptor[7] = (track.bandwidth & 0xFF000000) >> 24; // bit(32), maxBitrate=undefined
            decoderConfigDescriptor[8] = (track.bandwidth & 0x00FF0000) >> 16; // ''
            decoderConfigDescriptor[9] = (track.bandwidth & 0x0000FF00) >> 8; // ''
            decoderConfigDescriptor[10] = (track.bandwidth & 0x000000FF); // ''
            decoderConfigDescriptor[11] = (track.bandwidth & 0xFF000000) >> 24; // bit(32), avgbitrate
            decoderConfigDescriptor[12] |= (track.bandwidth & 0x00FF0000) >> 16; // '' 
            decoderConfigDescriptor[13] |= (track.bandwidth & 0x0000FF00) >> 8; // ''
            decoderConfigDescriptor[14] |= (track.bandwidth & 0x000000FF); // ''
            decoderConfigDescriptor.set(decoderSpecificInfo, 15); // DecoderSpecificInfo bytes

            // ES_Descriptor
            // defined in ISO/IEC 14496-1 (Systems), extends a BaseDescriptor
            esdLength = 3 + decoderConfigDescriptor.length;
            esDescriptor = new Uint8Array(2 + esdLength); // 2 = tag + size bytes
            esDescriptor[0] = 0x03; // bit(8), tag=0x03 (ES_DescrTag)
            esDescriptor[1] = esdLength; // bit(8), size
            esDescriptor[2] = (track.trackId & 0xFF00) >> 8; // bit(16), ES_ID=track_id
            esDescriptor[3] = (track.trackId & 0x00FF); // ''
            esDescriptor[4] = 0; // bit(8), flags and streamPriority
            esDescriptor.set(decoderConfigDescriptor, 5); // decoderConfigDescriptor bytes

            return esDescriptor;
        },

        createMP4AudioSampleEntry = function(track) {
            var mp4a = null,
                esdBox,
                ES_Descriptor;

            if (track.contentProtection !== undefined) {
                mp4a = new mp4lib.boxes.EncryptedAudioBox();
            } else {
                mp4a = new mp4lib.boxes.MP4AudioSampleEntryBox();
            }

            // SampleEntry fields
            mp4a.reserved = [0x0, 0x0, 0x0, 0x0, 0x0, 0x0];
            mp4a.data_reference_index = 1; // ??

            // AudioSampleEntry fields
            mp4a.reserved_2 = [0x0, 0x0]; // default value = 0
            mp4a.channelcount = track.channels; // number of channels
            mp4a.samplesize = 16; // default value = 16
            mp4a.pre_defined = 0; // default value = 0
            mp4a.reserved_3 = 0; // default value = 0
            mp4a.samplerate = track.samplingRate << 16; // sampling rate, as fixed-point 16.16 values

            esdBox = new mp4lib.boxes.ESDBox();
            ES_Descriptor = createMPEG4AACESDescriptor(track);
            esdBox.ES_tag = ES_Descriptor[0];
            esdBox.ES_length = ES_Descriptor[1];
            esdBox.ES_data = ES_Descriptor.subarray(2, ES_Descriptor.length);
            esdBox.version = 0;
            esdBox.flags = 0;

            // MP4AudioSampleEntry fields
            mp4a.boxes.push(esdBox);

            if (track.contentProtection !== undefined) {
                // create and add Protection Scheme Info Box
                mp4a.boxes.push(createProtectionSchemeInfoBox(track));
            }

            return mp4a;
        },

        createAudioSampleEntry = function(track) {
            var codec = track.codecs.substring(0, track.codecs.indexOf('.'));

            switch (codec) {
                case "mp4a":
                    return createMP4AudioSampleEntry(track);
                default:
                    throw {
                        name: MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_ERR_CODEC_UNSUPPORTED,
                        message: "Codec is not supported",
                        data: {
                            codec: codec
                        }
                    };
            }

            return null;
        },

        createSampleDescriptionBox = function(track) {

            //The sample description table gives detailed information about the coding type used, and any initialization
            //information needed for that coding.
            var stsd = new mp4lib.boxes.SampleDescriptionBox();
            stsd.version = 0;
            stsd.flags = 0;

            switch (track.type) {
                case "video":
                    stsd.boxes.push(createVisualSampleEntry(track));
                    break;
                case "audio":
                    stsd.boxes.push(createAudioSampleEntry(track));
                    break;
                default:
                    //NAN : To do add text entry
                    break;
            }

            return stsd;
        },

        createSampleTableBox = function(track) {

            //The sample table contains all the time and data indexing of the media samples in a track. Using the tables
            //here, it is possible to locate samples in time, determine their type (e.g. I-frame or not), and determine their
            //size, container, and offset into that container.
            var stbl = new mp4lib.boxes.SampleTableBox();

            //create and add Decoding Time to Sample Box (stts)
            stbl.boxes.push(createDecodingTimeToSampleBox(track));

            //create and add Sample to Chunk Box (stsc)
            stbl.boxes.push(createSampleToChunkBox(track));

            //create and add Chunk Offset Box (stco)
            stbl.boxes.push(createChunkOffsetBox(track));

            //create and add Sample Size Box (stsz)
            stbl.boxes.push(createSampleSizeBox(track));

            //create and add Sample Description Box (stsd)
            stbl.boxes.push(createSampleDescriptionBox(track));

            return stbl;
        },

        createVideoMediaHeaderBox = function() {
            //The video media header contains general presentation information, independent of the coding, for video
            //track. Note that the flags field has the value 1.
            var vmhd = new mp4lib.boxes.VideoMediaHeaderBox();

            vmhd.version = 0; //default value, is an integer that specifies the version of this box
            vmhd.flags = 1; //default value
            vmhd.graphicsmode = 0; //specifies a composition mode for this video track, from the following enumerated set,
            //which may be extended by derived specifications: copy = 0 copy over the existing image
            vmhd.opcolor = [0x0, 0x0, 0x0]; //is a set of 3 colour values (red, green, blue) available for use by graphics modes
            //default value opcolor = {0, 0, 0};

            return vmhd;
        },

        createSoundMediaHeaderBox = function() {

            //The sound media header contains general presentation information, independent of the coding, for audio
            //track. This header is used for all tracks containing audio
            var smhd = new mp4lib.boxes.SoundMediaHeaderBox();

            smhd.version = 0; //default value, is an integer that specifies the version of this box
            smhd.balance = 0; //is a fixed-point 8.8 number that places mono audio tracks in a stereo space; 0 is centre (the
            //normal value); full left is -1.0 and full right is 1.0.
            smhd.reserved = 0;
            smhd.flags = 1;

            return smhd;
        },

        /*createNullMediaHeaderBox = function () {
            //NAN non défini dans mp4lib, à définir
            //var nmhd = new NullMediaHeaderBox();
            //return nmhd;
        },*/

        createFileTypeBox = function() {

            //create a File Type Box
            var ftyp = new mp4lib.boxes.FileTypeBox();

            ftyp.major_brand = 1769172790; // is a brand identifier iso6 => decimal ASCII value for iso6
            ftyp.minor_brand = 1; // is an informative integer for the minor version of the major brand
            ftyp.compatible_brands = []; //is a list, to the end of the box, of brands isom, iso6 and msdh
            ftyp.compatible_brands[0] = 1769172845; // => decimal ASCII value for isom
            ftyp.compatible_brands[1] = 1769172790; // => decimal ASCII value for iso6
            ftyp.compatible_brands[2] = 1836278888; // => decimal ASCII value for msdh

            return ftyp;
        },

        createMovieExtendsBox = function(tracks) {
            var mvex,
                //mehd,
                trex,
                track = tracks[tracks.length - 1],
                i;

            // Create Movie Extends Box (mvex) 
            // This box warns readers that there might be Movie Fragment Boxes in this file
            mvex = new mp4lib.boxes.MovieExtendsBox();

            // Create Movie Extends Header Box (mehd)
            // The Movie Extends Header is optional, and provides the overall duration, including fragments, of a fragmented
            // movie. If this box is not present, the overall duration must be computed by examining each fragment.
            // mehd is optional
            /*if (track.duration !== Number.POSITIVE_INFINITY) {
                mehd = new mp4lib.boxes.MovieExtendsHeaderBox();
                mehd.version = 1;
                mehd.flags = 0;
                mehd.fragment_duration = Math.round(track.duration * track.timescale); // declares length of the presentation of the whole movie including fragments
                
                //add mehd box in mvex box
                mvex.boxes.push(mehd);
            }*/

            for (i = 0; i < tracks.length; i += 1) {
                track = tracks[i];
                // Create Track Extend Box (trex), exactly one for each track in the movie box
                // This sets up default values used by the movie fragments. By setting defaults in this way, space and
                // complexity can be saved in each Track Fragment Box.
                trex = new mp4lib.boxes.TrackExtendsBox();
                trex.version = 0;
                trex.flags = 0;
                trex.track_ID = track.trackId; // identifies the track; this shall be the track ID of a track in the Movie Box
                trex.default_sample_description_index = 1; // Set default value 
                trex.default_sample_duration = 0; // ''
                trex.default_sample_flags = 0; // ''
                trex.default_sample_size = 0; // ''

                // add trex box in mvex box
                mvex.boxes.push(trex);
            }

            return mvex;
        },

        createProtectionSystemSpecificHeaderBox = function(keySystems) {
            var psshs = [],
                pssh_bytes,
                pssh,
                i;

            for (i = 0; i < keySystems.length; i += 1) {
                pssh_bytes = new Uint8Array(keySystems[i].initData);
                pssh = new mp4lib.boxes.ProtectionSystemSpecificHeaderBox();
                pssh.read(pssh_bytes, 8, pssh_bytes.length); // 8: skip box length and type fields
                psshs.push(pssh);
            }

            return psshs;
        },

        doGenerateInitSegment = function(tracks) {
            var moov_file,
                moov,
                supportedKS,
                i;

            // Create file
            moov_file = new mp4lib.boxes.File();

            // Create Movie box (moov) 
            moov = new mp4lib.boxes.MovieBox();

            // Create and add MovieHeader box (mvhd)
            moov.boxes.push(createMovieHeaderBox(tracks));

            for (i = 0; i < tracks.length; i += 1) {
                // Create and add Track box (trak)
                moov.boxes.push(createTrackBox(tracks[i]));
            }

            // Create and add MovieExtends box (mvex)
            moov.boxes.push(createMovieExtendsBox(tracks));

            // Create and add Protection System Specific Header box (pssh)
            for (i = 0; i < tracks.length; i++) {
                if (tracks[i].contentProtection !== undefined) {
                    supportedKS = this.protectionExt.getSupportedKeySystemsFromContentProtection(tracks[i].contentProtection);
                    moov.boxes.push.apply(moov.boxes, createProtectionSystemSpecificHeaderBox(supportedKS));
                }
            }

            moov_file.boxes.push(createFileTypeBox());

            moov_file.boxes.push(moov);

            return mp4lib.serialize(moov_file);
        },

        ///////////////////////////////////////////////////////////////////////////////////////////
        // MOOF
        ///////////////////////////////////////////////////////////////////////////////////////////

        createMovieFragmentHeaderBox = function(sequenceNumber) {

            // Movie Fragment Header Box
            // The movie fragment header contains a sequence number, as a safety check. The sequence number usually
            // starts at 1 and must increase for each movie fragment in the file, in the order in which they occur. This allows
            // readers to verify integrity of the sequence; it is an error to construct a file where the fragments are out of
            // sequence.
            var mfhd = new mp4lib.boxes.MovieFragmentHeaderBox();

            mfhd.version = 0;
            mfhd.flags = 0;
            mfhd.sequence_number = sequenceNumber;

            return mfhd;
        },

        createTrackFragmentBox = function(track) {

            // Track Fragment Box
            // Within the movie fragment there is a set of track fragments, zero or more per track. The track fragments in
            // turn contain zero or more track runs, each of which document a contiguous run of samples for that track.
            // Within these structures, many fields are optional and can be defaulted.
            var traf = new mp4lib.boxes.TrackFragmentBox();

            traf.version = 0;
            traf.flags = 0;

            // Add Track Fragment Header box (tfhd)
            traf.boxes.push(createTrackFragmentHeaderBox(track));

            // Add Track Fragment Decode Time box (tfdt)
            traf.boxes.push(createTrackFragmentBaseMediaDecodeTimeBox(track));

            // Add Track Fragment Run box (trun)
            traf.boxes.push(createTrackFragmentRunBox(track));

            return traf;
        },

        createTrackFragmentHeaderBox = function(track) {

            // Track Fragment Header Box
            // Each movie fragment can add zero or more fragments to each track; and a track fragment can add zero or
            // more contiguous runs of samples. The track fragment header sets up information and defaults used for those
            // runs of samples.
            var tfhd = new mp4lib.boxes.TrackFragmentHeaderBox();

            tfhd.version = 0;
            tfhd.flags = //0x000008 | // default-sample-duration-present
            //0x000010 | // default-sample-size-present
            0x020000; // default-base-is-moof

            tfhd.track_ID = track.trackId;
            //tfhd.default_sample_duration = 0;
            //tfhd.default_sample_size = 0;

            return tfhd;
        },

        createTrackFragmentBaseMediaDecodeTimeBox = function(track) {

            // Track Fragment Base Media Decode Time Box
            // The Track Fragment Base Media Decode Time Box provides the absolute decode time, measured on the
            // media timeline, of the first sample in decode order in the track fragment. This can be useful, for example,
            // when performing random access in a file; it is not necessary to sum the sample durations of all preceding
            // samples in previous fragments to find this value (where the sample durations are the deltas in the Decoding
            // Time to Sample Box and the sample_durations in the preceding track runs).
            // The Track Fragment Base Media Decode Time Box, if present, shall be positioned after the Track Fragment
            // Header Box and before the first Track Fragment Run box.

            var tfdt = new mp4lib.boxes.TrackFragmentBaseMediaDecodeTimeBox();

            tfdt.version = 1; // baseMediaDecodeTime on 64 bits
            tfdt.flags = 0;

            tfdt.baseMediaDecodeTime = (track.samples.length > 0) ? track.samples[0].dts : 0;

            return tfdt;
        },

        createTrackFragmentRunBox = function(track) {

            // Track Fragment Run Box
            // Within the Track Fragment Box, there are zero or more Track Run Boxes. If the duration-is-empty flag is set in
            // the tf_flags, there are no track runs. A track run documents a contiguous set of samples for a track.
            // The number of optional fields is determined from the number of bits set in the lower byte of the flags, and the
            // size of a record from the bits set in the second byte of the flags. This procedure shall be followed, to allow for
            // new fields to be defined.

            var trun = new mp4lib.boxes.TrackFragmentRunBox(),
                i,
                cts_base,
                sample_duration_present_flag,
                sample;

            cts_base = track.samples[0].cts;
            sample_duration_present_flag = (track.samples[0].duration > 0) ? 0x000100 : 0x000000;

            trun.version = 0;
            trun.flags = 0x000001 | // data-offset-present
            sample_duration_present_flag | // sample-duration-present
            0x000200 | // sample-size-present
            ((track.type === 'video') ? 0x000800 : 0x000000); // sample-composition-time-offsets-present

            trun.data_offset = 0; // Initialize to 0, will be updated once mdat is set
            trun.samples_table = [];
            trun.sample_count = track.samples.length;

            for (i = 0; i < track.samples.length; i++) {
                sample = {
                    sample_duration: track.samples[i].duration,
                    sample_size: track.samples[i].size,
                    sample_composition_time_offset: track.samples[i].cts - track.samples[i].dts
                };

                if (sample.sample_composition_time_offset < 0) {
                    trun.version = 1;
                }

                trun.samples_table.push(sample);
            }

            return trun;
        },

        createMediaDataBox = function(track) {

            // Media Data Box

            var mdat = new mp4lib.boxes.MediaDataBox();

            mdat.data = track.data;

            return mdat;
        },

        doGenerateMediaSegment = function(tracks, sequenceNumber) {

            var moof_file,
                moof,
                i,
                length,
                data,
                trafs,
                mdatLength = 0,
                trackglobal = {},
                mdatTracksTab,
                offset = 0;

            // Create file
            moof_file = new mp4lib.boxes.File();

            // Create Movie Fragment box (moof) 
            moof = new mp4lib.boxes.MovieFragmentBox();

            // Create Movie Fragment Header box (moof) 
            moof.boxes.push(createMovieFragmentHeaderBox(sequenceNumber));

            for (i = 0; i < tracks.length; i += 1) {
                // Create Track Fragment box (traf)
                moof.boxes.push(createTrackFragmentBox(tracks[i]));
            }

            moof_file.boxes.push(moof);

            // Determine total length of output fragment file
            length = moof_file.getLength();

            // Add tracks data
            trafs = moof.getBoxesByType("traf");

            length += 8; // 8 = 'size' + 'type' mdat fields length

            // mdat array size = tracks.length
            mdatTracksTab = [tracks.length];

            for (i = 0; i < tracks.length; i += 1) {
                // Update trun.data_offset for the track
                trafs[i].getBoxByType("trun").data_offset = length;
                // Update length of output fragment file
                length += tracks[i].data.length;
                // Add current data in mdatTracksTab array
                mdatTracksTab[i] = tracks[i].data;
                // Update length of global mdat
                mdatLength += mdatTracksTab[i].length;
            }

            trackglobal.data = new Uint8Array(mdatLength);

            // Concatenate all the tracks data in an array
            for (i = 0; i < mdatTracksTab.length; i++) {
                trackglobal.data.set(mdatTracksTab[i], offset);
                offset += mdatTracksTab[i].length;
            }

            // Create mdat
            moof_file.boxes.push(createMediaDataBox(trackglobal));

            data = mp4lib.serialize(moof_file);

            return data;
        };

    return {
        protectionExt: undefined,

        generateInitSegment: doGenerateInitSegment,
        generateMediaSegment: doGenerateMediaSegment
    };
};

MediaPlayer.dependencies.Mp4Processor.prototype = {
    constructor: MediaPlayer.dependencies.Mp4Processor
};