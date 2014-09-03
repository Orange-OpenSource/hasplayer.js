if (typeof require !== 'undefined') {
    // node.js adaptation
    var mp4lib = require('./mp4lib.js');
}

// ---------- File (treated similarly to box in terms of processing) ----------

mp4lib.boxes.File = function(){};

mp4lib.boxes.File.prototype._processFields = function(processor) {
    processor.eat('boxes',mp4lib.fields.FIELD_CONTAINER_CHILDREN);
};

// ---------- Generic Box -------------------------------

mp4lib.boxes.Box = function(){
    this.size=null;
    this.boxtype = null;
};

mp4lib.boxes.Box.prototype._processFields = function(processor) {
    processor.eat('size',mp4lib.fields.FIELD_UINT32);
    processor.eat('boxtype',mp4lib.fields.FIELD_ID);

    if (this.size==1) {
        processor.eat('largesize',mp4lib.fields.FIELD_INT64);
    }

    if ((this.boxtype=='uuid') || (mp4lib.findUUIDByBoxtype(this.boxtype))) {
        processor.eat('usertype', new mp4lib.fields.ArrayField(mp4lib.fields.FIELD_INT8, 16));
    }
};


// ---------- Full Box -------------------------------

mp4lib.boxes.FullBox = function() {};

mp4lib.boxes.FullBox.prototype._processFields = function(processor) {
    mp4lib.boxes.Box.prototype._processFields.call(this,processor);
    processor.eat('version',mp4lib.fields.FIELD_INT8);
    processor.eat('flags',mp4lib.fields.FIELD_BIT24);
};

// ----------- Unknown Box -----------------------------

mp4lib.boxes.UnknownBox =  function() {};

mp4lib.boxes.UnknownBox.prototype._processFields = function(processor) {
    mp4lib.boxes.Box.prototype._processFields.call(this,processor);
    processor.eat('unrecognized_data',new mp4lib.fields.BoxFillingDataField());
};


// --------------------------- ftyp ----------------------------------

mp4lib.boxes.FileTypeBox = function() {};

mp4lib.boxes.FileTypeBox.prototype.boxtype = 'ftyp';

mp4lib.boxes.FileTypeBox.prototype._processFields = function(processor) {
    mp4lib.boxes.Box.prototype._processFields.call(this,processor);
    processor.eat('major_brand',mp4lib.fields.FIELD_INT32);
    processor.eat('minor_brand',mp4lib.fields.FIELD_INT32);
    processor.eat('compatible_brands',new mp4lib.fields.BoxFillingArrayField(mp4lib.fields.FIELD_INT32));
};

mp4lib.registerBoxType(mp4lib.boxes.FileTypeBox);

// --------------------------- moov ----------------------------------

mp4lib.boxes.MovieBox = function() {};

mp4lib.boxes.MovieBox.prototype.boxtype = 'moov';

mp4lib.boxes.MovieBox.prototype._processFields = function(processor) {
   mp4lib.boxes.Box.prototype._processFields.call(this,processor);
   processor.eat('boxes',mp4lib.fields.FIELD_CONTAINER_CHILDREN);
};

mp4lib.registerBoxType(mp4lib.boxes.MovieBox);

// --------------------------- moof ----------------------------------

mp4lib.boxes.MovieFragmentBox = function() {};

mp4lib.boxes.MovieFragmentBox.prototype.boxtype = 'moof';

mp4lib.boxes.MovieFragmentBox.prototype._processFields = function(processor) {
   mp4lib.boxes.Box.prototype._processFields.call(this,processor);
   processor.eat('boxes',mp4lib.fields.FIELD_CONTAINER_CHILDREN);
};

mp4lib.registerBoxType(mp4lib.boxes.MovieFragmentBox);

// --------------------------- mfra ----------------------------------

mp4lib.boxes.MovieFragmentRandomAccessBox = function() {};

mp4lib.boxes.MovieFragmentRandomAccessBox.prototype.boxtype = 'mfra';

mp4lib.boxes.MovieFragmentRandomAccessBox.prototype._processFields = function(processor) {
   mp4lib.boxes.Box.prototype._processFields.call(this,processor);
   processor.eat('boxes',mp4lib.fields.FIELD_CONTAINER_CHILDREN);
};

mp4lib.registerBoxType(mp4lib.boxes.MovieFragmentRandomAccessBox);

// --------------------------- udta ----------------------------------

mp4lib.boxes.UserDataBox = function() {};

mp4lib.boxes.UserDataBox.prototype.boxtype = 'udta';

mp4lib.boxes.UserDataBox.prototype._processFields = function(processor) {
   mp4lib.boxes.Box.prototype._processFields.call(this,processor);
   processor.eat('boxes',mp4lib.fields.FIELD_CONTAINER_CHILDREN);
};

mp4lib.registerBoxType(mp4lib.boxes.UserDataBox);

// --------------------------- trak ----------------------------------

mp4lib.boxes.TrackBox = function() {};

mp4lib.boxes.TrackBox.prototype.boxtype = 'trak';

mp4lib.boxes.TrackBox.prototype._processFields = function(processor) {
   mp4lib.boxes.Box.prototype._processFields.call(this,processor);
   processor.eat('boxes',mp4lib.fields.FIELD_CONTAINER_CHILDREN);
};

mp4lib.registerBoxType(mp4lib.boxes.TrackBox);

// --------------------------- edts ----------------------------------

mp4lib.boxes.EditBox = function() {};

mp4lib.boxes.EditBox.prototype.boxtype = 'edts';

mp4lib.boxes.EditBox.prototype._processFields = function(processor) {
   mp4lib.boxes.Box.prototype._processFields.call(this,processor);
   processor.eat('boxes',mp4lib.fields.FIELD_CONTAINER_CHILDREN);
};

mp4lib.registerBoxType(mp4lib.boxes.EditBox);

// --------------------------- mdia ----------------------------------

mp4lib.boxes.MediaBox = function() {};

mp4lib.boxes.MediaBox.prototype.boxtype = 'mdia';

mp4lib.boxes.MediaBox.prototype._processFields = function(processor) {
   mp4lib.boxes.Box.prototype._processFields.call(this,processor);
   processor.eat('boxes',mp4lib.fields.FIELD_CONTAINER_CHILDREN);
};

mp4lib.registerBoxType(mp4lib.boxes.MediaBox);

// --------------------------- minf ----------------------------------

mp4lib.boxes.MediaInformationBox = function() {};
mp4lib.boxes.MediaInformationBox.prototype.boxtype = 'minf';

mp4lib.boxes.MediaInformationBox.prototype._processFields = function(processor) {
   mp4lib.boxes.Box.prototype._processFields.call(this,processor);
   processor.eat('boxes',mp4lib.fields.FIELD_CONTAINER_CHILDREN);
};

mp4lib.registerBoxType(mp4lib.boxes.MediaInformationBox);

// --------------------------- dinf ----------------------------------

mp4lib.boxes.DataInformationBox=function() {};

mp4lib.boxes.DataInformationBox.prototype.boxtype = 'dinf';

mp4lib.boxes.DataInformationBox.prototype._processFields = function(processor) {
   mp4lib.boxes.Box.prototype._processFields.call(this,processor);
   processor.eat('boxes',mp4lib.fields.FIELD_CONTAINER_CHILDREN);
};

mp4lib.registerBoxType(mp4lib.boxes.DataInformationBox);

// --------------------------- stbl ----------------------------------

mp4lib.boxes.SampleTableBox = function() {};

