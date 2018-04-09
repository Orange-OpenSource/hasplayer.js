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

// ---------- File (treated similarly to box in terms of processing) ----------
mp4lib.boxes.File = function() {
    this.boxes = [];
};

mp4lib.boxes.File.prototype.getBoxByType = function(boxType) {
    var i = 0;

    for (i = 0; i < this.boxes.length; i++) {
        if (this.boxes[i].boxtype === boxType) {
            return this.boxes[i];
        }
    }
    return null;
};

mp4lib.boxes.File.prototype.getLength = function() {
    var length = 0,
        i = 0;

    for (i = 0; i < this.boxes.length; i++) {
        this.boxes[i].computeLength();
        length += this.boxes[i].size;
    }

    return length;
};

mp4lib.boxes.File.prototype.write = function(data) {
    var pos = 0,
        i = 0;

    for (i = 0; i < this.boxes.length; i++) {
        pos = this.boxes[i].write(data, pos);
    }
};

mp4lib.boxes.File.prototype.read = function(data) {
    var size = 0,
        boxtype = null,
        uuidFieldPos = 0,
        uuid = null,
        pos = 0,
        end = data.length,
        box;

    while (pos < end) {
        // Read box size
        size = mp4lib.fields.FIELD_UINT32.read(data, pos);

        // Read boxtype
        boxtype = mp4lib.fields.readString(data, pos + 4, 4);

        // Extented type?
        if (boxtype == "uuid") {
            uuidFieldPos = (size == 1) ? 16 : 8;
            uuid = new mp4lib.fields.ArrayField(mp4lib.fields.FIELD_INT8, 16).read(data, pos + uuidFieldPos, pos + uuidFieldPos + 16);
            uuid = JSON.stringify(uuid);
        }

        box = mp4lib.createBox(boxtype, size, uuid);
        if (boxtype === "uuid") {
            pos = box.read(data, pos + mp4lib.fields.FIELD_INT8.getLength() * 16 + 8, pos + size);
            uuid = null;
        } else {
            pos = box.read(data, pos + 8, pos + size);
        }

        // in debug mode, sourcebuffer is copied to each box,
        // so any invalid deserializations may be found by comparing
        // source buffer with serialized box
        if (mp4lib.debug) {
            box.__sourceBuffer = data.subarray(pos - box.size, pos);
        }

        //if boxtype is unknown, don't add it to the list box
        if (box.boxtype) {
            this.boxes.push(box);
        }

        if (box.size <= 0 || box.size === null) {
            throw new mp4lib.ParseException('Problem on size of box ' + box.boxtype +
                ', parsing stopped to avoid infinite loop');
        }
    }
};

/**
find child position
*/
mp4lib.boxes.File.prototype.getBoxOffsetByType = function(boxType) {
    var offset = 0,
        i = 0;

    for (i = 0; i < this.boxes.length; i++) {
        if (this.boxes[i].boxtype === boxType) {
            return offset;
        }
        offset += this.boxes[i].size;
    }
    return -1;
};

mp4lib.boxes.File.prototype.getBoxIndexByType = function(boxType) {
    var index = 0,
        i = 0;

    for (i = 0; i < this.boxes.length; i++) {
        if (this.boxes[i].boxtype === boxType) {
            return index;
        }
        index++;
    }
    return -1;
};


// ---------- Generic Box -------------------------------
mp4lib.boxes.Box = function(boxType, size, uuid, largesize) {
    this.size = size || null;
    this.boxtype = boxType;
    //large size management to do...
    if (this.size === 1 && largesize) {
        this.largesize = largesize;
    }

    if (uuid) {
        this.extended_type = uuid;
    }

    this.localPos = 0;
    this.localEnd = 0;
};

mp4lib.boxes.Box.prototype.write = function(data, pos) {
    this.localPos = pos;
    var i = 0;

    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.size);
    //if extended_type is not defined, boxtype must have this.boxtype value
    if (!this.extended_type) {
        this._writeData(data, mp4lib.fields.FIELD_ID, this.boxtype);
    } else { //if extended_type is defined, boxtype must have 'uuid' value
        this._writeData(data, mp4lib.fields.FIELD_ID, 'uuid');
    }

    if (this.size === 1) {
        this._writeData(data, mp4lib.fields.FIELD_INT64, this.largesize);
    }

    if (this.extended_type) {
        for (i = 0; i < 16; i++) {
            this._writeData(data, mp4lib.fields.FIELD_INT8, this.extended_type[i]);
        }
    }
};

mp4lib.boxes.Box.prototype.getBoxByType = function(boxType) {
    var i = 0;
    if (this.hasOwnProperty('boxes')) {
        for (i = 0; i < this.boxes.length; i++) {
            if (this.boxes[i].boxtype === boxType) {
                return this.boxes[i];
            }
        }
    }
    return null;
};


mp4lib.boxes.Box.prototype.getBoxesByType = function(boxType) {
    var resu = [],
        i = 0;
    if (this.hasOwnProperty('boxes')) {
        for (i = 0; i < this.boxes.length; i++) {
            if (this.boxes[i].boxtype === boxType) {
                resu.push(this.boxes[i]);
            }
        }
    }
    return resu;
};

/**
remove child from a box
*/
mp4lib.boxes.Box.prototype.removeBoxByType = function(boxType) {
    var i = 0;

    if (this.hasOwnProperty('boxes')) {
        for (i = 0; i < this.boxes.length; i++) {
            if (this.boxes[i].boxtype === boxType) {
                this.boxes.splice(i, 1);
            }
        }
    } else {
        mp4lib.warningHandler('' + this.boxtype + 'does not have ' + boxType + ' box, impossible to remove it');
    }
};

/**
find child position
*/
mp4lib.boxes.Box.prototype.getBoxOffsetByType = function(boxType) {
    var offset = 8,
        i = 0;

    if (this.hasOwnProperty('boxes')) {
        for (i = 0; i < this.boxes.length; i++) {
            if (this.boxes[i].boxtype === boxType) {
                return offset;
            }
            offset += this.boxes[i].size;
        }
    }
    return null;
};

mp4lib.boxes.Box.prototype.getBoxIndexByType = function(boxType) {
    var index = 0,
        i = 0;

    if (this.hasOwnProperty('boxes')) {
        for (i = 0; i < this.boxes.length; i++) {
            if (this.boxes[i].boxtype === boxType) {
                return index;
            }
            index++;
        }
    }
    return null;
};

mp4lib.boxes.Box.prototype.computeLength = function() {
    this.size = mp4lib.fields.FIELD_UINT32.getLength() + mp4lib.fields.FIELD_ID.getLength(); //size and boxtype length

    /*if (this.size === 1) {
        this.size += mp4lib.fields.FIELD_INT64.getLength(); //add large_size length
    }*/
    if (this.extended_type) {
        this.size += mp4lib.fields.FIELD_INT8.getLength() * 16; //add extended_type length.
    }
};

mp4lib.boxes.Box.prototype._readData = function(data, dataType) {
    var resu = dataType.read(data, this.localPos, this.localEnd);
    this.localPos += dataType.getLength(resu);
    return resu;
};

mp4lib.boxes.Box.prototype._writeData = function(data, dataType, dataField) {
    if (dataField === undefined || dataField === null) {
        throw new mp4lib.ParseException('a field to write is null or undefined for box : ' + this.boxtype);
    } else {
        dataType.write(data, this.localPos, dataField);
        this.localPos += dataType.getLength(dataField);
    }
};

mp4lib.boxes.Box.prototype._writeBuffer = function(data, dataField, size) {
    data.set(dataField, this.localPos);
    this.localPos += size;
};

mp4lib.boxes.Box.prototype._writeArrayData = function(data, dataArrayType, array) {
    var i = 0;

    if (array === undefined || array === null || array.length === 0) {
        throw new mp4lib.ParseException('an array to write is null, undefined or length = 0 for box : ' + this.boxtype);
    }

    for (i = 0; i < array.length; i++) {
        this._writeData(data, dataArrayType, array[i]);
    }
};

mp4lib.boxes.Box.prototype._readArrayData = function(data, dataArrayType) {
    var array = [],
        dataArrayTypeLength = dataArrayType.getLength(),
        size = (this.localEnd - this.localPos) / dataArrayTypeLength,
        i = 0;

    for (i = 0; i < size; i++) {
        array.push(dataArrayType.read(data, this.localPos));
        this.localPos += dataArrayTypeLength;
    }
    return array;
};

mp4lib.boxes.Box.prototype._readArrayFieldData = function(data, dataArrayType, arraySize) {
    var innerFieldLength = -1,
        array = [],
        i = 0;

    for (i = 0; i < arraySize; i++) {

        array.push(dataArrayType.read(data, this.localPos));

        if (innerFieldLength === -1) {
            innerFieldLength = dataArrayType.getLength(array[i]);
        }
        // it may happen that the size of field depends on the box flags,
        // we need to count is having box and first structure constructed

        this.localPos += innerFieldLength;
    }
    return array;
};

// ---------- Abstract Container Box -------------------------------
mp4lib.boxes.ContainerBox = function(boxType, size) {
    mp4lib.boxes.Box.call(this, boxType, size);
    this.boxes = [];
};

mp4lib.boxes.ContainerBox.prototype = Object.create(mp4lib.boxes.Box.prototype);
mp4lib.boxes.ContainerBox.prototype.constructor = mp4lib.boxes.ContainerBox;

mp4lib.boxes.ContainerBox.prototype.computeLength = function() {
    mp4lib.boxes.Box.prototype.computeLength.call(this);
    var i = 0;
    for (i = 0; i < this.boxes.length; i++) {
        this.boxes[i].computeLength();
        this.size += this.boxes[i].size;
    }
};

mp4lib.boxes.ContainerBox.prototype.write = function(data, pos) {
    mp4lib.boxes.Box.prototype.write.call(this, data, pos);
    var i = 0;

    for (i = 0; i < this.boxes.length; i++) {
        this.localPos = this.boxes[i].write(data, this.localPos);
    }

    return this.localPos;
};

mp4lib.boxes.ContainerBox.prototype.read = function(data, pos, end) {
    var size = 0,
        uuidFieldPos = 0,
        uuid = null,
        boxtype,
        box;

    while (pos < end) {
        // Read box size
        size = mp4lib.fields.FIELD_UINT32.read(data, pos);

        // Read boxtype
        boxtype = mp4lib.fields.readString(data, pos + 4, 4);

        // Extented type?
        if (boxtype === "uuid") {
            uuidFieldPos = (size == 1) ? 16 : 8;
            uuid = new mp4lib.fields.ArrayField(mp4lib.fields.FIELD_INT8, 16).read(data, pos + uuidFieldPos, pos + uuidFieldPos + 16);
            uuid = JSON.stringify(uuid);
        }

        box = mp4lib.createBox(boxtype, size, uuid);
        if (boxtype === "uuid") {
            pos = box.read(data, pos + mp4lib.fields.FIELD_INT8.getLength() * 16 + 8, pos + size);
            uuid = null;
        } else {
            pos = box.read(data, pos + 8, pos + size);
        }

        // in debug mode, sourcebuffer is copied to each box,
        // so any invalid deserializations may be found by comparing
        // source buffer with serialized box
        if (mp4lib.debug) {
            box.__sourceBuffer = data.subarray(pos - box.size, pos);
        }
        
        //if boxtype is unknown, don't add it to the list box
        if (box.boxtype) {
            this.boxes.push(box);
        }

        if (box.size <= 0 || box.size === null) {
            throw new mp4lib.ParseException('Problem on size of box ' + box.boxtype +
                ', parsing stopped to avoid infinite loop');
        }
    }

    return pos;
};

// ---------- Full Box -------------------------------
mp4lib.boxes.FullBox = function(boxType, size, uuid) {
    mp4lib.boxes.Box.call(this, boxType, size, uuid);
    this.version = null;
    this.flags = null;
};

mp4lib.boxes.FullBox.prototype = Object.create(mp4lib.boxes.Box.prototype);
mp4lib.boxes.FullBox.prototype.constructor = mp4lib.boxes.FullBox;

mp4lib.boxes.FullBox.prototype.read = function(data, pos, end) {
    this.localPos = pos;
    this.localEnd = end;
    this.version = this._readData(data, mp4lib.fields.FIELD_INT8);
    this.flags = this._readData(data, mp4lib.fields.FIELD_BIT24);
};

mp4lib.boxes.FullBox.prototype.write = function(data, pos) {
    mp4lib.boxes.Box.prototype.write.call(this, data, pos);

    this._writeData(data, mp4lib.fields.FIELD_INT8, this.version);
    this._writeData(data, mp4lib.fields.FIELD_BIT24, this.flags);
};

mp4lib.boxes.FullBox.prototype.getFullBoxAttributesLength = function() {
    this.size += mp4lib.fields.FIELD_INT8.getLength() + mp4lib.fields.FIELD_BIT24.getLength(); //version and flags size
};

mp4lib.boxes.FullBox.prototype.computeLength = function() {
    mp4lib.boxes.Box.prototype.computeLength.call(this);
    mp4lib.boxes.FullBox.prototype.getFullBoxAttributesLength.call(this);
};

// ---------- Abstract Container FullBox -------------------------------
mp4lib.boxes.ContainerFullBox = function(boxType, size) {
    mp4lib.boxes.FullBox.call(this, boxType, size);
    this.boxes = [];
};

mp4lib.boxes.ContainerFullBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);
mp4lib.boxes.ContainerFullBox.prototype.constructor = mp4lib.boxes.ContainerFullBox;

mp4lib.boxes.ContainerFullBox.prototype.computeLength = function(isEntryCount) {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    var i = 0;

    if (isEntryCount) {
        this.size += mp4lib.fields.FIELD_UINT32.getLength();
    }

    for (i = 0; i < this.boxes.length; i++) {
        this.boxes[i].computeLength();
        this.size += this.boxes[i].size;
    }
};

mp4lib.boxes.ContainerFullBox.prototype.read = function(data, pos, end, isEntryCount) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);
    var size = 0,
        uuidFieldPos = 0,
        uuid = null,
        boxtype, box;

    if (isEntryCount) {
        this.entry_count = this._readData(data, mp4lib.fields.FIELD_UINT32);
    }

    while (this.localPos < this.localEnd) {
        // Read box size
        size = mp4lib.fields.FIELD_UINT32.read(data, this.localPos);

        // Read boxtype
        boxtype = mp4lib.fields.readString(data, this.localPos + 4, 4);

        // Extented type?
        if (boxtype == "uuid") {
            uuidFieldPos = (size == 1) ? 16 : 8;
            uuid = new mp4lib.fields.ArrayField(mp4lib.fields.FIELD_INT8, 16).read(data, this.localPos + uuidFieldPos, this.localPos + uuidFieldPos + 16);
            uuid = JSON.stringify(uuid);
        }

        box = mp4lib.createBox(boxtype, size, uuid);
        if (boxtype === "uuid") {
            this.localPos = box.read(data, this.localPos + mp4lib.fields.FIELD_INT8.getLength() * 16 + 8, this.localPos + size);
            uuid = null;
        } else {
            this.localPos = box.read(data, this.localPos + 8, this.localPos + size);
        }

        // in debug mode, sourcebuffer is copied to each box,
        // so any invalid deserializations may be found by comparing
        // source buffer with serialized box
        if (mp4lib.debug) {
            box.__sourceBuffer = data.subarray(this.localPos - box.size, this.localPos);
        }

        if (box.boxtype) {
            this.boxes.push(box);
        }

        if (box.size <= 0 || box.size === null) {
            throw new mp4lib.ParseException('Problem on size of box ' + box.boxtype +
                ', parsing stopped to avoid infinite loop');
        }
    }

    return this.localPos;
};

mp4lib.boxes.ContainerFullBox.prototype.write = function(data, pos, isEntryCount) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);
    var i = 0;

    if (isEntryCount === true) {
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.entry_count);
    }

    for (i = 0; i < this.boxes.length; i++) {
        this.localPos = this.boxes[i].write(data, this.localPos);
    }

    return this.localPos;
};

