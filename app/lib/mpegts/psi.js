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
mpegts.si.PSISection = function(table_id) {
    this.m_table_id = table_id;
    this.m_section_syntax_indicator = 1;
    this.m_section_length = mpegts.si.PSISection.prototype.SECTION_LENGTH;
    this.m_transport_stream_id = 0;
    this.m_version_number = 0;
    this.m_current_next_indicator = true;
    this.m_section_number = 0;
    this.m_last_section_number = 0;
    this.m_bValid = null;
};

mpegts.si.PSISection.prototype.parse = function(data) {
    this.m_bValid = false;

    var id = 0;

    var pointerField = data[id];

    //if pointerField = 0 payload data start immediately otherwise, shift pointerField value
    id = pointerField === 0 ? id + 1 : id + pointerField;

    this.m_table_id = data[id];
    id++;
    this.m_section_syntax_indicator = mpegts.binary.getBitFromByte(data[id], 0);
    this.m_section_length = mpegts.binary.getValueFrom2Bytes(data.subarray(id, id + 2), 4);
    id += 2;
    this.m_transport_stream_id = mpegts.binary.getValueFrom2Bytes(data.subarray(id, id + 2));
    id += 2;
    this.m_version_number = mpegts.binary.getValueFromByte(data[id], 2, 5);
    this.m_current_next_indicator = mpegts.binary.getBitFromByte(data[id], 7);
    id++;
    this.m_section_number = data[id];
    id++;
    this.m_last_section_number = data[id];

    /*if (nLength < (m_section_length + 3))
	{
		m_bComplete = false;
		SAFE_DELETE(m_pBytestream);
		m_pBytestream = new unsigned char[m_section_length + 3];
		memcpy(m_pBytestream, pBytestream, nLength);
		m_nSectionIndex = nLength;
		return;
	}

	m_nSectionIndex = 0;
	m_bComplete = true;*/
    this.m_bValid = true;

    return id;
};

mpegts.si.PSISection.prototype.getSectionLength = function() {
    return this.m_section_length;
};

mpegts.si.PSISection.prototype.SECTION_LENGTH = 9;
mpegts.si.PSISection.prototype.HEADER_LENGTH = 8;