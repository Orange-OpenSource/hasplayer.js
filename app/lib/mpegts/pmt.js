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
mpegts.si.PMT = function(){
	mpegts.si.PSISection.call(this,mpegts.si.PMT.prototype.TABLE_ID);
	this.m_listOfComponents = [];
	this.m_PCR_PID = null;
	this.m_program_info_length = null;
};

mpegts.si.PMT.prototype = Object.create(mpegts.si.PSISection.prototype);
mpegts.si.PMT.prototype.constructor = mpegts.si.PMT;

mpegts.si.PMT.prototype.parse = function (data) {
	var id = mpegts.si.PSISection.prototype.parse.call(this,data);
	id++;

	if (!this.m_bValid)
	{
		console.log("PSI Parsing Problem during PMT parsing!");
		return;
	}
	this.m_bValid = false;

	// Check table_id field value
	if(this.m_table_id != this.TABLE_ID)
	{
		console.log("PMT Table ID != 2");
		return;
	}

	var remainingBytes = this.getSectionLength() - this.SECTION_LENGTH;

	// check if we have almost PCR_PID and program_info_length fields
	if (remainingBytes < 4)
	{
		return;
	}

	this.m_PCR_PID = mpegts.binary.getValueFrom2Bytes(data.subarray(id, id+2), 3);
	id += 2;
	this.m_program_info_length = mpegts.binary.getValueFrom2Bytes(data.subarray(id, id+2), 4);
	id += 2;
	
	// Parse program descriptors
	id += this.m_program_info_length;
	
	// Parse ES descriptions
	remainingBytes = (this.m_section_length - this.SECTION_LENGTH - 4 - this.m_program_info_length);
	var pESDescription = null;
	while (remainingBytes > 0)
	{
		pESDescription = new mpegts.si.ESDescription(data.subarray(id, id+remainingBytes));
		this.m_listOfComponents.push(pESDescription);
		remainingBytes -= pESDescription.getLength();
		id += pESDescription.getLength();
	}

	this.m_bValid = true;
};

mpegts.si.PMT.prototype.TABLE_ID	= 0x02;