// ----------- Unknown Box -----------------------------

mp4lib.boxes.UnknownBox = function(size) {
    mp4lib.boxes.Box.call(this, null, size);
};

mp4lib.boxes.UnknownBox.prototype = Object.create(mp4lib.boxes.Box.prototype);
mp4lib.boxes.UnknownBox.prototype.constructor = mp4lib.boxes.UnknownBox;

mp4lib.boxes.UnknownBox.prototype.read = function(data, pos, end) {
    this.localPos = pos;
    this.localEnd = end;

    this.unrecognized_data = data.subarray(this.localPos, this.localEnd);

    return this.localEnd;
};

mp4lib.boxes.UnknownBox.prototype.write = function(data, pos) {
    mp4lib.boxes.Box.prototype.write.call(this, data, pos);

    this._writeBuffer(data, this.unrecognized_data, this.unrecognized_data.length);

    return this.localPos;
};

mp4lib.boxes.UnknownBox.prototype.computeLength = function() {
    mp4lib.boxes.Box.prototype.computeLength.call(this);
    this.size += this.unrecognized_data.length;
};

// --------------------------- ftyp ----------------------------------

mp4lib.boxes.FileTypeBox = function(size) {
    mp4lib.boxes.Box.call(this, 'ftyp', size);
};

mp4lib.boxes.FileTypeBox.prototype = Object.create(mp4lib.boxes.Box.prototype);
mp4lib.boxes.FileTypeBox.prototype.constructor = mp4lib.boxes.FileTypeBox;

mp4lib.boxes.FileTypeBox.prototype.computeLength = function() {
    mp4lib.boxes.Box.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_INT32.getLength() * 2 + mp4lib.fields.FIELD_INT32.getLength() * this.compatible_brands.length;
};

mp4lib.boxes.FileTypeBox.prototype.read = function(data, pos, end) {
    this.localPos = pos;
    this.localEnd = end;

    this.major_brand = this._readData(data, mp4lib.fields.FIELD_INT32);
    this.minor_brand = this._readData(data, mp4lib.fields.FIELD_INT32);
    this.compatible_brands = this._readArrayData(data, mp4lib.fields.FIELD_INT32);

    return this.localPos;
};

mp4lib.boxes.FileTypeBox.prototype.write = function(data, pos) {
    mp4lib.boxes.Box.prototype.write.call(this, data, pos);

    this._writeData(data, mp4lib.fields.FIELD_INT32, this.major_brand);
    this._writeData(data, mp4lib.fields.FIELD_INT32, this.minor_brand);
    this._writeArrayData(data, mp4lib.fields.FIELD_INT32, this.compatible_brands);

    return this.localPos;
};
// --------------------------- moov ----------------------------------

mp4lib.boxes.MovieBox = function(size) {
    mp4lib.boxes.ContainerBox.call(this, 'moov', size);
};

mp4lib.boxes.MovieBox.prototype = Object.create(mp4lib.boxes.ContainerBox.prototype);
mp4lib.boxes.MovieBox.prototype.constructor = mp4lib.boxes.MovieBox;

// --------------------------- moof ----------------------------------
mp4lib.boxes.MovieFragmentBox = function(size) {
    mp4lib.boxes.ContainerBox.call(this, 'moof', size);
};

mp4lib.boxes.MovieFragmentBox.prototype = Object.create(mp4lib.boxes.ContainerBox.prototype);
mp4lib.boxes.MovieFragmentBox.prototype.constructor = mp4lib.boxes.MovieFragmentBox;

// --------------------------- mfra ----------------------------------
mp4lib.boxes.MovieFragmentRandomAccessBox = function(size) {
    mp4lib.boxes.ContainerBox.call(this, 'mfra', size);
};

mp4lib.boxes.MovieFragmentRandomAccessBox.prototype = Object.create(mp4lib.boxes.ContainerBox.prototype);
mp4lib.boxes.MovieFragmentRandomAccessBox.prototype.constructor = mp4lib.boxes.MovieFragmentRandomAccessBox;

// --------------------------- udta ----------------------------------
mp4lib.boxes.UserDataBox = function(size) {
    mp4lib.boxes.ContainerBox.call(this, 'udta', size);
};

mp4lib.boxes.UserDataBox.prototype = Object.create(mp4lib.boxes.ContainerBox.prototype);
mp4lib.boxes.UserDataBox.prototype.constructor = mp4lib.boxes.UserDataBox;

// --------------------------- trak ----------------------------------
mp4lib.boxes.TrackBox = function(size) {
    mp4lib.boxes.ContainerBox.call(this, 'trak', size);
};

mp4lib.boxes.TrackBox.prototype = Object.create(mp4lib.boxes.ContainerBox.prototype);
mp4lib.boxes.TrackBox.prototype.constructor = mp4lib.boxes.TrackBox;

// --------------------------- edts ----------------------------------
mp4lib.boxes.EditBox = function(size) {
    mp4lib.boxes.ContainerBox.call(this, 'edts', size);
};

mp4lib.boxes.EditBox.prototype = Object.create(mp4lib.boxes.ContainerBox.prototype);
mp4lib.boxes.EditBox.prototype.constructor = mp4lib.boxes.EditBox;

// --------------------------- mdia ----------------------------------
mp4lib.boxes.MediaBox = function(size) {
    mp4lib.boxes.ContainerBox.call(this, 'mdia', size);
};

mp4lib.boxes.MediaBox.prototype = Object.create(mp4lib.boxes.ContainerBox.prototype);
mp4lib.boxes.MediaBox.prototype.constructor = mp4lib.boxes.MediaBox;

// --------------------------- minf ----------------------------------
mp4lib.boxes.MediaInformationBox = function(size) {
    mp4lib.boxes.ContainerBox.call(this, 'minf', size);
};

mp4lib.boxes.MediaInformationBox.prototype = Object.create(mp4lib.boxes.ContainerBox.prototype);
mp4lib.boxes.MediaInformationBox.prototype.constructor = mp4lib.boxes.MediaInformationBox;

// --------------------------- dinf ----------------------------------
mp4lib.boxes.DataInformationBox = function(size) {
    mp4lib.boxes.ContainerBox.call(this, 'dinf', size);
};

mp4lib.boxes.DataInformationBox.prototype = Object.create(mp4lib.boxes.ContainerBox.prototype);
mp4lib.boxes.DataInformationBox.prototype.constructor = mp4lib.boxes.DataInformationBox;

// --------------------------- stbl ----------------------------------
mp4lib.boxes.SampleTableBox = function(size) {
    mp4lib.boxes.ContainerBox.call(this, 'stbl', size);
};

mp4lib.boxes.SampleTableBox.prototype = Object.create(mp4lib.boxes.ContainerBox.prototype);
mp4lib.boxes.SampleTableBox.prototype.constructor = mp4lib.boxes.SampleTableBox;

// --------------------------- mvex ----------------------------------
mp4lib.boxes.MovieExtendsBox = function(size) {
    mp4lib.boxes.ContainerBox.call(this, 'mvex', size);
};

mp4lib.boxes.MovieExtendsBox.prototype = Object.create(mp4lib.boxes.ContainerBox.prototype);
mp4lib.boxes.MovieExtendsBox.prototype.constructor = mp4lib.boxes.MovieExtendsBox;

// --------------------------- traf ----------------------------------
mp4lib.boxes.TrackFragmentBox = function(size) {
    mp4lib.boxes.ContainerBox.call(this, 'traf', size);
};

mp4lib.boxes.TrackFragmentBox.prototype = Object.create(mp4lib.boxes.ContainerBox.prototype);
mp4lib.boxes.TrackFragmentBox.prototype.constructor = mp4lib.boxes.TrackFragmentBox;

// --------------------------- meta -----------------------------
mp4lib.boxes.MetaBox = function(size) {
    mp4lib.boxes.ContainerFullBox.call(this, 'meta', size);
};

mp4lib.boxes.MetaBox.prototype = Object.create(mp4lib.boxes.ContainerFullBox.prototype);
mp4lib.boxes.MetaBox.prototype.constructor = mp4lib.boxes.MetaBox;

mp4lib.boxes.MetaBox.prototype.computeLength = function() {
    mp4lib.boxes.ContainerFullBox.prototype.computeLength.call(this, false);
};

mp4lib.boxes.MetaBox.prototype.read = function(data, pos, end) {
    return mp4lib.boxes.ContainerFullBox.prototype.read.call(this, data, pos, end, false);
};

mp4lib.boxes.MetaBox.prototype.write = function(data, pos) {
    return mp4lib.boxes.ContainerFullBox.prototype.write.call(this, data, pos, false);
};

// --------------------------- mvhd ----------------------------------
mp4lib.boxes.MovieHeaderBox = function(size) {
    mp4lib.boxes.FullBox.call(this, 'mvhd', size);
};

mp4lib.boxes.MovieHeaderBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);
mp4lib.boxes.MovieHeaderBox.prototype.constructor = mp4lib.boxes.MovieHeaderBox;

mp4lib.boxes.MovieHeaderBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);

    this.size += mp4lib.fields.FIELD_INT32.getLength() /*rate size*/ + mp4lib.fields.FIELD_INT16.getLength() * 2 /*volume size and reserved size*/ ;
    this.size += mp4lib.fields.FIELD_INT32.getLength() * 2 /*reserved_2 size*/ + mp4lib.fields.FIELD_INT32.getLength() * 9 /*matrix size*/ ;
    this.size += mp4lib.fields.FIELD_BIT32.getLength() * 6 /*pre_defined size*/ + mp4lib.fields.FIELD_UINT32.getLength() /*next_track_ID size*/ ;
    if (this.version === 1) {
        this.size += mp4lib.fields.FIELD_UINT64.getLength() * 3 + mp4lib.fields.FIELD_UINT32.getLength();
    } else {
        this.size += mp4lib.fields.FIELD_UINT32.getLength() * 4;
    }
};

mp4lib.boxes.MovieHeaderBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);

    if (this.version === 1) {
        this._writeData(data, mp4lib.fields.FIELD_UINT64, this.creation_time);
        this._writeData(data, mp4lib.fields.FIELD_UINT64, this.modification_time);
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.timescale);
        this._writeData(data, mp4lib.fields.FIELD_UINT64, this.duration);
    } else {
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.creation_time);
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.modification_time);
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.timescale);
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.duration);
    }

    this._writeData(data, mp4lib.fields.FIELD_INT32, this.rate);
    this._writeData(data, mp4lib.fields.FIELD_INT16, this.volume);
    this._writeData(data, mp4lib.fields.FIELD_INT16, this.reserved);
    this._writeArrayData(data, mp4lib.fields.FIELD_INT32, this.reserved_2);
    this._writeArrayData(data, mp4lib.fields.FIELD_INT32, this.matrix);
    this._writeArrayData(data, mp4lib.fields.FIELD_BIT32, this.pre_defined);
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.next_track_ID);

    return this.localPos;
};

mp4lib.boxes.MovieHeaderBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);

    if (this.version == 1) {
        this.creation_time = this._readData(data, mp4lib.fields.FIELD_UINT64);
        this.modification_time = this._readData(data, mp4lib.fields.FIELD_UINT64);
        this.timescale = this._readData(data, mp4lib.fields.FIELD_UINT32);
        this.duration = this._readData(data, mp4lib.fields.FIELD_UINT64);
    } else {
        this.creation_time = this._readData(data, mp4lib.fields.FIELD_UINT32);
        this.modification_time = this._readData(data, mp4lib.fields.FIELD_UINT32);
        this.timescale = this._readData(data, mp4lib.fields.FIELD_UINT32);
        this.duration = this._readData(data, mp4lib.fields.FIELD_UINT32);
    }

    this.rate = this._readData(data, mp4lib.fields.FIELD_INT32);
    this.volume = this._readData(data, mp4lib.fields.FIELD_INT16);
    this.reserved = this._readData(data, mp4lib.fields.FIELD_INT16);
    this.reserved_2 = this._readArrayFieldData(data, mp4lib.fields.FIELD_INT32, 2);
    this.matrix = this._readArrayFieldData(data, mp4lib.fields.FIELD_INT32, 9);
    this.pre_defined = this._readArrayFieldData(data, mp4lib.fields.FIELD_BIT32, 6);
    this.next_track_ID = this._readData(data, mp4lib.fields.FIELD_UINT32);

    return this.localPos;
};

// --------------------------- mdat ----------------------------------
mp4lib.boxes.MediaDataBox = function(size) {
    mp4lib.boxes.Box.call(this, 'mdat', size);
};

mp4lib.boxes.MediaDataBox.prototype = Object.create(mp4lib.boxes.Box.prototype);
mp4lib.boxes.MediaDataBox.prototype.constructor = mp4lib.boxes.MediaDataBox;

mp4lib.boxes.MediaDataBox.prototype.computeLength = function() {
    mp4lib.boxes.Box.prototype.computeLength.call(this);
    this.size += this.data.length;
};

mp4lib.boxes.MediaDataBox.prototype.read = function(data, pos, end) {
    this.data = data.subarray(pos, end);

    return end;
};

mp4lib.boxes.MediaDataBox.prototype.write = function(data, pos) {
    mp4lib.boxes.Box.prototype.write.call(this, data, pos);

    this._writeBuffer(data, this.data, this.data.length);

    return this.localPos;
};

// --------------------------- free ----------------------------------
mp4lib.boxes.FreeSpaceBox = function(size) {
    mp4lib.boxes.Box.call(this, 'free', size);
};

mp4lib.boxes.FreeSpaceBox.prototype = Object.create(mp4lib.boxes.Box.prototype);
mp4lib.boxes.FreeSpaceBox.prototype.constructor = mp4lib.boxes.FreeSpaceBox;

mp4lib.boxes.FreeSpaceBox.prototype.computeLength = function() {
    mp4lib.boxes.Box.prototype.computeLength.call(this);
    this.size += this.data.length;
};

mp4lib.boxes.FreeSpaceBox.prototype.read = function(data, pos, end) {
    this.localPos = pos;
    this.localEnd = end;
    this.data = data.subarray(this.localPos, this.localEnd);
    return this.localEnd;
};

mp4lib.boxes.FreeSpaceBox.prototype.write = function(data, pos) {
    mp4lib.boxes.Box.prototype.write.call(this, data, pos);

    this._writeBuffer(data, this.data, this.data.length);

    return this.localPos;
};

// --------------------------- sidx ----------------------------------
mp4lib.boxes.SegmentIndexBox = function(size) {
    mp4lib.boxes.FullBox.call(this, 'sidx', size);
};

mp4lib.boxes.SegmentIndexBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);
mp4lib.boxes.SegmentIndexBox.prototype.constructor = mp4lib.boxes.SegmentIndexBox;

mp4lib.boxes.SegmentIndexBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);

    this.size += mp4lib.fields.FIELD_UINT32.getLength() * 2; /* reference_ID and timescale size*/
    if (this.version === 1) {
        this.size += mp4lib.fields.FIELD_UINT64.getLength() * 2; /* earliest_presentation_time and first_offset size*/
    } else {
        this.size += mp4lib.fields.FIELD_UINT32.getLength() * 2; /* earliest_presentation_time and first_offset size*/
    }
    this.size += mp4lib.fields.FIELD_UINT16.getLength(); /* reserved size*/
    this.size += mp4lib.fields.FIELD_UINT16.getLength(); /* reference_count size*/
    this.size += (mp4lib.fields.FIELD_UINT64.getLength() /* reference_info size*/ + mp4lib.fields.FIELD_UINT32.getLength() /* SAP size*/ ) * this.reference_count;
};