mp4lib.boxes.SampleTableBox.prototype.boxtype = 'stbl';

mp4lib.boxes.SampleTableBox.prototype._processFields = function(processor) {
   mp4lib.boxes.Box.prototype._processFields.call(this,processor);
   processor.eat('boxes',mp4lib.fields.FIELD_CONTAINER_CHILDREN);
};

mp4lib.registerBoxType(mp4lib.boxes.SampleTableBox);

// --------------------------- mvex ----------------------------------

mp4lib.boxes.MovieExtendsBox=function() {};

mp4lib.boxes.MovieExtendsBox.prototype.boxtype = 'mvex';

mp4lib.boxes.MovieExtendsBox.prototype._processFields = function(processor) {
   mp4lib.boxes.Box.prototype._processFields.call(this,processor);
   processor.eat('boxes',mp4lib.fields.FIELD_CONTAINER_CHILDREN);
};

mp4lib.registerBoxType(mp4lib.boxes.MovieExtendsBox);

// --------------------------- traf ----------------------------------

mp4lib.boxes.TrackFragmentBox=function() {};

mp4lib.boxes.TrackFragmentBox.prototype.boxtype = 'traf';

mp4lib.boxes.TrackFragmentBox.prototype._processFields = function(processor) {
   mp4lib.boxes.Box.prototype._processFields.call(this,processor);
   processor.eat('boxes',mp4lib.fields.FIELD_CONTAINER_CHILDREN);
};

mp4lib.registerBoxType(mp4lib.boxes.TrackFragmentBox);

// --------------------------- meta -----------------------------

mp4lib.boxes.MetaBox=function() {};

mp4lib.boxes.MetaBox.prototype.boxtype = 'meta';

mp4lib.boxes.MetaBox.prototype._processFields = function(processor) {
   mp4lib.boxes.FullBox.prototype._processFields.call(this,processor);
   processor.eat('boxes',mp4lib.fields.FIELD_CONTAINER_CHILDREN);
};

mp4lib.registerBoxType(mp4lib.boxes.MetaBox);

// --------------------------- mvhd ----------------------------------

mp4lib.boxes.MovieHeaderBox=function() {};

mp4lib.boxes.MovieHeaderBox.prototype.boxtype = 'mvhd';

mp4lib.boxes.MovieHeaderBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this,processor);
    if (this.version==1) {
        processor.eat('creation_time',mp4lib.fields.FIELD_UINT64);
        processor.eat('modification_time',mp4lib.fields.FIELD_UINT64);
        processor.eat('timescale',mp4lib.fields.FIELD_UINT32);
        processor.eat('duration',mp4lib.fields.FIELD_UINT64);
    } else {
        processor.eat('creation_time',mp4lib.fields.FIELD_UINT32);
        processor.eat('modification_time',mp4lib.fields.FIELD_UINT32);
        processor.eat('timescale',mp4lib.fields.FIELD_UINT32);
        processor.eat('duration',mp4lib.fields.FIELD_UINT32);
    }

    processor.eat('rate',mp4lib.fields.FIELD_INT32);
    processor.eat('volume',mp4lib.fields.FIELD_INT16);
    processor.eat('reserved',mp4lib.fields.FIELD_INT16);
    processor.eat('reserved_2',new mp4lib.fields.ArrayField(mp4lib.fields.FIELD_INT32,2));
    processor.eat('matrix',new mp4lib.fields.ArrayField(mp4lib.fields.FIELD_INT32,9));
    processor.eat('pre_defined',new mp4lib.fields.ArrayField(mp4lib.fields.FIELD_BIT32,6));
    processor.eat('next_track_ID',mp4lib.fields.FIELD_UINT32);
};

mp4lib.registerBoxType(mp4lib.boxes.MovieHeaderBox);

// --------------------------- mdat ----------------------------------

mp4lib.boxes.MediaDataBox=function() {};

mp4lib.boxes.MediaDataBox.prototype.boxtype = 'mdat';

mp4lib.boxes.MediaDataBox.prototype._processFields = function(processor) {
    mp4lib.boxes.Box.prototype._processFields.call(this,processor);
    processor.eat('data',mp4lib.fields.FIELD_BOX_FILLING_DATA);

};

mp4lib.registerBoxType(mp4lib.boxes.MediaDataBox);

// --------------------------- free ----------------------------------

mp4lib.boxes.FreeSpaceBox=function() {};

mp4lib.boxes.FreeSpaceBox.prototype.boxtype = 'free';

mp4lib.boxes.FreeSpaceBox.prototype._processFields = function(processor) {
    mp4lib.boxes.Box.prototype._processFields.call(this,processor);
    processor.eat('data',mp4lib.fields.FIELD_BOX_FILLING_DATA);

};

mp4lib.registerBoxType(mp4lib.boxes.FreeSpaceBox);

// --------------------------- sidx ----------------------------------

mp4lib.boxes.SegmentIndexBox=function() {};

mp4lib.boxes.SegmentIndexBox.prototype.boxtype = 'sidx';

mp4lib.boxes.SegmentIndexBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this,processor);
    processor.eat('reference_ID',mp4lib.fields.FIELD_UINT32);
    processor.eat('timescale',mp4lib.fields.FIELD_UINT32);
    if (this.version==1) {
        processor.eat('earliest_presentation_time',mp4lib.fields.FIELD_UINT64);
        processor.eat('first_offset',mp4lib.fields.FIELD_UINT64);
    } else {
        processor.eat('earliest_presentation_time',mp4lib.fields.FIELD_UINT32);
        processor.eat('first_offset',mp4lib.fields.FIELD_UINT32);
    }
    processor.eat('reserved',mp4lib.fields.FIELD_UINT16);

    if (!processor.isDeserializing){
        this.reference_count = this.references.length;
    }

    processor.eat('reference_count',mp4lib.fields.FIELD_UINT16);

    var referenceField = new mp4lib.fields.StructureField(this,mp4lib.boxes.SegmentIndexBox.prototype._processReference);
    var a = new mp4lib.fields.ArrayField( referenceField, this.reference_count);
    processor.eat('references',a);
};

mp4lib.boxes.SegmentIndexBox.prototype._processReference = function(box,processor) {
    processor.eat('reference_info',mp4lib.fields.FIELD_UINT64);
    processor.eat('SAP',mp4lib.fields.FIELD_UINT32);
};

mp4lib.registerBoxType(mp4lib.boxes.SegmentIndexBox);

// --------------------------- tkhd ----------------------------------

mp4lib.boxes.TrackHeaderBox=function() {};

mp4lib.boxes.TrackHeaderBox.prototype.boxtype = 'tkhd';