mpegts.si.PMT.prototype.gStreamTypes = [
	/*  0 - 0x00 */ {name : "Reserved", value:0x00, desc:"ITU-T | ISO/IEC Reserved"},
	/*  1 - 0x01 */ {name : "MPEG1-Video", value:0xE0, desc:"ISO/IEC 11172-2 Video"},
	/*  2 - 0x02 */ {name : "MPEG2-Video", value:0xE0, desc:"ITU-T Rec. H.262 | ISO/IEC 13818-2 Video or ISO/IEC 11172-2 constrained parameter video stream"},
	/*  3 - 0x03 */ {name : "MPEG1-Audio", value:0xC0, desc:"ISO/IEC 11172-3 Audio"},
	/*  4 - 0x04 */ {name : "MPEG2-Audio", value:0xC0, desc:"ISO/IEC 13818-3 Audio"},
	/*  5 - 0x05 */ {name : "PRIVATE_SECTIONS",	value:0xBD, desc:"ITU-T Rec. H.222.0 | ISO/IEC 13818-1 private_sections"},
	/*  6 - 0x06 */ {name : "PRIVATE", value:0xBD, desc:"ITU-T Rec. H.222.0 | ISO/IEC 13818-1 PES packets containing private data"},
	/*  7 - 0x07 */ {name : "MHEG",	value:0xF3, desc:"ISO/IEC 13522 MHEG"},
	/*  8 - 0x08 */ {name : "MPEG1-DSM-CC",	value:0xF2, desc:"ITU-T Rec. H.222.0 | ISO/IEC 13818-1 Annex A DSM-CC"},
	/*  9 - 0x09 */ {name : "H.222.1", value:0xF4, desc:"ITU-T Rec. H.222.1"},
	/* 10 - 0x0A */ {name : "DSM-CC_A",	value:0xF4, desc:"ISO/IEC 13818-6 type A"},
	/* 11 - 0x0B */ {name : "DSM-CC_B", value:0xF5, desc:"ISO/IEC 13818-6 type B"},
	/* 12 - 0x0C */ {name : "DSM-CC_C",	value:0xF6, desc:"ISO/IEC 13818-6 type C"},
	/* 13 - 0x0D */ {name : "DSM-CC_D",	value:0xF7, desc:"ISO/IEC 13818-6 type D"},
	/* 14 - 0x0E */ {name : "Auxiliary", value:0x00, desc:"ITU-T Rec. H.222.0 | ISO/IEC 13818-1 auxiliary"},
	/* 15 - 0x0F */ {name : "MPEG2-AAC-ADTS", value:0xC0, desc:"ISO/IEC 13818-7 Audio with ADTS transport syntax"},
	/* 16 - 0x10 */ {name : "MPEG4-Video", value:0xE0, desc:"ISO/IEC 14496-2 Visual"},
	/* 17 - 0x11 */ {name : "MPEG4-AAC-LATM", value:0xC0, desc:"ISO/IEC 14496-3 Audio with the LATM transport syntax as defined in ISO/IEC 14496-3/AMD-1"},
	/* 18 - 0x12 */ {name : "MPEG4-SL", value:0xFA, desc:"ISO/IEC 14496-1 SL-packetized stream or FlexMux stream carried in PES packets"},
	/* 19 - 0x13 */ {name : "MPEG4-SL",	value:0xFA, desc:"ISO/IEC 14496-1 SL-packetized stream or FlexMux stream carried in ISO/IEC14496_sections"},
	/* 20 - 0x14 */ {name : "DSM-CC_SDP", value:0x00, desc:"ISO/IEC 13818-6 Synchronized Download Protocol"},
	/* 21 - 0x15 */ {name : "META_PES",	value:0xFC, desc:"Metadata carried in PES packets"},
	/* 22 - 0x16 */ {name : "META_SECTIONS", value:0xFC, desc:"Metadata carried in metadata_sections"},
	/* 23 - 0x17 */ {name : "META_DSM-CC", value:0xFC, desc:"Metadata carried in ISO/IEC 13818-6 Data Carousel"},
	/* 24 - 0x18 */ {name : "META_DSM-CC", value:0xFC, desc:"Metadata carried in ISO/IEC 13818-6 Object Carousel"},
	/* 25 - 0x19 */ {name : "META_DSM-CC", value:0xFC, desc:"Metadata carried in ISO/IEC 13818-6 Synchronized Download Protocol"},
	/* 26 - 0x1A */ {name : "MPEG2-IPMP", value:0x00, desc:"IPMP stream (defined in ISO/IEC 13818-11, MPEG-2 IPMP)"},
	/* 27 - 0x1B */ {name : "H.264", value:0xE0, desc:"AVC video stream as defined in ITU-T Rec. H.264 | ISO/IEC 14496-10 Video"},
	/* 28 - 0x1C */ {name : "MPEG4AAC", value:0xC0, desc:"ISO/IEC 14496-3 Audio, without using any additional transport syntax, such as DST, ALS and SLS"},
	/* 29 - 0x1D */ {name : "MPEG4Text", value:0x00, desc:"ISO/IEC 14496-17 Text"},
	/* 30 - 0x1E */ {name : "Aux. Video (23002-3)", value:0x1E, desc:"Auxiliary video stream as defined in ISO/IEC 23002-3"},
	/* 31 - 0x1F */ {name : "H.264-SVC", value:0xE0, desc:"SVC video sub-bitstream of a video stream as defined in the Annex G of ITU-T Rec. H.264 | ISO/IEC 14496-10 Video"},
	/* 32 - 0x20 */ {name : "H.264-MVC", value:0xE0, desc:"MVC video sub-bitstream of a video stream as defined in the Annex H of ITU-T Rec. H.264 | ISO/IEC 14496-10 Video"},
	/* 33 - 0x21 */ {name : "Reserved1", value:0x00, desc:"TBC Reserved"},
	/* 34 - 0x22 */ {name : "Reserved2", value:0x00, desc:"TBC Reserved"},
	/* 35 - 0x23 */ {name : "Reserved3", value:0x00, desc:"TBC Reserved"},
	/* 36 - 0x24 */ {name : "HEVC",	value:0xE0, desc:"ITU.-T Rec H.26x | ISO/IEC 23008-2 video stream"}
];