mp4lib.boxes.SegmentIndexBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);

    var i = 0,
        struct = {};

    this.reference_ID = this._readData(data, mp4lib.fields.FIELD_UINT32);
    this.timescale = this._readData(data, mp4lib.fields.FIELD_UINT32);

    if (this.version === 1) {
        this.earliest_presentation_time = this._readData(data, mp4lib.fields.FIELD_UINT64);
        this.first_offset = this._readData(data, mp4lib.fields.FIELD_UINT64);
    } else {
        this.earliest_presentation_time = this._readData(data, mp4lib.fields.FIELD_UINT32);
        this.first_offset = this._readData(data, mp4lib.fields.FIELD_UINT32);
    }
    this.reserved = this._readData(data, mp4lib.fields.FIELD_UINT16);
    this.reference_count = this._readData(data, mp4lib.fields.FIELD_UINT16);

    this.references = [];

    for (i = 0; i < this.reference_count; i++) {
        struct = {};

        struct.reference_info = this._readData(data, mp4lib.fields.FIELD_UINT64);
        struct.SAP = this._readData(data, mp4lib.fields.FIELD_UINT32);

        this.references.push(struct);
    }

    return this.localPos;
};

mp4lib.boxes.SegmentIndexBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);
    var i = 0;

    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.reference_ID);
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.timescale);

    if (this.version === 1) {
        this._writeData(data, mp4lib.fields.FIELD_UINT64, this.earliest_presentation_time);
        this._writeData(data, mp4lib.fields.FIELD_UINT64, this.first_offset);
    } else {
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.earliest_presentation_time);
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.first_offset);
    }

    this._writeData(data, mp4lib.fields.FIELD_UINT16, this.reserved);
    this._writeData(data, mp4lib.fields.FIELD_UINT16, this.reference_count);

    for (i = 0; i < this.reference_count; i++) {
        this._writeData(data, mp4lib.fields.FIELD_UINT64, this.references[i].reference_info);
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.references[i].SAP);
    }
    return this.localPos;
};

// --------------------------- tkhd ----------------------------------
mp4lib.boxes.TrackHeaderBox = function(size) {
    mp4lib.boxes.FullBox.call(this, 'tkhd', size);
};

mp4lib.boxes.TrackHeaderBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);
mp4lib.boxes.TrackHeaderBox.prototype.constructor = mp4lib.boxes.TrackHeaderBox;

mp4lib.boxes.TrackHeaderBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_INT16.getLength() * 4 + mp4lib.fields.FIELD_INT32.getLength() * 2 + mp4lib.fields.FIELD_UINT32.getLength() * 2 + mp4lib.fields.FIELD_INT32.getLength() * 9;
    if (this.version == 1) {
        this.size += mp4lib.fields.FIELD_UINT64.getLength() * 3 + mp4lib.fields.FIELD_UINT32.getLength() * 2;
    } else {
        this.size += mp4lib.fields.FIELD_UINT32.getLength() * 5;
    }
};

mp4lib.boxes.TrackHeaderBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);

    if (this.version === 1) {
        this.creation_time = this._readData(data, mp4lib.fields.FIELD_UINT64);
        this.modification_time = this._readData(data, mp4lib.fields.FIELD_UINT64);
        this.track_id = this._readData(data, mp4lib.fields.FIELD_UINT32);
        this.reserved = this._readData(data, mp4lib.fields.FIELD_UINT32);
        this.duration = this._readData(data, mp4lib.fields.FIELD_UINT64);
    } else {
        this.creation_time = this._readData(data, mp4lib.fields.FIELD_UINT32);
        this.modification_time = this._readData(data, mp4lib.fields.FIELD_UINT32);
        this.track_id = this._readData(data, mp4lib.fields.FIELD_UINT32);
        this.reserved = this._readData(data, mp4lib.fields.FIELD_UINT32);
        this.duration = this._readData(data, mp4lib.fields.FIELD_UINT32);
    }

    this.reserved_2 = this._readArrayFieldData(data, mp4lib.fields.FIELD_UINT32, 2);
    this.layer = this._readData(data, mp4lib.fields.FIELD_INT16);
    this.alternate_group = this._readData(data, mp4lib.fields.FIELD_INT16);
    this.volume = this._readData(data, mp4lib.fields.FIELD_INT16);
    this.reserved_3 = this._readData(data, mp4lib.fields.FIELD_INT16);
    this.matrix = this._readArrayFieldData(data, mp4lib.fields.FIELD_INT32, 9);
    this.width = this._readData(data, mp4lib.fields.FIELD_INT32);
    this.height = this._readData(data, mp4lib.fields.FIELD_INT32);
    return this.localPos;
};

mp4lib.boxes.TrackHeaderBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);

    if (this.version === 1) {
        this._writeData(data, mp4lib.fields.FIELD_UINT64, this.creation_time);
        this._writeData(data, mp4lib.fields.FIELD_UINT64, this.modification_time);
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.track_id);
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.reserved);
        this._writeData(data, mp4lib.fields.FIELD_UINT64, this.duration);
    } else {
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.creation_time);
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.modification_time);
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.track_id);
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.reserved);
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.duration);
    }

    this._writeArrayData(data, mp4lib.fields.FIELD_UINT32, this.reserved_2);
    this._writeData(data, mp4lib.fields.FIELD_INT16, this.layer);
    this._writeData(data, mp4lib.fields.FIELD_INT16, this.alternate_group);
    this._writeData(data, mp4lib.fields.FIELD_INT16, this.volume);
    this._writeData(data, mp4lib.fields.FIELD_INT16, this.reserved_3);
    this._writeArrayData(data, mp4lib.fields.FIELD_INT32, this.matrix);
    this._writeData(data, mp4lib.fields.FIELD_INT32, this.width);
    this._writeData(data, mp4lib.fields.FIELD_INT32, this.height);
    return this.localPos;
};

// --------------------------- mdhd ----------------------------------
mp4lib.boxes.MediaHeaderBox = function(size) {
    mp4lib.boxes.FullBox.call(this, 'mdhd', size);
};

mp4lib.boxes.MediaHeaderBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);
mp4lib.boxes.MediaHeaderBox.prototype.constructor = mp4lib.boxes.MediaHeaderBox;

mp4lib.boxes.MediaHeaderBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_UINT16.getLength() * 2;
    if (this.version == 1) {
        this.size += mp4lib.fields.FIELD_UINT64.getLength() * 3 + mp4lib.fields.FIELD_UINT32.getLength();
    } else {
        this.size += mp4lib.fields.FIELD_UINT32.getLength() * 4;
    }
};

mp4lib.boxes.MediaHeaderBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);

    if (this.version === 1) {
        this.creation_time = this._readData(data, mp4lib.fields.FIELD_UINT64);
        this.modification_time = this._readData(data, mp4lib.fields.FIELD_UINT64);
        this.timescale = this._readData(data, mp4lib.fields.FIELD_UINT32);
        this.duration = this._readData(data, mp4lib.fields.FIELD_UINT64);
    } else {
        this.creation_time = this._readData(data, mp4lib.fields.FIELD_UINT32);
        this.modification_time = this._readData(data, mp4lib.fields.FIELD_UINT32);
        this.timescale = this._readData(data, mp4lib.fields.FIELD_UINT32);
        this.duration = this._readData(data, mp4lib.fields.FIELD_UINT32);
    }

    this.language = this._readData(data, mp4lib.fields.FIELD_UINT16);
    this.pre_defined = this._readData(data, mp4lib.fields.FIELD_UINT16);
    return this.localPos;
};

mp4lib.boxes.MediaHeaderBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);

    if (this.version === 1) {
        this._writeData(data, mp4lib.fields.FIELD_UINT64, this.creation_time);
        this._writeData(data, mp4lib.fields.FIELD_UINT64, this.modification_time);
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.timescale);
        this._writeData(data, mp4lib.fields.FIELD_UINT64, this.duration);
    } else {
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.creation_time);
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.modification_time);
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.timescale);
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.duration);
    }

    this._writeData(data, mp4lib.fields.FIELD_UINT16, this.language);
    this._writeData(data, mp4lib.fields.FIELD_UINT16, this.pre_defined);
    return this.localPos;
};

// --------------------------- mehd ----------------------------------
mp4lib.boxes.MovieExtendsHeaderBox = function(size) {
    mp4lib.boxes.FullBox.call(this, 'mehd', size);
};

mp4lib.boxes.MovieExtendsHeaderBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);
mp4lib.boxes.MovieExtendsHeaderBox.prototype.constructor = mp4lib.boxes.MovieExtendsHeaderBox;

mp4lib.boxes.MovieExtendsHeaderBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    if (this.version == 1) {
        this.size += mp4lib.fields.FIELD_UINT64.getLength();
    } else {
        this.size += mp4lib.fields.FIELD_UINT32.getLength();
    }
};

mp4lib.boxes.MovieExtendsHeaderBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);

    if (this.version === 1) {
        this.fragment_duration = this._readData(data, mp4lib.fields.FIELD_UINT64);
    } else {
        this.fragment_duration = this._readData(data, mp4lib.fields.FIELD_UINT32);
    }
    return this.localPos;
};

mp4lib.boxes.MovieExtendsHeaderBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);

    if (this.version === 1) {
        this._writeData(data, mp4lib.fields.FIELD_UINT64, this.fragment_duration);
    } else {
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.fragment_duration);
    }
    return this.localPos;
};

// --------------------------- hdlr --------------------------------
mp4lib.boxes.HandlerBox = function(size) {
    mp4lib.boxes.FullBox.call(this, 'hdlr', size);
};

mp4lib.boxes.HandlerBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);
mp4lib.boxes.HandlerBox.prototype.constructor = mp4lib.boxes.HandlerBox;

//add NAN
mp4lib.boxes.HandlerBox.prototype.HANDLERTYPEVIDEO = "vide";
mp4lib.boxes.HandlerBox.prototype.HANDLERTYPEAUDIO = "soun";
mp4lib.boxes.HandlerBox.prototype.HANDLERTYPETEXT = "meta";
mp4lib.boxes.HandlerBox.prototype.HANDLERVIDEONAME = "Video Track";
mp4lib.boxes.HandlerBox.prototype.HANDLERAUDIONAME = "Audio Track";
mp4lib.boxes.HandlerBox.prototype.HANDLERTEXTNAME = "Text Track";

mp4lib.boxes.HandlerBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_UINT32.getLength() * 2 + mp4lib.fields.FIELD_UINT32.getLength() * 3 +
        mp4lib.fields.FIELD_STRING.getLength(this.name);
};

mp4lib.boxes.HandlerBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);

    this.pre_defined = this._readData(data, mp4lib.fields.FIELD_UINT32);
    this.handler_type = this._readData(data, mp4lib.fields.FIELD_UINT32);
    this.reserved = this._readArrayFieldData(data, mp4lib.fields.FIELD_UINT32, 3);
    this.name = this._readData(data, mp4lib.fields.FIELD_STRING);
    return this.localPos;
};

mp4lib.boxes.HandlerBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);

    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.pre_defined);
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.handler_type);
    this._writeArrayData(data, mp4lib.fields.FIELD_UINT32, this.reserved);
    this._writeData(data, mp4lib.fields.FIELD_STRING, this.name);
    return this.localPos;
};

// --------------------------- stts ----------------------------------
mp4lib.boxes.TimeToSampleBox = function(size) {
    mp4lib.boxes.FullBox.call(this, 'stts', size);
};

mp4lib.boxes.TimeToSampleBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);
mp4lib.boxes.TimeToSampleBox.prototype.constructor = mp4lib.boxes.TimeToSampleBox;

mp4lib.boxes.TimeToSampleBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_UINT32.getLength();
    this.size += this.entry_count * (mp4lib.fields.FIELD_UINT32.getLength() * 2);
};

mp4lib.boxes.TimeToSampleBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);
    var i = 0,
        struct = {};

    this.entry_count = this._readData(data, mp4lib.fields.FIELD_UINT32);

    this.entry = [];

    for (i = 0; i < this.entry_count; i++) {
        struct = {};

        struct.sample_count = this._readData(data, mp4lib.fields.FIELD_UINT32);
        struct.sample_delta = this._readData(data, mp4lib.fields.FIELD_UINT32);

        this.entry.push(struct);
    }
    return this.localPos;
};

mp4lib.boxes.TimeToSampleBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);
    var i = 0;

    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.entry_count);

    for (i = 0; i < this.entry_count; i++) {
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.entry[i].sample_count);
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.entry[i].sample_delta);
    }
    return this.localPos;
};

// --------------------------- stsc ----------------------------------
mp4lib.boxes.SampleToChunkBox = function(size) {
    mp4lib.boxes.FullBox.call(this, 'stsc', size);
};

mp4lib.boxes.SampleToChunkBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);
mp4lib.boxes.SampleToChunkBox.prototype.constructor = mp4lib.boxes.SampleToChunkBox;

mp4lib.boxes.SampleToChunkBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_UINT32.getLength();
    this.size += this.entry_count * (mp4lib.fields.FIELD_UINT32.getLength() * 3);
};

mp4lib.boxes.SampleToChunkBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);
    var i = 0,
        struct = {};

    this.entry_count = this._readData(data, mp4lib.fields.FIELD_UINT32);

    this.entry = [];

    for (i = 0; i < this.entry_count; i++) {
        struct = {};

        struct.first_chunk = this._readData(data, mp4lib.fields.FIELD_UINT32);
        struct.samples_per_chunk = this._readData(data, mp4lib.fields.FIELD_UINT32);
        struct.samples_description_index = this._readData(data, mp4lib.fields.FIELD_UINT32);

        this.entry.push(struct);
    }
    return this.localPos;
};

mp4lib.boxes.SampleToChunkBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);
    var i = 0;

    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.entry_count);
    for (i = 0; i < this.entry_count; i++) {
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.entry[i].first_chunk);
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.entry[i].samples_per_chunk);
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.entry[i].samples_description_index);
    }
    return this.localPos;
};

// --------------------------- stco ----------------------------------
mp4lib.boxes.ChunkOffsetBox = function(size) {
    mp4lib.boxes.FullBox.call(this, 'stco', size);
};

mp4lib.boxes.ChunkOffsetBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);
mp4lib.boxes.ChunkOffsetBox.prototype.constructor = mp4lib.boxes.ChunkOffsetBox;

mp4lib.boxes.ChunkOffsetBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_UINT32.getLength() + this.entry_count * mp4lib.fields.FIELD_UINT32.getLength();
};

mp4lib.boxes.ChunkOffsetBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);

    this.entry_count = this._readData(data, mp4lib.fields.FIELD_UINT32);
    this.chunk_offset = this._readArrayFieldData(data, mp4lib.fields.FIELD_UINT32, this.entry_count);
    return this.localPos;
};

mp4lib.boxes.ChunkOffsetBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);
    var i = 0;

    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.entry_count);

    for (i = 0; i < this.entry_count; i++) {
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.chunk_offset[i]);
    }
    return this.localPos;
};

// --------------------------- trex ----------------------------------
mp4lib.boxes.TrackExtendsBox = function(size) {
    mp4lib.boxes.FullBox.call(this, 'trex', size);
};

mp4lib.boxes.TrackExtendsBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);
mp4lib.boxes.TrackExtendsBox.prototype.constructor = mp4lib.boxes.TrackExtendsBox;

mp4lib.boxes.TrackExtendsBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_UINT32.getLength() * 5;
};

mp4lib.boxes.TrackExtendsBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);

    this.track_ID = this._readData(data, mp4lib.fields.FIELD_UINT32);
    this.default_sample_description_index = this._readData(data, mp4lib.fields.FIELD_UINT32);
    this.default_sample_duration = this._readData(data, mp4lib.fields.FIELD_UINT32);
    this.default_sample_size = this._readData(data, mp4lib.fields.FIELD_UINT32);
    this.default_sample_flags = this._readData(data, mp4lib.fields.FIELD_UINT32);
    return this.localPos;
};

mp4lib.boxes.TrackExtendsBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);

    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.track_ID);
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.default_sample_description_index);
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.default_sample_duration);
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.default_sample_size);
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.default_sample_flags);
    return this.localPos;
};

