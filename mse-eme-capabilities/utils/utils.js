/* exported toUtf8, fromUtf8, base64urlEncode, base64urlDecode, base64DecodeToUnit8Array, loadData_ */

var utf8encoder;
var utf8decoder;
if (typeof TextEncoder !== "undefined" && typeof TextDecoder !== "undefined") {
    utf8encoder = new TextEncoder('utf-8');
    utf8decoder = new TextDecoder('utf-8');
} else {
    utf8encoder = {
        encode: function (text) {
            var result = new Uint8Array(text.length);
            for (var i = 0; i < text.length; i++) {
                result[i] = text.charCodeAt(i);
            }
            return result;
        }
    };

    utf8decoder = {
        decode: function (buffer) {
            return String.fromCharCode.apply(null, new Uint8Array(buffer));
        }
    };
}

function toUtf8(o) {
    return utf8encoder.encode(JSON.stringify(o));
}

function fromUtf8(t) {
    return JSON.parse(utf8decoder.decode(t));
}

// Encodes |data| into base64url string. There is no '=' padding, and the
// characters '-' and '_' must be used instead of '+' and '/', respectively.
function base64urlEncode(data) {
    var result = btoa(String.fromCharCode.apply(null, data));
    return result.replace(/=+$/g, '').replace(/\+/g, "-").replace(/\//g, "_");
}
// Decode |encoded| using base64url decoding.
function base64urlDecode(encoded) {
    return atob(encoded.replace(/\-/g, "+").replace(/\_/g, "/"));
}
// Decode |encoded| using base64 to a Uint8Array
function base64DecodeToUnit8Array(encoded) {
    return new Uint8Array(atob(encoded).split('').map(function (c) {
        return c.charCodeAt(0);
    }));
}

var loadData_ = function (url, isBinary) {

    return new Promise(function (resolve, reject) {

        var request = new XMLHttpRequest();
        request.open("GET", url, true);
        if (isBinary) {
            request.responseType = 'arraybuffer';
        }
        request.onload = function () {
            if (request.status != 200) {
                reject('Error loading data');
                return;
            }
            var response = request.response;
            if (isBinary) {
                response = new Uint8Array(response);
            }
            resolve(response);
        };
        request.onerror = function () {
            reject('Error loading data');
            return;
        };
        request.send();
    });
};

navigator.sayswho = (function () {
    var ua = navigator.userAgent,
        tem,
        M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
    if (/trident/i.test(M[1])) {
        tem = /\brv[ :]+(\d+)/g.exec(ua) || [];
        return 'IE ' + (tem[1] || '');
    }
    if (M[1] === 'Chrome') {
        tem = ua.match(/\b(OPR|Edge)\/(\d+)/);
        if (tem !== null) {
            return tem.slice(1).join(' ').replace('OPR', 'Opera');
        }
    }
    M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, '-?'];
    if ((tem = ua.match(/version\/(\d+)/i)) !== null) {
        M.splice(1, 1, tem[1]);
    }
    return M.join(' ');
})();

/*------------------------------------------------------------------------------------------*/

// MEDIA SOURCE FUNCTIONS

/*------------------------------------------------------------------------------------------*/

var MEDIA_ERROR_CODES = ['MEDIA_ERR_ABORTED', 'MEDIA_ERR_NETWORK', 'MEDIA_ERR_DECODE', 'MEDIA_ERR_SRC_NOT_SUPPORTED', 'MEDIA_ERR_ENCRYPTED'];

function MediaSourceUtil(segmentInfo) {
    this.segmentInfo = segmentInfo;
}

MediaSourceUtil.prototype.appendVideoElement = function () {

    var mediaTag = document.createElement("video");
    if (!document.body) {
        document.body = document.createElement("body");
    }
    document.body.appendChild(mediaTag);

    return mediaTag;
};

MediaSourceUtil.prototype.openMediaSource = function (mediaTag) {
    return new Promise(function (resolve) {

        var mediaSource = new MediaSource();
        var mediaSourceURL = URL.createObjectURL(mediaSource);

        var eventHandler = function onSourceOpen() {
            mediaSource.removeEventListener('sourceopen', eventHandler);
            URL.revokeObjectURL(mediaSourceURL);
            resolve({
                mediaTag: mediaTag,
                mediaSource: mediaSource
            });
        };

        mediaSource.addEventListener('sourceopen', eventHandler);
        mediaTag.src = mediaSourceURL;
    });

};

MediaSourceUtil.prototype.closeMediaSource = function (mediaTag) {
    document.body.removeChild(mediaTag);
};

MediaSourceUtil.prototype.appendInitData = function (mediaSource, data) {

    var that = this;
    return new Promise(function (resolve, reject) {

        function extractSegmentData(mediaData, info) {
            var start = info.offset;
            var end = start + info.size;
            return mediaData.subarray(start, end);
        }

        var sourceBuffer = mediaSource.addSourceBuffer(that.segmentInfo.type);
        var initSegment = extractSegmentData(data, that.segmentInfo.init);

        try {
            var onUpdatedEnd = function () {
                sourceBuffer.removeEventListener('updateend', onUpdatedEnd);
                if (!sourceBuffer.updating) {
                    if (mediaSource.readyState !== 'open') {
                        reject(new Error("Media source error"));
                    } else {
                        mediaSource.endOfStream();
                        resolve();
                    }
                }
                resolve();
            };
            sourceBuffer.addEventListener('updateend', onUpdatedEnd);
            sourceBuffer.appendBuffer(initSegment);
        } catch (err) {
            reject(err);
        }
    });
};

