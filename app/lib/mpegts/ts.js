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
mpegts.ts.TsPacket = function(){
    this.m_cSync = null;
    this.m_bTransportError = null;
    this.m_bPUSI = null;
    this.m_bTransportPriority = null;
    this.m_nPID = null;
    this.m_cTransportScramblingCtrl = null;
    this.m_cAdaptationFieldCtrl = null;
    this.m_cContinuityCounter = null;
    this.m_pAdaptationField = null;
    this.m_payloadArray = null;
    this.m_cPayloadLength = null;
    this.m_bDirty = null;
    this.m_time = null;
    this.m_arrivalTime = null;
    this.m_bIgnored = null;
};

mpegts.ts.TsPacket.prototype.parse = function(data) {
    var byteId = 0;
    this.m_cSync = data[byteId];
    if (this.m_cSync !== this.SYNC_WORD) {
        console.log("TS Packet Malformed!");
        return;
    }

    byteId++;

    this.m_bTransportError = mpegts.binary.getBitFromByte(data[byteId], 0);
    this.m_bPUSI = mpegts.binary.getBitFromByte(data[byteId], 1);
    this.m_bTransportPriority = mpegts.binary.getBitFromByte(data[byteId], 2);
    this.m_nPID = mpegts.binary.getValueFrom2Bytes(data.subarray(byteId, byteId+2), 3, 13);
    
    byteId += 2;

    this.m_cTransportScramblingCtrl = mpegts.binary.getValueFromByte(data[byteId], 0, 2);
    this.m_cAdaptationFieldCtrl = mpegts.binary.getValueFromByte(data[byteId], 2, 2);
    this.m_cContinuityCounter = mpegts.binary.getValueFromByte(data[byteId], 4, 4);

    byteId++;

    // Adaptation field
    // NAN => to Validate
    if(this.m_cAdaptationFieldCtrl & 0x02)
    {
        // Check adaptation field length before parsing
        var cAFLength = data[byteId];
        if ((cAFLength + byteId) >= this.TS_PACKET_SIZE)
        {
            console.log("TS Packet Size Problem!");
            return;
        }
        this.m_pAdaptationField = new mpegts.ts.AdaptationField();
        this.m_pAdaptationField.parse(data.subarray(byteId));
        byteId += this.m_pAdaptationField.getLength();
    }

    // Check packet validity
    if (this.m_cAdaptationFieldCtrl === 0x00)
    {
        console.log("TS Packet is invalid!");
        return;
    }

    // Payload
    if(this.m_cAdaptationFieldCtrl & 0x01)
    {
        this.m_cPayloadLength = this.TS_PACKET_SIZE - byteId;
        this.m_payloadArray = data.subarray(byteId,byteId + this.m_cPayloadLength);
    }
};

mpegts.ts.TsPacket.prototype.getPid = function() {
    return this.m_nPID;
};

mpegts.ts.TsPacket.prototype.getPayload = function() {
    return this.m_payloadArray;
};

mpegts.ts.TsPacket.prototype.getPayloadLength = function() {
    return this.m_cPayloadLength;
};

mpegts.ts.TsPacket.prototype.getPusi = function() {
    return this.m_bPUSI;
};

mpegts.ts.TsPacket.prototype.hasAdaptationFieldOnly = function() {
    return (this.m_cAdaptationFieldCtrl === 0x02);
};

mpegts.ts.TsPacket.prototype.SYNC_WORD = 0x47;
mpegts.ts.TsPacket.prototype.TS_PACKET_SIZE = 188;
mpegts.ts.TsPacket.prototype.UNDEFINED_PID = 0xFFFF;
mpegts.ts.TsPacket.prototype.PAT_PID = 0;
mpegts.ts.TsPacket.prototype.STREAM_ID_PROGRAM_STREAM_MAP = 0xBC;
mpegts.ts.TsPacket.prototype.STREAM_ID_PADDING_STREAM = 0xBE;
mpegts.ts.TsPacket.prototype.STREAM_ID_PADDING_STREAM = 0xBE;
mpegts.ts.TsPacket.prototype.STREAM_ID_PRIVATE_STREAM_2 = 0xBF;
mpegts.ts.TsPacket.prototype.STREAM_ID_ECM_STREAM = 0xF0;
mpegts.ts.TsPacket.prototype.STREAM_ID_EMM_STREAM = 0xF1;
mpegts.ts.TsPacket.prototype.STREAM_ID_DSMCC_STREAM = 0xF2;
mpegts.ts.TsPacket.prototype.STREAM_ID_H2221_TYPE_E_STREAM = 0xF8;
mpegts.ts.TsPacket.prototype.STREAM_ID_PROGRAM_STREAM_DIRECTORY = 0xFF;