// --------------------------- vmhd ----------------------------------
mp4lib.boxes.VideoMediaHeaderBox = function(size) {
    mp4lib.boxes.FullBox.call(this, 'vmhd', size);
};

mp4lib.boxes.VideoMediaHeaderBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);
mp4lib.boxes.VideoMediaHeaderBox.prototype.constructor = mp4lib.boxes.VideoMediaHeaderBox;

mp4lib.boxes.VideoMediaHeaderBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_INT16.getLength() + mp4lib.fields.FIELD_UINT16.getLength() * 3;
};

mp4lib.boxes.VideoMediaHeaderBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);

    this.graphicsmode = this._readData(data, mp4lib.fields.FIELD_INT16);
    this.opcolor = this._readArrayFieldData(data, mp4lib.fields.FIELD_UINT16, 3);
    return this.localPos;
};

mp4lib.boxes.VideoMediaHeaderBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);

    this._writeData(data, mp4lib.fields.FIELD_INT16, this.graphicsmode);
    this._writeArrayData(data, mp4lib.fields.FIELD_UINT16, this.opcolor);
    return this.localPos;
};

// --------------------------- smhd ----------------------------------
mp4lib.boxes.SoundMediaHeaderBox = function(size) {
    mp4lib.boxes.FullBox.call(this, 'smhd', size);
};

mp4lib.boxes.SoundMediaHeaderBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);
mp4lib.boxes.SoundMediaHeaderBox.prototype.constructor = mp4lib.boxes.SoundMediaHeaderBox;

mp4lib.boxes.SoundMediaHeaderBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_INT16.getLength() + mp4lib.fields.FIELD_UINT16.getLength();
};

mp4lib.boxes.SoundMediaHeaderBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);

    this.balance = this._readData(data, mp4lib.fields.FIELD_INT16);
    this.reserved = this._readData(data, mp4lib.fields.FIELD_UINT16);
    return this.localPos;
};

mp4lib.boxes.SoundMediaHeaderBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);

    this._writeData(data, mp4lib.fields.FIELD_INT16, this.balance);
    this._writeData(data, mp4lib.fields.FIELD_UINT16, this.reserved);
    return this.localPos;
};

// --------------------------- dref ----------------------------------
mp4lib.boxes.DataReferenceBox = function(size) {
    mp4lib.boxes.ContainerFullBox.call(this, 'dref', size);
};

mp4lib.boxes.DataReferenceBox.prototype = Object.create(mp4lib.boxes.ContainerFullBox.prototype);
mp4lib.boxes.DataReferenceBox.prototype.constructor = mp4lib.boxes.DataReferenceBox;

mp4lib.boxes.DataReferenceBox.prototype.computeLength = function() {
    mp4lib.boxes.ContainerFullBox.prototype.computeLength.call(this, true);
};

mp4lib.boxes.DataReferenceBox.prototype.read = function(data, pos, end) {
    return mp4lib.boxes.ContainerFullBox.prototype.read.call(this, data, pos, end, true);
};

mp4lib.boxes.DataReferenceBox.prototype.write = function(data, pos) {
    if (!this.entry_count) {
        //if entry_count has not been set, set it to boxes array length
        this.entry_count = this.boxes.length;
    }
    return mp4lib.boxes.ContainerFullBox.prototype.write.call(this, data, pos, true);
};

// --------------------------- url  ----------------------------------
mp4lib.boxes.DataEntryUrlBox = function(size) {
    mp4lib.boxes.FullBox.call(this, 'url ', size);
};

mp4lib.boxes.DataEntryUrlBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);
mp4lib.boxes.DataEntryUrlBox.prototype.constructor = mp4lib.boxes.DataEntryUrlBox;

mp4lib.boxes.DataEntryUrlBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    //NAN : test on location value, not definition, probleme in IE
    if (this.location !== undefined /*&& this.location !==""*/ ) {
        //this.flags = this.flags | 1;
        this.size += mp4lib.fields.FIELD_STRING.getLength(this.location);
    }
};

mp4lib.boxes.DataEntryUrlBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);

    if (this.flags & '0x000001' === 0) {
        this.location = this._readData(data, mp4lib.fields.FIELD_STRING);
    }

    return this.localPos;
};

mp4lib.boxes.DataEntryUrlBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);

    if (this.location !== undefined /* && this.location !== ""*/ ) {
        this._writeData(data, mp4lib.fields.FIELD_STRING, this.location);
    }
    return this.localPos;
};

// --------------------------- urn  ----------------------------------
mp4lib.boxes.DataEntryUrnBox = function(size) {
    mp4lib.boxes.FullBox.call(this, 'urn ', size);
};

mp4lib.boxes.DataEntryUrnBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);
mp4lib.boxes.DataEntryUrnBox.prototype.constructor = mp4lib.boxes.DataEntryUrnBox;

mp4lib.boxes.DataEntryUrnBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    if (this.flags & '0x000001' === 0) {
        this.size += mp4lib.fields.FIELD_STRING.getLength(this.name) + mp4lib.fields.FIELD_STRING.getLength(this.location);
    }
};

mp4lib.boxes.DataEntryUrnBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);

    if (this.flags & '0x000001' === 0) {
        this.name = this._readData(data, mp4lib.fields.FIELD_STRING);
        this.location = this._readData(data, mp4lib.fields.FIELD_STRING);
    }
    return this.localPos;
};

mp4lib.boxes.DataEntryUrnBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);

    if (this.flags & '0x000001' === 0) {
        this._writeData(data, mp4lib.fields.FIELD_STRING, this.name);
        this._writeData(data, mp4lib.fields.FIELD_STRING, this.location);
    }
    return this.localPos;
};

// --------------------------- mfhd ----------------------------------
mp4lib.boxes.MovieFragmentHeaderBox = function(size) {
    mp4lib.boxes.FullBox.call(this, 'mfhd', size);
};

mp4lib.boxes.MovieFragmentHeaderBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);
mp4lib.boxes.MovieFragmentHeaderBox.prototype.constructor = mp4lib.boxes.MovieFragmentHeaderBox;

mp4lib.boxes.MovieFragmentHeaderBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_UINT32.getLength();
};

mp4lib.boxes.MovieFragmentHeaderBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);
    this.sequence_number = this._readData(data, mp4lib.fields.FIELD_UINT32);
    return this.localPos;
};

mp4lib.boxes.MovieFragmentHeaderBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.sequence_number);
    return this.localPos;
};

// --------------------------- tfhd ----------------------------------
mp4lib.boxes.TrackFragmentHeaderBox = function(size) {
    mp4lib.boxes.FullBox.call(this, 'tfhd', size);
};

mp4lib.boxes.TrackFragmentHeaderBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);
mp4lib.boxes.TrackFragmentHeaderBox.prototype.constructor = mp4lib.boxes.TrackFragmentHeaderBox;

mp4lib.boxes.TrackFragmentHeaderBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_UINT32.getLength();
    //even if, for example base_data_offset is defined, test the flags value
    //to know if base_data_offset size should be added to global size.
    if ((this.flags & 0x000001) !== 0 && this.base_data_offset !== undefined) {
        this.size += mp4lib.fields.FIELD_UINT64.getLength();
    }
    if ((this.flags & 0x000002) !== 0 && this.sample_description_index !== undefined) {
        this.size += mp4lib.fields.FIELD_UINT32.getLength();
    }
    if ((this.flags & 0x000008) !== 0 && this.default_sample_duration !== undefined) {
        this.size += mp4lib.fields.FIELD_UINT32.getLength();
    }
    if ((this.flags & 0x000010) !== 0 && this.default_sample_size !== undefined) {
        this.size += mp4lib.fields.FIELD_UINT32.getLength();
    }
    if ((this.flags & 0x000020) !== 0 && this.default_sample_flags !== undefined) {
        this.size += mp4lib.fields.FIELD_UINT32.getLength();
    }
};

mp4lib.boxes.TrackFragmentHeaderBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);

    this.track_ID = this._readData(data, mp4lib.fields.FIELD_UINT32);
    if ((this.flags & 0x000001) !== 0) {
        this.base_data_offset = this._readData(data, mp4lib.fields.FIELD_UINT64);
    }
    if ((this.flags & 0x000002) !== 0) {
        this.sample_description_index = this._readData(data, mp4lib.fields.FIELD_UINT32);
    }
    if ((this.flags & 0x000008) !== 0) {
        this.default_sample_duration = this._readData(data, mp4lib.fields.FIELD_UINT32);
    }
    if ((this.flags & 0x000010) !== 0) {
        this.default_sample_size = this._readData(data, mp4lib.fields.FIELD_UINT32);
    }
    if ((this.flags & 0x000020) !== 0) {
        this.default_sample_flags = this._readData(data, mp4lib.fields.FIELD_UINT32);
    }
    return this.localPos;
};

mp4lib.boxes.TrackFragmentHeaderBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);

    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.track_ID);

    if ((this.flags & 0x000001) !== 0) {
        this._writeData(data, mp4lib.fields.FIELD_UINT64, this.base_data_offset);
    }
    if ((this.flags & 0x000002) !== 0) {
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.sample_description_index);
    }
    if ((this.flags & 0x000008) !== 0) {
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.default_sample_duration);
    }
    if ((this.flags & 0x000010) !== 0) {
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.default_sample_size);
    }
    if ((this.flags & 0x000020) !== 0) {
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.default_sample_flags);
    }
    return this.localPos;
};

// --------------------------- tfdt ----------------------------------
mp4lib.boxes.TrackFragmentBaseMediaDecodeTimeBox = function(size) {
    mp4lib.boxes.FullBox.call(this, 'tfdt', size);
};

mp4lib.boxes.TrackFragmentBaseMediaDecodeTimeBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);
mp4lib.boxes.TrackFragmentBaseMediaDecodeTimeBox.prototype.constructor = mp4lib.boxes.TrackFragmentBaseMediaDecodeTimeBox;

mp4lib.boxes.TrackFragmentBaseMediaDecodeTimeBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    if (this.version === 1) {
        this.size += mp4lib.fields.FIELD_UINT64.getLength();
    } else {
        this.size += mp4lib.fields.FIELD_UINT32.getLength();
    }
};

mp4lib.boxes.TrackFragmentBaseMediaDecodeTimeBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);

    if (this.version === 1) {
        this.baseMediaDecodeTime = this._readData(data, mp4lib.fields.FIELD_UINT64);
    } else {
        this.baseMediaDecodeTime = this._readData(data, mp4lib.fields.FIELD_UINT32);
    }
    return this.localPos;
};

mp4lib.boxes.TrackFragmentBaseMediaDecodeTimeBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);

    if (this.version === 1) {
        this._writeData(data, mp4lib.fields.FIELD_UINT64, this.baseMediaDecodeTime);
    } else {
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.baseMediaDecodeTime);
    }
    return this.localPos;
};

// --------------------------- trun ----------------------------------
mp4lib.boxes.TrackFragmentRunBox = function(size) {
    mp4lib.boxes.FullBox.call(this, 'trun', size);
};

mp4lib.boxes.TrackFragmentRunBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);
mp4lib.boxes.TrackFragmentRunBox.prototype.constructor = mp4lib.boxes.TrackFragmentRunBox;

mp4lib.boxes.TrackFragmentRunBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    var i = 0;
    this.size += mp4lib.fields.FIELD_UINT32.getLength(); //sample_count size
    if ((this.flags & 0x000001) !== 0 && this.data_offset !== undefined) {
        this.size += mp4lib.fields.FIELD_INT32.getLength();
    }
    if ((this.flags & 0x000004) !== 0 && this.first_sample_flags !== undefined) {
        this.size += mp4lib.fields.FIELD_UINT32.getLength();
    }

    for (i = 0; i < this.sample_count; i++) {
        if ((this.flags & 0x000100) !== 0 && this.samples_table[i].sample_duration !== undefined) {
            this.size += mp4lib.fields.FIELD_UINT32.getLength();
        }
        if ((this.flags & 0x000200) !== 0 && this.samples_table[i].sample_size !== undefined) {
            this.size += mp4lib.fields.FIELD_UINT32.getLength();
        }
        if ((this.flags & 0x000400) !== 0 && this.samples_table[i].sample_flags !== undefined) {
            this.size += mp4lib.fields.FIELD_UINT32.getLength();
        }

        if (this.version === 1) {
            if ((this.flags & 0x000800) !== 0 && this.samples_table[i].sample_composition_time_offset !== undefined) {
                this.size += mp4lib.fields.FIELD_INT32.getLength();
            }
        } else {
            if ((this.flags & 0x000800) !== 0 && this.samples_table[i].sample_composition_time_offset !== undefined) {
                this.size += mp4lib.fields.FIELD_UINT32.getLength();
            }
        }
    }
};

mp4lib.boxes.TrackFragmentRunBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);
    var i = 0,
        struct = {};

    this.sample_count = this._readData(data, mp4lib.fields.FIELD_UINT32);

    if ((this.flags & 0x000001) !== 0) {
        this.data_offset = this._readData(data, mp4lib.fields.FIELD_INT32);
    }
    if ((this.flags & 0x000004) !== 0) {
        this.first_sample_flags = this._readData(data, mp4lib.fields.FIELD_UINT32);
    }

    this.samples_table = [];

    for (i = 0; i < this.sample_count; i++) {
        struct = {};
        if ((this.flags & 0x000100) !== 0) {
            struct.sample_duration = this._readData(data, mp4lib.fields.FIELD_UINT32);
        }
        if ((this.flags & 0x000200) !== 0) {
            struct.sample_size = this._readData(data, mp4lib.fields.FIELD_UINT32);
        }
        if ((this.flags & 0x000400) !== 0) {
            struct.sample_flags = this._readData(data, mp4lib.fields.FIELD_UINT32);
        }

        if (this.version === 1) {
            if ((this.flags & 0x000800) !== 0) {
                struct.sample_composition_time_offset = this._readData(data, mp4lib.fields.FIELD_INT32);
            }
        } else {
            if ((this.flags & 0x000800) !== 0) {
                struct.sample_composition_time_offset = this._readData(data, mp4lib.fields.FIELD_UINT32);
            }
        }
        this.samples_table.push(struct);
    }
    return this.localPos;
};

mp4lib.boxes.TrackFragmentRunBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);
    var i = 0;

    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.sample_count);

    if ((this.flags & 0x000001) !== 0) {
        this._writeData(data, mp4lib.fields.FIELD_INT32, this.data_offset);
    }
    if ((this.flags & 0x000004) !== 0) {
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.first_sample_flags);
    }

    for (i = 0; i < this.sample_count; i++) {

        if ((this.flags & 0x000100) !== 0) {
            this._writeData(data, mp4lib.fields.FIELD_UINT32, this.samples_table[i].sample_duration);
        }
        if ((this.flags & 0x000200) !== 0) {
            this._writeData(data, mp4lib.fields.FIELD_UINT32, this.samples_table[i].sample_size);
        }
        if ((this.flags & 0x000400) !== 0) {
            this._writeData(data, mp4lib.fields.FIELD_UINT32, this.samples_table[i].sample_flags);
        }

        if (this.version === 1) {
            if ((this.flags & 0x000800) !== 0) {
                this._writeData(data, mp4lib.fields.FIELD_INT32, this.samples_table[i].sample_composition_time_offset);
            }
        } else {
            if ((this.flags & 0x000800) !== 0) {
                this._writeData(data, mp4lib.fields.FIELD_UINT32, this.samples_table[i].sample_composition_time_offset);
            }
        }
    }
    return this.localPos;
};

// --------------------------- stsd ----------------------------------
mp4lib.boxes.SampleDescriptionBox = function(size) {
    mp4lib.boxes.ContainerFullBox.call(this, 'stsd', size);
};

mp4lib.boxes.SampleDescriptionBox.prototype = Object.create(mp4lib.boxes.ContainerFullBox.prototype);
mp4lib.boxes.SampleDescriptionBox.prototype.constructor = mp4lib.boxes.SampleDescriptionBox;

