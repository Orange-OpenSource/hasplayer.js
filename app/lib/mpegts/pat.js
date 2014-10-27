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
mpegts.si.PAT = function(){
	mpegts.si.PSISection.call(this,mpegts.si.PAT.prototype.TABLE_ID);
	this.m_listOfProgramAssociation = [];
	this.m_network_pid = null;
};

mpegts.si.PAT.prototype = Object.create(mpegts.si.PSISection.prototype);
mpegts.si.PAT.prototype.constructor = mpegts.si.PAT;

mpegts.si.PAT.prototype.parse = function (data) {
	var id = mpegts.si.PSISection.prototype.parse.call(this,data);
	id++;

	if (!this.m_bValid)
	{
		console.log("PSI Parsing Problem during PAT parsing!");
		return;
	}
	this.m_bValid = false;

	if(this.m_table_id != this.TABLE_ID)
	{
		console.log("PAT Table ID != 0");
		return;
	}

	var remainingBytes = this.getSectionLength() - this.SECTION_LENGTH;

	while (remainingBytes >= 4)
	{
		var prog = new mpegts.si.ProgramAssociation(data.subarray(id,id+4));
		
		if(prog.getProgramNumber() === 0)
		{
			// Network PID
			this.m_network_pid = prog.getProgramMapPid();
		}
		else
		{
			this.m_listOfProgramAssociation.push(prog);
		}
		remainingBytes -= 4;
		id += 4;
	}

	this.m_bValid = true;
};

/**
* returns the PID of the PMT associated to the first program
*
* @return the PID of the PMT associated to the first program
*/
mpegts.si.PAT.prototype.getPmtPid = function()
{
	var pid = mpegts.ts.TsPacket.prototype.UNDEFINED_PID;
	
	if(this.m_listOfProgramAssociation.length >= 1){
		var prog = this.m_listOfProgramAssociation[0];
		pid = prog.getProgramMapPid();
	}
	
	return pid;
};

mpegts.si.PAT.prototype.TABLE_ID	= 0x00;
mpegts.si.PAT.prototype.PID		= 0x00;


mpegts.si.ProgramAssociation = function(data){
	this.m_program_number = 0;
	this.m_program_map_pid = 0;
	this.parse(data);
};

mpegts.si.ProgramAssociation.prototype.getProgramNumber = function () {
	return this.m_program_number;
};

mpegts.si.ProgramAssociation.prototype.getProgramMapPid = function () {
	return this.m_program_map_pid;
};

mpegts.si.ProgramAssociation.prototype.getLength = function () {
	return 4;
};

/**
* Parse the ProgramAssociation from given stream
*/
mpegts.si.ProgramAssociation.prototype.parse = function(data){
	this.m_program_number = mpegts.binary.getValueFrom2Bytes(data.subarray(0, 2));
	this.m_program_map_pid = mpegts.binary.getValueFrom2Bytes(data.subarray(2, 4), 3, 13);
};