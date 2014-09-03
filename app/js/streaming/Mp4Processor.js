
MediaPlayer.dependencies.Mp4Processor = function () {
    "use strict";

    var createMovieHeaderBox = function(media) {

            // Movie Header Box
            // This box defines overall information which is media-independent, and relevant to the
            // entire presentation considered as a whole.

            // Create MovieHeader box (mvhd)
            var mvhd = new mp4lib.boxes.MovieHeaderBox();

            mvhd.version = 1; // version = 1  in order to have 64bits duration value
            mvhd.creation_time = 0; // the creation time of the presentation => ignore (set to 0)
            mvhd.modification_time = 0; // the most recent time the presentation was modified => ignore (set to 0)
            mvhd.timescale = media.timescale; // the time-scale for the entire presentation => take timescale of current adaptationSet
            mvhd.duration = Math.round(media.duration * media.timescale); // the length of the presentation (in the indicated timescale) =>  take duration of period
            mvhd.rate = 0x00010000; // 16.16 number, "1.0" = normal playback
            mvhd.volume = 0x0100; // 8.8 number, "1.0" = full volume
            mvhd.reserved = 0;
            mvhd.reserved_2 = [0x0, 0x0];
            mvhd.matrix = [0x00010000, 0x0, 0x0, 0x0, 0x00010000, 0x0, 0x0, 0x0, 0x40000000];   // provides a transformation matrix for the video; (u,v,w) are restricted here to (0,0,1),
                                                                                                // hex values (0,0,0x40000000)
            mvhd.pre_defined = [0x0, 0x0, 0x0, 0x0, 0x0, 0x0];
            mvhd.next_track_ID = media.trackId + 1; // indicates a value to use for the track ID of the next track to be added to this presentation
            mvhd.flags = 0; //default value

            return mvhd;
        },

        createTrackBox = function(media) {

            // Track Box: This is a container box for a single track of a presentation
            // Track Header Box: This box specifies the characteristics of a single track

            // Create Track box (trak)
            var trak = new mp4lib.boxes.TrackBox();
            trak.boxes = [];

            // Create and add TrackHeader box (trak)
            var tkhd = new mp4lib.boxes.TrackHeaderBox();

            tkhd.version = 1; // version = 1  in order to have 64bits duration value
            tkhd.flags = 0x1 | 0x2 | 0x4; //Track_enabled: Indicates that the track is enabled. Flag value is 0x000001. A disabled track (the low
                                         //bit is zero) is treated as if it were not present.
                                         //Track_in_movie: Indicates that the track is used in the presentation. Flag value is 0x000002.
                                         //Track_in_preview: Indicates that the track is used when previewing the presentation. Flag value is 0x000004.
            tkhd.creation_time = 0; // the creation time of the presentation => ignore (set to 0)
            tkhd.modification_time = 0; // the most recent time the presentation was modified => ignore (set to 0)
            tkhd.track_id = media.trackId; // uniquely identifies this track over the entire life-time of this presentation
            tkhd.reserved = 0;
            tkhd.duration = Math.round(media.duration * media.timescale); // the duration of this track (in the timescale indicated in the Movie Header Box) =>  take duration of period
            tkhd.reserved_2 = [0x0, 0x0];
            tkhd.layer = 0; // specifies the front-to-back ordering of video tracks; tracks with lower numbers are closer to the viewer => 0 since only one video track
            tkhd.alternate_group = 0; // specifies a group or collection of tracks => ignore
            tkhd.volume = 0x0100; // 8.8 number, "1.0" = full volume
            tkhd.reserved_3 = 0;
            tkhd.matrix = [0x00010000, 0x0, 0x0, 0x0, 0x00010000, 0x0, 0x0, 0x0, 0x40000000];   // provides a transformation matrix for the video; (u,v,w) are restricted here to (0,0,1),
            tkhd.width = media.width << 16;  // visual presentation size as fixed-point 16.16 values
            tkhd.height = media.height << 16; // visual presentation size as fixed-point 16.16 values

            trak.boxes.push(tkhd);

            //Create container for the media information in a track (mdia)
            var mdia = new mp4lib.boxes.MediaBox();
            mdia.boxes = [];

            //Create and add Media Header Box (mdhd)
            mdia.boxes.push(createMediaHeaderBox(media));
            
            //Create and add Handler Reference Box (hdlr)
            mdia.boxes.push(createHandlerReferenceBox(media));

            //Create and add Media Information Box (minf)
            mdia.boxes.push(createMediaInformationBox(media));

            trak.boxes.push(mdia);

            return trak;
        },

        getLanguageCode = function(language) {
            //declares the language code for this media. See ISO 639-2/T for the set of three character
            //codes. Each character is packed as the difference between its ASCII value and 0x60. Since the code
            //is confined to being three lower-case letters, these values are strictly positive.

            //NAN : dans le cas de la video, le champ contient quelle valeur?
            //pas défini dans la norme, retourne 0 pour le moment
            var result = 0;

            //lang member is define, get it. if not language is 'und'
            // if current adaptation is video type, return 'und'.
            //var language = adaptation.lang ? adaptation.lang : 'und' ;

            //return value is packed on 15 bits, each character is defined on 5 bits
            // there is a padding value to align on 16 bits
            var firstLetterCode = (language.charCodeAt(0) - 96) << 10 ; //96 decimal base = 0x60
            var secondLetterCode = (language.charCodeAt(1) - 96) << 5;
            var thirdLetterCode = language.charCodeAt(2) - 96;

          
            result = firstLetterCode | secondLetterCode | thirdLetterCode;
            
            return result;
        },

        createMediaHeaderBox = function (media) {

            //mdhd : The media header declares overall information that is media-independent, and relevant to characteristics of
            //the media in a track.
            var mdhd = new mp4lib.boxes.MediaHeaderBox();

            mdhd.version = 1; // version = 1  in order to have 64bits duration value
            mdhd.creation_time = 0; // the creation time of the presentation => ignore (set to 0)
            mdhd.modification_time = 0; // the most recent time the presentation was modified => ignore (set to 0)
            mdhd.timescale = media.timescale; // the time-scale for the entire presentation => take timescale of current adaptationSet
            mdhd.duration = Math.round(media.duration * media.timescale); //integer that declares the duration of this media (in the scale of the timescale). If the
                                         //duration cannot be determined then duration is set to all 1s.
            mdhd.pad = 0; // padding for language value
            mdhd.language = getLanguageCode(media.language);
            
            mdhd.pre_defined = 0; // default value

            return mdhd;
        },

        stringToCharCode = function (str) {

            var code = 0;
            for (var i = 0; i < str.length; i++)
            {
                code |= str.charCodeAt(i) << ((str.length - i - 1) * 8);
            }
            return code;
        },

        createHandlerReferenceBox = function (media) {
            
            //This box within a Media Box declares the process by which the media-data in the track is presented, and thus,
            //the nature of the media in a track. For example, a video track would be handled by a video handler.
            var hdlr = new mp4lib.boxes.HandlerBox();
            
            hdlr.version = 0; // default value version = 0 
            hdlr.pre_defined = 0; //default value.
            switch (media.type)
            {
                case "video" :
                    hdlr.handler_type = stringToCharCode(hdlr.HANDLERTYPEVIDEO);
                    hdlr.name = hdlr.HANDLERVIDEONAME;
                    break;
                case "audio" :
                    hdlr.handler_type = stringToCharCode(hdlr.HANDLERTYPEAUDIO);
                    hdlr.name = hdlr.HANDLERAUDIONAME;
                    break;
                default :
                    hdlr.handler_type = stringToCharCode(hdlr.HANDLERTYPETEXT);
                    hdlr.name = hdlr.HANDLERTEXTNAME;
                    break;
            }
            hdlr.name += '\0';
            hdlr.reserved = [0x0, 0x0]; //default value
            hdlr.flags = 0; //default value

            return hdlr;
        },

        createMediaInformationBox = function (media) {

            //This box contains all the objects that declare characteristic information of the media in the track.
            var minf = new mp4lib.boxes.MediaInformationBox();
            minf.boxes = [];
            
            //Create and add the adapted media header box (vmhd, smhd or nmhd) for audio, video or text.
            switch(media.type)
            {
                case "video" :
                    minf.boxes.push(createVideoMediaHeaderBox(media));
                    break;
                case "audio" :
                    minf.boxes.push(createSoundMediaHeaderBox(media));
                    break;
                default :
                    //minf.boxes.push(createNullMediaHeaderBox(media));
                    break;
            }

            //Create and add Data Information Box (dinf)
            minf.boxes.push(createDataInformationBox(media));
             
            //Create and add Sample Table Box (stbl)
            minf.boxes.push(createSampleTableBox(media));

            return minf;

        },

        createDataInformationBox = function () {

            //The data information box contains objects that declare the location of the media information in a track.
            var dinf = new mp4lib.boxes.DataInformationBox();
            dinf.boxes = [];

            //The data reference object contains a table of data references (normally URLs) that declare the location(s) of
            //the media data used within the presentation
            var dref = new mp4lib.boxes.DataReferenceBox();

            dref.version = 0; //is an integer that specifies the version of this box default = 0
            dref.entry_count = 1; //is an integer that counts the actual entries
            dref.flags = 0; //default value

            //The DataEntryBox within the DataReferenceBox shall be either a DataEntryUrnBox or a DataEntryUrlBox.
            dref.boxes = [];
            
            //NAN : not used, but mandatory
            var url = new mp4lib.boxes.DataEntryUrlBox();
            url.location = "";

            //add data Entry Url Box in data Reference box
            dref.boxes.push(url);

            //add data Reference Box in data information box
            dinf.boxes.push(dref);

            return dinf;
        },

        createDecodingTimeToSampleBox = function () {
            
            //This box contains a compact version of a table that allows indexing from decoding time to sample number.
            var stts = new mp4lib.boxes.TimeToSampleBox();

            stts.version = 0; //is an integer that specifies the version of this box. default value = 0
            stts.entry_count = 0; //is an integer that gives the number of entries in the following table. not used in fragmented
                                  //content 
            stts.flags = 0; //default value = 0

            stts.entry = [];

            return stts;
        },

        createSampleToChunkBox = function () {

            //Samples within the media data are grouped into chunks.
            var stsc = new mp4lib.boxes.SampleToChunkBox();
                
            stsc.version = 0; //is an integer that specifies the version of this box. default value = 0.
            stsc.entry_count = 0; //is an integer that gives the number of entries in the following table
            
            stsc.entry = [];

            return stsc;
        },

        createChunkOffsetBox = function () {

            //The chunk offset table gives the index of each chunk into the containing file
            var stco = new mp4lib.boxes.ChunkOffsetBox();

            stco.version = 0; //is an integer that specifies the version of this box. default value = 0
            stco.entry_count = 0;//is an integer that gives the number of entries in the following table
            stco.flags = 0; //default value

            stco.chunk_offset = [];
            
            return stco;
        },

        createSampleSizeBox = function () {
            
            //This box contains the sample count and a table giving the size in bytes of each sample. This allows the media
            //data itself to be unframed. The total number of samples in the media is always indicated in the sample count.
            var stsz = new mp4lib.boxes.SampleSizeBox();

            stsz.version = 0; // default value = 0
            stsz.flags = 0; //default value = 0
            stsz.sample_count = 0; //is an integer that gives the number of samples in the track; if sample-size is 0, then it is
                                   //also the number of entries in the following table         
            stsz.sample_size = 0; //is integer specifying the default sample size.
            
            return stsz;
        },

        _hexstringtoBuffer = function (a) {
            var res = new Uint8Array(a.length/2);

            for (var i=0;i<a.length/2;i++)
                res[i] = parseInt( ""+a[i*2]+a[i*2+1], 16);
            return res;
        },

        _mergeArrays = function (oldBuffer,newPart) {
            var res = new Uint8Array(oldBuffer.length+newPart.length);
            res.set(oldBuffer,0);
            res.set(newPart,oldBuffer.length);
            return res;
        },

        createAVCConfigurationBox = function (media) {

            //Create an AVC Configuration Box
            var avcC = new mp4lib.boxes.AVCConfigurationBox();

            avcC.configurationVersion = 1; //unsigned int(8) configurationVersion = 1;
            avcC.lengthSizeMinusOne = 3; //indicates the length in bytes of the NALUnitLength field in an AVC video
                                         //sample or AVC parameter set sample of the associated stream minus one
          
            avcC.reserved = 0x3F; //bit(6) reserved = ‘111111’b;
            
            avcC.SPS_NAL= []; //SPS NAL Array
            avcC.PPS_NAL= []; //PPS NAL Array

            var NALDatabuffer = new Uint8Array(0);

            var codecPrivateData = media.codecPrivateData;

            var NALArray = codecPrivateData.split("00000001");

            NALArray.splice(0,1);

            var SPS_index = 0;
            var PPS_index = 0;
            for (var j=0;j<NALArray.length;j++)
            {
                var regexp7 = new RegExp("^[A-Z0-9]7", "gi");           //SPS
                var regexp8 = new RegExp("^[A-Z0-9]8", "gi");           //PPS
                
                
                var NALBuffer = _hexstringtoBuffer(NALArray[j]);

                if (NALArray[j].match(regexp7))
                {
                    avcC.SPS_NAL[SPS_index++] = { "NAL_length":NALBuffer.length, "NAL":NALBuffer };
                    avcC.AVCProfileIndication = parseInt(NALArray[j].substr(2,2),16); //contains the profile code as defined in ISO/IEC 14496-10.
                    avcC.profile_compatibility = parseInt(NALArray[j].substr(4,2),16); //is a byte defined exactly the same as the byte which occurs between the
                                                                                       //profile_IDC and level_IDC in a sequence parameter set (SPS), as defined in ISO/IEC 14496-10.
                    avcC.AVCLevelIndication = parseInt(NALArray[j].substr(6,2),16); //contains the level code as defined in ISO/IEC 14496-10.
                }
                if (NALArray[j].match(regexp8))
                {
                    avcC.PPS_NAL[PPS_index++] =  { "NAL_length":NALBuffer.length, "NAL":NALBuffer };
                }

                var tempBuffer = new Uint8Array(NALBuffer.length+4);
                tempBuffer[3] = NALBuffer.length;
                tempBuffer.set(NALBuffer,4);

                NALDatabuffer = _mergeArrays(NALDatabuffer,tempBuffer);
            }
            avcC.numOfSequenceParameterSets = SPS_index; //of SPSs that are used as the initial set of SPSs
                                                         //for decoding the AVC elementary stream.
            avcC.numOfPictureParameterSets = PPS_index; //indicates the number of picture parameter sets (PPSs) that are used
                                                        //as the initial set of PPSs for decoding the AVC elementary stream.

            return avcC;
        },

        createAVCVisualSampleEntry = function (media) {

            //An AVC visual sample entry shall contain an AVC Configuration Box
            var avc1 = null;

            if (media.contentProtection !== undefined)
            {
                avc1 = new mp4lib.boxes.EncryptedVideoBox();
            }
            else
            {
                avc1 = new mp4lib.boxes.AVC1VisualSampleEntryBox();
            }

            avc1.boxes = [];

            avc1.data_reference_index = 1; //To DO... ??
            avc1.compressorname = "AVC Coding";//is a name, for informative purposes. It is formatted in a fixed 32-byte field, with the first
                                               //byte set to the number of bytes to be displayed, followed by that number of bytes of displayable data,
                                               //and then padding to complete 32 bytes total (including the size byte). The field may be set to 0.
            avc1.depth = 0x0018;//takes one of the following values 0x0018 – images are in colour with no alpha.
            avc1.reserved =[0x0,0x0,0x0,0x0,0x0,0x0];//default value = 0
            avc1.reserved_2 = 0;//default value = 0
            avc1.reserved_3 = 0;//default value = 0
            avc1.pre_defined = 0;//unsigned int(16) pre_defined = 0;
            avc1.pre_defined_2 = [0x0,0x0,0x0];//unsigned int(32)[3] pre_defined = 0;
            avc1.pre_defined_3 = 65535;//int(16) pre_defined = -1;
            avc1.frame_count = 1;//template unsigned int(16) frame_count = 1;indicates how many frames of compressed video are stored in each sample. The default is
                                 //1, for one frame per sample; it may be more than 1 for multiple frames per sample
            avc1.horizresolution = 0x00480000;// 72 dpi
            avc1.vertresolution = 0x00480000;// 72 dpi

            avc1.height = media.height;//are the maximum visual width and height of the stream described by this sample
            avc1.width = media.width;//description, in pixels
            
            //create and add AVC Configuration Box (avcC)
            avc1.boxes.push(createAVCConfigurationBox(media));

            if (media.contentProtection != undefined)
            {
                // create and add Protection Scheme Info Box
                avc1.boxes.push(createProtectionSchemeInfoBox(media));
            }
           
            return avc1;
        },

        createOriginalFormatBox = function (media) {
            var frma = new mp4lib.boxes.OriginalFormatBox();
            frma.data_format = stringToCharCode(media.codecs.substring(0, media.codecs.indexOf('.')));

            return frma;
        },

        createSchemeTypeBox = function () {
            var schm = new mp4lib.boxes.SchemeTypeBox();

            schm.flags=0;
            schm.version=0;
            schm.scheme_type = 0x63656E63; //'cenc' => common encryption
            schm.scheme_version = 0x00010000;// version set to 0x00010000 (Major version 1, Minor version 0)

            return schm;
        },

        createSchemeInformationBox = function (media) {
            var schi = new mp4lib.boxes.SchemeInformationBox();
            schi.boxes = [];

            //create and add Track Encryption Box
            schi.boxes.push(createTrackEncryptionBox(media));

            return schi;
        },

        createTrackEncryptionBox = function (media) {
            var tenc = new mp4lib.boxes.TrackEncryptionBox();
            
            tenc.default_IsEncrypted = 0x1; //default value
            tenc.default_IV_size = 8; //default value, NA => à préciser
            tenc.default_KID = [];

            return tenc;
        },

        createProtectionSchemeInfoBox = function (media) {
            //create Protection Scheme Info Box
            var sinf = new mp4lib.boxes.ProtectionSchemeInformationBox();
            sinf.boxes = [];

            //create and add Original Format Box => indicate codec type of the encrypted content         
            sinf.boxes.push(createOriginalFormatBox(media));

            //create and add Scheme Type box            
            sinf.boxes.push(createSchemeTypeBox());

            //create and add Scheme Information Box
            sinf.boxes.push(createSchemeInformationBox(media));
            
            return sinf;
        },

        createVisualSampleEntry = function (media) {
            var codec = media.codecs.substring(0, media.codecs.indexOf('.'));

            switch (codec){
                case "avc1":
                    return createAVCVisualSampleEntry(media);
                default:
                break;
            }
        },
        
        parseHexString = function (str) {
            var bytes = [];
            while (str.length >= 2) { 
                bytes.push(parseInt(str.substring(0, 2), 16));
                str = str.substring(2, str.length);
            }

            return bytes;
        },

        createMPEG4AACESDescriptor = function (media) {

            // AudioSpecificConfig
            // defined in ISO/IEC 14496-3, subpart 1
            // => AudioSpecificConfig corresponds to hex bytes contained in "codecPrivateData" field
            var audioSpecificConfig = parseHexString(media.codecPrivateData);

            // DecoderSpecificInfo
            // defined in ISO/IEC 14496-1 (Systems), extends a BaseDescriptor
            var dsiLength = audioSpecificConfig.length;
            var decoderSpecificInfo = new Uint8Array(2 + dsiLength); // 2 = tag + size bytes
            decoderSpecificInfo[0] = 0x05;          // bit(8), tag=0x05 (DecSpecificInfoTag)
            decoderSpecificInfo[1] = dsiLength;     // bit(8), size
            decoderSpecificInfo.set(audioSpecificConfig, 2); // AudioSpecificConfig bytes

            // DecoderConfigDescriptor
            // defined in ISO/IEC 14496-1 (Systems), extends a BaseDescriptor
            var dcdLength = 13 + decoderSpecificInfo.length; // 2 = tag + size bytes
            var decoderConfigDescriptor = new Uint8Array(2 + dcdLength);
            decoderConfigDescriptor[0] = 0x04;      // bit(8), tag=0x04 (DecoderConfigDescrTag)
            decoderConfigDescriptor[1] = dcdLength; // bit(8), size
            decoderConfigDescriptor[2] = 0x40;      // bit(8), objectTypeIndication=0x40 (MPEG-4 AAC)
            decoderConfigDescriptor[3] = 0x05 << 2; // bit(6), streamType=0x05 (Visualstream)
            decoderConfigDescriptor[3] |= 0 << 1;   // bit(1), upStream=0
            decoderConfigDescriptor[3] |= 1;        // bit(1), reserved=1
            decoderConfigDescriptor[4] = 0xFF;      // bit(24), buffersizeDB=undefined
            decoderConfigDescriptor[5] = 0xFF;      // ''
            decoderConfigDescriptor[6] = 0xFF;      // ''
            decoderConfigDescriptor[7] = 0xFF;      // bit(32), maxBitrate=undefined
            decoderConfigDescriptor[8] = 0xFF;      // ''
            decoderConfigDescriptor[9] = 0xFF;      // ''
            decoderConfigDescriptor[10] = 0xFF;     // ''
            decoderConfigDescriptor[11] = (media.bandwidth & 0xFF000000) >> 24; // bit(32), avgbitrate
            decoderConfigDescriptor[12] |= (media.bandwidth & 0x00FF0000) >> 16;// '' 
            decoderConfigDescriptor[13] |= (media.bandwidth & 0x0000FF00) >> 8; // ''
            decoderConfigDescriptor[14] |= (media.bandwidth & 0x000000FF);      // ''
            decoderConfigDescriptor.set(decoderSpecificInfo, 15); // DecoderSpecificInfo bytes

            // ES_Descriptor
            // defined in ISO/IEC 14496-1 (Systems), extends a BaseDescriptor
            var  esdLength = 3 + decoderConfigDescriptor.length;
            var esDescriptor = new Uint8Array(2 + esdLength); // 2 = tag + size bytes
            esDescriptor[0] = 0x03;                 // bit(8), tag=0x03 (ES_DescrTag)
            esDescriptor[1] = esdLength;            // bit(8), size
            esDescriptor[2] = (media.trackId & 0xFF00) >> 8;    // bit(16), ES_ID=track_id
            esDescriptor[3] = (media.trackId & 0x00FF);         // ''
            esDescriptor[4] = 0;                    // bit(8), flags and streamPriority
            esDescriptor.set(decoderConfigDescriptor, 5); // decoderConfigDescriptor bytes

            return esDescriptor;
        },

        createMP4AudioSampleEntry = function (media) {
            var mp4a = null;

            if (media.contentProtection !== undefined)
            {
                mp4a = new mp4lib.boxes.EncryptedAudioBox();
            }
            else
            {
                mp4a = new mp4lib.boxes.MP4AudioSampleEntryBox();
            }

            mp4a.boxes = [];

            // SampleEntry fields
            mp4a.reserved = [0x0, 0x0, 0x0, 0x0, 0x0, 0x0];
            mp4a.data_reference_index = 1;              // ??
            
            // AudioSampleEntry fields
            mp4a.reserved_2 = [0x0, 0x0];               // default value = 0
            mp4a.channelcount = media.channels;         // number of channels
            mp4a.samplesize = 16;                       // default value = 16
            mp4a.pre_defined = 0;                       // default value = 0
            mp4a.reserved_3 = 0;                        // default value = 0
            mp4a.samplerate = media.samplingRate << 16; // sampling rate, as fixed-point 16.16 values

            var esdBox = new mp4lib.boxes.ESDBox();
            var ES_Descriptor = createMPEG4AACESDescriptor(media);
            esdBox.ES_tag = ES_Descriptor[0];
            esdBox.ES_length = ES_Descriptor[1];
            esdBox.ES_data = ES_Descriptor.subarray(2, ES_Descriptor.length);

            // MP4AudioSampleEntry fields
            mp4a.boxes.push(esdBox);
            
            if (media.contentProtection != undefined)
            {
                // create and add Protection Scheme Info Box
                mp4a.boxes.push(createProtectionSchemeInfoBox(media));
            }

            return mp4a;
        },
        
        createAudioSampleEntry = function (media) {
            var codec = media.codecs.substring(0, media.codecs.indexOf('.'));

            switch (codec)
            {
            case "mp4a":
                return createMP4AudioSampleEntry(media);
                break;
            default:
                break;
            }

            return null;
        },
        
        createSampleDescriptionBox = function (media) {
            
            //The sample description table gives detailed information about the coding type used, and any initialization
            //information needed for that coding.
            var stsd = new mp4lib.boxes.SampleDescriptionBox();
            stsd.boxes = [];
             
            switch(media.type)
            {
                case "video" :
                    stsd.boxes.push(createVisualSampleEntry(media));
                    break;
                case "audio" :
                    stsd.boxes.push(createAudioSampleEntry(media));
                    break;
                default :
                    //NAN : To do add text entry
                    break;
            }          

            return stsd;
        },

        createSampleTableBox = function (media){

            //The sample table contains all the time and data indexing of the media samples in a track. Using the tables
            //here, it is possible to locate samples in time, determine their type (e.g. I-frame or not), and determine their
            //size, container, and offset into that container.
            var stbl = new mp4lib.boxes.SampleTableBox();
            stbl.boxes = [];

            //create and add Decoding Time to Sample Box (stts)
            stbl.boxes.push(createDecodingTimeToSampleBox(media));

            //create and add Sample to Chunk Box (stsc)
            stbl.boxes.push(createSampleToChunkBox(media));
            
            //create and add Chunk Offset Box (stco)
            stbl.boxes.push(createChunkOffsetBox(media));

            //create and add Sample Size Box (stsz)
            stbl.boxes.push(createSampleSizeBox(media));
            
            //create and add Sample Description Box (stsd)
            stbl.boxes.push(createSampleDescriptionBox(media));

            return stbl;
        },

        createVideoMediaHeaderBox = function () {
            //The video media header contains general presentation information, independent of the coding, for video
            //media. Note that the flags field has the value 1.
            var vmhd = new mp4lib.boxes.VideoMediaHeaderBox();
            
            vmhd.version = 0; //default value, is an integer that specifies the version of this box
            vmhd.flags = 1; //default value
            vmhd.graphicsmode = 0;//specifies a composition mode for this video track, from the following enumerated set,
                                 //which may be extended by derived specifications: copy = 0 copy over the existing image
            vmhd.opcolor =  [0x0, 0x0, 0x0];//is a set of 3 colour values (red, green, blue) available for use by graphics modes
                                            //default value opcolor = {0, 0, 0};

            return vmhd;
        },

        createSoundMediaHeaderBox = function () {

            //The sound media header contains general presentation information, independent of the coding, for audio
            //media. This header is used for all tracks containing audio
            var smhd = new mp4lib.boxes.SoundMediaHeaderBox();

            smhd.version = 0; //default value, is an integer that specifies the version of this box
            smhd.balance = 0; //is a fixed-point 8.8 number that places mono audio tracks in a stereo space; 0 is centre (the
                           //normal value); full left is -1.0 and full right is 1.0.
            smhd.reserved = 0;

            return smhd;
        },

        createNullMediaHeaderBox = function () {
            //NAN non défini dans mp4lib, à définir
            //var nmhd = new NullMediaHeaderBox();
            //return nmhd;
        },

        createFileTypeBox = function () {

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

        createMovieExtendsBox = function (media) {
            
            // Create Movie Extends Box (mvex) 
            // This box warns readers that there might be Movie Fragment Boxes in this file
            var mvex = new mp4lib.boxes.MovieExtendsBox();
            mvex.boxes = [];
            
            // Create Movie Extends Header Box (mehd)
            // The Movie Extends Header is optional, and provides the overall duration, including fragments, of a fragmented
            // movie. If this box is not present, the overall duration must be computed by examining each fragment.
            if (media.duration !== Number.POSITIVE_INFINITY)
            {
                var mehd = new mp4lib.boxes.MovieExtendsHeaderBox();
                mehd.version = 1;
                mehd.flags = 0;
                mehd.fragment_duration = Math.round(media.duration * media.timescale); // declares length of the presentation of the whole movie including fragments
                
                //add mehd box in mvex box
                mvex.boxes.push(mehd);
            }
                
            // Create Track Extend Box (trex), exactly one for each track in the movie box
            // This sets up default values used by the movie fragments. By setting defaults in this way, space and
            // complexity can be saved in each Track Fragment Box.
            var trex = new mp4lib.boxes.TrackExtendsBox();
            trex.track_ID = media.trackId;              // identifies the track; this shall be the track ID of a track in the Movie Box
            trex.default_sample_description_index = 1;  // Set default value 
            trex.default_sample_duration = 0;           // ''
            trex.default_sample_flags = 0;              // ''
            trex.default_sample_size = 0;               // ''
            
            // add trex box in mvex box
            mvex.boxes.push(trex);

            return mvex;
        },

        createProtectionSystemSpecificHeaderBox = function (media) {
            var pssh = new mp4lib.boxes.ProtectionSystemSpecificHeaderBox();

            pssh.version = 0; //default value
            pssh.flags = 0; //default value

            //get hexadecimal value from SS manifest
            //remove 'urn:uuid:' and '-' characters
            var schemeIdUri = media.contentProtection.schemeIdUri.substring(8).replace(/[^A-Fa-f0-9]/g, "");
            //convert string to hexadecimal value
            pssh.SystemID = _hexstringtoBuffer(schemeIdUri);
            //get protection header
            var array = BASE64.decodeArray(media.contentProtection.pro.__text);
            pssh.DataSize = array.length;
            pssh.Data = array;

            return pssh;
        },

        doGenerateInitSegment = function (media) {
            // Create file
            var moov_file = new mp4lib.boxes.File();
            moov_file.boxes = [];

            // Create Movie box (moov) 
            var moov = new mp4lib.boxes.MovieBox();
            moov.boxes = [];

            // Create and add MovieHeader box (mvhd)
            moov.boxes.push(createMovieHeaderBox(media));

            // Create and add Track box (trak)
            moov.boxes.push(createTrackBox(media));

            // Create and add MovieExtends box (mvex)
            moov.boxes.push(createMovieExtendsBox(media));

            //Create and add Protection System Specific Header box (pssh)
            if (media.contentProtection != undefined) 
            {
                moov.boxes.push(createProtectionSystemSpecificHeaderBox(media));
            }

            moov_file.boxes.push(createFileTypeBox());

            moov_file.boxes.push(moov);        

            return mp4lib.serialize(moov_file);
        };

    return {

        generateInitSegment: doGenerateInitSegment
    };
};

MediaPlayer.dependencies.Mp4Processor.prototype = {
    constructor: MediaPlayer.dependencies.Mp4Processor
};