mp4lib.boxes.SampleDescriptionBox.prototype.computeLength = function() {
    mp4lib.boxes.ContainerFullBox.prototype.computeLength.call(this, true);
};

mp4lib.boxes.SampleDescriptionBox.prototype.read = function(data, pos, end) {
    return mp4lib.boxes.ContainerFullBox.prototype.read.call(this, data, pos, end, true);
};

mp4lib.boxes.SampleDescriptionBox.prototype.write = function(data, pos) {
    this.entry_count = this.boxes.length;
    return mp4lib.boxes.ContainerFullBox.prototype.write.call(this, data, pos, true);
};

// --------------------------- sdtp ----------------------------------
mp4lib.boxes.SampleDependencyTableBox = function(size) {
    mp4lib.boxes.FullBox.call(this, 'sdtp', size);
};

mp4lib.boxes.SampleDependencyTableBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);
mp4lib.boxes.SampleDependencyTableBox.prototype.constructor = mp4lib.boxes.SampleDependencyTableBox;

mp4lib.boxes.SampleDependencyTableBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_UINT8.getLength() * this.sample_dependency_table.length;
};

mp4lib.boxes.SampleDependencyTableBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);
    this.sample_dependency_table = this._readArrayData(data, mp4lib.fields.FIELD_UINT8);
    return this.localPos;
};

mp4lib.boxes.SampleDependencyTableBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);

    this._writeArrayData(data, mp4lib.fields.FIELD_UINT8, this.sample_dependency_table);
    return this.localPos;
};

// --------------------------- abstract SampleEntry ----------------------------------
mp4lib.boxes.SampleEntryBox = function(boxType, size) {
    mp4lib.boxes.Box.call(this, boxType, size);
};

mp4lib.boxes.SampleEntryBox.prototype = Object.create(mp4lib.boxes.Box.prototype);
mp4lib.boxes.SampleEntryBox.prototype.constructor = mp4lib.boxes.SampleEntryBox;

mp4lib.boxes.SampleEntryBox.prototype.computeLength = function() {
    mp4lib.boxes.Box.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_UINT16.getLength() + mp4lib.fields.FIELD_UINT8.getLength() * 6;
};

mp4lib.boxes.SampleEntryBox.prototype.read = function(data, pos, end) {
    this.localPos = pos;
    this.localEnd = end;

    this.reserved = this._readArrayFieldData(data, mp4lib.fields.FIELD_UINT8, 6);
    this.data_reference_index = this._readData(data, mp4lib.fields.FIELD_UINT16);
    return this.localPos;
};

mp4lib.boxes.SampleEntryBox.prototype.write = function(data, pos) {
    mp4lib.boxes.Box.prototype.write.call(this, data, pos);

    this._writeArrayData(data, mp4lib.fields.FIELD_UINT8, this.reserved);
    this._writeData(data, mp4lib.fields.FIELD_UINT16, this.data_reference_index);
    return this.localPos;
};

// --------------------------- abstract VisualSampleEntry ----------------------------------
mp4lib.boxes.VisualSampleEntryBox = function(boxType, size) {
    mp4lib.boxes.SampleEntryBox.call(this, boxType, size);
};

mp4lib.boxes.VisualSampleEntryBox.prototype = Object.create(mp4lib.boxes.SampleEntryBox.prototype);
mp4lib.boxes.VisualSampleEntryBox.prototype.constructor = mp4lib.boxes.VisualSampleEntryBox;

mp4lib.boxes.VisualSampleEntryBox.prototype.computeLength = function() {
    mp4lib.boxes.SampleEntryBox.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_UINT16.getLength() * 7 + mp4lib.fields.FIELD_UINT32.getLength() * 3;
    this.size += mp4lib.fields.FIELD_UINT32.getLength() * 3;
    this.size += 32; //compressorname size
};

mp4lib.boxes.VisualSampleEntryBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.SampleEntryBox.prototype.read.call(this, data, pos, end);
    this.pre_defined = this._readData(data, mp4lib.fields.FIELD_UINT16);
    this.reserved_2 = this._readData(data, mp4lib.fields.FIELD_UINT16);
    // there is already field called reserved from SampleEntry, so we need to call it reserved_2
    this.pre_defined_2 = this._readArrayFieldData(data, mp4lib.fields.FIELD_UINT32, 3);
    this.width = this._readData(data, mp4lib.fields.FIELD_UINT16);
    this.height = this._readData(data, mp4lib.fields.FIELD_UINT16);
    this.horizresolution = this._readData(data, mp4lib.fields.FIELD_UINT32);
    this.vertresolution = this._readData(data, mp4lib.fields.FIELD_UINT32);
    this.reserved_3 = this._readData(data, mp4lib.fields.FIELD_UINT32);
    this.frame_count = this._readData(data, mp4lib.fields.FIELD_UINT16);
    this.compressorname = this._readArrayFieldData(data, mp4lib.fields.FIELD_UINT8, 32);
    this.depth = this._readData(data, mp4lib.fields.FIELD_UINT16);
    this.pre_defined_3 = this._readData(data, mp4lib.fields.FIELD_INT16);
    return this.localPos;
};

mp4lib.boxes.VisualSampleEntryBox.prototype.write = function(data, pos) {
    mp4lib.boxes.SampleEntryBox.prototype.write.call(this, data, pos);

    this._writeData(data, mp4lib.fields.FIELD_UINT16, this.pre_defined);
    this._writeData(data, mp4lib.fields.FIELD_UINT16, this.reserved_2);
    // there is already field called reserved from SampleEntry, so we need to call it reserved_2
    this._writeArrayData(data, mp4lib.fields.FIELD_UINT32, this.pre_defined_2);
    this._writeData(data, mp4lib.fields.FIELD_UINT16, this.width);
    this._writeData(data, mp4lib.fields.FIELD_UINT16, this.height);
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.horizresolution);
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.vertresolution);
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.reserved_3);
    this._writeData(data, mp4lib.fields.FIELD_UINT16, this.frame_count);
    this._writeArrayData(data, mp4lib.fields.FIELD_UINT8, this.compressorname);
    this._writeData(data, mp4lib.fields.FIELD_UINT16, this.depth);
    this._writeData(data, mp4lib.fields.FIELD_INT16, this.pre_defined_3);
    return this.localPos;
};

// --------------------------- abstract VisualSampleEntryContainer ----------------------------------
mp4lib.boxes.VisualSampleEntryContainerBox = function(boxType, size) {
    mp4lib.boxes.VisualSampleEntryBox.call(this, boxType, size);
    this.boxes = [];
};

mp4lib.boxes.VisualSampleEntryContainerBox.prototype = Object.create(mp4lib.boxes.VisualSampleEntryBox.prototype);
mp4lib.boxes.VisualSampleEntryContainerBox.prototype.constructor = mp4lib.boxes.VisualSampleEntryContainerBox;

mp4lib.boxes.VisualSampleEntryContainerBox.prototype.computeLength = function() {
    mp4lib.boxes.VisualSampleEntryBox.prototype.computeLength.call(this);
    var i = 0;
    for (i = 0; i < this.boxes.length; i++) {
        this.boxes[i].computeLength();
        this.size += this.boxes[i].size;
    }
};

mp4lib.boxes.VisualSampleEntryContainerBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.VisualSampleEntryBox.prototype.read.call(this, data, pos, end);

    var size = 0,
        uuidFieldPos = 0,
        uuid = null,
        boxtype,
        box;

    while (this.localPos < this.localEnd) {
        // Read box size
        size = mp4lib.fields.FIELD_UINT32.read(data, this.localPos);

        // Read boxtype
        boxtype = mp4lib.fields.readString(data, this.localPos + 4, 4);

        // Extented type?
        if (boxtype == "uuid") {
            uuidFieldPos = (size == 1) ? 16 : 8;
            uuid = new mp4lib.fields.ArrayField(mp4lib.fields.FIELD_INT8, 16).read(data, this.localPos + uuidFieldPos, this.localPos + uuidFieldPos + 16);
            uuid = JSON.stringify(uuid);
        }

        box = mp4lib.createBox(boxtype, size, uuid);
        if (boxtype === "uuid") {
            this.localPos = box.read(data, this.localPos + mp4lib.fields.FIELD_INT8.getLength() * 16 + 8, this.localPos + size);
        } else {
            this.localPos = box.read(data, this.localPos + 8, this.localPos + size);
        }

        // in debug mode, sourcebuffer is copied to each box,
        // so any invalid deserializations may be found by comparing
        // source buffer with serialized box
        if (mp4lib.debug) {
            box.__sourceBuffer = data.subarray(this.localPos - box.size, this.localPos);
        }

        this.boxes.push(box);

        if (box.size <= 0 || box.size === null) {
            throw new mp4lib.ParseException('Problem on size of box ' + box.boxtype +
                ', parsing stopped to avoid infinite loop');
        }

        if (!box.boxtype) {
            throw new mp4lib.ParseException('Problem on unknown box, parsing stopped to avoid infinite loop');
        }
    }
    return this.localPos;
};

mp4lib.boxes.VisualSampleEntryContainerBox.prototype.write = function(data, pos) {
    mp4lib.boxes.VisualSampleEntryBox.prototype.write.call(this, data, pos);
    var i = 0;

    for (i = 0; i < this.boxes.length; i++) {
        this.localPos = this.boxes[i].write(data, this.localPos);
    }
    return this.localPos;
};

// --------------------------- avc1 ----------------------------------
mp4lib.boxes.AVC1VisualSampleEntryBox = function(size) {
    mp4lib.boxes.VisualSampleEntryContainerBox.call(this, 'avc1', size);
};

mp4lib.boxes.AVC1VisualSampleEntryBox.prototype = Object.create(mp4lib.boxes.VisualSampleEntryContainerBox.prototype);
mp4lib.boxes.AVC1VisualSampleEntryBox.prototype.constructor = mp4lib.boxes.AVC1VisualSampleEntryBox;

//-------------------------- encv ------------------------------------
mp4lib.boxes.EncryptedVideoBox = function(size) {
    mp4lib.boxes.VisualSampleEntryContainerBox.call(this, 'encv', size);
};

mp4lib.boxes.EncryptedVideoBox.prototype = Object.create(mp4lib.boxes.VisualSampleEntryContainerBox.prototype);
mp4lib.boxes.EncryptedVideoBox.prototype.constructor = mp4lib.boxes.EncryptedVideoBox;

// --------------------------- avcc ----------------------------------
mp4lib.boxes.AVCConfigurationBox = function(size) {
    mp4lib.boxes.Box.call(this, 'avcC', size);
};

mp4lib.boxes.AVCConfigurationBox.prototype = Object.create(mp4lib.boxes.Box.prototype);
mp4lib.boxes.AVCConfigurationBox.prototype.constructor = mp4lib.boxes.AVCConfigurationBox;

mp4lib.boxes.AVCConfigurationBox.prototype.computeLength = function() {
    mp4lib.boxes.Box.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_UINT8.getLength() * 4 + mp4lib.fields.FIELD_UINT8.getLength() * 3;
    this.size += this._getNALLength(this.numOfSequenceParameterSets, this.SPS_NAL);
    this.size += this._getNALLength(this.numOfPictureParameterSets, this.PPS_NAL);
};

mp4lib.boxes.AVCConfigurationBox.prototype._getNALLength = function(nbElements, nalArray) {
    var size_NAL = 0,
        i = 0;

    for (i = 0; i < nbElements; i++) {
        size_NAL += mp4lib.fields.FIELD_UINT16.getLength() + nalArray[i].NAL_length;
    }

    return size_NAL;
};

mp4lib.boxes.AVCConfigurationBox.prototype.read = function(data, pos, end) {
    this.localPos = pos;
    this.localEnd = end;
    this.configurationVersion = this._readData(data, mp4lib.fields.FIELD_UINT8);
    this.AVCProfileIndication = this._readData(data, mp4lib.fields.FIELD_UINT8);
    this.profile_compatibility = this._readData(data, mp4lib.fields.FIELD_UINT8);
    this.AVCLevelIndication = this._readData(data, mp4lib.fields.FIELD_UINT8);

    this.temp = this._readData(data, mp4lib.fields.FIELD_UINT8);
    // 6 bits for reserved =63 and two bits for NAL length = 2-bit length byte size type
    this.lengthSizeMinusOne = this.temp & 3;
    this.numOfSequenceParameterSets_tmp = this._readData(data, mp4lib.fields.FIELD_UINT8);
    this.numOfSequenceParameterSets = this.numOfSequenceParameterSets_tmp & 31;

    this.SPS_NAL = this._readNAL(data, this.numOfSequenceParameterSets);

    this.numOfPictureParameterSets = this._readData(data, mp4lib.fields.FIELD_UINT8);

    this.PPS_NAL = this._readNAL(data, this.numOfPictureParameterSets);
    return this.localPos;
};

mp4lib.boxes.AVCConfigurationBox.prototype._readNAL = function(data, nbElements) {
    var nalArray = [],
        i = 0,
        struct = {};

    for (i = 0; i < nbElements; i++) {
        struct = {};

        struct.NAL_length = this._readData(data, mp4lib.fields.FIELD_UINT16);
        struct.NAL = data.subarray(this.localPos, this.localPos + struct.NAL_length);
        this.localPos += struct.NAL_length;
        nalArray.push(struct);
    }
    return nalArray;
};

mp4lib.boxes.AVCConfigurationBox.prototype.write = function(data, pos) {
    mp4lib.boxes.Box.prototype.write.call(this, data, pos);

    this._writeData(data, mp4lib.fields.FIELD_UINT8, this.configurationVersion);
    this._writeData(data, mp4lib.fields.FIELD_UINT8, this.AVCProfileIndication);
    this._writeData(data, mp4lib.fields.FIELD_UINT8, this.profile_compatibility);
    this._writeData(data, mp4lib.fields.FIELD_UINT8, this.AVCLevelIndication);

    this.temp = this.lengthSizeMinusOne | 252;
    this._writeData(data, mp4lib.fields.FIELD_UINT8, this.temp);
    this.numOfSequenceParameterSets = this.SPS_NAL.length;
    this.numOfSequenceParameterSets_tmp = this.numOfSequenceParameterSets | 224;
    this._writeData(data, mp4lib.fields.FIELD_UINT8, this.numOfSequenceParameterSets_tmp);
    this._writeNAL(data, this.numOfSequenceParameterSets, this.SPS_NAL);
    this._writeData(data, mp4lib.fields.FIELD_UINT8, this.numOfPictureParameterSets);
    this._writeNAL(data, this.numOfPictureParameterSets, this.PPS_NAL);
    return this.localPos;
};

mp4lib.boxes.AVCConfigurationBox.prototype._writeNAL = function(data, nbElements, nalArray) {
    var i = 0;

    for (i = 0; i < nbElements; i++) {
        this._writeData(data, mp4lib.fields.FIELD_UINT16, nalArray[i].NAL_length);
        this._writeBuffer(data, nalArray[i].NAL, nalArray[i].NAL_length);
    }
};

// --------------------------- pasp ----------------------------------
mp4lib.boxes.PixelAspectRatioBox = function(size) {
    mp4lib.boxes.Box.call(this, 'pasp', size);
};

mp4lib.boxes.PixelAspectRatioBox.prototype = Object.create(mp4lib.boxes.Box.prototype);
mp4lib.boxes.PixelAspectRatioBox.prototype.constructor = mp4lib.boxes.PixelAspectRatioBox;

mp4lib.boxes.PixelAspectRatioBox.prototype.computeLength = function() {
    mp4lib.boxes.Box.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_INT32.getLength() * 2;
};

mp4lib.boxes.PixelAspectRatioBox.prototype.read = function(data, pos, end) {
    this.localPos = pos;
    this.localEnd = end;

    this.hSpacing = this._readData(data, mp4lib.fields.FIELD_INT32);
    this.vSpacing = this._readData(data, mp4lib.fields.FIELD_INT32);
    return this.localPos;
};