mp4lib.boxes.TrackHeaderBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this,processor);
    if (this.version==1) {
        processor.eat('creation_time',mp4lib.fields.FIELD_UINT64);
        processor.eat('modification_time',mp4lib.fields.FIELD_UINT64);
        processor.eat('track_id',mp4lib.fields.FIELD_UINT32);
        processor.eat('reserved',mp4lib.fields.FIELD_UINT32);
        processor.eat('duration',mp4lib.fields.FIELD_UINT64);
    } else {
        processor.eat('creation_time',mp4lib.fields.FIELD_UINT32);
        processor.eat('modification_time',mp4lib.fields.FIELD_UINT32);
        processor.eat('track_id',mp4lib.fields.FIELD_UINT32);
        processor.eat('reserved',mp4lib.fields.FIELD_UINT32);
        processor.eat('duration',mp4lib.fields.FIELD_UINT32);
    }

    processor.eat('reserved_2',new mp4lib.fields.ArrayField(mp4lib.fields.FIELD_UINT32,2));
    processor.eat('layer',mp4lib.fields.FIELD_INT16);
    processor.eat('alternate_group',mp4lib.fields.FIELD_INT16);
    processor.eat('volume',mp4lib.fields.FIELD_INT16);
    processor.eat('reserved_3',mp4lib.fields.FIELD_INT16);
    processor.eat('matrix',new mp4lib.fields.ArrayField(mp4lib.fields.FIELD_INT32,9));
    processor.eat('width',mp4lib.fields.FIELD_INT32);
    processor.eat('height',mp4lib.fields.FIELD_INT32);
};
mp4lib.registerBoxType(mp4lib.boxes.TrackHeaderBox);

// --------------------------- mdhd ----------------------------------

mp4lib.boxes.MediaHeaderBox=function() {};

mp4lib.boxes.MediaHeaderBox.prototype.boxtype = 'mdhd';

mp4lib.boxes.MediaHeaderBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this,processor);
    if (this.version==1) {
        processor.eat('creation_time',mp4lib.fields.FIELD_UINT64);
        processor.eat('modification_time',mp4lib.fields.FIELD_UINT64);
        processor.eat('timescale',mp4lib.fields.FIELD_UINT32);
        processor.eat('duration',mp4lib.fields.FIELD_UINT64);
    } else {
        processor.eat('creation_time',mp4lib.fields.FIELD_UINT32);
        processor.eat('modification_time',mp4lib.fields.FIELD_UINT32);
        processor.eat('timescale',mp4lib.fields.FIELD_UINT32);
        processor.eat('duration',mp4lib.fields.FIELD_UINT32);
    }

    processor.eat('language',mp4lib.fields.FIELD_UINT16);
    processor.eat('reserved',mp4lib.fields.FIELD_UINT16);
};
mp4lib.registerBoxType(mp4lib.boxes.MediaHeaderBox);

// --------------------------- mehd ----------------------------------

mp4lib.boxes.MovieExtendsHeaderBox=function() {};

mp4lib.boxes.MovieExtendsHeaderBox.prototype.boxtype = 'mehd';

mp4lib.boxes.MovieExtendsHeaderBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this,processor);
    if (this.version==1) {
        processor.eat('fragment_duration',mp4lib.fields.FIELD_UINT64);
    } else {
        processor.eat('fragment_duration',mp4lib.fields.FIELD_UINT32);
    }
};
mp4lib.registerBoxType(mp4lib.boxes.MovieExtendsHeaderBox);

// --------------------------- hdlr --------------------------------

mp4lib.boxes.HandlerBox=function() {};

mp4lib.boxes.HandlerBox.prototype.boxtype = 'hdlr';

//add NAN
mp4lib.boxes.HandlerBox.prototype.HANDLERTYPEVIDEO = "vide";
mp4lib.boxes.HandlerBox.prototype.HANDLERTYPEAUDIO = "soun";
mp4lib.boxes.HandlerBox.prototype.HANDLERTYPETEXT = "meta";
mp4lib.boxes.HandlerBox.prototype.HANDLERVIDEONAME = "Video Track";
mp4lib.boxes.HandlerBox.prototype.HANDLERAUDIONAME = "Audio Track";
mp4lib.boxes.HandlerBox.prototype.HANDLERTEXTNAME = "Text Track";

mp4lib.boxes.HandlerBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this,processor);
    processor.eat('pre_defined',mp4lib.fields.FIELD_UINT32);
    processor.eat('handler_type',mp4lib.fields.FIELD_UINT32);
    processor.eat('reserved',new mp4lib.fields.ArrayField(mp4lib.fields.FIELD_UINT32,3));
    processor.eat('name',mp4lib.fields.FIELD_STRING);
};
mp4lib.registerBoxType(mp4lib.boxes.HandlerBox);

// --------------------------- stts ----------------------------------

mp4lib.boxes.TimeToSampleBox=function() {};

mp4lib.boxes.TimeToSampleBox.prototype.boxtype = 'stts';

mp4lib.boxes.TimeToSampleBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this,processor);

    if (!processor.isDeserializing){
        this.entry_count = this.entry.length;
    }

    processor.eat('entry_count',mp4lib.fields.FIELD_UINT_32);
    var entryField = new mp4lib.fields.StructureField(this, mp4lib.boxes.TimeToSampleBox.prototype._processEntry);
    var a = new mp4lib.fields.ArrayField( entryField, this.entry_count);
    processor.eat('entry',a);
};

mp4lib.boxes.TimeToSampleBox.prototype._processEntry = function(box,processor) {
    processor.eat('sample_count',mp4lib.fields.FIELD_UINT32);
    processor.eat('sample_delta',mp4lib.fields.FIELD_UINT32);
};

mp4lib.registerBoxType(mp4lib.boxes.TimeToSampleBox);

// --------------------------- stsc ----------------------------------

mp4lib.boxes.SampleToChunkBox=function() {};

mp4lib.boxes.SampleToChunkBox.prototype.boxtype = 'stsc';

mp4lib.boxes.SampleToChunkBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this,processor);

    if (!processor.isDeserializing){
        this.entry_count = this.entry.length;
    }

    processor.eat('entry_count',mp4lib.fields.FIELD_UINT32);
    var entryField = new mp4lib.fields.StructureField(this,mp4lib.boxes.SampleToChunkBox.prototype._processEntry);
    var a = new mp4lib.fields.ArrayField( entryField, this.entry_count);
    processor.eat('entry',a);
};

mp4lib.boxes.SampleToChunkBox.prototype._processEntry = function(box,processor) {
    processor.eat('first_chunk',mp4lib.fields.FIELD_UINT32);
    processor.eat('samples_per_chunk',mp4lib.fields.FIELD_UINT32);
    processor.eat('samples_description_index',mp4lib.fields.FIELD_UINT32);
};

mp4lib.registerBoxType(mp4lib.boxes.SampleToChunkBox);

// --------------------------- stco ----------------------------------

mp4lib.boxes.ChunkOffsetBox=function() {};

mp4lib.boxes.ChunkOffsetBox.prototype.boxtype = 'stco';

mp4lib.boxes.ChunkOffsetBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this,processor);

    if (!processor.isDeserializing){
        this.entry_count = this.chunk_offset.length;
    }

    processor.eat('entry_count',mp4lib.fields.FIELD_UINT32);
    var a = new mp4lib.fields.ArrayField( mp4lib.fields.FIELD_UINT32, this.entry_count);
    processor.eat('chunk_offset',a);
};

mp4lib.registerBoxType(mp4lib.boxes.ChunkOffsetBox);

// --------------------------- trex ----------------------------------

mp4lib.boxes.TrackExtendsBox=function() {};

mp4lib.boxes.TrackExtendsBox.prototype.boxtype = 'trex';

mp4lib.boxes.TrackExtendsBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this,processor);
    processor.eat('track_ID',mp4lib.fields.FIELD_UINT32);
    processor.eat('default_sample_description_index',mp4lib.fields.FIELD_UINT32);
    processor.eat('default_sample_duration',mp4lib.fields.FIELD_UINT32);
    processor.eat('default_sample_size',mp4lib.fields.FIELD_UINT32);
    processor.eat('default_sample_flags',mp4lib.fields.FIELD_UINT32);
};
mp4lib.registerBoxType(mp4lib.boxes.TrackExtendsBox);

