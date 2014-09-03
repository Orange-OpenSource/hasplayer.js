Custom.vo.metrics.DownloadSwitch = function () {
    "use strict";

    this.type = null;
    this.mediaStartTime = null;
	this.downloadStartTime = null;
	this.quality = null;


    // this.t = null;      // Real-Time | Time of the switch event.
    // this.mt = null;     // Media-Time | The media presentation time of the earliest access unit (out of all media content components) played out from the Representation.
    // this.to = null;     // value of Representation@id identifying the switch-to Representation.
    // this.lto = null;    // If not present, this metrics concerns the Representation as a whole. If present, lto indicates the value of SubRepresentation@level within Representation identifying the switch-to level of the Representation.
};

Custom.vo.metrics.DownloadSwitch.prototype = {
    constructor: Custom.vo.metrics.DownloadSwitch
};