mp4lib.boxes.PixelAspectRatioBox.prototype.write = function(data, pos) {
    mp4lib.boxes.Box.prototype.write.call(this, data, pos);

    this._writeData(data, mp4lib.fields.FIELD_INT32, this.hSpacing);
    this._writeData(data, mp4lib.fields.FIELD_INT32, this.vSpacing);
    return this.localPos;
};

// --------------------------- abstract VisualSampleEntry ----------------------------------
mp4lib.boxes.AudioSampleEntryBox = function(boxType, size) {
    mp4lib.boxes.SampleEntryBox.call(this, boxType, size);
};

mp4lib.boxes.AudioSampleEntryBox.prototype = Object.create(mp4lib.boxes.SampleEntryBox.prototype);
mp4lib.boxes.AudioSampleEntryBox.prototype.constructor = mp4lib.boxes.AudioSampleEntryBox;

mp4lib.boxes.AudioSampleEntryBox.prototype.computeLength = function() {
    mp4lib.boxes.SampleEntryBox.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_UINT16.getLength() * 4 + mp4lib.fields.FIELD_UINT32.getLength() * 3;
};

mp4lib.boxes.AudioSampleEntryBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.SampleEntryBox.prototype.read.call(this, data, pos, end);

    this.reserved_2 = this._readArrayFieldData(data, mp4lib.fields.FIELD_UINT32, 2);
    this.channelcount = this._readData(data, mp4lib.fields.FIELD_UINT16);
    this.samplesize = this._readData(data, mp4lib.fields.FIELD_UINT16);
    this.pre_defined = this._readData(data, mp4lib.fields.FIELD_UINT16);
    this.reserved_3 = this._readData(data, mp4lib.fields.FIELD_UINT16);
    this.samplerate = this._readData(data, mp4lib.fields.FIELD_UINT32);
    return this.localPos;
};

mp4lib.boxes.AudioSampleEntryBox.prototype.write = function(data, pos) {
    mp4lib.boxes.SampleEntryBox.prototype.write.call(this, data, pos);

    this._writeArrayData(data, mp4lib.fields.FIELD_UINT32, this.reserved_2);
    this._writeData(data, mp4lib.fields.FIELD_UINT16, this.channelcount);
    this._writeData(data, mp4lib.fields.FIELD_UINT16, this.samplesize);
    this._writeData(data, mp4lib.fields.FIELD_UINT16, this.pre_defined);
    this._writeData(data, mp4lib.fields.FIELD_UINT16, this.reserved_3);
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.samplerate);
    return this.localPos;
};

// --------------------------- abstract AudioSampleEntryContainer ----------------------------------
mp4lib.boxes.AudioSampleEntryContainerBox = function(boxType, size) {
    mp4lib.boxes.AudioSampleEntryBox.call(this, boxType, size);
    this.boxes = [];
};

mp4lib.boxes.AudioSampleEntryContainerBox.prototype = Object.create(mp4lib.boxes.AudioSampleEntryBox.prototype);
mp4lib.boxes.AudioSampleEntryContainerBox.prototype.constructor = mp4lib.boxes.AudioSampleEntryContainerBox;

mp4lib.boxes.AudioSampleEntryContainerBox.prototype.computeLength = function() {
    mp4lib.boxes.AudioSampleEntryBox.prototype.computeLength.call(this);
    var i = 0;
    for (i = 0; i < this.boxes.length; i++) {
        this.boxes[i].computeLength();
        this.size += this.boxes[i].size;
    }
};

mp4lib.boxes.AudioSampleEntryContainerBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.AudioSampleEntryBox.prototype.read.call(this, data, pos, end);

    var size = 0,
        uuidFieldPos = 0,
        uuid = null,
        boxtype,
        box;

    while (this.localPos < this.localEnd) {
        // Read box size
        size = mp4lib.fields.FIELD_UINT32.read(data, this.localPos);

        // Read boxtype
        boxtype = mp4lib.fields.readString(data, this.localPos + 4, 4);

        // Extented type?
        if (boxtype == "uuid") {
            uuidFieldPos = (size == 1) ? 16 : 8;
            uuid = new mp4lib.fields.ArrayField(mp4lib.fields.FIELD_INT8, 16).read(data, this.localPos + uuidFieldPos, this.localPos + uuidFieldPos + 16);
            uuid = JSON.stringify(uuid);
        }

        box = mp4lib.createBox(boxtype, size, uuid);
        if (boxtype === "uuid") {
            this.localPos = box.read(data, this.localPos + mp4lib.fields.FIELD_INT8.getLength() * 16 + 8, this.localPos + size);
        } else {
            this.localPos = box.read(data, this.localPos + 8, this.localPos + size);
        }

        // in debug mode, sourcebuffer is copied to each box,
        // so any invalid deserializations may be found by comparing
        // source buffer with serialized box
        if (mp4lib.debug) {
            box.__sourceBuffer = data.subarray(this.localPos - box.size, this.localPos);
        }

        this.boxes.push(box);

        if (box.size <= 0 || box.size === null) {
            throw new mp4lib.ParseException('Problem on size of box ' + box.boxtype +
                ', parsing stopped to avoid infinite loop');
        }

        if (!box.boxtype) {
            throw new mp4lib.ParseException('Problem on unknown box, parsing stopped to avoid infinite loop');
        }
    }
    return this.localPos;
};

mp4lib.boxes.AudioSampleEntryContainerBox.prototype.write = function(data, pos) {
    mp4lib.boxes.AudioSampleEntryBox.prototype.write.call(this, data, pos);
    var i = 0;

    for (i = 0; i < this.boxes.length; i++) {
        this.localPos = this.boxes[i].write(data, this.localPos);
    }
    return this.localPos;
};

// --------------------------- mp4a ----------------------------------
mp4lib.boxes.MP4AudioSampleEntryBox = function(size) {
    mp4lib.boxes.AudioSampleEntryContainerBox.call(this, 'mp4a', size);
};

mp4lib.boxes.MP4AudioSampleEntryBox.prototype = Object.create(mp4lib.boxes.AudioSampleEntryContainerBox.prototype);
mp4lib.boxes.MP4AudioSampleEntryBox.prototype.constructor = mp4lib.boxes.MP4AudioSampleEntryBox;

//-------------------------- enca ------------------------------------
mp4lib.boxes.EncryptedAudioBox = function(size) {
    mp4lib.boxes.AudioSampleEntryContainerBox.call(this, 'enca', size);
};

mp4lib.boxes.EncryptedAudioBox.prototype = Object.create(mp4lib.boxes.AudioSampleEntryContainerBox.prototype);
mp4lib.boxes.EncryptedAudioBox.prototype.constructor = mp4lib.boxes.EncryptedAudioBox;

// --------------------------- esds ----------------------------
mp4lib.boxes.ESDBox = function(size) {
    mp4lib.boxes.FullBox.call(this, 'esds', size);
};

mp4lib.boxes.ESDBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);
mp4lib.boxes.ESDBox.prototype.constructor = mp4lib.boxes.ESDBox;

mp4lib.boxes.ESDBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_UINT8.getLength() * 2 + this.ES_length;
};

mp4lib.boxes.ESDBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);

    this.ES_tag = this._readData(data, mp4lib.fields.FIELD_UINT8);
    this.ES_length = this._readData(data, mp4lib.fields.FIELD_UINT8);
    this.ES_data = data.subarray(this.localPos, this.localPos + this.ES_length);
    this.localPos += this.ES_length;
    return this.localPos;
};

mp4lib.boxes.ESDBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);

    this._writeData(data, mp4lib.fields.FIELD_UINT8, this.ES_tag);
    this._writeData(data, mp4lib.fields.FIELD_UINT8, this.ES_length);
    this._writeBuffer(data, this.ES_data, this.ES_length);
    return this.localPos;
};

// --------------------------- stsz ----------------------------------
mp4lib.boxes.SampleSizeBox = function(size) {
    mp4lib.boxes.FullBox.call(this, 'stsz', size);
};

mp4lib.boxes.SampleSizeBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);
mp4lib.boxes.SampleSizeBox.prototype.constructor = mp4lib.boxes.SampleSizeBox;

mp4lib.boxes.SampleSizeBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_UINT32.getLength() * 2 + mp4lib.fields.FIELD_UINT32.getLength() * this.sample_count;
};

mp4lib.boxes.SampleSizeBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);

    this.sample_size = this._readData(data, mp4lib.fields.FIELD_UINT32);
    this.sample_count = this._readData(data, mp4lib.fields.FIELD_UINT32);
    this.entries = this._readArrayFieldData(data, mp4lib.fields.FIELD_UINT32, this.sample_count);
    return this.localPos;
};

mp4lib.boxes.SampleSizeBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);
    var i = 0;
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.sample_size);
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.sample_count);
    for (i = 0; i < this.sample_count; i++) {
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.entries[i]);
    }
    return this.localPos;
};

// ------------------------- pssh ------------------------------------
mp4lib.boxes.ProtectionSystemSpecificHeaderBox = function(size) {
    mp4lib.boxes.FullBox.call(this, 'pssh', size);
};

mp4lib.boxes.ProtectionSystemSpecificHeaderBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);
mp4lib.boxes.ProtectionSystemSpecificHeaderBox.prototype.constructor = mp4lib.boxes.ProtectionSystemSpecificHeaderBox;

mp4lib.boxes.ProtectionSystemSpecificHeaderBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);

    this.size += mp4lib.fields.FIELD_UINT8.getLength() * 16;
    this.size += mp4lib.fields.FIELD_UINT32.getLength();
    this.size += mp4lib.fields.FIELD_UINT8.getLength() * this.DataSize;
};

mp4lib.boxes.ProtectionSystemSpecificHeaderBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);

    this.SystemID = this._readArrayFieldData(data, mp4lib.fields.FIELD_UINT8, 16);
    this.DataSize = this._readData(data, mp4lib.fields.FIELD_UINT32);
    this.Data = this._readArrayFieldData(data, mp4lib.fields.FIELD_UINT8, this.DataSize);
    return this.localPos;
};

mp4lib.boxes.ProtectionSystemSpecificHeaderBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);
    var i = 0;

    for (i = 0; i < 16; i++) {
        this._writeData(data, mp4lib.fields.FIELD_UINT8, this.SystemID[i]);
    }
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.DataSize);
    for (i = 0; i < this.DataSize; i++) {
        this._writeData(data, mp4lib.fields.FIELD_UINT8, this.Data[i]);
    }
    return this.localPos;
};


// --------------------------- senc ----------------------------------
mp4lib.boxes.SampleEncryptionBox = function(size) {
    mp4lib.boxes.FullBox.call(this, 'senc', size);
};

mp4lib.boxes.SampleEncryptionBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);
mp4lib.boxes.SampleEncryptionBox.prototype.constructor = mp4lib.boxes.SampleEncryptionBox;

mp4lib.boxes.SampleEncryptionBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    var i = 0,
        j = 0;

    this.size += mp4lib.fields.FIELD_UINT32.getLength(); //sample_count size
    if (this.flags & 1) {
        this.size += mp4lib.fields.FIELD_UINT8.getLength(); //IV_size size
    }
    for (i = 0; i < this.sample_count; i++) {
        this.size += 8; // InitializationVector size
        if (this.flags & 2) {
            this.size += mp4lib.fields.FIELD_UINT16.getLength(); // NumberOfEntries size
            for (j = 0; j < this.entry[i].NumberOfEntries; j++) {
                this.size += mp4lib.fields.FIELD_UINT16.getLength(); //BytesOfClearData size
                this.size += mp4lib.fields.FIELD_UINT32.getLength(); //BytesOfEncryptedData size
            }
        }
    }
};

mp4lib.boxes.SampleEncryptionBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);
    var i = 0,
        j = 0;
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.sample_count);
    if (this.flags & 1) {
        this._writeData(data, mp4lib.fields.FIELD_UINT8, this.IV_size);
    }
    for (i = 0; i < this.sample_count; i++) {
        this._writeBuffer(data, this.entry[i].InitializationVector, 8);

        if (this.flags & 2) {
            this._writeData(data, mp4lib.fields.FIELD_UINT16, this.entry[i].NumberOfEntries); // NumberOfEntries

            for (j = 0; j < this.entry[i].NumberOfEntries; j++) {
                this._writeData(data, mp4lib.fields.FIELD_UINT16, this.entry[i].clearAndCryptedData[j].BytesOfClearData); //BytesOfClearData
                this._writeData(data, mp4lib.fields.FIELD_UINT32, this.entry[i].clearAndCryptedData[j].BytesOfEncryptedData); //BytesOfEncryptedData size
            }
        }
    }
    return this.localPos;
};

mp4lib.boxes.SampleEncryptionBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);
    var i = 0,
        j = 0,
        clearAndCryptedStruct = {},
        struct = {};
    this.sample_count = this._readData(data, mp4lib.fields.FIELD_UINT32);
    if (this.flags & 1) {
        this.IV_size = this._readData(data, mp4lib.fields.FIELD_UINT8);
    }
    this.entry = [];
    for (i = 0; i < this.sample_count; i++) {
        struct = {};
        struct.InitializationVector = data.subarray(this.localPos, this.localPos + 8);
        this.localPos += 8; //InitializationVector size

        if (this.flags & 2) {
            struct.NumberOfEntries = this._readData(data, mp4lib.fields.FIELD_UINT16); // NumberOfEntries
            struct.clearAndCryptedData = [];
            for (j = 0; j < struct.NumberOfEntries; j++) {
                clearAndCryptedStruct = {};
                clearAndCryptedStruct.BytesOfClearData = this._readData(data, mp4lib.fields.FIELD_UINT16); //BytesOfClearData
                clearAndCryptedStruct.BytesOfEncryptedData = this._readData(data, mp4lib.fields.FIELD_UINT32); //BytesOfEncryptedData size
                struct.clearAndCryptedData.push(clearAndCryptedStruct);
            }
        }
        this.entry.push(struct);
    }
    return this.localPos;
};

// ------------------------- saiz ------------------------------------
mp4lib.boxes.SampleAuxiliaryInformationSizesBox = function(size) {
    mp4lib.boxes.FullBox.call(this, 'saiz', size);
};

mp4lib.boxes.SampleAuxiliaryInformationSizesBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);
mp4lib.boxes.SampleAuxiliaryInformationSizesBox.prototype.constructor = mp4lib.boxes.SampleAuxiliaryInformationSizesBox;

mp4lib.boxes.SampleAuxiliaryInformationSizesBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);

    if (this.flags & 1) {
        this.size += mp4lib.fields.FIELD_UINT32.getLength() * 2;
    }

    this.size += mp4lib.fields.FIELD_UINT8.getLength() + mp4lib.fields.FIELD_UINT32.getLength();

    if (this.default_sample_info_size === 0) {
        this.size += mp4lib.fields.FIELD_UINT8.getLength() * this.sample_count;
    }
};

mp4lib.boxes.SampleAuxiliaryInformationSizesBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);

    if (this.flags & 1) {
        this.aux_info_type = this._readData(data, mp4lib.fields.FIELD_UINT32);
        this.aux_info_type_parameter = this._readData(data, mp4lib.fields.FIELD_UINT32);
    }
    this.default_sample_info_size = this._readData(data, mp4lib.fields.FIELD_UINT8);
    this.sample_count = this._readData(data, mp4lib.fields.FIELD_UINT32);

    if (this.default_sample_info_size === 0) {
        this.sample_info_size = this._readArrayFieldData(data, mp4lib.fields.FIELD_UINT8, this.sample_count);
    }
    return this.localPos;
};

mp4lib.boxes.SampleAuxiliaryInformationSizesBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);
    var i = 0;
    if (this.flags & 1) {
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.aux_info_type);
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.aux_info_type_parameter);
    }
    this._writeData(data, mp4lib.fields.FIELD_UINT8, this.default_sample_info_size);
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.sample_count);
    if (this.default_sample_info_size === 0) {
        for (i = 0; i < this.sample_count; i++) {
            this._writeData(data, mp4lib.fields.FIELD_UINT8, this.sample_info_size[i]);
        }
    }
    return this.localPos;
};