mpegts.si.PMT.prototype.MPEG2_VIDEO_STREAM_TYPE =	0x02;
mpegts.si.PMT.prototype.AVC_VIDEO_STREAM_TYPE =		0x1B;
mpegts.si.PMT.prototype.MPEG1_AUDIO_STREAM_TYPE =	0x03;
mpegts.si.PMT.prototype.MPEG2_AUDIO_STREAM_TYPE =	0x04;
mpegts.si.PMT.prototype.AAC_AUDIO_STREAM_TYPE =		0x11;
mpegts.si.PMT.prototype.AC3_AUDIO_STREAM_TYPE =		0x06;
mpegts.si.PMT.prototype.SUB_STREAM_TYPE =			0x06;

mpegts.si.PMT.prototype.STREAM_TYPE_MP1V =			0x01;
mpegts.si.PMT.prototype.STREAM_TYPE_MP2V =			0x02;
mpegts.si.PMT.prototype.STREAM_TYPE_MP1A =			0x03;
mpegts.si.PMT.prototype.STREAM_TYPE_MP2A =			0x04;
mpegts.si.PMT.prototype.STREAM_TYPE_PRIVATE	=		0x06;
mpegts.si.PMT.prototype.STREAM_TYPE_TELETEXT =		0x06;
mpegts.si.PMT.prototype.STREAM_TYPE_DVBSUBTITLE =	0x06;
mpegts.si.PMT.prototype.STREAM_TYPE_AC3 =			0x06;
mpegts.si.PMT.prototype.STREAM_TYPE_MP2AAC_ADTS =	0x0F;
mpegts.si.PMT.prototype.STREAM_TYPE_MP4AAC_LATM	=	0x11;
mpegts.si.PMT.prototype.STREAM_TYPE_H264 =			0x1B;
mpegts.si.PMT.prototype.STREAM_TYPE_MP4AAC	=		0x1C;
mpegts.si.PMT.prototype.STREAM_TYPE_AUX_23002_3 =	0x1E;
mpegts.si.PMT.prototype.STREAM_TYPE_SVC =			0x1F;
mpegts.si.PMT.prototype.STREAM_TYPE_MVC	=			0x20;
mpegts.si.PMT.prototype.STREAM_TYPE_HEVC =			0x24;


mpegts.si.ESDescription = function(data){
	/** ES description fields */
	this.m_stream_type = null;
	this.m_elementary_PID = null;
	this.m_ES_info_length = null;
	this.parse(data);
};

/**
* Gets the stream type associated to this ES
* @return the stream type associated to this ES
*/
mpegts.si.ESDescription.prototype.getStreamType = function() {
	return this.m_stream_type;
};

/**
* Gets the pid on which this ES may be found
* @return the pid on which this ES may be found
*/
mpegts.si.ESDescription.prototype.getPID = function() {
	return this.m_elementary_PID;
};

/**
* Returns the elementary stream description length
* @return the elementary stream description length
*/
mpegts.si.ESDescription.prototype.getLength = function() {
	return 5 + this.m_ES_info_length;
};

/**
* Parse the ESDescription from given bytestream
* @param the bytestream to parse
* @return the bytestream length
*/
mpegts.si.ESDescription.prototype.parse = function(data)
{
	this.m_stream_type = data[0];
	this.m_elementary_PID = mpegts.binary.getValueFrom2Bytes(data.subarray(1, 3), 3);
	this.m_ES_info_length = mpegts.binary.getValueFrom2Bytes(data.subarray(3, 5), 4);
};