MediaSourceUtil.prototype.appendData = function (mediaTag, mediaSource, data) {

    var that = this;
    return new Promise(function (resolve, reject) {

        var sourceBuffer = mediaSource.addSourceBuffer(that.segmentInfo.type);

        try {
            var onUpdatedEnd = function () {
                console.log('SourceBuffer updateend');
                sourceBuffer.removeEventListener('updateend', onUpdatedEnd);
                if (!sourceBuffer.updating) {
                    if (mediaSource.readyState === 'open') {
                        mediaSource.endOfStream();
                        console.log('resolve');
                        resolve();
                    }
                }
            };
            var onError = function() {
                console.log('video error');
                mediaTag.removeEventListener('error', onError);
                reject(new Error(MEDIA_ERROR_CODES[mediaTag.error.code] + ': ' + mediaTag.error.message));
            };
            var onLoadedmetadata = function() {
                console.log('video loadedmetadata');
                mediaTag.removeEventListener('loadedmetadata', onLoadedmetadata);
                resolve();
            };
            var onLoadeddata = function() {
                console.log('video loadeddata');
                mediaTag.removeEventListener('loadeddata', onLoadedmetadata);
                resolve();
            };
            mediaTag.addEventListener('error', onError);
            mediaTag.addEventListener('loadedmetadata', onLoadedmetadata);
            mediaTag.addEventListener('loadeddata', onLoadeddata);
            sourceBuffer.addEventListener('updateend', onUpdatedEnd);
            sourceBuffer.appendBuffer(data);
        } catch (err) {
            reject(err);
        }
    });
};

MediaSourceUtil.prototype.loadBinaryData = function () {
    return loadData_(this.segmentInfo.url, true);
};

/*------------------------------------------------------------------------------------------*/

// OUTPUT FUNCTIONS

/*------------------------------------------------------------------------------------------*/
var xhtml_ns = "http://www.w3.org/1999/xhtml";

function Output() {
    this.output_document = null;
    this.output_node = null;
}

Output.prototype.resolve_log = function () {
    var node = document.getElementById("log");
    if (!node) {
        if (!document.body || document.readyState == "loading") {
            return;
        }
        node = document.createElement("div");
        node.id = "log";
        document.body.appendChild(node);
    }
    this.output_document = document;
    this.output_node = node;

    var supportedNode = document.getElementById("supported_sections");
    if (!supportedNode) {
        supportedNode = document.createElementNS(xhtml_ns, "sections");
        supportedNode.id = "supported_sections";
        this.output_node.appendChild(supportedNode);
    }

    var resultsNode = document.getElementById("results_sections");
    if (!resultsNode) {
        resultsNode = document.createElementNS(xhtml_ns, "sections");
        resultsNode.id = "results_sections";
        this.output_node.appendChild(resultsNode);
        var html = "<table id='results'>" +
            "<thead><tr><th>Result</th><th>Test Name</th>" +
            "<th>Message</th></tr></thead>" +
            "<tbody>";
        html += "</tbody></table>";
        this.output_node.lastChild.innerHTML = html;
    }
};

Output.prototype.add_supported_codecs = function (codecs) {
    if (!this.output_node) {
        this.resolve_log();
    }

    var supportedNode = document.getElementById("supported_sections");
    if (!supportedNode) {
        return;
    }

    var div = document.createElement('div');
    div.id = "codecs";
    div.innerHTML = 'Supported Codecs';
    supportedNode.appendChild(div);

    var list = document.createElement('ul');
    list.setAttribute("class", "supported_list");
    div.appendChild(list);

    for (var i = 0; i < codecs.length; i++) {
        var li = document.createElement('li');
        li.innerHTML = codecs[i];
        list.appendChild(li);
    }
};

Output.prototype.add_supported_CDM = function (cdms) {
    if (!this.output_node) {
        this.resolve_log();
    }

    var supportedNode = document.getElementById("supported_sections");
    if (!supportedNode) {
        return;
    }

    var div = document.createElement('div');
    div.id = "cdms";
    div.innerHTML = 'Supported CDMs';
    supportedNode.appendChild(div);

    var list = document.createElement('ul');
    list.setAttribute("class", "supported_list");
    div.appendChild(list);

    for (var i = 0; i < cdms.length; i++) {
        var li = document.createElement('li');
        li.innerHTML = cdms[i];
        list.appendChild(li);
    }
};

Output.prototype.add_result = function (name, support, message) {

    if (!this.output_node) {
        this.resolve_log();
    }

    var resultsNode = document.getElementById("results_sections");
    if (!resultsNode) {
        return;
    }
    var tableRef = document.getElementById('results').getElementsByTagName('tbody')[0];

    // Insert a row in the table at the last row
    var newRow = tableRef.insertRow(tableRef.rows.length);

    // Fill the new row
    var newCell = newRow.insertCell(0);
    var span = document.createElement('span');
    span.innerHTML = '';
    span.setAttribute("class", support ? "ok" : "ko");
    newCell.appendChild(span);

    newCell = newRow.insertCell(1);
    var testName = document.createTextNode(name);
    newCell.appendChild(testName);

    newCell = newRow.insertCell(2);
    var messageText = message ? document.createTextNode(message) : document.createTextNode('');
    newCell.appendChild(messageText);
};

Output.prototype.add_test_time = function (started, ended) {

    var timeNode = document.getElementById("time");
    if (!timeNode) {
        if (!document.body || document.readyState == "loading") {
            return;
        }
        timeNode = document.createElement("div");
        timeNode.id = "time";
        document.body.appendChild(timeNode);
    }

    var title = document.getElementById("title");
    title.innerHTML += 'Tests run in ' + ((ended - started) / 1000).toPrecision(3) + 's';
};