//------------------------- saio ------------------------------------
mp4lib.boxes.SampleAuxiliaryInformationOffsetsBox = function(size) {
    mp4lib.boxes.FullBox.call(this, 'saio', size);
};

mp4lib.boxes.SampleAuxiliaryInformationOffsetsBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);
mp4lib.boxes.SampleAuxiliaryInformationOffsetsBox.prototype.constructor = mp4lib.boxes.SampleAuxiliaryInformationOffsetsBox;

mp4lib.boxes.SampleAuxiliaryInformationOffsetsBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    if (this.flags & 1) {
        this.size += mp4lib.fields.FIELD_UINT32.getLength() * 2;
    }
    this.size += mp4lib.fields.FIELD_UINT32.getLength(); /*entry_count size */
    if (this.version === 0) {
        this.size += mp4lib.fields.FIELD_UINT32.getLength() * this.entry_count;
    } else {
        this.size += mp4lib.fields.FIELD_UINT64.getLength() * this.entry_count;
    }
};

mp4lib.boxes.SampleAuxiliaryInformationOffsetsBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);

    if (this.flags & 1) {
        this.aux_info_type = this._readData(data, mp4lib.fields.FIELD_UINT32);
        this.aux_info_type_parameter = this._readData(data, mp4lib.fields.FIELD_UINT32);
    }

    this.entry_count = this._readData(data, mp4lib.fields.FIELD_UINT32);

    if (this.version === 0) {
        this.offset = this._readArrayFieldData(data, mp4lib.fields.FIELD_UINT32, this.entry_count);
    } else {
        this.offset = this._readArrayFieldData(data, mp4lib.fields.FIELD_UINT64, this.entry_count);
    }
    return this.localPos;
};

mp4lib.boxes.SampleAuxiliaryInformationOffsetsBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);

    var i = 0;
    if (this.flags & 1) {
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.aux_info_type);
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.aux_info_type_parameter);
    }
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.entry_count);
    if (this.version === 0) {
        for (i = 0; i < this.entry_count; i++) {
            this._writeData(data, mp4lib.fields.FIELD_UINT32, this.offset[i]);
        }
    } else {
        for (i = 0; i < this.entry_count; i++) {
            this._writeData(data, mp4lib.fields.FIELD_UINT64, this.offset[i]);
        }
    }
    return this.localPos;
};

//------------------------- sinf ------------------------------------
mp4lib.boxes.ProtectionSchemeInformationBox = function(size) {
    mp4lib.boxes.ContainerBox.call(this, 'sinf', size);
};

mp4lib.boxes.ProtectionSchemeInformationBox.prototype = Object.create(mp4lib.boxes.ContainerBox.prototype);
mp4lib.boxes.ProtectionSchemeInformationBox.prototype.constructor = mp4lib.boxes.ProtectionSchemeInformationBox;

//------------------------ schi --------------------------------------
mp4lib.boxes.SchemeInformationBox = function(size) {
    mp4lib.boxes.ContainerBox.call(this, 'schi', size);
};

mp4lib.boxes.SchemeInformationBox.prototype = Object.create(mp4lib.boxes.ContainerBox.prototype);
mp4lib.boxes.SchemeInformationBox.prototype.constructor = mp4lib.boxes.SchemeInformationBox;

//------------------------ tenc --------------------------------------
mp4lib.boxes.TrackEncryptionBox = function(size) {
    mp4lib.boxes.FullBox.call(this, 'tenc', size);
};

mp4lib.boxes.TrackEncryptionBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);
mp4lib.boxes.TrackEncryptionBox.prototype.constructor = mp4lib.boxes.TrackEncryptionBox;

mp4lib.boxes.TrackEncryptionBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);

    this.size += mp4lib.fields.FIELD_BIT24.getLength();
    this.size += mp4lib.fields.FIELD_UINT8.getLength();
    this.size += mp4lib.fields.FIELD_UINT8.getLength() * 16;
};

mp4lib.boxes.TrackEncryptionBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);

    this.default_IsEncrypted = this._readData(data, mp4lib.fields.FIELD_BIT24);
    this.default_IV_size = this._readData(data, mp4lib.fields.FIELD_UINT8);
    this.default_KID = this._readArrayFieldData(data, mp4lib.fields.FIELD_UINT8, 16);
    return this.localPos;
};

mp4lib.boxes.TrackEncryptionBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);

    this._writeData(data, mp4lib.fields.FIELD_BIT24, this.default_IsEncrypted);
    this._writeData(data, mp4lib.fields.FIELD_UINT8, this.default_IV_size);
    this._writeArrayData(data, mp4lib.fields.FIELD_UINT8, this.default_KID);
    return this.localPos;
};

//------------------------- schm -------------------------------------
mp4lib.boxes.SchemeTypeBox = function(size) {
    mp4lib.boxes.FullBox.call(this, 'schm', size);
};

mp4lib.boxes.SchemeTypeBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);
mp4lib.boxes.SchemeTypeBox.prototype.constructor = mp4lib.boxes.SchemeTypeBox;

mp4lib.boxes.SchemeTypeBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);

    this.size += mp4lib.fields.FIELD_UINT32.getLength() * 2;
    if (this.flags & 0x000001) {
        this.size += mp4lib.fields.FIELD_STRING.getLength(this.scheme_uri);
    }
};

mp4lib.boxes.SchemeTypeBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);

    this.scheme_type = this._readData(data, mp4lib.fields.FIELD_UINT32);
    this.scheme_version = this._readData(data, mp4lib.fields.FIELD_UINT32);
    if (this.flags & 0x000001) {
        this.scheme_uri = this._readData(data, mp4lib.fields.FIELD_STRING);
    }
    return this.localPos;
};

mp4lib.boxes.SchemeTypeBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);

    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.scheme_type);
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.scheme_version);
    if (this.flags & 0x000001) {
        this._writeData(data, mp4lib.fields.FIELD_STRING, this.scheme_uri);
    }
    return this.localPos;
};

// --------------------------- elst ----------------------------------
mp4lib.boxes.EditListBox = function(size) {
    mp4lib.boxes.FullBox.call(this, 'elst', size);
    this.entries = [];
};

mp4lib.boxes.EditListBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);
mp4lib.boxes.EditListBox.prototype.constructor = mp4lib.boxes.EditListBox;

mp4lib.boxes.EditListBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);

    this.size += mp4lib.fields.FIELD_UINT32.getLength(); //entry_count size

    if (this.version === 1) {
        this.size += (mp4lib.fields.FIELD_UINT64.getLength() * 2 /*segment_duration and media_time size*/ +
            mp4lib.fields.FIELD_UINT16.getLength() * 2 /*media_rate_integer and media_rate_fraction size)*/ ) * this.entry_count;
    } else { // version==0
        this.size += (mp4lib.fields.FIELD_UINT32.getLength() * 2 /*segment_duration and media_time size*/ +
            mp4lib.fields.FIELD_UINT16.getLength() * 2 /*media_rate_integer and media_rate_fraction size)*/ ) * this.entry_count;
    }
};

mp4lib.boxes.EditListBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);
    var i = 0,
        struct = {};
    this.entry_count = this._readData(data, mp4lib.fields.FIELD_UINT32);

    for (i = 0; i < this.entry_count; i++) {
        struct = {};
        if (this.version === 1) {
            struct.segment_duration = this._readData(data, mp4lib.fields.FIELD_UINT64);
            struct.media_time = this._readData(data, mp4lib.fields.FIELD_UINT64);
        } else { // version==0
            struct.segment_duration = this._readData(data, mp4lib.fields.FIELD_UINT32);
            struct.media_time = this._readData(data, mp4lib.fields.FIELD_UINT32);
        }
        struct.media_rate_integer = this._readData(data, mp4lib.fields.FIELD_UINT16);
        struct.media_rate_fraction = this._readData(data, mp4lib.fields.FIELD_UINT16);
        this.entries.push(struct);
    }
    return this.localPos;
};

mp4lib.boxes.EditListBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);
    var i = 0;
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.entry_count);
    for (i = 0; i < this.entry_count; i++) {

        if (this.version === 1) {
            this._writeData(data, mp4lib.fields.FIELD_UINT64, this.entries[i].segment_duration);
            this._writeData(data, mp4lib.fields.FIELD_UINT64, this.entries[i].media_time);
        } else { // version==0
            this._writeData(data, mp4lib.fields.FIELD_UINT32, this.entries[i].segment_duration);
            this._writeData(data, mp4lib.fields.FIELD_UINT32, this.entries[i].media_time);
        }
        this._writeData(data, mp4lib.fields.FIELD_UINT16, this.entries[i].media_rate_integer);
        this._writeData(data, mp4lib.fields.FIELD_UINT16, this.entries[i].media_rate_fraction);
    }
    return this.localPos;
};

// --------------------------- hmhd ----------------------------------
mp4lib.boxes.HintMediaHeaderBox = function(size) {
    mp4lib.boxes.FullBox.call(this, 'hmhd', size);
};

mp4lib.boxes.HintMediaHeaderBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);
mp4lib.boxes.HintMediaHeaderBox.prototype.constructor = mp4lib.boxes.HintMediaHeaderBox;

mp4lib.boxes.HintMediaHeaderBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);

    this.size += mp4lib.fields.FIELD_UINT16.getLength() * 2; //maxPDUsize and avgPDUsize size
    this.size += mp4lib.fields.FIELD_UINT32.getLength() * 3; //maxbitrate, avgbitrate and reserved size
};

mp4lib.boxes.HintMediaHeaderBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);

    this.maxPDUsize = this._readData(data, mp4lib.fields.FIELD_UINT16);
    this.avgPDUsize = this._readData(data, mp4lib.fields.FIELD_UINT16);
    this.maxbitrate = this._readData(data, mp4lib.fields.FIELD_UINT32);
    this.avgbitrate = this._readData(data, mp4lib.fields.FIELD_UINT32);
    this.reserved = this._readData(data, mp4lib.fields.FIELD_UINT32);
    return this.localPos;
};

mp4lib.boxes.HintMediaHeaderBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);

    this._writeData(data, mp4lib.fields.FIELD_UINT16, this.maxPDUsize);
    this._writeData(data, mp4lib.fields.FIELD_UINT16, this.avgPDUsize);
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.maxbitrate);
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.avgbitrate);
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.reserved);
    return this.localPos;
};

// --------------------------- nmhd ----------------------------------
mp4lib.boxes.NullMediaHeaderBox = function(size) {
    mp4lib.boxes.FullBox.call(this, 'nmhd', size);
};

mp4lib.boxes.NullMediaHeaderBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);
mp4lib.boxes.NullMediaHeaderBox.prototype.constructor = mp4lib.boxes.NullMediaHeaderBox;

// --------------------------- ctts ----------------------------------
mp4lib.boxes.CompositionOffsetBox = function(size) {
    mp4lib.boxes.FullBox.call(this, 'ctts', size);
    this.entries = [];
};

mp4lib.boxes.CompositionOffsetBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);
mp4lib.boxes.CompositionOffsetBox.prototype.constructor = mp4lib.boxes.CompositionOffsetBox;

mp4lib.boxes.CompositionOffsetBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);

    this.size += mp4lib.fields.FIELD_UINT32.getLength(); //entry_count size

    if (this.version === 0) {
        this.size += (mp4lib.fields.FIELD_UINT32.getLength() * 2 /*sample_count and sample_offset size*/ ) * this.entry_count;
    } else { // version===1
        this.size += (mp4lib.fields.FIELD_UINT32.getLength() /*sample_count size*/ + mp4lib.fields.FIELD_INT32.getLength()
            /*sample_offset size*/
        ) * this.entry_count;
    }
};

mp4lib.boxes.CompositionOffsetBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);
    var i = 0,
        struct = {};
    this.entry_count = this._readData(data, mp4lib.fields.FIELD_UINT32);
    for (i = 0; i < this.entry_count; i++) {
        struct = {};

        if (this.version === 0) {
            struct.sample_count = this._readData(data, mp4lib.fields.FIELD_UINT32);
            struct.sample_offset = this._readData(data, mp4lib.fields.FIELD_UINT32);
        } else { // version==1
            struct.sample_count = this._readData(data, mp4lib.fields.FIELD_UINT32);
            struct.sample_offset = this._readData(data, mp4lib.fields.FIELD_INT32);
        }
        this.entries.push(struct);
    }
    return this.localPos;
};

mp4lib.boxes.CompositionOffsetBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);
    var i = 0;
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.entry_count);
    for (i = 0; i < this.entry_count; i++) {
        if (this.version === 0) {
            this._writeData(data, mp4lib.fields.FIELD_UINT32, this.entries[i].sample_count);
            this._writeData(data, mp4lib.fields.FIELD_UINT32, this.entries[i].sample_offset);
        } else { // version==1
            this._writeData(data, mp4lib.fields.FIELD_UINT32, this.entries[i].sample_count);
            this._writeData(data, mp4lib.fields.FIELD_INT32, this.entries[i].sample_offset);
        }
    }
    return this.localPos;
};

// --------------------------- cslg ----------------------------------
mp4lib.boxes.CompositionToDecodeBox = function(size) {
    mp4lib.boxes.FullBox.call(this, 'cslg', size);
};

mp4lib.boxes.CompositionToDecodeBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);
mp4lib.boxes.CompositionToDecodeBox.prototype.constructor = mp4lib.boxes.CompositionToDecodeBox;

mp4lib.boxes.CompositionToDecodeBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_INT32.getLength() * 5;
};

mp4lib.boxes.CompositionToDecodeBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);

    this.compositionToDTSShift = this._readData(data, mp4lib.fields.FIELD_INT32);
    this.leastDecodeToDisplayDelta = this._readData(data, mp4lib.fields.FIELD_INT32);
    this.greatestDecodeToDisplayDelta = this._readData(data, mp4lib.fields.FIELD_INT32);
    this.compositionStartTime = this._readData(data, mp4lib.fields.FIELD_INT32);
    this.compositionEndTime = this._readData(data, mp4lib.fields.FIELD_INT32);
    return this.localPos;
};

mp4lib.boxes.CompositionToDecodeBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);

    this._writeData(data, mp4lib.fields.FIELD_INT32, this.compositionToDTSShift);
    this._writeData(data, mp4lib.fields.FIELD_INT32, this.leastDecodeToDisplayDelta);
    this._writeData(data, mp4lib.fields.FIELD_INT32, this.greatestDecodeToDisplayDelta);
    this._writeData(data, mp4lib.fields.FIELD_INT32, this.compositionStartTime);
    this._writeData(data, mp4lib.fields.FIELD_INT32, this.compositionEndTime);
    return this.localPos;
};

// --------------------------- stss ----------------------------------
mp4lib.boxes.SyncSampleBox = function(size) {
    mp4lib.boxes.FullBox.call(this, 'stss', size);
    this.entries = [];
};

mp4lib.boxes.SyncSampleBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);
mp4lib.boxes.SyncSampleBox.prototype.constructor = mp4lib.boxes.SyncSampleBox;

mp4lib.boxes.SyncSampleBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_UINT32.getLength(); //entry_count size
    this.size += mp4lib.fields.FIELD_UINT32.getLength() * this.entry_count; //entries size
};

mp4lib.boxes.SyncSampleBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);
    var i = 0,
        struct = {};

    this.entry_count = this._readData(data, mp4lib.fields.FIELD_UINT32);
    for (i = 0; i < this.entry_count; i++) {
        struct = {};
        struct.sample_number = this._readData(data, mp4lib.fields.FIELD_UINT32);
        this.entries.push(struct);
    }
    return this.localPos;
};

mp4lib.boxes.SyncSampleBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);
    var i = 0;
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.entry_count);
    for (i = 0; i < this.entry_count; i++) {
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.entries[i].sample_number);
    }
    return this.localPos;
};