// --------------------------- vmhd ----------------------------------

mp4lib.boxes.VideoMediaHeaderBox=function() {};

mp4lib.boxes.VideoMediaHeaderBox.prototype.boxtype = 'vmhd';

mp4lib.boxes.VideoMediaHeaderBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this,processor);
    processor.eat('graphicsmode',mp4lib.fields.FIELD_INT16);
    processor.eat('opcolor',new mp4lib.fields.ArrayField(mp4lib.fields.FIELD_UINT16,3));
};

mp4lib.registerBoxType(mp4lib.boxes.VideoMediaHeaderBox);

// --------------------------- smhd ----------------------------------

mp4lib.boxes.SoundMediaHeaderBox=function() {};

mp4lib.boxes.SoundMediaHeaderBox.prototype.boxtype = 'smhd';

mp4lib.boxes.SoundMediaHeaderBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this,processor);
    processor.eat('balance',mp4lib.fields.FIELD_INT16);
    processor.eat('reserved',mp4lib.fields.FIELD_UINT16);
};

mp4lib.registerBoxType(mp4lib.boxes.SoundMediaHeaderBox);

// --------------------------- dref ----------------------------------

mp4lib.boxes.DataReferenceBox=function() {};

mp4lib.boxes.DataReferenceBox.prototype.boxtype = 'dref';

mp4lib.boxes.DataReferenceBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this,processor);

    if (!processor.isDeserializing)
        this.entry_count = this.boxes.length;

    processor.eat('entry_count',mp4lib.fields.FIELD_UINT32);
    processor.eat('boxes',mp4lib.fields.FIELD_CONTAINER_CHILDREN);
};

mp4lib.registerBoxType(mp4lib.boxes.DataReferenceBox);

// --------------------------- url  ----------------------------------

mp4lib.boxes.DataEntryUrlBox=function() {};

mp4lib.boxes.DataEntryUrlBox.prototype.boxtype = 'url ';

mp4lib.boxes.DataEntryUrlBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this,processor);

    if (processor.isDeserializing) {
        if (this.flags & '0x000001' === 0) {
            processor.eat('location',mp4lib.fields.FIELD_STRING);
        }
    } else {
        if ('location' in this) {
            this.flags = this.flags | 1;
            processor.eat('location',mp4lib.fields.FIELD_STRING);
        }
    }
};

mp4lib.registerBoxType(mp4lib.boxes.DataEntryUrlBox);

// --------------------------- urn  ----------------------------------

mp4lib.boxes.DataEntryUrnBox=function() {};

mp4lib.boxes.DataEntryUrnBox.prototype.boxtype = 'urn ';

mp4lib.boxes.DataEntryUrnBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this,processor);

    if (this.flags & '0x000001' === 0) {
        processor.eat('name',mp4lib.fields.FIELD_STRING);
        processor.eat('location',mp4lib.fields.FIELD_STRING);
    }
};

mp4lib.registerBoxType(mp4lib.boxes.DataEntryUrnBox);

// --------------------------- mfhd ----------------------------------

mp4lib.boxes.MovieFragmentHeaderBox=function() {};

mp4lib.boxes.MovieFragmentHeaderBox.prototype.boxtype = 'mfhd';

mp4lib.boxes.MovieFragmentHeaderBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this,processor);
    processor.eat('sequence_number',mp4lib.fields.FIELD_UINT32);
};

mp4lib.registerBoxType(mp4lib.boxes.MovieFragmentHeaderBox);

// --------------------------- tfhd ----------------------------------

mp4lib.boxes.TrackFragmentHeaderBox=function() {};

mp4lib.boxes.TrackFragmentHeaderBox.prototype.boxtype = 'tfhd';

mp4lib.boxes.TrackFragmentHeaderBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this,processor);
    processor.eat('track_ID',mp4lib.fields.FIELD_UINT32);
    processor.eat_flagged(this,'flags',0x000001,'base_data_offset',mp4lib.fields.FIELD_UINT64);
    processor.eat_flagged(this,'flags',0x000002,'sample_description_index',mp4lib.fields.FIELD_UINT32);
    processor.eat_flagged(this,'flags',0x000008,'default_sample_duration',mp4lib.fields.FIELD_UINT32);
    processor.eat_flagged(this,'flags',0x000010,'default_sample_size',mp4lib.fields.FIELD_UINT32);
    processor.eat_flagged(this,'flags',0x000020,'default_sample_flags',mp4lib.fields.FIELD_UINT32);
};

mp4lib.registerBoxType(mp4lib.boxes.TrackFragmentHeaderBox);

// --------------------------- tfdt ----------------------------------

mp4lib.boxes.TrackFragmentBaseMediaDecodeTimeBox=function() {};

mp4lib.boxes.TrackFragmentBaseMediaDecodeTimeBox.prototype.boxtype = 'tfdt';

mp4lib.boxes.TrackFragmentBaseMediaDecodeTimeBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this,processor);
    if (this.version==1) {
        processor.eat('baseMediaDecodeTime',mp4lib.fields.FIELD_UINT64);
    } else {
        processor.eat('baseMediaDecodeTime',mp4lib.fields.FIELD_UINT32);
    }
};

mp4lib.registerBoxType(mp4lib.boxes.TrackFragmentBaseMediaDecodeTimeBox);

// --------------------------- trun ----------------------------------

mp4lib.boxes.TrackFragmentRunBox=function() {};

mp4lib.boxes.TrackFragmentRunBox.prototype.boxtype = 'trun';

mp4lib.boxes.TrackFragmentRunBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this,processor);

    if (!processor.isDeserializing) {
        this.sample_count = this.samples_table.length;
    }

    processor.eat('sample_count',mp4lib.fields.FIELD_UINT32);

    processor.eat_flagged(this,'flags',0x000001,'data_offset',mp4lib.fields.FIELD_INT32);
    processor.eat_flagged(this,'flags',0x000004,'first_sample_flags',mp4lib.fields.FIELD_UINT32);

    var entryField = new mp4lib.fields.StructureField(this,mp4lib.boxes.TrackFragmentRunBox.prototype._processEntry);
    processor.eat('samples_table',new mp4lib.fields.ArrayField( entryField, this.sample_count));
};

mp4lib.boxes.TrackFragmentRunBox.prototype._processEntry = function(box,processor) {
    processor.eat_flagged(box,'flags',0x000100,'sample_duration',mp4lib.fields.FIELD_UINT32);
    processor.eat_flagged(box,'flags',0x000200,'sample_size',mp4lib.fields.FIELD_UINT32);
    processor.eat_flagged(box,'flags',0x000400,'sample_flags',mp4lib.fields.FIELD_UINT32);

    if (box.version==1) {
        processor.eat_flagged(box,'flags',0x000800,'sample_composition_time_offset',mp4lib.fields.FIELD_INT32);
    } else {
        processor.eat_flagged(box,'flags',0x000800,'sample_composition_time_offset',mp4lib.fields.FIELD_UINT32);
    }
};

mp4lib.registerBoxType(mp4lib.boxes.TrackFragmentRunBox);

// --------------------------- stts ----------------------------------

mp4lib.boxes.TimeToSampleBox=function() {};

mp4lib.boxes.TimeToSampleBox.prototype.boxtype = 'stts';