// --------------------------- tref ----------------------------------
mp4lib.boxes.TrackReferenceBox = function(size) {
    mp4lib.boxes.FullBox.call(this, 'tref', size);
};

mp4lib.boxes.TrackReferenceBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);
mp4lib.boxes.TrackReferenceBox.prototype.constructor = mp4lib.boxes.TrackReferenceBox;

mp4lib.boxes.TrackReferenceBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_UINT32.getLength() * this.track_IDs.length;
};

mp4lib.boxes.TrackReferenceBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);
    this.track_IDs = this._readArrayData(data, mp4lib.fields.FIELD_UINT32);
    return this.localPos;
};

mp4lib.boxes.TrackReferenceBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);
    this._writeArrayData(data, mp4lib.fields.FIELD_UINT32, this.track_IDs);
    return this.localPos;
};

//---------------------------- frma ----------------------------------
mp4lib.boxes.OriginalFormatBox = function(size) {
    mp4lib.boxes.Box.call(this, 'frma', size);
};

mp4lib.boxes.OriginalFormatBox.prototype = Object.create(mp4lib.boxes.Box.prototype);
mp4lib.boxes.OriginalFormatBox.prototype.constructor = mp4lib.boxes.OriginalFormatBox;

mp4lib.boxes.OriginalFormatBox.prototype.computeLength = function() {
    mp4lib.boxes.Box.prototype.computeLength.call(this);
    this.size += mp4lib.fields.FIELD_UINT32.getLength();
};

mp4lib.boxes.OriginalFormatBox.prototype.read = function(data, pos, end) {
    this.localPos = pos;
    this.localEnd = end;
    this.data_format = this._readData(data, mp4lib.fields.FIELD_UINT32);
    return this.localPos;
};

mp4lib.boxes.OriginalFormatBox.prototype.write = function(data, pos) {
    mp4lib.boxes.Box.prototype.write.call(this, data, pos);
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.data_format);
    return this.localPos;
};

// -------------------------------------------------------------------
// Microsoft Smooth Streaming specific boxes
// -------------------------------------------------------------------

// --------------------------- piff ----------------------------------
//PIFF Sample Encryption box
mp4lib.boxes.PiffSampleEncryptionBox = function(size) {
    mp4lib.boxes.FullBox.call(this, 'sepiff', size, [0xA2, 0x39, 0x4F, 0x52, 0x5A, 0x9B, 0x4F, 0x14, 0xA2, 0x44, 0x6C, 0x42, 0x7C, 0x64, 0x8D, 0xF4]);
};

mp4lib.boxes.PiffSampleEncryptionBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);
mp4lib.boxes.PiffSampleEncryptionBox.prototype.constructor = mp4lib.boxes.PiffSampleEncryptionBox;

mp4lib.boxes.PiffSampleEncryptionBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    var i = 0,
        j = 0;

    this.size += mp4lib.fields.FIELD_UINT32.getLength(); //sample_count size
    if (this.flags & 1) {
        this.size += mp4lib.fields.FIELD_UINT8.getLength(); //IV_size size
    }
    for (i = 0; i < this.sample_count; i++) {
        this.size += 8; // InitializationVector size
        if (this.flags & 2) {
            this.size += mp4lib.fields.FIELD_UINT16.getLength(); // NumberOfEntries size
            for (j = 0; j < this.entry[i].NumberOfEntries; j++) {
                this.size += mp4lib.fields.FIELD_UINT16.getLength(); //BytesOfClearData size
                this.size += mp4lib.fields.FIELD_UINT32.getLength(); //BytesOfEncryptedData size
            }
        }
    }
};

mp4lib.boxes.PiffSampleEncryptionBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);
    var i = 0,
        j = 0;
    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.sample_count);
    if (this.flags & 1) {
        this._writeData(data, mp4lib.fields.FIELD_UINT8, this.IV_size);
    }
    for (i = 0; i < this.sample_count; i++) {
        this._writeBuffer(data, this.entry[i].InitializationVector, 8);

        if (this.flags & 2) {
            this._writeData(data, mp4lib.fields.FIELD_UINT16, this.entry[i].NumberOfEntries); // NumberOfEntries

            for (j = 0; j < this.entry[i].NumberOfEntries; j++) {
                this._writeData(data, mp4lib.fields.FIELD_UINT16, this.entry[i].clearAndCryptedData[j].BytesOfClearData); //BytesOfClearData
                this._writeData(data, mp4lib.fields.FIELD_UINT32, this.entry[i].clearAndCryptedData[j].BytesOfEncryptedData); //BytesOfEncryptedData size
            }
        }
    }
    return this.localPos;
};

mp4lib.boxes.PiffSampleEncryptionBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);
    var i = 0,
        j = 0,
        clearAndCryptedStruct = {},
        struct = {};
    this.sample_count = this._readData(data, mp4lib.fields.FIELD_UINT32);
    if (this.flags & 1) {
        this.IV_size = this._readData(data, mp4lib.fields.FIELD_UINT8);
    }
    this.entry = [];
    for (i = 0; i < this.sample_count; i++) {
        struct = {};
        struct.InitializationVector = data.subarray(this.localPos, this.localPos + 8);
        this.localPos += 8; //InitializationVector size

        if (this.flags & 2) {
            struct.NumberOfEntries = this._readData(data, mp4lib.fields.FIELD_UINT16); // NumberOfEntries
            struct.clearAndCryptedData = [];
            for (j = 0; j < struct.NumberOfEntries; j++) {
                clearAndCryptedStruct = {};
                clearAndCryptedStruct.BytesOfClearData = this._readData(data, mp4lib.fields.FIELD_UINT16); //BytesOfClearData
                clearAndCryptedStruct.BytesOfEncryptedData = this._readData(data, mp4lib.fields.FIELD_UINT32); //BytesOfEncryptedData size
                struct.clearAndCryptedData.push(clearAndCryptedStruct);
            }
        }
        this.entry.push(struct);
    }
    return this.localPos;
};

//PIFF Track Encryption Box
mp4lib.boxes.PiffTrackEncryptionBox = function(size) {
    mp4lib.boxes.FullBox.call(this, 'tepiff', size, [0x89, 0x74, 0xDB, 0xCE, 0x7B, 0xE7, 0x4C, 0x51, 0x84, 0xF9, 0x71, 0x48, 0xF9, 0x88, 0x25, 0x54]);
};

mp4lib.boxes.PiffTrackEncryptionBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);
mp4lib.boxes.PiffTrackEncryptionBox.prototype.constructor = mp4lib.boxes.PiffTrackEncryptionBox;

//PIFF Protection System Specific Header Box
mp4lib.boxes.PiffProtectionSystemSpecificHeaderBox = function(size) {
    mp4lib.boxes.FullBox.call(this, 'psshpiff', size, [0xD0, 0x8A, 0x4F, 0x18, 0x10, 0xF3, 0x4A, 0x82, 0xB6, 0xC8, 0x32, 0xD8, 0xAB, 0xA1, 0x83, 0xD3]);
};

mp4lib.boxes.PiffProtectionSystemSpecificHeaderBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);
mp4lib.boxes.PiffProtectionSystemSpecificHeaderBox.prototype.constructor = mp4lib.boxes.PiffProtectionSystemSpecificHeaderBox;

// --------------------------- tfdx -----------------------------
mp4lib.boxes.TfxdBox = function(size) {
    mp4lib.boxes.FullBox.call(this, 'tfxd', size, [0x6D, 0x1D, 0x9B, 0x05, 0x42, 0xD5, 0x44, 0xE6, 0x80, 0xE2, 0x14, 0x1D, 0xAF, 0xF7, 0x57, 0xB2]);
};

mp4lib.boxes.TfxdBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);
mp4lib.boxes.TfxdBox.prototype.constructor = mp4lib.boxes.TfxdBox;

mp4lib.boxes.TfxdBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);
    if (this.version === 1) {
        this.size += mp4lib.fields.FIELD_UINT64.getLength() * 2;
    } else {
        this.size += mp4lib.fields.FIELD_UINT32.getLength() * 2;
    }
};

mp4lib.boxes.TfxdBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);

    if (this.version === 1) {
        this._writeData(data, mp4lib.fields.FIELD_UINT64, this.fragment_absolute_time);
        this._writeData(data, mp4lib.fields.FIELD_UINT64, this.fragment_duration);
    } else {
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.fragment_absolute_time);
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.fragment_duration);
    }
    return this.localPos;
};

mp4lib.boxes.TfxdBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);

    if (this.version === 1) {
        this.fragment_absolute_time = this._readData(data, mp4lib.fields.FIELD_UINT64);
        this.fragment_duration = this._readData(data, mp4lib.fields.FIELD_UINT64);
    } else {
        this.fragment_absolute_time = this._readData(data, mp4lib.fields.FIELD_UINT32);
        this.fragment_duration = this._readData(data, mp4lib.fields.FIELD_UINT32);
    }
    return this.localPos;
};

// --------------------------- tfrf -----------------------------
mp4lib.boxes.TfrfBox = function(size) {
    mp4lib.boxes.FullBox.call(this, 'tfrf', size, [0xD4, 0x80, 0x7E, 0xF2, 0xCA, 0x39, 0x46, 0x95, 0x8E, 0x54, 0x26, 0xCB, 0x9E, 0x46, 0xA7, 0x9F]);
};

mp4lib.boxes.TfrfBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);
mp4lib.boxes.TfrfBox.prototype.constructor = mp4lib.boxes.TfrfBox;

mp4lib.boxes.TfrfBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);

    this.size += mp4lib.fields.FIELD_UINT8.getLength(); //fragment_count size
    if (this.version === 1) {
        this.size += (mp4lib.fields.FIELD_UINT64.getLength() * 2 /*fragment_absolute_time and fragment_duration size*/ ) * this.fragment_count;
    } else {
        this.size += (mp4lib.fields.FIELD_UINT32.getLength() * 2 /*fragment_absolute_time and fragment_duration size*/ ) * this.fragment_count;
    }
};

mp4lib.boxes.TfrfBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);
    var i = 0;
    this._writeData(data, mp4lib.fields.FIELD_UINT8, this.fragment_count);
    for (i = 0; i < this.fragment_count; i++) {
        if (this.version === 1) {
            this._writeData(data, mp4lib.fields.FIELD_UINT64, this.entry[i].fragment_absolute_time);
            this._writeData(data, mp4lib.fields.FIELD_UINT64, this.entry[i].fragment_duration);
        } else {
            this._writeData(data, mp4lib.fields.FIELD_UINT32, this.entry[i].fragment_absolute_time);
            this._writeData(data, mp4lib.fields.FIELD_UINT32, this.entry[i].fragment_duration);
        }
    }
    return this.localPos;
};

mp4lib.boxes.TfrfBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);
    var i = 0,
        struct = {};
    this.fragment_count = this._readData(data, mp4lib.fields.FIELD_UINT8);
    this.entry = [];
    for (i = 0; i < this.fragment_count; i++) {
        struct = {};
        if (this.version === 1) {
            struct.fragment_absolute_time = this._readData(data, mp4lib.fields.FIELD_UINT64);
            struct.fragment_duration = this._readData(data, mp4lib.fields.FIELD_UINT64);
        } else {
            struct.fragment_absolute_time = this._readData(data, mp4lib.fields.FIELD_UINT32);
            struct.fragment_duration = this._readData(data, mp4lib.fields.FIELD_UINT32);
        }
        this.entry.push(struct);
    }
    return this.localPos;
};

// --------------------------- subs -----------------------------
mp4lib.boxes.SubSampleInformationBox = function(size) {
    mp4lib.boxes.FullBox.call(this, 'subs', size);
};

mp4lib.boxes.SubSampleInformationBox.prototype = Object.create(mp4lib.boxes.FullBox.prototype);
mp4lib.boxes.SubSampleInformationBox.prototype.constructor = mp4lib.boxes.SubSampleInformationBox;

mp4lib.boxes.SubSampleInformationBox.prototype.computeLength = function() {
    mp4lib.boxes.FullBox.prototype.computeLength.call(this);

    this.size += mp4lib.fields.FIELD_UINT32.getLength(); //entry_count size
    for (i = 0; i < this.entry_count; i++) {
        this.size += mp4lib.fields.FIELD_UINT32.getLength(); //sample_delta size
        this.size += mp4lib.fields.FIELD_UINT16.getLength(); //subsample_count size

        if (this.entry[i].subsample_count > 0) {
            for (j=0; j < this.entry[i].subsample_count; j++) {                
                if (this.version === 1) {
                    this.size += mp4lib.fields.FIELD_UINT32.getLength(); //subsample_size size
                } else {
                    this.size += mp4lib.fields.FIELD_UINT16.getLength(); //subsample_size size
                }

                this.size += mp4lib.fields.FIELD_UINT8.getLength(); //subsample_priority size
                this.size += mp4lib.fields.FIELD_UINT8.getLength(); //discardable size
                this.size += mp4lib.fields.FIELD_UINT32.getLength(); //reserved size
            }
        }
    }
};

mp4lib.boxes.SubSampleInformationBox.prototype.read = function(data, pos, end) {
    mp4lib.boxes.FullBox.prototype.read.call(this, data, pos, end);
    var i = 0,
        j = 0,
        struct = {},
        subSampleStruct = {};

    this.entry_count = this._readData(data, mp4lib.fields.FIELD_UINT32);
    this.entry = [];
    for (i = 0; i < this.entry_count; i++) {
        struct = {};
        struct.sample_delta = this._readData(data, mp4lib.fields.FIELD_UINT32);
        struct.subsample_count = this._readData(data, mp4lib.fields.FIELD_UINT16);
        if (struct.subsample_count > 0) {
            struct.subSampleEntries = [];
            for (j=0; j < struct.subsample_count; j++) {
                subSampleStruct = {};
                if (this.version === 1) {
                    subSampleStruct.subsample_size = this._readData(data, mp4lib.fields.FIELD_UINT32);
                } else {
                    subSampleStruct.subsample_size = this._readData(data, mp4lib.fields.FIELD_UINT16);
                }
                subSampleStruct.subsample_priority = this._readData(data, mp4lib.fields.FIELD_UINT8);
                subSampleStruct.discardable = this._readData(data, mp4lib.fields.FIELD_UINT8);
                subSampleStruct.reserved = this._readData(data, mp4lib.fields.FIELD_UINT32);
                struct.subSampleEntries.push(subSampleStruct);
            }
        }
        this.entry.push(struct);
    }

    return this.localPos;
};

mp4lib.boxes.SubSampleInformationBox.prototype.write = function(data, pos) {
    mp4lib.boxes.FullBox.prototype.write.call(this, data, pos);
    var i = 0,
        j = 0;

    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.entry_count);

    for (i = 0; i < this.entry_count; i++) {
        this._writeData(data, mp4lib.fields.FIELD_UINT32, this.entry[i].sample_delta);
        this._writeData(data, mp4lib.fields.FIELD_UINT16, this.entry[i].subsample_count);
        if (this.entry[i].subsample_count > 0) {

            for (j = 0; j < this.entry[i].subsample_count; j++) {
                if (this.version === 1) {
                    this._writeData(data, mp4lib.fields.FIELD_UINT32, this.entry[i].subSampleEntries[j].subsample_size);
                } else {
                    this._writeData(data, mp4lib.fields.FIELD_UINT16, this.entry[i].subSampleEntries[j].subsample_size);
                }
                this._writeData(data, mp4lib.fields.FIELD_UINT8, this.entry[i].subSampleEntries[j].subsample_priority);
                this._writeData(data, mp4lib.fields.FIELD_UINT8, this.entry[i].subSampleEntries[j].discardable);
                this._writeData(data, mp4lib.fields.FIELD_UINT32, this.entry[i].subSampleEntries[j].reserved);
            }
        }
    }

    return this.localPos;
};

mp4lib.registerTypeBoxes();