mp4lib.boxes.TimeToSampleBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this,processor);

    if (!processor.isDeserializing) {
        this.entry_count = this.entry.length;
    }

    processor.eat('entry_count',mp4lib.fields.FIELD_UINT32);
    var entryField = new mp4lib.fields.StructureField(this,mp4lib.boxes.TimeToSampleBox.prototype._processEntry);
    var a = new mp4lib.fields.ArrayField( entryField, this.entry_count);
    processor.eat('entry',a);
};

mp4lib.boxes.TimeToSampleBox.prototype._processEntry = function(box,processor) {
    processor.eat('sample_count',mp4lib.fields.FIELD_UINT32);
    processor.eat('sample_delta',mp4lib.fields.FIELD_UINT32);
};

mp4lib.registerBoxType(mp4lib.boxes.TimeToSampleBox);

// --------------------------- stsd ----------------------------------

mp4lib.boxes.SampleDescriptionBox=function() {};

mp4lib.boxes.SampleDescriptionBox.prototype.boxtype = 'stsd';

mp4lib.boxes.SampleDescriptionBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this,processor);

    if (!processor.isDeserializing){
        this.entry_count = this.boxes.length;
    }

    processor.eat('entry_count',mp4lib.fields.FIELD_UINT32);
    processor.eat('boxes',mp4lib.fields.FIELD_CONTAINER_CHILDREN);
};

mp4lib.registerBoxType(mp4lib.boxes.SampleDescriptionBox);

// --------------------------- sdtp ----------------------------------

mp4lib.boxes.SampleDependencyTableBox=function() {};

mp4lib.boxes.SampleDependencyTableBox.prototype.boxtype = 'sdtp';

mp4lib.boxes.SampleDependencyTableBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this,processor);
    
    processor.eat('sample_dependency_array',
                new mp4lib.fields.BoxFillingArrayField( mp4lib.fields.FIELD_UINT8 ));
};

mp4lib.registerBoxType(mp4lib.boxes.SampleDependencyTableBox);

// --------------------------- abstract SampleEntry ----------------------------------

mp4lib.boxes.SampleEntryBox=function() {};

mp4lib.boxes.SampleEntryBox.prototype._processFields = function(processor) {
    mp4lib.boxes.Box.prototype._processFields.call(this,processor);
    processor.eat('reserved',new mp4lib.fields.ArrayField(mp4lib.fields.FIELD_UINT8,6));
    processor.eat('data_reference_index',mp4lib.fields.FIELD_UINT16);
};

// --------------------------- abstract VisualSampleEntry ----------------------------------

mp4lib.boxes.VisualSampleEntryBox=function() {};

mp4lib.boxes.VisualSampleEntryBox.prototype._processFields = function(processor) {
    mp4lib.boxes.SampleEntryBox.prototype._processFields.call(this,processor);
    processor.eat('pre_defined',mp4lib.fields.FIELD_UINT16);
    processor.eat('reserved_2',mp4lib.fields.FIELD_UINT16); 
    // there is already field called reserved from SampleEntry, so we need to call it reserved_2
    processor.eat('pre_defined_2',new mp4lib.fields.ArrayField(mp4lib.fields.FIELD_UINT32,3));
    processor.eat('width',mp4lib.fields.FIELD_UINT16);
    processor.eat('height',mp4lib.fields.FIELD_UINT16);
    processor.eat('horizresolution',mp4lib.fields.FIELD_UINT32);
    processor.eat('vertresolution',mp4lib.fields.FIELD_UINT32);
    processor.eat('reserved_3',mp4lib.fields.FIELD_UINT32);
    processor.eat('frame_count',mp4lib.fields.FIELD_UINT16);
    processor.eat('compressorname',new mp4lib.fields.FixedLenStringField(32));
    processor.eat('depth',mp4lib.fields.FIELD_UINT16);
    processor.eat('pre_defined_3',mp4lib.fields.FIELD_INT16);
    processor.eat('boxes',mp4lib.fields.FIELD_CONTAINER_CHILDREN);
};

// --------------------------- avc1 ----------------------------------

mp4lib.boxes.AVC1VisualSampleEntryBox=function() {};

mp4lib.boxes.AVC1VisualSampleEntryBox.prototype.boxtype = 'avc1';

mp4lib.boxes.AVC1VisualSampleEntryBox.prototype._processFields = function(processor) {
    mp4lib.boxes.VisualSampleEntryBox.prototype._processFields.call(this,processor);
};

mp4lib.registerBoxType(mp4lib.boxes.AVC1VisualSampleEntryBox);

//-------------------------- encv ------------------------------------

mp4lib.boxes.EncryptedVideoBox=function() {};

mp4lib.boxes.EncryptedVideoBox.prototype.boxtype = 'encv';

mp4lib.boxes.EncryptedVideoBox.prototype._processFields = function(processor) {
    mp4lib.boxes.VisualSampleEntryBox.prototype._processFields.call(this,processor);
};

mp4lib.registerBoxType( mp4lib.boxes.EncryptedVideoBox );

// --------------------------- avcc ----------------------------------

mp4lib.boxes.AVCConfigurationBox=function() {};

mp4lib.boxes.AVCConfigurationBox.prototype.boxtype = 'avcC';

mp4lib.boxes.AVCConfigurationBox.prototype._processFields = function(processor) {
    mp4lib.boxes.Box.prototype._processFields.call(this,processor);
    processor.eat('configurationVersion',mp4lib.fields.FIELD_UINT8);
    processor.eat('AVCProfileIndication',mp4lib.fields.FIELD_UINT8);
    processor.eat('profile_compatibility',mp4lib.fields.FIELD_UINT8);
    processor.eat('AVCLevelIndication',mp4lib.fields.FIELD_UINT8);
    
    if (processor.isDeserializing){
        processor.eat('temp',mp4lib.fields.FIELD_UINT8);  
        // 6 bits for reserved =63 and two bits for NAL length = 2-bit length byte size type
        this.lengthSizeMinusOne = this.temp & 3;
        processor.eat('numOfSequenceParameterSets_tmp',mp4lib.fields.FIELD_UINT8);
        this.numOfSequenceParameterSets = this.numOfSequenceParameterSets_tmp & 31;
    } else {
        this.temp = this.lengthSizeMinusOne | 252;
        processor.eat('temp',mp4lib.fields.FIELD_UINT8);
        this.numOfSequenceParameterSets = this.SPS_NAL.length;
        this.numOfSequenceParameterSets_tmp = this.numOfSequenceParameterSets | 224;
        processor.eat('numOfSequenceParameterSets_tmp',mp4lib.fields.FIELD_UINT8);
    }

    processor.eat('SPS_NAL', new mp4lib.fields.VariableElementSizeArrayField(
        new mp4lib.fields.StructureField(this, mp4lib.boxes.AVCConfigurationBox.prototype._processNAL),
        this.numOfSequenceParameterSets ));

    processor.eat('numOfPictureParameterSets',mp4lib.fields.FIELD_UINT8);
    processor.eat('PPS_NAL', new mp4lib.fields.VariableElementSizeArrayField(
        new mp4lib.fields.StructureField(this, mp4lib.boxes.AVCConfigurationBox.prototype._processNAL),
        this.numOfPictureParameterSets ));
};

mp4lib.boxes.AVCConfigurationBox.prototype._processNAL = function(box,processor) {
    processor.eat('NAL_length',mp4lib.fields.FIELD_UINT16);
    processor.eat('NAL',new mp4lib.fields.DataField(this.NAL_length));
};

mp4lib.registerBoxType(mp4lib.boxes.AVCConfigurationBox);

// --------------------------- pasp ----------------------------------

mp4lib.boxes.PixelAspectRatioBox=function() {};

mp4lib.boxes.PixelAspectRatioBox.prototype.boxtype = 'pasp';

mp4lib.boxes.PixelAspectRatioBox.prototype._processFields = function(processor) {
    mp4lib.boxes.Box.prototype._processFields.call(this,processor);
    processor.eat('hSpacing',mp4lib.fields.FIELD_INT32);
    processor.eat('vSpacing',mp4lib.fields.FIELD_INT32);
};

mp4lib.registerBoxType(mp4lib.boxes.PixelAspectRatioBox);

// --------------------------- abstract VisualSampleEntry ----------------------------------

mp4lib.boxes.AudioSampleEntryBox=function() {};

mp4lib.boxes.AudioSampleEntryBox.prototype._processFields = function(processor) {
    mp4lib.boxes.SampleEntryBox.prototype._processFields.call(this,processor);
    processor.eat('reserved_2',new mp4lib.fields.ArrayField(mp4lib.fields.FIELD_UINT32,2));
    processor.eat('channelcount',mp4lib.fields.FIELD_UINT16);
    processor.eat('samplesize',mp4lib.fields.FIELD_UINT16);
    processor.eat('pre_defined',mp4lib.fields.FIELD_UINT16);
    processor.eat('reserved_3',mp4lib.fields.FIELD_UINT16);
    processor.eat('samplerate',mp4lib.fields.FIELD_UINT32);
    processor.eat('boxes',mp4lib.fields.FIELD_CONTAINER_CHILDREN);
};

// --------------------------- mp4a ----------------------------------

mp4lib.boxes.MP4AudioSampleEntryBox=function() {};

mp4lib.boxes.MP4AudioSampleEntryBox.prototype.boxtype = 'mp4a';

mp4lib.boxes.MP4AudioSampleEntryBox.prototype._processFields = function(processor) {
    mp4lib.boxes.AudioSampleEntryBox.prototype._processFields.call(this,processor);
};

mp4lib.registerBoxType(mp4lib.boxes.MP4AudioSampleEntryBox);

//-------------------------- enca ------------------------------------

mp4lib.boxes.EncryptedAudioBox=function() {};

mp4lib.boxes.EncryptedAudioBox.prototype.boxtype = 'enca';

mp4lib.boxes.EncryptedAudioBox.prototype._processFields = function(processor) {
    mp4lib.boxes.AudioSampleEntryBox.prototype._processFields.call(this,processor);
};

mp4lib.registerBoxType( mp4lib.boxes.EncryptedAudioBox );

// --------------------------- esds ----------------------------

mp4lib.boxes.ESDBox=function() {};

mp4lib.boxes.ESDBox.prototype.boxtype = 'esds';

mp4lib.boxes.ESDBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this,processor);
    processor.eat("ES_tag", mp4lib.fields.FIELD_UINT8);
    processor.eat("ES_length", mp4lib.fields.FIELD_UINT8);
    processor.eat('ES_data', new mp4lib.fields.DataField(this.ES_length));
};

mp4lib.registerBoxType(mp4lib.boxes.ESDBox);

// --------------------------- stsz ----------------------------------

mp4lib.boxes.SampleSizeBox=function() {};

mp4lib.boxes.SampleSizeBox.prototype.boxtype = 'stsz';

mp4lib.boxes.SampleSizeBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this,processor);
    processor.eat('sample_size',mp4lib.fields.FIELD_UINT32);
    processor.eat('sample_count',mp4lib.fields.FIELD_UINT32);
    var a = new mp4lib.fields.ArrayField( mp4lib.fields.FIELD_UINT32, this.sample_count);
    processor.eat('entries',a);
};

mp4lib.registerBoxType(mp4lib.boxes.SampleSizeBox);

// ------------------------- pssh ------------------------------------

mp4lib.boxes.ProtectionSystemSpecificHeaderBox=function() {};

mp4lib.boxes.ProtectionSystemSpecificHeaderBox.prototype.boxtype = 'pssh';

mp4lib.boxes.ProtectionSystemSpecificHeaderBox.prototype._processFields = function(processor) {
   mp4lib.boxes.FullBox.prototype._processFields.call(this,processor);

   processor.eat('SystemID',new mp4lib.fields.ArrayField(mp4lib.fields.FIELD_UINT8, 16));
   processor.eat('DataSize',mp4lib.fields.FIELD_UINT32);
   processor.eat('Data',new mp4lib.fields.ArrayField(mp4lib.fields.FIELD_UINT8, this.DataSize));
};

mp4lib.registerBoxType( mp4lib.boxes.ProtectionSystemSpecificHeaderBox );

// ------------------------- saiz ------------------------------------

mp4lib.boxes.SampleAuxiliaryInformationSizesBox=function() {};

mp4lib.boxes.SampleAuxiliaryInformationSizesBox.prototype.boxtype = 'saiz';

mp4lib.boxes.SampleAuxiliaryInformationSizesBox.prototype._processFields = function(processor) {
   mp4lib.boxes.FullBox.prototype._processFields.call(this,processor);

   if (this.flags & 1)
   {
        processor.eat('aux_info_type',mp4lib.fields.FIELD_UINT32);
        processor.eat('aux_info_type_parameter',mp4lib.fields.FIELD_UINT32);
    }
    processor.eat('default_sample_info_size',mp4lib.fields.FIELD_UINT8);
    processor.eat('sample_count',mp4lib.fields.FIELD_UINT32);

    if (this.default_sample_info_size===0) {
        processor.eat('sample_info_size',new mp4lib.fields.ArrayField(mp4lib.fields.FIELD_UINT8, this.sample_count));
    }
};

mp4lib.registerBoxType( mp4lib.boxes.SampleAuxiliaryInformationSizesBox );

//------------------------- saio ------------------------------------

mp4lib.boxes.SampleAuxiliaryInformationOffsetsBox=function() {};

mp4lib.boxes.SampleAuxiliaryInformationOffsetsBox.prototype.boxtype = 'saio';

mp4lib.boxes.SampleAuxiliaryInformationOffsetsBox.prototype._processFields = function(processor) {
   mp4lib.boxes.FullBox.prototype._processFields.call(this,processor);

    if (this.flags & 1) {
        processor.eat('aux_info_type',mp4lib.fields.FIELD_UINT32);
        processor.eat('aux_info_type_parameter',mp4lib.fields.FIELD_UINT32);
    }
    processor.eat('entry_count',mp4lib.fields.FIELD_UINT32);
    if (this.version===0) {
        processor.eat('offset',new mp4lib.fields.ArrayField(mp4lib.fields.FIELD_UINT32, this.entry_count));
    }
    else {
        processor.eat('offset',new mp4lib.fields.ArrayField(mp4lib.fields.FIELD_UINT64, this.entry_count));
    }
};

mp4lib.registerBoxType( mp4lib.boxes.SampleAuxiliaryInformationOffsetsBox);

//------------------------- sinf ------------------------------------

mp4lib.boxes.ProtectionSchemeInformationBox=function() {};

mp4lib.boxes.ProtectionSchemeInformationBox.prototype.boxtype = 'sinf';

mp4lib.boxes.ProtectionSchemeInformationBox.prototype._processFields = function(processor) {
  mp4lib.boxes.Box.prototype._processFields.call(this,processor);
  processor.eat('boxes',mp4lib.fields.FIELD_CONTAINER_CHILDREN);
};

mp4lib.registerBoxType( mp4lib.boxes.ProtectionSchemeInformationBox);

//------------------------ schi --------------------------------------

mp4lib.boxes.SchemeInformationBox=function() {};

mp4lib.boxes.SchemeInformationBox.prototype.boxtype = 'schi';

mp4lib.boxes.SchemeInformationBox.prototype._processFields = function(processor) {
  mp4lib.boxes.Box.prototype._processFields.call(this,processor);
  processor.eat('boxes',mp4lib.fields.FIELD_CONTAINER_CHILDREN);
};

mp4lib.registerBoxType( mp4lib.boxes.SchemeInformationBox);

//------------------------ tenc --------------------------------------

mp4lib.boxes.TrackEncryptionBox=function() {};

mp4lib.boxes.TrackEncryptionBox.prototype.boxtype = 'tenc';

mp4lib.boxes.TrackEncryptionBox.prototype._processFields = function(processor) {
  mp4lib.boxes.FullBox.prototype._processFields.call(this,processor);

  processor.eat('default_IsEncrypted',mp4lib.fields.FIELD_BIT24);
  processor.eat('default_IV_size',mp4lib.fields.FIELD_UINT8);
  processor.eat('default_KID', new mp4lib.fields.ArrayField(mp4lib.fields.FIELD_UINT8, 16));
};

mp4lib.registerBoxType( mp4lib.boxes.TrackEncryptionBox);

//------------------------- schm -------------------------------------

mp4lib.boxes.SchemeTypeBox=function() {};

mp4lib.boxes.SchemeTypeBox.prototype.boxtype = 'schm';

mp4lib.boxes.SchemeTypeBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this,processor);

    processor.eat('scheme_type',mp4lib.fields.FIELD_UINT32);
    processor.eat('scheme_version',mp4lib.fields.FIELD_UINT32);

    if (this.flags & 0x000001) {
        processor.eat('scheme_uri',mp4lib.fields.FIELD_STRING);
    }
};

mp4lib.registerBoxType( mp4lib.boxes.SchemeTypeBox);

// --------------------------- elst ---------------------------------- 

mp4lib.boxes.EditListBox = function() {};

mp4lib.boxes.EditListBox.prototype.boxtype = 'elst';

mp4lib.boxes.EditListBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this,processor);
    processor.eat('entry_count',mp4lib.fields.FIELD_UINT32);

    var entryField = new mp4lib.fields.StructureField(this,mp4lib.boxes.EditListBox.prototype._processEntry);

    var a = new mp4lib.fields.ArrayField( entryField, this.entry_count);
    processor.eat('entries',a);
};

mp4lib.boxes.EditListBox.prototype._processEntry = function(box,processor) {
    if (box.version==1) {
        processor.eat('segment_duration',mp4lib.fields.FIELD_UINT64);
        processor.eat('media_time',mp4lib.fields.FIELD_UINT64);
    } else { // version==0
        processor.eat('segment_duration',mp4lib.fields.FIELD_UINT32);
        processor.eat('media_time',mp4lib.fields.FIELD_UINT32);
    }
    processor.eat('media_rate_integer',mp4lib.fields.FIELD_UINT16);
    processor.eat('media_rate_fraction',mp4lib.fields.FIELD_UINT16);
};

mp4lib.registerBoxType(mp4lib.boxes.EditListBox);

// --------------------------- hmhd ----------------------------------

mp4lib.boxes.HintMediaHeaderBox = function() {};

mp4lib.boxes.HintMediaHeaderBox.prototype.boxtype = 'hmhd';

mp4lib.boxes.HintMediaHeaderBox.prototype._processFields = function(processor) {
   mp4lib.boxes.FullBox.prototype._processFields.call(this,processor);
   processor.eat('maxPDUsize',mp4lib.fields.FIELD_UINT16);
   processor.eat('avgPDUsize',mp4lib.fields.FIELD_UINT16);
   processor.eat('maxbitrate',mp4lib.fields.FIELD_UINT32);
   processor.eat('avgbitrate',mp4lib.fields.FIELD_UINT32);
   processor.eat('reserved'  ,mp4lib.fields.FIELD_UINT32);
};

mp4lib.registerBoxType(mp4lib.boxes.HintMediaHeaderBox);

// --------------------------- nmhd ---------------------------------- 

mp4lib.boxes.NullMediaHeaderBox = function() {};

mp4lib.boxes.NullMediaHeaderBox.prototype.boxtype = 'nmhd';

mp4lib.boxes.NullMediaHeaderBox.prototype._processFields = function(processor) {
   mp4lib.boxes.FullBox.prototype._processFields.call(this,processor);
};

mp4lib.registerBoxType(mp4lib.boxes.NullMediaHeaderBox);

// --------------------------- ctts ---------------------------------- 

mp4lib.boxes.CompositionOffsetBox = function() {};

mp4lib.boxes.CompositionOffsetBox.prototype.boxtype = 'ctts';

mp4lib.boxes.CompositionOffsetBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this,processor);
    processor.eat('entry_count',mp4lib.fields.FIELD_UINT32);

    var entryField = new mp4lib.fields.StructureField(this,mp4lib.boxes.CompositionOffsetBox.prototype._processEntry);

    var a = new mp4lib.fields.ArrayField( entryField, this.entry_count);
    processor.eat('entries',a);
};

mp4lib.boxes.CompositionOffsetBox.prototype._processEntry = function(box,processor) {
    if (box.version===0) {
        processor.eat('sample_count',mp4lib.fields.FIELD_UINT32);
        processor.eat('sample_offset',mp4lib.fields.FIELD_UINT32);
    } else { // version==1
        processor.eat('sample_count',mp4lib.fields.FIELD_UINT32);
        processor.eat('sample_offset',mp4lib.fields.FIELD_INT32);
    }
};

mp4lib.registerBoxType(mp4lib.boxes.CompositionOffsetBox);

// --------------------------- cslg ----------------------------------

mp4lib.boxes.CompositionToDecodeBox = function() {};

mp4lib.boxes.CompositionToDecodeBox.prototype.boxtype = 'cslg';

mp4lib.boxes.CompositionToDecodeBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this,processor);
    processor.eat('compositionToDTSShift',mp4lib.fields.FIELD_INT32);
    processor.eat('leastDecodeToDisplayDelta',mp4lib.fields.FIELD_INT32);
    processor.eat('greatestDecodeToDisplayDelta',mp4lib.fields.FIELD_INT32);
    processor.eat('compositionStartTime',mp4lib.fields.FIELD_INT32);
    processor.eat('compositionEndTime',mp4lib.fields.FIELD_INT32);
};

mp4lib.registerBoxType(mp4lib.boxes.CompositionToDecodeBox);

// --------------------------- stss ----------------------------------

mp4lib.boxes.SyncSampleBox = function() {};

mp4lib.boxes.SyncSampleBox.prototype.boxtype = 'stss';

mp4lib.boxes.SyncSampleBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this,processor);
    processor.eat('entry_count',mp4lib.fields.FIELD_UINT32);

        var entryField = new mp4lib.fields.StructureField(this,mp4lib.boxes.SyncSampleBox.prototype._processEntry);

        var a = new mp4lib.fields.ArrayField( entryField, this.entry_count);
        processor.eat('entries',a);
};

mp4lib.boxes.SyncSampleBox.prototype._processEntry = function(box,processor) {
        processor.eat('sample_number',mp4lib.fields.FIELD_UINT32);
};

mp4lib.registerBoxType(mp4lib.boxes.SyncSampleBox);

// --------------------------- tref ----------------------------------

mp4lib.boxes.TrackReferenceBox = function() {};
mp4lib.boxes.TrackReferenceBox.prototype.boxtype = 'tref';

mp4lib.boxes.TrackReferenceBox.prototype._processFields = function(processor) {
   mp4lib.boxes.FullBox.prototype._processFields.call(this,processor);
   processor.eat('track_IDs',new mp4lib.fields.BoxFillingArrayField(mp4lib.fields.FIELD_UINT32));
};

mp4lib.registerBoxType(mp4lib.boxes.TrackReferenceBox);
    


//---------------------------- frma ----------------------------------

mp4lib.boxes.OriginalFormatBox=function() {};

mp4lib.boxes.OriginalFormatBox.prototype.boxtype = 'frma';

mp4lib.boxes.OriginalFormatBox.prototype._processFields = function(processor) {
  mp4lib.boxes.Box.prototype._processFields.call(this,processor);
  processor.eat('data_format',mp4lib.fields.FIELD_UINT32);
};

mp4lib.registerBoxType( mp4lib.boxes.OriginalFormatBox);




// -------------------------------------------------------------------
// Microsoft Smooth Streaming specific boxes
// -------------------------------------------------------------------

// --------------------------- piff ----------------------------------
//PIFF Sample Encryption box
mp4lib.boxes.PiffSampleEncryptionBox=function() {};

mp4lib.boxes.PiffSampleEncryptionBox.prototype.boxtype = 'sepiff';
mp4lib.boxes.PiffSampleEncryptionBox.prototype.uuid = [0xA2, 0x39, 0x4F, 0x52, 0x5A, 0x9B, 0x4F, 0x14, 0xA2, 0x44, 0x6C, 0x42, 0x7C, 0x64, 0x8D, 0xF4];

mp4lib.boxes.PiffSampleEncryptionBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this,processor);
    processor.eat('sample_count',mp4lib.fields.FIELD_UINT32);

    if (this.flags & 1)
    {
        processor.eat('IV_size',mp4lib.fields.FIELD_UINT8);
    }
   
    var entryField = new mp4lib.fields.StructureField(this, mp4lib.boxes.PiffSampleEncryptionBox.prototype._processEntry);
    var a = new mp4lib.fields.VariableElementSizeArrayField( entryField, this.sample_count );
    processor.eat('entry',a);
};

mp4lib.boxes.PiffSampleEncryptionBox.prototype._processEntry = function(box,processor) {
    //add *IV_SIZE
    processor.eat('InitializationVector', new mp4lib.fields.DataField(8));
    if (box.flags & 2)
    {
        processor.eat('NumberOfEntries',mp4lib.fields.FIELD_UINT16);
        var entryField = new mp4lib.fields.StructureField(this, mp4lib.boxes.PiffSampleEncryptionBox.prototype._processClearEntry);
        var a = new mp4lib.fields.ArrayField( entryField, this.NumberOfEntries );
        processor.eat('clearAndCryptedData',a);
    }
};

mp4lib.boxes.PiffSampleEncryptionBox.prototype._processClearEntry = function(box,processor) {
    processor.eat('BytesOfClearData',mp4lib.fields.FIELD_UINT16);
    processor.eat('BytesOfEncryptedData',mp4lib.fields.FIELD_UINT32);
};

mp4lib.registerBoxType(mp4lib.boxes.PiffSampleEncryptionBox);

//PIFF Track Encryption Box
mp4lib.boxes.PiffTrackEncryptionBox=function() {};

mp4lib.boxes.PiffTrackEncryptionBox.prototype.boxtype = 'tepiff';
mp4lib.boxes.PiffTrackEncryptionBox.prototype.uuid = [0x89, 0x74, 0xDB, 0xCE, 0x7B, 0xE7, 0x4C, 0x51, 0x84, 0xF9, 0x71, 0x48, 0xF9, 0x88, 0x25, 0x54];

mp4lib.boxes.PiffTrackEncryptionBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this,processor);
};

mp4lib.registerBoxType(mp4lib.boxes.PiffTrackEncryptionBox);

//PIFF Protection System Specific Header Box
mp4lib.boxes.PiffProtectionSystemSpecificHeaderBox=function() {};

mp4lib.boxes.PiffProtectionSystemSpecificHeaderBox.prototype.boxtype = 'psshpiff';
mp4lib.boxes.PiffProtectionSystemSpecificHeaderBox.prototype.uuid = [0xD0, 0x8A, 0x4F, 0x18, 0x10, 0xF3, 0x4A, 0x82, 0xB6, 0xC8, 0x32, 0xD8, 0xAB, 0xA1, 0x83, 0xD3];

mp4lib.boxes.PiffProtectionSystemSpecificHeaderBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this,processor);
};

mp4lib.registerBoxType(mp4lib.boxes.PiffProtectionSystemSpecificHeaderBox);


// --------------------------- tfdx -----------------------------

mp4lib.boxes.TfxdBox=function() {};

mp4lib.boxes.TfxdBox.prototype.boxtype = 'tfxd';
mp4lib.boxes.TfxdBox.prototype.uuid = [0x6D, 0x1D, 0x9B, 0x05, 0x42, 0xD5, 0x44, 0xE6, 0x80, 0xE2, 0x14, 0x1D, 0xAF, 0xF7, 0x57, 0xB2];

mp4lib.boxes.TfxdBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this,processor);
    if (this.version==1) {
        processor.eat('fragment_absolute_time',mp4lib.fields.FIELD_UINT64);
        processor.eat('fragment_duration',mp4lib.fields.FIELD_UINT64);
    }
    else {
        processor.eat('fragment_absolute_time',mp4lib.fields.FIELD_UINT32);
        processor.eat('fragment_duration',mp4lib.fields.FIELD_UINT32);
    }
};
mp4lib.registerBoxType(mp4lib.boxes.TfxdBox);

// --------------------------- tfrf -----------------------------

mp4lib.boxes.TfrfBox=function() {};

mp4lib.boxes.TfrfBox.prototype.boxtype = 'tfrf';
mp4lib.boxes.TfrfBox.prototype.uuid = [0xD4, 0x80, 0x7E, 0xF2, 0xCA, 0x39, 0x46, 0x95, 0x8E, 0x54, 0x26, 0xCB, 0x9E, 0x46, 0xA7, 0x9F];

mp4lib.boxes.TfrfBox.prototype._processFields = function(processor) {
    mp4lib.boxes.FullBox.prototype._processFields.call(this,processor);
    processor.eat('fragment_count', mp4lib.fields.FIELD_UINT8);
    var entryField = new mp4lib.fields.StructureField(this, mp4lib.boxes.TfrfBox.prototype._processEntry);
    var a = new mp4lib.fields.ArrayField(entryField, this.fragment_count);
    processor.eat('entry',a);
};

mp4lib.boxes.TfrfBox.prototype._processEntry = function(box,processor) {
    if (box.version==1) {
        processor.eat('fragment_absolute_time',mp4lib.fields.FIELD_UINT64);
        processor.eat('fragment_duration',mp4lib.fields.FIELD_UINT64);
    }
    else {
        processor.eat('fragment_absolute_time',mp4lib.fields.FIELD_UINT32);
        processor.eat('fragment_duration',mp4lib.fields.FIELD_UINT32);
    }
};
mp4lib.registerBoxType(mp4lib.boxes.TfrfBox);
