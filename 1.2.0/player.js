/* Last build : 1.7.2015_17:24:2 / git revision : 6271a9b */
var cast = window.cast || {};

(function() {
    function HasCastReceiver(player) {
        this.player = player;
        this.videoNode = player.getVideoModel().getElement();
        this.currentSender = null;
        this.firstAudioAccess = true;
        this.castReceiverManager = cast.receiver.CastReceiverManager.getInstance();
        this.castMessageBus = this.castReceiverManager.getCastMessageBus(HasCastReceiver.PROTOCOL, cast.receiver.CastMessageBus.MessageType.JSON);
        this.castMessageBus.onMessage = this.onMessage.bind(this);
        this.castReceiverManager.onSenderConnected = this.onSenderConnected.bind(this);
        this.castReceiverManager.onSenderDisconnected = this.onSenderDisconnected.bind(this);
        this.castReceiverManager.start();
        this.videoNode.addEventListener("timeupdate", this.timeUpdated.bind(this));
        this.player.addEventListener("metricChanged", this.metricChanged.bind(this));
    }
    HasCastReceiver.PROTOCOL = "urn:x-cast:com.google.cast.video.hasplayer";
    HasCastReceiver.prototype.onSenderConnected = function(e) {
        console.info("sender connected", e);
        this.sendMessage(e.senderId, "connected", {
            connected: true
        });
    };
    HasCastReceiver.prototype.onSenderDisconnected = function(e) {
        console.info("onSenderDsisconnected ? ");
        if (this.castReceiverManager.getSenders().length === 0) {
            window.close();
        }
    };
    HasCastReceiver.prototype.timeUpdated = function() {
        console.info("timeUpdated");
        this.sendMessage(this.currentSender, "timeUpdated", this.videoNode.currentTime);
    };
    HasCastReceiver.prototype.onMessage = function(event) {
        var message = event.data;
        this.currentSender = event.senderId;
        switch (message.command) {
          case "play":
            this.play(message.data);
            break;

          case "toggleInformation":
            this.toggleInformation();
            break;

          case "toggleControlBar":
            this.toggleControlBar();
            break;

          case "toggleMute":
            this.toggleMute();
            break;

          case "changeTrack":
            this.changeTrack(message.data);
            break;
        }
    };
    HasCastReceiver.prototype.metricChanged = function(e) {
        if (e.data.stream == "audio" && this.firstAudioAccess && this.currentSender) {
            this.firstAudioAccess = false;
            var audiotracks = this.player.getAudioTracks();
            console.info("audiotracks", audiotracks);
            if (audiotracks.length > 1) {
                this.sendMessage(this.currentSender, "HaveMultiAudio", audiotracks);
            }
        }
    };
    HasCastReceiver.prototype.toggleInformation = function() {
        $("#infosToToggle").toggle();
        $("#chartToToggle").toggle();
        $("#sliderToToggle").toggle();
        this.sendMessage(this.currentSender, "toggleInformation", $("#chartToToggle").is(":visible"));
    };
    HasCastReceiver.prototype.toggleControlBar = function() {
        var cb = $("#controlBar");
        console.info("controlbar display :: ", cb.is(":visible"));
        if (cb.is(":visible")) {
            cb.hide();
        } else {
            cb.show();
        }
        this.sendMessage(this.currentSender, "toggleControlBar", $("#controlBar").is(":visible"));
    };
    HasCastReceiver.prototype.toggleMute = function() {
        this.videoNode.muted = !this.videoNode.muted;
        if (this.videoNode.muted) {
            setVolumeOff(true);
        } else {
            setVolumeOff(false);
        }
        this.sendMessage(this.currentSender, "toggleMute", this.videoNode.muted);
    };
    HasCastReceiver.prototype.changeTrack = function(track) {
        console.info("switch language ", track);
        this.player.setAudioTrack(track);
    };
    HasCastReceiver.prototype.play = function(message) {
        console.info("receiving play message", message);
        var drmParams = {};
        drmParams.backUrl = message.backUrl || null;
        drmParams.customData = message.customData || null;
        this.player.attachSource(message.url, drmParams);
        firstAccess = true;
        this.firstAudioAccess = true;
        setTimeout(this.toggleControlBar.bind(this), 1e4);
        this.sendMessage(this.currentSender, "toggleMute", this.videoNode.muted);
        $("#chartToToggle").hide();
        this.sendMessage(this.currentSender, "toggleInformation", $("#chartToToggle").is(":visible"));
    };
    HasCastReceiver.prototype.sendMessage = function(senderId, evt, message) {
        console.info("sendMessage", evt, senderId, message);
        this.castMessageBus.send(senderId, {
            event: evt,
            data: message
        });
    };
    window.HasCastReceiver = HasCastReceiver;
})();

var isCrKey = cast && cast.receiver && navigator.userAgent.lastIndexOf("CrKey") != -1;

var hideMetricsAtStart = false;

var idsToToggle = [ "#chartToToggle", "#sliderToToggle", "#infosToToggle" ];

var updateTimeout;

var updateIntervalLength = 100;

var chartXaxisWindow = 30;

var plotCount = chartXaxisWindow * 1e3 / updateIntervalLength;

var serviceNetBalancerEnabled = true;

var netBalancerLimitValue = 0;

var netBalancerLimitSetted = true;

var streamSource;

var context = "hasplayer_custom";

var startTime;

var downloadRepInfos = {
    quality: -1,
    bandwidth: 0,
    width: 0,
    height: 0,
    codecs: ""
}, playRepInfos = {
    quality: -1,
    bandwidth: 0,
    width: 0,
    height: 0,
    codecs: ""
}, bufferLevel, bitrate, qualitySwitches = [], chartBandwidth = null, dlSeries = [], playSeries = [], plotIndex = 0, chartOptions = {
    series: {
        shadowSize: 0
    },
    yaxis: {
        ticks: [],
        color: "#FFF"
    },
    xaxis: {
        show: true,
        tickFormatter: function() {
            return "";
        }
    },
    lines: {
        steps: true
    },
    grid: {
        markings: [],
        borderWidth: 0
    },
    legend: {
        show: false
    }
}, video, player, enableMetrics = false, metricsAgent = null, metricsAgentActive = false, currentIdToToggle = 0, isPlaying = false, isMetricsOn = !hideMetricsAtStart, firstAccess = true, audioTracksSelectIsPresent = false;

function hideNetworkLimiter() {
    if (serviceNetBalancerEnabled) {
        $("#networkToToggle").toggle();
    }
}

function sendNetBalancerLimit(activate, limit) {
    var http = new XMLHttpRequest(), data = {
        NetBalancerLimit: {
            activate: activate,
            upLimit: limit
        }
    };
    http.open("POST", "http://localhost:8081/NetBalancerLimit", true);
    http.setRequestHeader("Content-Type", "application/json; charset=UTF-8");
    http.timeout = 2e3;
    var stringJson = JSON.stringify(data);
    http.onload = function() {
        if (http.status < 200 || http.status > 299) {
            hideNetworkLimiter();
            serviceNetBalancerEnabled = false;
        } else {
            document.getElementById("networkToToggle").style.visibility = "visible";
        }
    };
    http.send(stringJson);
}

function initNetBalancerSlider() {
    var initBW = 5e3;
    $("#sliderNetworkBandwidth").labeledslider({
        max: 5e3,
        min: 0,
        orientation: "horizontal",
        step: 100,
        tweenLabels: false,
        range: "min",
        value: 5e3,
        slide: function(event, ui) {
            $("#networkBandwidth").html(ui.value + " kb/s");
        },
        stop: function(event, ui) {
            console.log("slider Network value = " + ui.value);
            $("#networkBandwidth").html(ui.value + " kb/s");
            netBalancerLimitValue = ui.value;
            netBalancerLimitSetted = false;
        }
    });
    $("#networkBandwidth").html(5e3 + " kb/s");
    sendNetBalancerLimit(true, initBW * 1e3);
}

function setTimeWithSeconds(sec) {
    var sec_num = parseInt(sec, 10);
    var hours = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - hours * 3600) / 60);
    var seconds = sec_num - hours * 3600 - minutes * 60;
    if (hours < 10) {
        hours = "0" + hours;
    }
    if (minutes < 10) {
        minutes = "0" + minutes;
    }
    if (seconds < 10) {
        seconds = "0" + seconds;
    }
    var time = hours + ":" + minutes + ":" + seconds;
    return time;
}

function updateSeekBar() {
    $("#seekBar").attr("value", video.currentTime);
    $(".current-time").text(setTimeWithSeconds(video.currentTime));
}

function initChartAndSlider() {
    var metricsExt = player.getMetricsExt(), bdw, bdwM, bdwK, bitrateValues = null, i;
    bitrateValues = metricsExt.getBitratesForType("video");
    if (bitrateValues === null) {
        return;
    }
    for (var idx in bitrateValues) {
        bdwM = bitrateValues[idx] / 1e6;
        bdwK = bitrateValues[idx] / 1e3;
        bdw = bdwM < 10 ? Math.round(bdwK) + "k" : Math.round(bitrateValues[idx] / 1e5) / 10 + "M";
        chartOptions.grid.markings.push({
            yaxis: {
                from: idx,
                to: idx
            },
            color: "#b0b0b0"
        });
        chartOptions.yaxis.ticks.push([ idx, bdw ]);
    }
    chartOptions.yaxis.min = 0;
    chartOptions.yaxis.max = bitrateValues.length - 1;
    for (i = 0; i < plotCount; i++) {
        dlSeries.push([ i, null ]);
        playSeries.push([ i, null ]);
    }
    plotIndex = 0;
    var bandwidthData = [ {
        data: dlSeries,
        label: "download",
        color: "#2980B9"
    }, {
        data: playSeries,
        label: "playing",
        color: "#E74C3C"
    } ];
    chartBandwidth = $.plot($("#chartBandwidth"), bandwidthData, chartOptions);
    var labels = [];
    for (i = 0; i < bitrateValues.length; i++) {
        labels.push(Math.round(bitrateValues[i] / 1e3) + "k");
    }
    $("#sliderBitrate").labeledslider({
        max: bitrateValues.length - 1,
        orientation: "vertical",
        range: true,
        step: 1,
        tweenLabels: false,
        values: [ 0, bitrateValues.length - 1 ],
        stop: function(event, ui) {
            player.setConfig({
                video: {
                    "ABR.minQuality": ui.values[0],
                    "ABR.maxQuality": ui.values[1]
                }
            });
        }
    });
    var audioDatas = player.getAudioTracks();
    if (audioDatas && audioDatas.length > 1) {
        var selectOptions = "";
        for (i = 0; i < audioDatas.length; i++) {
            selectOptions += '<option value="' + audioDatas[i].id + '">' + audioDatas[i].lang + " - " + audioDatas[i].id + "</option>";
        }
        $(".audio-tracks").html(selectOptions);
        audioTracksSelectIsPresent = true;
        $(".audio-tracks").change(function(track) {
            var currentTrackId = $("select option:selected")[0].value;
            for (i = 0; i < audioDatas.length; i++) {
                if (audioDatas[i].id == currentTrackId) {
                    player.setAudioTrack(audioDatas[i]);
                }
            }
        });
    } else {
        $(".audio-tracks").hide();
    }
}

function update() {
    var httpRequests, httpRequest, repSwitch, metricsVideo = player.getMetricsFor("video"), metricsExt = player.getMetricsExt(), currentTime = video.currentTime, i, currentSwitch;
    if (!chartBandwidth) {
        initChartAndSlider();
    }
    if (chartBandwidth === null) {
        return;
    }
    bufferLevel = metricsExt.getCurrentBufferLevel(metricsVideo);
    bufferLevel = bufferLevel ? bufferLevel.level.toPrecision(3) : 0;
    repSwitch = metricsExt.getCurrentRepresentationSwitch(metricsVideo);
    httpRequests = metricsExt.getHttpRequests(metricsVideo);
    i = httpRequests.length - 1;
    if (i >= 0) {
        httpRequest = httpRequests[i];
        while (httpRequest.tfinish === null && i > 0) {
            i -= 1;
            httpRequest = httpRequests[i];
        }
    }
    if (httpRequest && httpRequest.tfinish) {
        bitrate = httpRequest.bytesLength * 8e3 / (httpRequest.tfinish - httpRequest.trequest);
    }
    if (repSwitch && httpRequest && httpRequest.quality != downloadRepInfos.quality) {
        downloadRepInfos.quality = metricsExt.getIndexForRepresentation(repSwitch.to);
        downloadRepInfos.bandwidth = metricsExt.getBandwidthForRepresentation(repSwitch.to);
        downloadRepInfos.width = metricsExt.getVideoWidthForRepresentation(repSwitch.to);
        downloadRepInfos.height = metricsExt.getVideoHeightForRepresentation(repSwitch.to);
        downloadRepInfos.codecs = metricsExt.getCodecsForRepresentation(repSwitch.to);
        qualitySwitches.push({
            downloadStartTime: httpRequest.trequest,
            mediaStartTime: httpRequest.startTime,
            quality: downloadRepInfos.quality,
            bandwidth: downloadRepInfos.bandwidth,
            width: downloadRepInfos.width,
            height: downloadRepInfos.height,
            codecs: downloadRepInfos.codecs
        });
        if (playRepInfos.quality === -1) {
            playRepInfos.quality = downloadRepInfos.quality;
            playRepInfos.bandwidth = downloadRepInfos.bandwidth;
            playRepInfos.width = downloadRepInfos.width;
            playRepInfos.height = downloadRepInfos.height;
            playRepInfos.codecs = downloadRepInfos.codecs;
        }
    }
    for (i = 0; i < qualitySwitches.length; i += 1) {
        currentSwitch = qualitySwitches[i];
        if (currentTime >= currentSwitch.mediaStartTime) {
            playRepInfos.quality = currentSwitch.quality;
            playRepInfos.bandwidth = currentSwitch.bandwidth;
            playRepInfos.width = currentSwitch.width;
            playRepInfos.height = currentSwitch.height;
            playRepInfos.codecs = currentSwitch.codecs;
            qualitySwitches.splice(0, 1);
            break;
        }
    }
    if (plotIndex === plotCount) {
        for (i = 0; i < plotCount - 1; i += 1) {
            dlSeries[i] = [ i, dlSeries[i + 1][1] ];
            playSeries[i] = [ i, playSeries[i + 1][1] ];
        }
        plotIndex -= 1;
    }
    dlSeries[plotIndex] = [ plotIndex, Math.round(downloadRepInfos.quality) ];
    playSeries[plotIndex] = [ plotIndex, Math.round(playRepInfos.quality) ];
    plotIndex += 1;
    var bandwidthData = [ {
        data: dlSeries,
        label: "download",
        color: "#2980B9"
    }, {
        data: playSeries,
        label: "playing",
        color: "#E74C3C"
    } ];
    chartBandwidth.setData(bandwidthData);
    chartBandwidth.setupGrid();
    chartBandwidth.draw();
    if (firstAccess && video.duration > 0) {
        firstAccess = false;
        $(".controlBar").show();
        if (!player.metricsExt.manifestExt.getIsDynamic(player.metricsExt.manifestModel.getValue())) {
            $(".live").hide();
            $(".seekbar-container").show();
            $("#seekBar").attr("max", video.duration);
            $(".duration").text(setTimeWithSeconds(video.duration));
            $("#videoPlayer").on("timeupdate", updateSeekBar);
        } else {
            $(".seekbar-container").hide();
            $(".live").show();
        }
    }
    $("#state").html("Playing");
    $("#playingBandwidth").html(Math.round(playRepInfos.bandwidth / 1e3).toLocaleString() + " kb/s");
    $("#playingResolution").html(playRepInfos.width + "x" + playRepInfos.height);
    $("#playingCodecs").html(playRepInfos.codecs);
    $("#bufferLevel").html(bufferLevel + " s</br>");
    $("#bitrate").html("[" + httpRequest.quality + "] " + Math.round(bitrate / 1e3).toLocaleString() + " kb/s");
    updateTimeout = setTimeout(update, updateIntervalLength);
}

function toggleFullScreen() {
    if (!document.fullscreenElement && !document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
        if (document.getElementById("videoContainer").requestFullscreen) {
            document.getElementById("videoContainer").requestFullscreen();
        } else if (document.getElementById("videoContainer").msRequestFullscreen) {
            document.getElementById("videoContainer").msRequestFullscreen();
        } else if (document.getElementById("videoContainer").mozRequestFullScreen) {
            document.getElementById("videoContainer").mozRequestFullScreen();
        } else if (document.getElementById("videoContainer").webkitRequestFullscreen) {
            document.getElementById("videoContainer").webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
    }
}

var setVolumeOff = function(value) {
    if (value) {
        $(".button-volume").removeClass("fa-volume-up");
        $(".button-volume").addClass("fa-volume-off");
    } else {
        $(".button-volume").removeClass("fa-volume-off");
        $(".button-volume").addClass("fa-volume-up");
    }
};

var setPlaying = function(value) {
    if (value) {
        $(".button-playpause").removeClass("fa-play");
        $(".button-playpause").addClass("fa-pause");
    } else {
        $(".button-playpause").removeClass("fa-pause");
        $(".button-playpause").addClass("fa-play");
    }
};

var setShowInfo = function(value) {
    if (value) {
        $(".button-informations").removeClass("fa-info");
        $(".button-informations").addClass("fa-info-circle");
    } else {
        $(".button-informations").removeClass("fa-info-circle");
        $(".button-informations").addClass("fa-info");
    }
};

function hideMetrics() {
    $("#infosToToggle").toggle();
    $("#chartToToggle").toggle();
    $("#sliderToToggle").toggle();
    isMetricsOn = $("#chartToToggle").is(":visible");
    setShowInfo(isMetricsOn);
}

function appendText(message) {
    var currentTime = new Date(), elapsedTime = (currentTime - startTime) / 1e3;
    $("#textarea").html($("#textarea").html() + "\n" + elapsedTime.toFixed(3) + ": " + message);
    $("#textarea").scrollTop($("#textarea")[0].scrollHeight);
}

function initControlBar() {
    var controlBar = $("#controlBar");
    controlBar.hide();
    var i = null;
    $("html").mousemove(function() {
        clearTimeout(i);
        controlBar.show();
        $("body").css({
            cursor: "auto"
        });
        i = setTimeout(function() {
            controlBar.fadeOut(500, function() {
                $("body").css({
                    cursor: "none"
                });
            });
        }, 1500);
    });
    setShowInfo(isMetricsOn);
    $(".button-informations").click(function() {
        hideMetrics();
    });
    $(".button-playpause").click(function() {
        isPlaying ? video.pause() : video.play();
    });
    $(".button-volume").click(function() {
        video.muted = !video.muted;
    });
    $(".button-fullscreen").click(function() {
        toggleFullScreen();
    });
    $("#seekBar").click(function(event) {
        video.currentTime = event.offsetX * video.duration / $("#seekBar").width();
        updateSeekBar();
    });
}

function initVideoController() {
    video = document.querySelector("video");
    $("#videoPlayer").on("play", function() {
        isPlaying = true;
        setPlaying(true);
        if (video.muted) {
            setVolumeOff(true);
        }
        update();
        appendText("play");
    });
    $("#videoPlayer").dblclick(function() {
        toggleFullScreen();
    });
    $("#videoPlayer").on("pause", function() {
        isPlaying = false;
        setPlaying(false);
        clearTimeout(updateTimeout);
        appendText("pause");
    });
    if (video.muted) {
        setVolumeOff(true);
    }
    $("#videoPlayer").on("volumechange", function() {
        if (video.muted) {
            setVolumeOff(true);
        } else {
            setVolumeOff(false);
        }
    });
    $("#videoPlayer").on("loadstart", function() {
        appendText("loadstart");
    });
    $("#videoPlayer").on("loadedmetadata", function() {
        appendText("loadedmetadata");
    });
    $("#videoPlayer").on("loadeddata", function() {
        appendText("loadeddata");
    });
    $("#videoPlayer").on("canplay", function() {
        appendText("canplay");
    });
    $("#videoPlayer").on("playing", function() {
        appendText("playing");
    });
    $("#videoPlayer").on("stalled", function() {
        appendText("stalled");
    });
    $("#videoPlayer").on("durationchange", function() {
        appendText("durationchange: " + video.duration);
    });
    $("#videoPlayer").on("progress", function() {});
    $("#videoPlayer").on("timeupdate", function() {});
}

function parseUrlParams() {
    var query = window.location.search, anchor = window.location.hash, params, i, name, value;
    if (query) {
        params = query.substring(1).split("&");
        for (i = 0; i < params.length; i++) {
            name = params[i].split("=")[0];
            value = params[i].substr(name.length + 1);
            if (name === "file" || name === "url") {
                streamSource = value + anchor;
            } else if (name === "context") {
                context = value;
            } else if (name === "metrics") {
                enableMetrics = true;
            } else if (name === "debug" && value !== "false") {
                document.getElementById("debugInfos").style.visibility = "visible";
            } else {
                streamSource += "&" + params[i];
            }
        }
    }
}

function metricUpdated(e) {
    var metric;
    if (e.data.stream == "video" && e.data.metric == "HttpRequestTrace") {
        metric = e.data.value;
        if (metric.tfinish != null && !netBalancerLimitSetted) {
            console.log("Set NetBalancer Limit" + netBalancerLimitValue);
            sendNetBalancerLimit(true, netBalancerLimitValue * 1e3);
            netBalancerLimitSetted = true;
        }
    }
}

function metricAdded(e) {
    switch (e.data.metric) {
      case "State":
        if (e.data.stream === "video") {
            appendText("Video state = " + e.data.value.current);
            if (e.data.value.current === "buffering") {
                document.getElementById("bufferingDiv").style.visibility = "visible";
            } else {
                document.getElementById("bufferingDiv").style.visibility = "hidden";
            }
        }
        break;
    }
}

function initPlayer() {
    switch (context) {
      case "dash":
        player = new MediaPlayer(new MediaPlayer.di.Context());
        break;

      case "hasplayer_default":
        break;

      case "hasplayer_custom":
      default:
        player = new MediaPlayer(new MediaPlayer.di.Context());
        break;
    }
    player.startup();
    player.attachView(video);
    player.setAutoPlay(true);
    player.addEventListener("metricUpdated", metricUpdated.bind(this));
    player.addEventListener("metricAdded", metricAdded.bind(this));
    if (isCrKey) {
        var ccastReceiver = new HasCastReceiver(player);
        player.getDebug().setLogToBrowserConsole(false);
    }
}

function launchPlayer() {
    if (metricsAgent && metricsAgentActive) {
        metricsAgent.createSession();
    }
    startTime = new Date();
    appendText("attachSource");
    player.attachSource(streamSource);
    update();
    initControlBar();
}

function onLoad() {
    parseUrlParams();
    initNetBalancerSlider();
    initVideoController();
    initPlayer();
    $(document).keydown(function(e) {
        if (e.keyCode == 73 && e.ctrlKey) {
            hideMetrics();
            hideNetworkLimiter();
            return false;
        }
    });
    if (hideMetricsAtStart) {
        hideMetrics();
    }
}

function onUnload() {
    sendNetBalancerLimit(false, 0);
}

(function(e, t) {
    var n, r, i = typeof t, o = e.location, a = e.document, s = a.documentElement, l = e.jQuery, u = e.$, c = {}, p = [], f = "1.10.2", d = p.concat, h = p.push, g = p.slice, m = p.indexOf, y = c.toString, v = c.hasOwnProperty, b = f.trim, x = function(e, t) {
        return new x.fn.init(e, t, r);
    }, w = /[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/.source, T = /\S+/g, C = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, N = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]*))$/, k = /^<(\w+)\s*\/?>(?:<\/\1>|)$/, E = /^[\],:{}\s]*$/, S = /(?:^|:|,)(?:\s*\[)+/g, A = /\\(?:["\\\/bfnrt]|u[\da-fA-F]{4})/g, j = /"[^"\\\r\n]*"|true|false|null|-?(?:\d+\.|)\d+(?:[eE][+-]?\d+|)/g, D = /^-ms-/, L = /-([\da-z])/gi, H = function(e, t) {
        return t.toUpperCase();
    }, q = function(e) {
        (a.addEventListener || "load" === e.type || "complete" === a.readyState) && (_(), 
        x.ready());
    }, _ = function() {
        a.addEventListener ? (a.removeEventListener("DOMContentLoaded", q, !1), e.removeEventListener("load", q, !1)) : (a.detachEvent("onreadystatechange", q), 
        e.detachEvent("onload", q));
    };
    x.fn = x.prototype = {
        jquery: f,
        constructor: x,
        init: function(e, n, r) {
            var i, o;
            if (!e) return this;
            if ("string" == typeof e) {
                if (i = "<" === e.charAt(0) && ">" === e.charAt(e.length - 1) && e.length >= 3 ? [ null, e, null ] : N.exec(e), 
                !i || !i[1] && n) return !n || n.jquery ? (n || r).find(e) : this.constructor(n).find(e);
                if (i[1]) {
                    if (n = n instanceof x ? n[0] : n, x.merge(this, x.parseHTML(i[1], n && n.nodeType ? n.ownerDocument || n : a, !0)), 
                    k.test(i[1]) && x.isPlainObject(n)) for (i in n) x.isFunction(this[i]) ? this[i](n[i]) : this.attr(i, n[i]);
                    return this;
                }
                if (o = a.getElementById(i[2]), o && o.parentNode) {
                    if (o.id !== i[2]) return r.find(e);
                    this.length = 1, this[0] = o;
                }
                return this.context = a, this.selector = e, this;
            }
            return e.nodeType ? (this.context = this[0] = e, this.length = 1, this) : x.isFunction(e) ? r.ready(e) : (e.selector !== t && (this.selector = e.selector, 
            this.context = e.context), x.makeArray(e, this));
        },
        selector: "",
        length: 0,
        toArray: function() {
            return g.call(this);
        },
        get: function(e) {
            return null == e ? this.toArray() : 0 > e ? this[this.length + e] : this[e];
        },
        pushStack: function(e) {
            var t = x.merge(this.constructor(), e);
            return t.prevObject = this, t.context = this.context, t;
        },
        each: function(e, t) {
            return x.each(this, e, t);
        },
        ready: function(e) {
            return x.ready.promise().done(e), this;
        },
        slice: function() {
            return this.pushStack(g.apply(this, arguments));
        },
        first: function() {
            return this.eq(0);
        },
        last: function() {
            return this.eq(-1);
        },
        eq: function(e) {
            var t = this.length, n = +e + (0 > e ? t : 0);
            return this.pushStack(n >= 0 && t > n ? [ this[n] ] : []);
        },
        map: function(e) {
            return this.pushStack(x.map(this, function(t, n) {
                return e.call(t, n, t);
            }));
        },
        end: function() {
            return this.prevObject || this.constructor(null);
        },
        push: h,
        sort: [].sort,
        splice: [].splice
    }, x.fn.init.prototype = x.fn, x.extend = x.fn.extend = function() {
        var e, n, r, i, o, a, s = arguments[0] || {}, l = 1, u = arguments.length, c = !1;
        for ("boolean" == typeof s && (c = s, s = arguments[1] || {}, l = 2), "object" == typeof s || x.isFunction(s) || (s = {}), 
        u === l && (s = this, --l); u > l; l++) if (null != (o = arguments[l])) for (i in o) e = s[i], 
        r = o[i], s !== r && (c && r && (x.isPlainObject(r) || (n = x.isArray(r))) ? (n ? (n = !1, 
        a = e && x.isArray(e) ? e : []) : a = e && x.isPlainObject(e) ? e : {}, s[i] = x.extend(c, a, r)) : r !== t && (s[i] = r));
        return s;
    }, x.extend({
        expando: "jQuery" + (f + Math.random()).replace(/\D/g, ""),
        noConflict: function(t) {
            return e.$ === x && (e.$ = u), t && e.jQuery === x && (e.jQuery = l), x;
        },
        isReady: !1,
        readyWait: 1,
        holdReady: function(e) {
            e ? x.readyWait++ : x.ready(!0);
        },
        ready: function(e) {
            if (e === !0 ? !--x.readyWait : !x.isReady) {
                if (!a.body) return setTimeout(x.ready);
                x.isReady = !0, e !== !0 && --x.readyWait > 0 || (n.resolveWith(a, [ x ]), x.fn.trigger && x(a).trigger("ready").off("ready"));
            }
        },
        isFunction: function(e) {
            return "function" === x.type(e);
        },
        isArray: Array.isArray || function(e) {
            return "array" === x.type(e);
        },
        isWindow: function(e) {
            return null != e && e == e.window;
        },
        isNumeric: function(e) {
            return !isNaN(parseFloat(e)) && isFinite(e);
        },
        type: function(e) {
            return null == e ? e + "" : "object" == typeof e || "function" == typeof e ? c[y.call(e)] || "object" : typeof e;
        },
        isPlainObject: function(e) {
            var n;
            if (!e || "object" !== x.type(e) || e.nodeType || x.isWindow(e)) return !1;
            try {
                if (e.constructor && !v.call(e, "constructor") && !v.call(e.constructor.prototype, "isPrototypeOf")) return !1;
            } catch (r) {
                return !1;
            }
            if (x.support.ownLast) for (n in e) return v.call(e, n);
            for (n in e) ;
            return n === t || v.call(e, n);
        },
        isEmptyObject: function(e) {
            var t;
            for (t in e) return !1;
            return !0;
        },
        error: function(e) {
            throw Error(e);
        },
        parseHTML: function(e, t, n) {
            if (!e || "string" != typeof e) return null;
            "boolean" == typeof t && (n = t, t = !1), t = t || a;
            var r = k.exec(e), i = !n && [];
            return r ? [ t.createElement(r[1]) ] : (r = x.buildFragment([ e ], t, i), i && x(i).remove(), 
            x.merge([], r.childNodes));
        },
        parseJSON: function(n) {
            return e.JSON && e.JSON.parse ? e.JSON.parse(n) : null === n ? n : "string" == typeof n && (n = x.trim(n), 
            n && E.test(n.replace(A, "@").replace(j, "]").replace(S, ""))) ? Function("return " + n)() : (x.error("Invalid JSON: " + n), 
            t);
        },
        parseXML: function(n) {
            var r, i;
            if (!n || "string" != typeof n) return null;
            try {
                e.DOMParser ? (i = new DOMParser(), r = i.parseFromString(n, "text/xml")) : (r = new ActiveXObject("Microsoft.XMLDOM"), 
                r.async = "false", r.loadXML(n));
            } catch (o) {
                r = t;
            }
            return r && r.documentElement && !r.getElementsByTagName("parsererror").length || x.error("Invalid XML: " + n), 
            r;
        },
        noop: function() {},
        globalEval: function(t) {
            t && x.trim(t) && (e.execScript || function(t) {
                e.eval.call(e, t);
            })(t);
        },
        camelCase: function(e) {
            return e.replace(D, "ms-").replace(L, H);
        },
        nodeName: function(e, t) {
            return e.nodeName && e.nodeName.toLowerCase() === t.toLowerCase();
        },
        each: function(e, t, n) {
            var r, i = 0, o = e.length, a = M(e);
            if (n) {
                if (a) {
                    for (;o > i; i++) if (r = t.apply(e[i], n), r === !1) break;
                } else for (i in e) if (r = t.apply(e[i], n), r === !1) break;
            } else if (a) {
                for (;o > i; i++) if (r = t.call(e[i], i, e[i]), r === !1) break;
            } else for (i in e) if (r = t.call(e[i], i, e[i]), r === !1) break;
            return e;
        },
        trim: b && !b.call("\ufeff ") ? function(e) {
            return null == e ? "" : b.call(e);
        } : function(e) {
            return null == e ? "" : (e + "").replace(C, "");
        },
        makeArray: function(e, t) {
            var n = t || [];
            return null != e && (M(Object(e)) ? x.merge(n, "string" == typeof e ? [ e ] : e) : h.call(n, e)), 
            n;
        },
        inArray: function(e, t, n) {
            var r;
            if (t) {
                if (m) return m.call(t, e, n);
                for (r = t.length, n = n ? 0 > n ? Math.max(0, r + n) : n : 0; r > n; n++) if (n in t && t[n] === e) return n;
            }
            return -1;
        },
        merge: function(e, n) {
            var r = n.length, i = e.length, o = 0;
            if ("number" == typeof r) for (;r > o; o++) e[i++] = n[o]; else while (n[o] !== t) e[i++] = n[o++];
            return e.length = i, e;
        },
        grep: function(e, t, n) {
            var r, i = [], o = 0, a = e.length;
            for (n = !!n; a > o; o++) r = !!t(e[o], o), n !== r && i.push(e[o]);
            return i;
        },
        map: function(e, t, n) {
            var r, i = 0, o = e.length, a = M(e), s = [];
            if (a) for (;o > i; i++) r = t(e[i], i, n), null != r && (s[s.length] = r); else for (i in e) r = t(e[i], i, n), 
            null != r && (s[s.length] = r);
            return d.apply([], s);
        },
        guid: 1,
        proxy: function(e, n) {
            var r, i, o;
            return "string" == typeof n && (o = e[n], n = e, e = o), x.isFunction(e) ? (r = g.call(arguments, 2), 
            i = function() {
                return e.apply(n || this, r.concat(g.call(arguments)));
            }, i.guid = e.guid = e.guid || x.guid++, i) : t;
        },
        access: function(e, n, r, i, o, a, s) {
            var l = 0, u = e.length, c = null == r;
            if ("object" === x.type(r)) {
                o = !0;
                for (l in r) x.access(e, n, l, r[l], !0, a, s);
            } else if (i !== t && (o = !0, x.isFunction(i) || (s = !0), c && (s ? (n.call(e, i), 
            n = null) : (c = n, n = function(e, t, n) {
                return c.call(x(e), n);
            })), n)) for (;u > l; l++) n(e[l], r, s ? i : i.call(e[l], l, n(e[l], r)));
            return o ? e : c ? n.call(e) : u ? n(e[0], r) : a;
        },
        now: function() {
            return new Date().getTime();
        },
        swap: function(e, t, n, r) {
            var i, o, a = {};
            for (o in t) a[o] = e.style[o], e.style[o] = t[o];
            i = n.apply(e, r || []);
            for (o in t) e.style[o] = a[o];
            return i;
        }
    }), x.ready.promise = function(t) {
        if (!n) if (n = x.Deferred(), "complete" === a.readyState) setTimeout(x.ready); else if (a.addEventListener) a.addEventListener("DOMContentLoaded", q, !1), 
        e.addEventListener("load", q, !1); else {
            a.attachEvent("onreadystatechange", q), e.attachEvent("onload", q);
            var r = !1;
            try {
                r = null == e.frameElement && a.documentElement;
            } catch (i) {}
            r && r.doScroll && function o() {
                if (!x.isReady) {
                    try {
                        r.doScroll("left");
                    } catch (e) {
                        return setTimeout(o, 50);
                    }
                    _(), x.ready();
                }
            }();
        }
        return n.promise(t);
    }, x.each("Boolean Number String Function Array Date RegExp Object Error".split(" "), function(e, t) {
        c["[object " + t + "]"] = t.toLowerCase();
    });
    function M(e) {
        var t = e.length, n = x.type(e);
        return x.isWindow(e) ? !1 : 1 === e.nodeType && t ? !0 : "array" === n || "function" !== n && (0 === t || "number" == typeof t && t > 0 && t - 1 in e);
    }
    r = x(a), function(e, t) {
        var n, r, i, o, a, s, l, u, c, p, f, d, h, g, m, y, v, b = "sizzle" + -new Date(), w = e.document, T = 0, C = 0, N = st(), k = st(), E = st(), S = !1, A = function(e, t) {
            return e === t ? (S = !0, 0) : 0;
        }, j = typeof t, D = 1 << 31, L = {}.hasOwnProperty, H = [], q = H.pop, _ = H.push, M = H.push, O = H.slice, F = H.indexOf || function(e) {
            var t = 0, n = this.length;
            for (;n > t; t++) if (this[t] === e) return t;
            return -1;
        }, B = "checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped", P = "[\\x20\\t\\r\\n\\f]", R = "(?:\\\\.|[\\w-]|[^\\x00-\\xa0])+", W = R.replace("w", "w#"), $ = "\\[" + P + "*(" + R + ")" + P + "*(?:([*^$|!~]?=)" + P + "*(?:(['\"])((?:\\\\.|[^\\\\])*?)\\3|(" + W + ")|)|)" + P + "*\\]", I = ":(" + R + ")(?:\\(((['\"])((?:\\\\.|[^\\\\])*?)\\3|((?:\\\\.|[^\\\\()[\\]]|" + $.replace(3, 8) + ")*)|.*)\\)|)", z = RegExp("^" + P + "+|((?:^|[^\\\\])(?:\\\\.)*)" + P + "+$", "g"), X = RegExp("^" + P + "*," + P + "*"), U = RegExp("^" + P + "*([>+~]|" + P + ")" + P + "*"), V = RegExp(P + "*[+~]"), Y = RegExp("=" + P + "*([^\\]'\"]*)" + P + "*\\]", "g"), J = RegExp(I), G = RegExp("^" + W + "$"), Q = {
            ID: RegExp("^#(" + R + ")"),
            CLASS: RegExp("^\\.(" + R + ")"),
            TAG: RegExp("^(" + R.replace("w", "w*") + ")"),
            ATTR: RegExp("^" + $),
            PSEUDO: RegExp("^" + I),
            CHILD: RegExp("^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\(" + P + "*(even|odd|(([+-]|)(\\d*)n|)" + P + "*(?:([+-]|)" + P + "*(\\d+)|))" + P + "*\\)|)", "i"),
            bool: RegExp("^(?:" + B + ")$", "i"),
            needsContext: RegExp("^" + P + "*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\(" + P + "*((?:-\\d)?\\d*)" + P + "*\\)|)(?=[^-]|$)", "i")
        }, K = /^[^{]+\{\s*\[native \w/, Z = /^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/, et = /^(?:input|select|textarea|button)$/i, tt = /^h\d$/i, nt = /'|\\/g, rt = RegExp("\\\\([\\da-f]{1,6}" + P + "?|(" + P + ")|.)", "ig"), it = function(e, t, n) {
            var r = "0x" + t - 65536;
            return r !== r || n ? t : 0 > r ? String.fromCharCode(r + 65536) : String.fromCharCode(55296 | r >> 10, 56320 | 1023 & r);
        };
        try {
            M.apply(H = O.call(w.childNodes), w.childNodes), H[w.childNodes.length].nodeType;
        } catch (ot) {
            M = {
                apply: H.length ? function(e, t) {
                    _.apply(e, O.call(t));
                } : function(e, t) {
                    var n = e.length, r = 0;
                    while (e[n++] = t[r++]) ;
                    e.length = n - 1;
                }
            };
        }
        function at(e, t, n, i) {
            var o, a, s, l, u, c, d, m, y, x;
            if ((t ? t.ownerDocument || t : w) !== f && p(t), t = t || f, n = n || [], !e || "string" != typeof e) return n;
            if (1 !== (l = t.nodeType) && 9 !== l) return [];
            if (h && !i) {
                if (o = Z.exec(e)) if (s = o[1]) {
                    if (9 === l) {
                        if (a = t.getElementById(s), !a || !a.parentNode) return n;
                        if (a.id === s) return n.push(a), n;
                    } else if (t.ownerDocument && (a = t.ownerDocument.getElementById(s)) && v(t, a) && a.id === s) return n.push(a), 
                    n;
                } else {
                    if (o[2]) return M.apply(n, t.getElementsByTagName(e)), n;
                    if ((s = o[3]) && r.getElementsByClassName && t.getElementsByClassName) return M.apply(n, t.getElementsByClassName(s)), 
                    n;
                }
                if (r.qsa && (!g || !g.test(e))) {
                    if (m = d = b, y = t, x = 9 === l && e, 1 === l && "object" !== t.nodeName.toLowerCase()) {
                        c = mt(e), (d = t.getAttribute("id")) ? m = d.replace(nt, "\\$&") : t.setAttribute("id", m), 
                        m = "[id='" + m + "'] ", u = c.length;
                        while (u--) c[u] = m + yt(c[u]);
                        y = V.test(e) && t.parentNode || t, x = c.join(",");
                    }
                    if (x) try {
                        return M.apply(n, y.querySelectorAll(x)), n;
                    } catch (T) {} finally {
                        d || t.removeAttribute("id");
                    }
                }
            }
            return kt(e.replace(z, "$1"), t, n, i);
        }
        function st() {
            var e = [];
            function t(n, r) {
                return e.push(n += " ") > o.cacheLength && delete t[e.shift()], t[n] = r;
            }
            return t;
        }
        function lt(e) {
            return e[b] = !0, e;
        }
        function ut(e) {
            var t = f.createElement("div");
            try {
                return !!e(t);
            } catch (n) {
                return !1;
            } finally {
                t.parentNode && t.parentNode.removeChild(t), t = null;
            }
        }
        function ct(e, t) {
            var n = e.split("|"), r = e.length;
            while (r--) o.attrHandle[n[r]] = t;
        }
        function pt(e, t) {
            var n = t && e, r = n && 1 === e.nodeType && 1 === t.nodeType && (~t.sourceIndex || D) - (~e.sourceIndex || D);
            if (r) return r;
            if (n) while (n = n.nextSibling) if (n === t) return -1;
            return e ? 1 : -1;
        }
        function ft(e) {
            return function(t) {
                var n = t.nodeName.toLowerCase();
                return "input" === n && t.type === e;
            };
        }
        function dt(e) {
            return function(t) {
                var n = t.nodeName.toLowerCase();
                return ("input" === n || "button" === n) && t.type === e;
            };
        }
        function ht(e) {
            return lt(function(t) {
                return t = +t, lt(function(n, r) {
                    var i, o = e([], n.length, t), a = o.length;
                    while (a--) n[i = o[a]] && (n[i] = !(r[i] = n[i]));
                });
            });
        }
        s = at.isXML = function(e) {
            var t = e && (e.ownerDocument || e).documentElement;
            return t ? "HTML" !== t.nodeName : !1;
        }, r = at.support = {}, p = at.setDocument = function(e) {
            var n = e ? e.ownerDocument || e : w, i = n.defaultView;
            return n !== f && 9 === n.nodeType && n.documentElement ? (f = n, d = n.documentElement, 
            h = !s(n), i && i.attachEvent && i !== i.top && i.attachEvent("onbeforeunload", function() {
                p();
            }), r.attributes = ut(function(e) {
                return e.className = "i", !e.getAttribute("className");
            }), r.getElementsByTagName = ut(function(e) {
                return e.appendChild(n.createComment("")), !e.getElementsByTagName("*").length;
            }), r.getElementsByClassName = ut(function(e) {
                return e.innerHTML = "<div class='a'></div><div class='a i'></div>", e.firstChild.className = "i", 
                2 === e.getElementsByClassName("i").length;
            }), r.getById = ut(function(e) {
                return d.appendChild(e).id = b, !n.getElementsByName || !n.getElementsByName(b).length;
            }), r.getById ? (o.find.ID = function(e, t) {
                if (typeof t.getElementById !== j && h) {
                    var n = t.getElementById(e);
                    return n && n.parentNode ? [ n ] : [];
                }
            }, o.filter.ID = function(e) {
                var t = e.replace(rt, it);
                return function(e) {
                    return e.getAttribute("id") === t;
                };
            }) : (delete o.find.ID, o.filter.ID = function(e) {
                var t = e.replace(rt, it);
                return function(e) {
                    var n = typeof e.getAttributeNode !== j && e.getAttributeNode("id");
                    return n && n.value === t;
                };
            }), o.find.TAG = r.getElementsByTagName ? function(e, n) {
                return typeof n.getElementsByTagName !== j ? n.getElementsByTagName(e) : t;
            } : function(e, t) {
                var n, r = [], i = 0, o = t.getElementsByTagName(e);
                if ("*" === e) {
                    while (n = o[i++]) 1 === n.nodeType && r.push(n);
                    return r;
                }
                return o;
            }, o.find.CLASS = r.getElementsByClassName && function(e, n) {
                return typeof n.getElementsByClassName !== j && h ? n.getElementsByClassName(e) : t;
            }, m = [], g = [], (r.qsa = K.test(n.querySelectorAll)) && (ut(function(e) {
                e.innerHTML = "<select><option selected=''></option></select>", e.querySelectorAll("[selected]").length || g.push("\\[" + P + "*(?:value|" + B + ")"), 
                e.querySelectorAll(":checked").length || g.push(":checked");
            }), ut(function(e) {
                var t = n.createElement("input");
                t.setAttribute("type", "hidden"), e.appendChild(t).setAttribute("t", ""), e.querySelectorAll("[t^='']").length && g.push("[*^$]=" + P + "*(?:''|\"\")"), 
                e.querySelectorAll(":enabled").length || g.push(":enabled", ":disabled"), e.querySelectorAll("*,:x"), 
                g.push(",.*:");
            })), (r.matchesSelector = K.test(y = d.webkitMatchesSelector || d.mozMatchesSelector || d.oMatchesSelector || d.msMatchesSelector)) && ut(function(e) {
                r.disconnectedMatch = y.call(e, "div"), y.call(e, "[s!='']:x"), m.push("!=", I);
            }), g = g.length && RegExp(g.join("|")), m = m.length && RegExp(m.join("|")), v = K.test(d.contains) || d.compareDocumentPosition ? function(e, t) {
                var n = 9 === e.nodeType ? e.documentElement : e, r = t && t.parentNode;
                return e === r || !(!r || 1 !== r.nodeType || !(n.contains ? n.contains(r) : e.compareDocumentPosition && 16 & e.compareDocumentPosition(r)));
            } : function(e, t) {
                if (t) while (t = t.parentNode) if (t === e) return !0;
                return !1;
            }, A = d.compareDocumentPosition ? function(e, t) {
                if (e === t) return S = !0, 0;
                var i = t.compareDocumentPosition && e.compareDocumentPosition && e.compareDocumentPosition(t);
                return i ? 1 & i || !r.sortDetached && t.compareDocumentPosition(e) === i ? e === n || v(w, e) ? -1 : t === n || v(w, t) ? 1 : c ? F.call(c, e) - F.call(c, t) : 0 : 4 & i ? -1 : 1 : e.compareDocumentPosition ? -1 : 1;
            } : function(e, t) {
                var r, i = 0, o = e.parentNode, a = t.parentNode, s = [ e ], l = [ t ];
                if (e === t) return S = !0, 0;
                if (!o || !a) return e === n ? -1 : t === n ? 1 : o ? -1 : a ? 1 : c ? F.call(c, e) - F.call(c, t) : 0;
                if (o === a) return pt(e, t);
                r = e;
                while (r = r.parentNode) s.unshift(r);
                r = t;
                while (r = r.parentNode) l.unshift(r);
                while (s[i] === l[i]) i++;
                return i ? pt(s[i], l[i]) : s[i] === w ? -1 : l[i] === w ? 1 : 0;
            }, n) : f;
        }, at.matches = function(e, t) {
            return at(e, null, null, t);
        }, at.matchesSelector = function(e, t) {
            if ((e.ownerDocument || e) !== f && p(e), t = t.replace(Y, "='$1']"), !(!r.matchesSelector || !h || m && m.test(t) || g && g.test(t))) try {
                var n = y.call(e, t);
                if (n || r.disconnectedMatch || e.document && 11 !== e.document.nodeType) return n;
            } catch (i) {}
            return at(t, f, null, [ e ]).length > 0;
        }, at.contains = function(e, t) {
            return (e.ownerDocument || e) !== f && p(e), v(e, t);
        }, at.attr = function(e, n) {
            (e.ownerDocument || e) !== f && p(e);
            var i = o.attrHandle[n.toLowerCase()], a = i && L.call(o.attrHandle, n.toLowerCase()) ? i(e, n, !h) : t;
            return a === t ? r.attributes || !h ? e.getAttribute(n) : (a = e.getAttributeNode(n)) && a.specified ? a.value : null : a;
        }, at.error = function(e) {
            throw Error("Syntax error, unrecognized expression: " + e);
        }, at.uniqueSort = function(e) {
            var t, n = [], i = 0, o = 0;
            if (S = !r.detectDuplicates, c = !r.sortStable && e.slice(0), e.sort(A), S) {
                while (t = e[o++]) t === e[o] && (i = n.push(o));
                while (i--) e.splice(n[i], 1);
            }
            return e;
        }, a = at.getText = function(e) {
            var t, n = "", r = 0, i = e.nodeType;
            if (i) {
                if (1 === i || 9 === i || 11 === i) {
                    if ("string" == typeof e.textContent) return e.textContent;
                    for (e = e.firstChild; e; e = e.nextSibling) n += a(e);
                } else if (3 === i || 4 === i) return e.nodeValue;
            } else for (;t = e[r]; r++) n += a(t);
            return n;
        }, o = at.selectors = {
            cacheLength: 50,
            createPseudo: lt,
            match: Q,
            attrHandle: {},
            find: {},
            relative: {
                ">": {
                    dir: "parentNode",
                    first: !0
                },
                " ": {
                    dir: "parentNode"
                },
                "+": {
                    dir: "previousSibling",
                    first: !0
                },
                "~": {
                    dir: "previousSibling"
                }
            },
            preFilter: {
                ATTR: function(e) {
                    return e[1] = e[1].replace(rt, it), e[3] = (e[4] || e[5] || "").replace(rt, it), 
                    "~=" === e[2] && (e[3] = " " + e[3] + " "), e.slice(0, 4);
                },
                CHILD: function(e) {
                    return e[1] = e[1].toLowerCase(), "nth" === e[1].slice(0, 3) ? (e[3] || at.error(e[0]), 
                    e[4] = +(e[4] ? e[5] + (e[6] || 1) : 2 * ("even" === e[3] || "odd" === e[3])), e[5] = +(e[7] + e[8] || "odd" === e[3])) : e[3] && at.error(e[0]), 
                    e;
                },
                PSEUDO: function(e) {
                    var n, r = !e[5] && e[2];
                    return Q.CHILD.test(e[0]) ? null : (e[3] && e[4] !== t ? e[2] = e[4] : r && J.test(r) && (n = mt(r, !0)) && (n = r.indexOf(")", r.length - n) - r.length) && (e[0] = e[0].slice(0, n), 
                    e[2] = r.slice(0, n)), e.slice(0, 3));
                }
            },
            filter: {
                TAG: function(e) {
                    var t = e.replace(rt, it).toLowerCase();
                    return "*" === e ? function() {
                        return !0;
                    } : function(e) {
                        return e.nodeName && e.nodeName.toLowerCase() === t;
                    };
                },
                CLASS: function(e) {
                    var t = N[e + " "];
                    return t || (t = RegExp("(^|" + P + ")" + e + "(" + P + "|$)")) && N(e, function(e) {
                        return t.test("string" == typeof e.className && e.className || typeof e.getAttribute !== j && e.getAttribute("class") || "");
                    });
                },
                ATTR: function(e, t, n) {
                    return function(r) {
                        var i = at.attr(r, e);
                        return null == i ? "!=" === t : t ? (i += "", "=" === t ? i === n : "!=" === t ? i !== n : "^=" === t ? n && 0 === i.indexOf(n) : "*=" === t ? n && i.indexOf(n) > -1 : "$=" === t ? n && i.slice(-n.length) === n : "~=" === t ? (" " + i + " ").indexOf(n) > -1 : "|=" === t ? i === n || i.slice(0, n.length + 1) === n + "-" : !1) : !0;
                    };
                },
                CHILD: function(e, t, n, r, i) {
                    var o = "nth" !== e.slice(0, 3), a = "last" !== e.slice(-4), s = "of-type" === t;
                    return 1 === r && 0 === i ? function(e) {
                        return !!e.parentNode;
                    } : function(t, n, l) {
                        var u, c, p, f, d, h, g = o !== a ? "nextSibling" : "previousSibling", m = t.parentNode, y = s && t.nodeName.toLowerCase(), v = !l && !s;
                        if (m) {
                            if (o) {
                                while (g) {
                                    p = t;
                                    while (p = p[g]) if (s ? p.nodeName.toLowerCase() === y : 1 === p.nodeType) return !1;
                                    h = g = "only" === e && !h && "nextSibling";
                                }
                                return !0;
                            }
                            if (h = [ a ? m.firstChild : m.lastChild ], a && v) {
                                c = m[b] || (m[b] = {}), u = c[e] || [], d = u[0] === T && u[1], f = u[0] === T && u[2], 
                                p = d && m.childNodes[d];
                                while (p = ++d && p && p[g] || (f = d = 0) || h.pop()) if (1 === p.nodeType && ++f && p === t) {
                                    c[e] = [ T, d, f ];
                                    break;
                                }
                            } else if (v && (u = (t[b] || (t[b] = {}))[e]) && u[0] === T) f = u[1]; else while (p = ++d && p && p[g] || (f = d = 0) || h.pop()) if ((s ? p.nodeName.toLowerCase() === y : 1 === p.nodeType) && ++f && (v && ((p[b] || (p[b] = {}))[e] = [ T, f ]), 
                            p === t)) break;
                            return f -= i, f === r || 0 === f % r && f / r >= 0;
                        }
                    };
                },
                PSEUDO: function(e, t) {
                    var n, r = o.pseudos[e] || o.setFilters[e.toLowerCase()] || at.error("unsupported pseudo: " + e);
                    return r[b] ? r(t) : r.length > 1 ? (n = [ e, e, "", t ], o.setFilters.hasOwnProperty(e.toLowerCase()) ? lt(function(e, n) {
                        var i, o = r(e, t), a = o.length;
                        while (a--) i = F.call(e, o[a]), e[i] = !(n[i] = o[a]);
                    }) : function(e) {
                        return r(e, 0, n);
                    }) : r;
                }
            },
            pseudos: {
                not: lt(function(e) {
                    var t = [], n = [], r = l(e.replace(z, "$1"));
                    return r[b] ? lt(function(e, t, n, i) {
                        var o, a = r(e, null, i, []), s = e.length;
                        while (s--) (o = a[s]) && (e[s] = !(t[s] = o));
                    }) : function(e, i, o) {
                        return t[0] = e, r(t, null, o, n), !n.pop();
                    };
                }),
                has: lt(function(e) {
                    return function(t) {
                        return at(e, t).length > 0;
                    };
                }),
                contains: lt(function(e) {
                    return function(t) {
                        return (t.textContent || t.innerText || a(t)).indexOf(e) > -1;
                    };
                }),
                lang: lt(function(e) {
                    return G.test(e || "") || at.error("unsupported lang: " + e), e = e.replace(rt, it).toLowerCase(), 
                    function(t) {
                        var n;
                        do if (n = h ? t.lang : t.getAttribute("xml:lang") || t.getAttribute("lang")) return n = n.toLowerCase(), 
                        n === e || 0 === n.indexOf(e + "-"); while ((t = t.parentNode) && 1 === t.nodeType);
                        return !1;
                    };
                }),
                target: function(t) {
                    var n = e.location && e.location.hash;
                    return n && n.slice(1) === t.id;
                },
                root: function(e) {
                    return e === d;
                },
                focus: function(e) {
                    return e === f.activeElement && (!f.hasFocus || f.hasFocus()) && !!(e.type || e.href || ~e.tabIndex);
                },
                enabled: function(e) {
                    return e.disabled === !1;
                },
                disabled: function(e) {
                    return e.disabled === !0;
                },
                checked: function(e) {
                    var t = e.nodeName.toLowerCase();
                    return "input" === t && !!e.checked || "option" === t && !!e.selected;
                },
                selected: function(e) {
                    return e.parentNode && e.parentNode.selectedIndex, e.selected === !0;
                },
                empty: function(e) {
                    for (e = e.firstChild; e; e = e.nextSibling) if (e.nodeName > "@" || 3 === e.nodeType || 4 === e.nodeType) return !1;
                    return !0;
                },
                parent: function(e) {
                    return !o.pseudos.empty(e);
                },
                header: function(e) {
                    return tt.test(e.nodeName);
                },
                input: function(e) {
                    return et.test(e.nodeName);
                },
                button: function(e) {
                    var t = e.nodeName.toLowerCase();
                    return "input" === t && "button" === e.type || "button" === t;
                },
                text: function(e) {
                    var t;
                    return "input" === e.nodeName.toLowerCase() && "text" === e.type && (null == (t = e.getAttribute("type")) || t.toLowerCase() === e.type);
                },
                first: ht(function() {
                    return [ 0 ];
                }),
                last: ht(function(e, t) {
                    return [ t - 1 ];
                }),
                eq: ht(function(e, t, n) {
                    return [ 0 > n ? n + t : n ];
                }),
                even: ht(function(e, t) {
                    var n = 0;
                    for (;t > n; n += 2) e.push(n);
                    return e;
                }),
                odd: ht(function(e, t) {
                    var n = 1;
                    for (;t > n; n += 2) e.push(n);
                    return e;
                }),
                lt: ht(function(e, t, n) {
                    var r = 0 > n ? n + t : n;
                    for (;--r >= 0; ) e.push(r);
                    return e;
                }),
                gt: ht(function(e, t, n) {
                    var r = 0 > n ? n + t : n;
                    for (;t > ++r; ) e.push(r);
                    return e;
                })
            }
        }, o.pseudos.nth = o.pseudos.eq;
        for (n in {
            radio: !0,
            checkbox: !0,
            file: !0,
            password: !0,
            image: !0
        }) o.pseudos[n] = ft(n);
        for (n in {
            submit: !0,
            reset: !0
        }) o.pseudos[n] = dt(n);
        function gt() {}
        gt.prototype = o.filters = o.pseudos, o.setFilters = new gt();
        function mt(e, t) {
            var n, r, i, a, s, l, u, c = k[e + " "];
            if (c) return t ? 0 : c.slice(0);
            s = e, l = [], u = o.preFilter;
            while (s) {
                (!n || (r = X.exec(s))) && (r && (s = s.slice(r[0].length) || s), l.push(i = [])), 
                n = !1, (r = U.exec(s)) && (n = r.shift(), i.push({
                    value: n,
                    type: r[0].replace(z, " ")
                }), s = s.slice(n.length));
                for (a in o.filter) !(r = Q[a].exec(s)) || u[a] && !(r = u[a](r)) || (n = r.shift(), 
                i.push({
                    value: n,
                    type: a,
                    matches: r
                }), s = s.slice(n.length));
                if (!n) break;
            }
            return t ? s.length : s ? at.error(e) : k(e, l).slice(0);
        }
        function yt(e) {
            var t = 0, n = e.length, r = "";
            for (;n > t; t++) r += e[t].value;
            return r;
        }
        function vt(e, t, n) {
            var r = t.dir, o = n && "parentNode" === r, a = C++;
            return t.first ? function(t, n, i) {
                while (t = t[r]) if (1 === t.nodeType || o) return e(t, n, i);
            } : function(t, n, s) {
                var l, u, c, p = T + " " + a;
                if (s) {
                    while (t = t[r]) if ((1 === t.nodeType || o) && e(t, n, s)) return !0;
                } else while (t = t[r]) if (1 === t.nodeType || o) if (c = t[b] || (t[b] = {}), 
                (u = c[r]) && u[0] === p) {
                    if ((l = u[1]) === !0 || l === i) return l === !0;
                } else if (u = c[r] = [ p ], u[1] = e(t, n, s) || i, u[1] === !0) return !0;
            };
        }
        function bt(e) {
            return e.length > 1 ? function(t, n, r) {
                var i = e.length;
                while (i--) if (!e[i](t, n, r)) return !1;
                return !0;
            } : e[0];
        }
        function xt(e, t, n, r, i) {
            var o, a = [], s = 0, l = e.length, u = null != t;
            for (;l > s; s++) (o = e[s]) && (!n || n(o, r, i)) && (a.push(o), u && t.push(s));
            return a;
        }
        function wt(e, t, n, r, i, o) {
            return r && !r[b] && (r = wt(r)), i && !i[b] && (i = wt(i, o)), lt(function(o, a, s, l) {
                var u, c, p, f = [], d = [], h = a.length, g = o || Nt(t || "*", s.nodeType ? [ s ] : s, []), m = !e || !o && t ? g : xt(g, f, e, s, l), y = n ? i || (o ? e : h || r) ? [] : a : m;
                if (n && n(m, y, s, l), r) {
                    u = xt(y, d), r(u, [], s, l), c = u.length;
                    while (c--) (p = u[c]) && (y[d[c]] = !(m[d[c]] = p));
                }
                if (o) {
                    if (i || e) {
                        if (i) {
                            u = [], c = y.length;
                            while (c--) (p = y[c]) && u.push(m[c] = p);
                            i(null, y = [], u, l);
                        }
                        c = y.length;
                        while (c--) (p = y[c]) && (u = i ? F.call(o, p) : f[c]) > -1 && (o[u] = !(a[u] = p));
                    }
                } else y = xt(y === a ? y.splice(h, y.length) : y), i ? i(null, a, y, l) : M.apply(a, y);
            });
        }
        function Tt(e) {
            var t, n, r, i = e.length, a = o.relative[e[0].type], s = a || o.relative[" "], l = a ? 1 : 0, c = vt(function(e) {
                return e === t;
            }, s, !0), p = vt(function(e) {
                return F.call(t, e) > -1;
            }, s, !0), f = [ function(e, n, r) {
                return !a && (r || n !== u) || ((t = n).nodeType ? c(e, n, r) : p(e, n, r));
            } ];
            for (;i > l; l++) if (n = o.relative[e[l].type]) f = [ vt(bt(f), n) ]; else {
                if (n = o.filter[e[l].type].apply(null, e[l].matches), n[b]) {
                    for (r = ++l; i > r; r++) if (o.relative[e[r].type]) break;
                    return wt(l > 1 && bt(f), l > 1 && yt(e.slice(0, l - 1).concat({
                        value: " " === e[l - 2].type ? "*" : ""
                    })).replace(z, "$1"), n, r > l && Tt(e.slice(l, r)), i > r && Tt(e = e.slice(r)), i > r && yt(e));
                }
                f.push(n);
            }
            return bt(f);
        }
        function Ct(e, t) {
            var n = 0, r = t.length > 0, a = e.length > 0, s = function(s, l, c, p, d) {
                var h, g, m, y = [], v = 0, b = "0", x = s && [], w = null != d, C = u, N = s || a && o.find.TAG("*", d && l.parentNode || l), k = T += null == C ? 1 : Math.random() || .1;
                for (w && (u = l !== f && l, i = n); null != (h = N[b]); b++) {
                    if (a && h) {
                        g = 0;
                        while (m = e[g++]) if (m(h, l, c)) {
                            p.push(h);
                            break;
                        }
                        w && (T = k, i = ++n);
                    }
                    r && ((h = !m && h) && v--, s && x.push(h));
                }
                if (v += b, r && b !== v) {
                    g = 0;
                    while (m = t[g++]) m(x, y, l, c);
                    if (s) {
                        if (v > 0) while (b--) x[b] || y[b] || (y[b] = q.call(p));
                        y = xt(y);
                    }
                    M.apply(p, y), w && !s && y.length > 0 && v + t.length > 1 && at.uniqueSort(p);
                }
                return w && (T = k, u = C), x;
            };
            return r ? lt(s) : s;
        }
        l = at.compile = function(e, t) {
            var n, r = [], i = [], o = E[e + " "];
            if (!o) {
                t || (t = mt(e)), n = t.length;
                while (n--) o = Tt(t[n]), o[b] ? r.push(o) : i.push(o);
                o = E(e, Ct(i, r));
            }
            return o;
        };
        function Nt(e, t, n) {
            var r = 0, i = t.length;
            for (;i > r; r++) at(e, t[r], n);
            return n;
        }
        function kt(e, t, n, i) {
            var a, s, u, c, p, f = mt(e);
            if (!i && 1 === f.length) {
                if (s = f[0] = f[0].slice(0), s.length > 2 && "ID" === (u = s[0]).type && r.getById && 9 === t.nodeType && h && o.relative[s[1].type]) {
                    if (t = (o.find.ID(u.matches[0].replace(rt, it), t) || [])[0], !t) return n;
                    e = e.slice(s.shift().value.length);
                }
                a = Q.needsContext.test(e) ? 0 : s.length;
                while (a--) {
                    if (u = s[a], o.relative[c = u.type]) break;
                    if ((p = o.find[c]) && (i = p(u.matches[0].replace(rt, it), V.test(s[0].type) && t.parentNode || t))) {
                        if (s.splice(a, 1), e = i.length && yt(s), !e) return M.apply(n, i), n;
                        break;
                    }
                }
            }
            return l(e, f)(i, t, !h, n, V.test(e)), n;
        }
        r.sortStable = b.split("").sort(A).join("") === b, r.detectDuplicates = S, p(), 
        r.sortDetached = ut(function(e) {
            return 1 & e.compareDocumentPosition(f.createElement("div"));
        }), ut(function(e) {
            return e.innerHTML = "<a href='#'></a>", "#" === e.firstChild.getAttribute("href");
        }) || ct("type|href|height|width", function(e, n, r) {
            return r ? t : e.getAttribute(n, "type" === n.toLowerCase() ? 1 : 2);
        }), r.attributes && ut(function(e) {
            return e.innerHTML = "<input/>", e.firstChild.setAttribute("value", ""), "" === e.firstChild.getAttribute("value");
        }) || ct("value", function(e, n, r) {
            return r || "input" !== e.nodeName.toLowerCase() ? t : e.defaultValue;
        }), ut(function(e) {
            return null == e.getAttribute("disabled");
        }) || ct(B, function(e, n, r) {
            var i;
            return r ? t : (i = e.getAttributeNode(n)) && i.specified ? i.value : e[n] === !0 ? n.toLowerCase() : null;
        }), x.find = at, x.expr = at.selectors, x.expr[":"] = x.expr.pseudos, x.unique = at.uniqueSort, 
        x.text = at.getText, x.isXMLDoc = at.isXML, x.contains = at.contains;
    }(e);
    var O = {};
    function F(e) {
        var t = O[e] = {};
        return x.each(e.match(T) || [], function(e, n) {
            t[n] = !0;
        }), t;
    }
    x.Callbacks = function(e) {
        e = "string" == typeof e ? O[e] || F(e) : x.extend({}, e);
        var n, r, i, o, a, s, l = [], u = !e.once && [], c = function(t) {
            for (r = e.memory && t, i = !0, a = s || 0, s = 0, o = l.length, n = !0; l && o > a; a++) if (l[a].apply(t[0], t[1]) === !1 && e.stopOnFalse) {
                r = !1;
                break;
            }
            n = !1, l && (u ? u.length && c(u.shift()) : r ? l = [] : p.disable());
        }, p = {
            add: function() {
                if (l) {
                    var t = l.length;
                    (function i(t) {
                        x.each(t, function(t, n) {
                            var r = x.type(n);
                            "function" === r ? e.unique && p.has(n) || l.push(n) : n && n.length && "string" !== r && i(n);
                        });
                    })(arguments), n ? o = l.length : r && (s = t, c(r));
                }
                return this;
            },
            remove: function() {
                return l && x.each(arguments, function(e, t) {
                    var r;
                    while ((r = x.inArray(t, l, r)) > -1) l.splice(r, 1), n && (o >= r && o--, a >= r && a--);
                }), this;
            },
            has: function(e) {
                return e ? x.inArray(e, l) > -1 : !(!l || !l.length);
            },
            empty: function() {
                return l = [], o = 0, this;
            },
            disable: function() {
                return l = u = r = t, this;
            },
            disabled: function() {
                return !l;
            },
            lock: function() {
                return u = t, r || p.disable(), this;
            },
            locked: function() {
                return !u;
            },
            fireWith: function(e, t) {
                return !l || i && !u || (t = t || [], t = [ e, t.slice ? t.slice() : t ], n ? u.push(t) : c(t)), 
                this;
            },
            fire: function() {
                return p.fireWith(this, arguments), this;
            },
            fired: function() {
                return !!i;
            }
        };
        return p;
    }, x.extend({
        Deferred: function(e) {
            var t = [ [ "resolve", "done", x.Callbacks("once memory"), "resolved" ], [ "reject", "fail", x.Callbacks("once memory"), "rejected" ], [ "notify", "progress", x.Callbacks("memory") ] ], n = "pending", r = {
                state: function() {
                    return n;
                },
                always: function() {
                    return i.done(arguments).fail(arguments), this;
                },
                then: function() {
                    var e = arguments;
                    return x.Deferred(function(n) {
                        x.each(t, function(t, o) {
                            var a = o[0], s = x.isFunction(e[t]) && e[t];
                            i[o[1]](function() {
                                var e = s && s.apply(this, arguments);
                                e && x.isFunction(e.promise) ? e.promise().done(n.resolve).fail(n.reject).progress(n.notify) : n[a + "With"](this === r ? n.promise() : this, s ? [ e ] : arguments);
                            });
                        }), e = null;
                    }).promise();
                },
                promise: function(e) {
                    return null != e ? x.extend(e, r) : r;
                }
            }, i = {};
            return r.pipe = r.then, x.each(t, function(e, o) {
                var a = o[2], s = o[3];
                r[o[1]] = a.add, s && a.add(function() {
                    n = s;
                }, t[1 ^ e][2].disable, t[2][2].lock), i[o[0]] = function() {
                    return i[o[0] + "With"](this === i ? r : this, arguments), this;
                }, i[o[0] + "With"] = a.fireWith;
            }), r.promise(i), e && e.call(i, i), i;
        },
        when: function(e) {
            var t = 0, n = g.call(arguments), r = n.length, i = 1 !== r || e && x.isFunction(e.promise) ? r : 0, o = 1 === i ? e : x.Deferred(), a = function(e, t, n) {
                return function(r) {
                    t[e] = this, n[e] = arguments.length > 1 ? g.call(arguments) : r, n === s ? o.notifyWith(t, n) : --i || o.resolveWith(t, n);
                };
            }, s, l, u;
            if (r > 1) for (s = Array(r), l = Array(r), u = Array(r); r > t; t++) n[t] && x.isFunction(n[t].promise) ? n[t].promise().done(a(t, u, n)).fail(o.reject).progress(a(t, l, s)) : --i;
            return i || o.resolveWith(u, n), o.promise();
        }
    }), x.support = function(t) {
        var n, r, o, s, l, u, c, p, f, d = a.createElement("div");
        if (d.setAttribute("className", "t"), d.innerHTML = "  <link/><table></table><a href='/a'>a</a><input type='checkbox'/>", 
        n = d.getElementsByTagName("*") || [], r = d.getElementsByTagName("a")[0], !r || !r.style || !n.length) return t;
        s = a.createElement("select"), u = s.appendChild(a.createElement("option")), o = d.getElementsByTagName("input")[0], 
        r.style.cssText = "top:1px;float:left;opacity:.5", t.getSetAttribute = "t" !== d.className, 
        t.leadingWhitespace = 3 === d.firstChild.nodeType, t.tbody = !d.getElementsByTagName("tbody").length, 
        t.htmlSerialize = !!d.getElementsByTagName("link").length, t.style = /top/.test(r.getAttribute("style")), 
        t.hrefNormalized = "/a" === r.getAttribute("href"), t.opacity = /^0.5/.test(r.style.opacity), 
        t.cssFloat = !!r.style.cssFloat, t.checkOn = !!o.value, t.optSelected = u.selected, 
        t.enctype = !!a.createElement("form").enctype, t.html5Clone = "<:nav></:nav>" !== a.createElement("nav").cloneNode(!0).outerHTML, 
        t.inlineBlockNeedsLayout = !1, t.shrinkWrapBlocks = !1, t.pixelPosition = !1, t.deleteExpando = !0, 
        t.noCloneEvent = !0, t.reliableMarginRight = !0, t.boxSizingReliable = !0, o.checked = !0, 
        t.noCloneChecked = o.cloneNode(!0).checked, s.disabled = !0, t.optDisabled = !u.disabled;
        try {
            delete d.test;
        } catch (h) {
            t.deleteExpando = !1;
        }
        o = a.createElement("input"), o.setAttribute("value", ""), t.input = "" === o.getAttribute("value"), 
        o.value = "t", o.setAttribute("type", "radio"), t.radioValue = "t" === o.value, 
        o.setAttribute("checked", "t"), o.setAttribute("name", "t"), l = a.createDocumentFragment(), 
        l.appendChild(o), t.appendChecked = o.checked, t.checkClone = l.cloneNode(!0).cloneNode(!0).lastChild.checked, 
        d.attachEvent && (d.attachEvent("onclick", function() {
            t.noCloneEvent = !1;
        }), d.cloneNode(!0).click());
        for (f in {
            submit: !0,
            change: !0,
            focusin: !0
        }) d.setAttribute(c = "on" + f, "t"), t[f + "Bubbles"] = c in e || d.attributes[c].expando === !1;
        d.style.backgroundClip = "content-box", d.cloneNode(!0).style.backgroundClip = "", 
        t.clearCloneStyle = "content-box" === d.style.backgroundClip;
        for (f in x(t)) break;
        return t.ownLast = "0" !== f, x(function() {
            var n, r, o, s = "padding:0;margin:0;border:0;display:block;box-sizing:content-box;-moz-box-sizing:content-box;-webkit-box-sizing:content-box;", l = a.getElementsByTagName("body")[0];
            l && (n = a.createElement("div"), n.style.cssText = "border:0;width:0;height:0;position:absolute;top:0;left:-9999px;margin-top:1px", 
            l.appendChild(n).appendChild(d), d.innerHTML = "<table><tr><td></td><td>t</td></tr></table>", 
            o = d.getElementsByTagName("td"), o[0].style.cssText = "padding:0;margin:0;border:0;display:none", 
            p = 0 === o[0].offsetHeight, o[0].style.display = "", o[1].style.display = "none", 
            t.reliableHiddenOffsets = p && 0 === o[0].offsetHeight, d.innerHTML = "", d.style.cssText = "box-sizing:border-box;-moz-box-sizing:border-box;-webkit-box-sizing:border-box;padding:1px;border:1px;display:block;width:4px;margin-top:1%;position:absolute;top:1%;", 
            x.swap(l, null != l.style.zoom ? {
                zoom: 1
            } : {}, function() {
                t.boxSizing = 4 === d.offsetWidth;
            }), e.getComputedStyle && (t.pixelPosition = "1%" !== (e.getComputedStyle(d, null) || {}).top, 
            t.boxSizingReliable = "4px" === (e.getComputedStyle(d, null) || {
                width: "4px"
            }).width, r = d.appendChild(a.createElement("div")), r.style.cssText = d.style.cssText = s, 
            r.style.marginRight = r.style.width = "0", d.style.width = "1px", t.reliableMarginRight = !parseFloat((e.getComputedStyle(r, null) || {}).marginRight)), 
            typeof d.style.zoom !== i && (d.innerHTML = "", d.style.cssText = s + "width:1px;padding:1px;display:inline;zoom:1", 
            t.inlineBlockNeedsLayout = 3 === d.offsetWidth, d.style.display = "block", d.innerHTML = "<div></div>", 
            d.firstChild.style.width = "5px", t.shrinkWrapBlocks = 3 !== d.offsetWidth, t.inlineBlockNeedsLayout && (l.style.zoom = 1)), 
            l.removeChild(n), n = d = o = r = null);
        }), n = s = l = u = r = o = null, t;
    }({});
    var B = /(?:\{[\s\S]*\}|\[[\s\S]*\])$/, P = /([A-Z])/g;
    function R(e, n, r, i) {
        if (x.acceptData(e)) {
            var o, a, s = x.expando, l = e.nodeType, u = l ? x.cache : e, c = l ? e[s] : e[s] && s;
            if (c && u[c] && (i || u[c].data) || r !== t || "string" != typeof n) return c || (c = l ? e[s] = p.pop() || x.guid++ : s), 
            u[c] || (u[c] = l ? {} : {
                toJSON: x.noop
            }), ("object" == typeof n || "function" == typeof n) && (i ? u[c] = x.extend(u[c], n) : u[c].data = x.extend(u[c].data, n)), 
            a = u[c], i || (a.data || (a.data = {}), a = a.data), r !== t && (a[x.camelCase(n)] = r), 
            "string" == typeof n ? (o = a[n], null == o && (o = a[x.camelCase(n)])) : o = a, 
            o;
        }
    }
    function W(e, t, n) {
        if (x.acceptData(e)) {
            var r, i, o = e.nodeType, a = o ? x.cache : e, s = o ? e[x.expando] : x.expando;
            if (a[s]) {
                if (t && (r = n ? a[s] : a[s].data)) {
                    x.isArray(t) ? t = t.concat(x.map(t, x.camelCase)) : t in r ? t = [ t ] : (t = x.camelCase(t), 
                    t = t in r ? [ t ] : t.split(" ")), i = t.length;
                    while (i--) delete r[t[i]];
                    if (n ? !I(r) : !x.isEmptyObject(r)) return;
                }
                (n || (delete a[s].data, I(a[s]))) && (o ? x.cleanData([ e ], !0) : x.support.deleteExpando || a != a.window ? delete a[s] : a[s] = null);
            }
        }
    }
    x.extend({
        cache: {},
        noData: {
            applet: !0,
            embed: !0,
            object: "clsid:D27CDB6E-AE6D-11cf-96B8-444553540000"
        },
        hasData: function(e) {
            return e = e.nodeType ? x.cache[e[x.expando]] : e[x.expando], !!e && !I(e);
        },
        data: function(e, t, n) {
            return R(e, t, n);
        },
        removeData: function(e, t) {
            return W(e, t);
        },
        _data: function(e, t, n) {
            return R(e, t, n, !0);
        },
        _removeData: function(e, t) {
            return W(e, t, !0);
        },
        acceptData: function(e) {
            if (e.nodeType && 1 !== e.nodeType && 9 !== e.nodeType) return !1;
            var t = e.nodeName && x.noData[e.nodeName.toLowerCase()];
            return !t || t !== !0 && e.getAttribute("classid") === t;
        }
    }), x.fn.extend({
        data: function(e, n) {
            var r, i, o = null, a = 0, s = this[0];
            if (e === t) {
                if (this.length && (o = x.data(s), 1 === s.nodeType && !x._data(s, "parsedAttrs"))) {
                    for (r = s.attributes; r.length > a; a++) i = r[a].name, 0 === i.indexOf("data-") && (i = x.camelCase(i.slice(5)), 
                    $(s, i, o[i]));
                    x._data(s, "parsedAttrs", !0);
                }
                return o;
            }
            return "object" == typeof e ? this.each(function() {
                x.data(this, e);
            }) : arguments.length > 1 ? this.each(function() {
                x.data(this, e, n);
            }) : s ? $(s, e, x.data(s, e)) : null;
        },
        removeData: function(e) {
            return this.each(function() {
                x.removeData(this, e);
            });
        }
    });
    function $(e, n, r) {
        if (r === t && 1 === e.nodeType) {
            var i = "data-" + n.replace(P, "-$1").toLowerCase();
            if (r = e.getAttribute(i), "string" == typeof r) {
                try {
                    r = "true" === r ? !0 : "false" === r ? !1 : "null" === r ? null : +r + "" === r ? +r : B.test(r) ? x.parseJSON(r) : r;
                } catch (o) {}
                x.data(e, n, r);
            } else r = t;
        }
        return r;
    }
    function I(e) {
        var t;
        for (t in e) if (("data" !== t || !x.isEmptyObject(e[t])) && "toJSON" !== t) return !1;
        return !0;
    }
    x.extend({
        queue: function(e, n, r) {
            var i;
            return e ? (n = (n || "fx") + "queue", i = x._data(e, n), r && (!i || x.isArray(r) ? i = x._data(e, n, x.makeArray(r)) : i.push(r)), 
            i || []) : t;
        },
        dequeue: function(e, t) {
            t = t || "fx";
            var n = x.queue(e, t), r = n.length, i = n.shift(), o = x._queueHooks(e, t), a = function() {
                x.dequeue(e, t);
            };
            "inprogress" === i && (i = n.shift(), r--), i && ("fx" === t && n.unshift("inprogress"), 
            delete o.stop, i.call(e, a, o)), !r && o && o.empty.fire();
        },
        _queueHooks: function(e, t) {
            var n = t + "queueHooks";
            return x._data(e, n) || x._data(e, n, {
                empty: x.Callbacks("once memory").add(function() {
                    x._removeData(e, t + "queue"), x._removeData(e, n);
                })
            });
        }
    }), x.fn.extend({
        queue: function(e, n) {
            var r = 2;
            return "string" != typeof e && (n = e, e = "fx", r--), r > arguments.length ? x.queue(this[0], e) : n === t ? this : this.each(function() {
                var t = x.queue(this, e, n);
                x._queueHooks(this, e), "fx" === e && "inprogress" !== t[0] && x.dequeue(this, e);
            });
        },
        dequeue: function(e) {
            return this.each(function() {
                x.dequeue(this, e);
            });
        },
        delay: function(e, t) {
            return e = x.fx ? x.fx.speeds[e] || e : e, t = t || "fx", this.queue(t, function(t, n) {
                var r = setTimeout(t, e);
                n.stop = function() {
                    clearTimeout(r);
                };
            });
        },
        clearQueue: function(e) {
            return this.queue(e || "fx", []);
        },
        promise: function(e, n) {
            var r, i = 1, o = x.Deferred(), a = this, s = this.length, l = function() {
                --i || o.resolveWith(a, [ a ]);
            };
            "string" != typeof e && (n = e, e = t), e = e || "fx";
            while (s--) r = x._data(a[s], e + "queueHooks"), r && r.empty && (i++, r.empty.add(l));
            return l(), o.promise(n);
        }
    });
    var z, X, U = /[\t\r\n\f]/g, V = /\r/g, Y = /^(?:input|select|textarea|button|object)$/i, J = /^(?:a|area)$/i, G = /^(?:checked|selected)$/i, Q = x.support.getSetAttribute, K = x.support.input;
    x.fn.extend({
        attr: function(e, t) {
            return x.access(this, x.attr, e, t, arguments.length > 1);
        },
        removeAttr: function(e) {
            return this.each(function() {
                x.removeAttr(this, e);
            });
        },
        prop: function(e, t) {
            return x.access(this, x.prop, e, t, arguments.length > 1);
        },
        removeProp: function(e) {
            return e = x.propFix[e] || e, this.each(function() {
                try {
                    this[e] = t, delete this[e];
                } catch (n) {}
            });
        },
        addClass: function(e) {
            var t, n, r, i, o, a = 0, s = this.length, l = "string" == typeof e && e;
            if (x.isFunction(e)) return this.each(function(t) {
                x(this).addClass(e.call(this, t, this.className));
            });
            if (l) for (t = (e || "").match(T) || []; s > a; a++) if (n = this[a], r = 1 === n.nodeType && (n.className ? (" " + n.className + " ").replace(U, " ") : " ")) {
                o = 0;
                while (i = t[o++]) 0 > r.indexOf(" " + i + " ") && (r += i + " ");
                n.className = x.trim(r);
            }
            return this;
        },
        removeClass: function(e) {
            var t, n, r, i, o, a = 0, s = this.length, l = 0 === arguments.length || "string" == typeof e && e;
            if (x.isFunction(e)) return this.each(function(t) {
                x(this).removeClass(e.call(this, t, this.className));
            });
            if (l) for (t = (e || "").match(T) || []; s > a; a++) if (n = this[a], r = 1 === n.nodeType && (n.className ? (" " + n.className + " ").replace(U, " ") : "")) {
                o = 0;
                while (i = t[o++]) while (r.indexOf(" " + i + " ") >= 0) r = r.replace(" " + i + " ", " ");
                n.className = e ? x.trim(r) : "";
            }
            return this;
        },
        toggleClass: function(e, t) {
            var n = typeof e;
            return "boolean" == typeof t && "string" === n ? t ? this.addClass(e) : this.removeClass(e) : x.isFunction(e) ? this.each(function(n) {
                x(this).toggleClass(e.call(this, n, this.className, t), t);
            }) : this.each(function() {
                if ("string" === n) {
                    var t, r = 0, o = x(this), a = e.match(T) || [];
                    while (t = a[r++]) o.hasClass(t) ? o.removeClass(t) : o.addClass(t);
                } else (n === i || "boolean" === n) && (this.className && x._data(this, "__className__", this.className), 
                this.className = this.className || e === !1 ? "" : x._data(this, "__className__") || "");
            });
        },
        hasClass: function(e) {
            var t = " " + e + " ", n = 0, r = this.length;
            for (;r > n; n++) if (1 === this[n].nodeType && (" " + this[n].className + " ").replace(U, " ").indexOf(t) >= 0) return !0;
            return !1;
        },
        val: function(e) {
            var n, r, i, o = this[0];
            {
                if (arguments.length) return i = x.isFunction(e), this.each(function(n) {
                    var o;
                    1 === this.nodeType && (o = i ? e.call(this, n, x(this).val()) : e, null == o ? o = "" : "number" == typeof o ? o += "" : x.isArray(o) && (o = x.map(o, function(e) {
                        return null == e ? "" : e + "";
                    })), r = x.valHooks[this.type] || x.valHooks[this.nodeName.toLowerCase()], r && "set" in r && r.set(this, o, "value") !== t || (this.value = o));
                });
                if (o) return r = x.valHooks[o.type] || x.valHooks[o.nodeName.toLowerCase()], r && "get" in r && (n = r.get(o, "value")) !== t ? n : (n = o.value, 
                "string" == typeof n ? n.replace(V, "") : null == n ? "" : n);
            }
        }
    }), x.extend({
        valHooks: {
            option: {
                get: function(e) {
                    var t = x.find.attr(e, "value");
                    return null != t ? t : e.text;
                }
            },
            select: {
                get: function(e) {
                    var t, n, r = e.options, i = e.selectedIndex, o = "select-one" === e.type || 0 > i, a = o ? null : [], s = o ? i + 1 : r.length, l = 0 > i ? s : o ? i : 0;
                    for (;s > l; l++) if (n = r[l], !(!n.selected && l !== i || (x.support.optDisabled ? n.disabled : null !== n.getAttribute("disabled")) || n.parentNode.disabled && x.nodeName(n.parentNode, "optgroup"))) {
                        if (t = x(n).val(), o) return t;
                        a.push(t);
                    }
                    return a;
                },
                set: function(e, t) {
                    var n, r, i = e.options, o = x.makeArray(t), a = i.length;
                    while (a--) r = i[a], (r.selected = x.inArray(x(r).val(), o) >= 0) && (n = !0);
                    return n || (e.selectedIndex = -1), o;
                }
            }
        },
        attr: function(e, n, r) {
            var o, a, s = e.nodeType;
            if (e && 3 !== s && 8 !== s && 2 !== s) return typeof e.getAttribute === i ? x.prop(e, n, r) : (1 === s && x.isXMLDoc(e) || (n = n.toLowerCase(), 
            o = x.attrHooks[n] || (x.expr.match.bool.test(n) ? X : z)), r === t ? o && "get" in o && null !== (a = o.get(e, n)) ? a : (a = x.find.attr(e, n), 
            null == a ? t : a) : null !== r ? o && "set" in o && (a = o.set(e, r, n)) !== t ? a : (e.setAttribute(n, r + ""), 
            r) : (x.removeAttr(e, n), t));
        },
        removeAttr: function(e, t) {
            var n, r, i = 0, o = t && t.match(T);
            if (o && 1 === e.nodeType) while (n = o[i++]) r = x.propFix[n] || n, x.expr.match.bool.test(n) ? K && Q || !G.test(n) ? e[r] = !1 : e[x.camelCase("default-" + n)] = e[r] = !1 : x.attr(e, n, ""), 
            e.removeAttribute(Q ? n : r);
        },
        attrHooks: {
            type: {
                set: function(e, t) {
                    if (!x.support.radioValue && "radio" === t && x.nodeName(e, "input")) {
                        var n = e.value;
                        return e.setAttribute("type", t), n && (e.value = n), t;
                    }
                }
            }
        },
        propFix: {
            "for": "htmlFor",
            "class": "className"
        },
        prop: function(e, n, r) {
            var i, o, a, s = e.nodeType;
            if (e && 3 !== s && 8 !== s && 2 !== s) return a = 1 !== s || !x.isXMLDoc(e), a && (n = x.propFix[n] || n, 
            o = x.propHooks[n]), r !== t ? o && "set" in o && (i = o.set(e, r, n)) !== t ? i : e[n] = r : o && "get" in o && null !== (i = o.get(e, n)) ? i : e[n];
        },
        propHooks: {
            tabIndex: {
                get: function(e) {
                    var t = x.find.attr(e, "tabindex");
                    return t ? parseInt(t, 10) : Y.test(e.nodeName) || J.test(e.nodeName) && e.href ? 0 : -1;
                }
            }
        }
    }), X = {
        set: function(e, t, n) {
            return t === !1 ? x.removeAttr(e, n) : K && Q || !G.test(n) ? e.setAttribute(!Q && x.propFix[n] || n, n) : e[x.camelCase("default-" + n)] = e[n] = !0, 
            n;
        }
    }, x.each(x.expr.match.bool.source.match(/\w+/g), function(e, n) {
        var r = x.expr.attrHandle[n] || x.find.attr;
        x.expr.attrHandle[n] = K && Q || !G.test(n) ? function(e, n, i) {
            var o = x.expr.attrHandle[n], a = i ? t : (x.expr.attrHandle[n] = t) != r(e, n, i) ? n.toLowerCase() : null;
            return x.expr.attrHandle[n] = o, a;
        } : function(e, n, r) {
            return r ? t : e[x.camelCase("default-" + n)] ? n.toLowerCase() : null;
        };
    }), K && Q || (x.attrHooks.value = {
        set: function(e, n, r) {
            return x.nodeName(e, "input") ? (e.defaultValue = n, t) : z && z.set(e, n, r);
        }
    }), Q || (z = {
        set: function(e, n, r) {
            var i = e.getAttributeNode(r);
            return i || e.setAttributeNode(i = e.ownerDocument.createAttribute(r)), i.value = n += "", 
            "value" === r || n === e.getAttribute(r) ? n : t;
        }
    }, x.expr.attrHandle.id = x.expr.attrHandle.name = x.expr.attrHandle.coords = function(e, n, r) {
        var i;
        return r ? t : (i = e.getAttributeNode(n)) && "" !== i.value ? i.value : null;
    }, x.valHooks.button = {
        get: function(e, n) {
            var r = e.getAttributeNode(n);
            return r && r.specified ? r.value : t;
        },
        set: z.set
    }, x.attrHooks.contenteditable = {
        set: function(e, t, n) {
            z.set(e, "" === t ? !1 : t, n);
        }
    }, x.each([ "width", "height" ], function(e, n) {
        x.attrHooks[n] = {
            set: function(e, r) {
                return "" === r ? (e.setAttribute(n, "auto"), r) : t;
            }
        };
    })), x.support.hrefNormalized || x.each([ "href", "src" ], function(e, t) {
        x.propHooks[t] = {
            get: function(e) {
                return e.getAttribute(t, 4);
            }
        };
    }), x.support.style || (x.attrHooks.style = {
        get: function(e) {
            return e.style.cssText || t;
        },
        set: function(e, t) {
            return e.style.cssText = t + "";
        }
    }), x.support.optSelected || (x.propHooks.selected = {
        get: function(e) {
            var t = e.parentNode;
            return t && (t.selectedIndex, t.parentNode && t.parentNode.selectedIndex), null;
        }
    }), x.each([ "tabIndex", "readOnly", "maxLength", "cellSpacing", "cellPadding", "rowSpan", "colSpan", "useMap", "frameBorder", "contentEditable" ], function() {
        x.propFix[this.toLowerCase()] = this;
    }), x.support.enctype || (x.propFix.enctype = "encoding"), x.each([ "radio", "checkbox" ], function() {
        x.valHooks[this] = {
            set: function(e, n) {
                return x.isArray(n) ? e.checked = x.inArray(x(e).val(), n) >= 0 : t;
            }
        }, x.support.checkOn || (x.valHooks[this].get = function(e) {
            return null === e.getAttribute("value") ? "on" : e.value;
        });
    });
    var Z = /^(?:input|select|textarea)$/i, et = /^key/, tt = /^(?:mouse|contextmenu)|click/, nt = /^(?:focusinfocus|focusoutblur)$/, rt = /^([^.]*)(?:\.(.+)|)$/;
    function it() {
        return !0;
    }
    function ot() {
        return !1;
    }
    function at() {
        try {
            return a.activeElement;
        } catch (e) {}
    }
    x.event = {
        global: {},
        add: function(e, n, r, o, a) {
            var s, l, u, c, p, f, d, h, g, m, y, v = x._data(e);
            if (v) {
                r.handler && (c = r, r = c.handler, a = c.selector), r.guid || (r.guid = x.guid++), 
                (l = v.events) || (l = v.events = {}), (f = v.handle) || (f = v.handle = function(e) {
                    return typeof x === i || e && x.event.triggered === e.type ? t : x.event.dispatch.apply(f.elem, arguments);
                }, f.elem = e), n = (n || "").match(T) || [ "" ], u = n.length;
                while (u--) s = rt.exec(n[u]) || [], g = y = s[1], m = (s[2] || "").split(".").sort(), 
                g && (p = x.event.special[g] || {}, g = (a ? p.delegateType : p.bindType) || g, 
                p = x.event.special[g] || {}, d = x.extend({
                    type: g,
                    origType: y,
                    data: o,
                    handler: r,
                    guid: r.guid,
                    selector: a,
                    needsContext: a && x.expr.match.needsContext.test(a),
                    namespace: m.join(".")
                }, c), (h = l[g]) || (h = l[g] = [], h.delegateCount = 0, p.setup && p.setup.call(e, o, m, f) !== !1 || (e.addEventListener ? e.addEventListener(g, f, !1) : e.attachEvent && e.attachEvent("on" + g, f))), 
                p.add && (p.add.call(e, d), d.handler.guid || (d.handler.guid = r.guid)), a ? h.splice(h.delegateCount++, 0, d) : h.push(d), 
                x.event.global[g] = !0);
                e = null;
            }
        },
        remove: function(e, t, n, r, i) {
            var o, a, s, l, u, c, p, f, d, h, g, m = x.hasData(e) && x._data(e);
            if (m && (c = m.events)) {
                t = (t || "").match(T) || [ "" ], u = t.length;
                while (u--) if (s = rt.exec(t[u]) || [], d = g = s[1], h = (s[2] || "").split(".").sort(), 
                d) {
                    p = x.event.special[d] || {}, d = (r ? p.delegateType : p.bindType) || d, f = c[d] || [], 
                    s = s[2] && RegExp("(^|\\.)" + h.join("\\.(?:.*\\.|)") + "(\\.|$)"), l = o = f.length;
                    while (o--) a = f[o], !i && g !== a.origType || n && n.guid !== a.guid || s && !s.test(a.namespace) || r && r !== a.selector && ("**" !== r || !a.selector) || (f.splice(o, 1), 
                    a.selector && f.delegateCount--, p.remove && p.remove.call(e, a));
                    l && !f.length && (p.teardown && p.teardown.call(e, h, m.handle) !== !1 || x.removeEvent(e, d, m.handle), 
                    delete c[d]);
                } else for (d in c) x.event.remove(e, d + t[u], n, r, !0);
                x.isEmptyObject(c) && (delete m.handle, x._removeData(e, "events"));
            }
        },
        trigger: function(n, r, i, o) {
            var s, l, u, c, p, f, d, h = [ i || a ], g = v.call(n, "type") ? n.type : n, m = v.call(n, "namespace") ? n.namespace.split(".") : [];
            if (u = f = i = i || a, 3 !== i.nodeType && 8 !== i.nodeType && !nt.test(g + x.event.triggered) && (g.indexOf(".") >= 0 && (m = g.split("."), 
            g = m.shift(), m.sort()), l = 0 > g.indexOf(":") && "on" + g, n = n[x.expando] ? n : new x.Event(g, "object" == typeof n && n), 
            n.isTrigger = o ? 2 : 3, n.namespace = m.join("."), n.namespace_re = n.namespace ? RegExp("(^|\\.)" + m.join("\\.(?:.*\\.|)") + "(\\.|$)") : null, 
            n.result = t, n.target || (n.target = i), r = null == r ? [ n ] : x.makeArray(r, [ n ]), 
            p = x.event.special[g] || {}, o || !p.trigger || p.trigger.apply(i, r) !== !1)) {
                if (!o && !p.noBubble && !x.isWindow(i)) {
                    for (c = p.delegateType || g, nt.test(c + g) || (u = u.parentNode); u; u = u.parentNode) h.push(u), 
                    f = u;
                    f === (i.ownerDocument || a) && h.push(f.defaultView || f.parentWindow || e);
                }
                d = 0;
                while ((u = h[d++]) && !n.isPropagationStopped()) n.type = d > 1 ? c : p.bindType || g, 
                s = (x._data(u, "events") || {})[n.type] && x._data(u, "handle"), s && s.apply(u, r), 
                s = l && u[l], s && x.acceptData(u) && s.apply && s.apply(u, r) === !1 && n.preventDefault();
                if (n.type = g, !o && !n.isDefaultPrevented() && (!p._default || p._default.apply(h.pop(), r) === !1) && x.acceptData(i) && l && i[g] && !x.isWindow(i)) {
                    f = i[l], f && (i[l] = null), x.event.triggered = g;
                    try {
                        i[g]();
                    } catch (y) {}
                    x.event.triggered = t, f && (i[l] = f);
                }
                return n.result;
            }
        },
        dispatch: function(e) {
            e = x.event.fix(e);
            var n, r, i, o, a, s = [], l = g.call(arguments), u = (x._data(this, "events") || {})[e.type] || [], c = x.event.special[e.type] || {};
            if (l[0] = e, e.delegateTarget = this, !c.preDispatch || c.preDispatch.call(this, e) !== !1) {
                s = x.event.handlers.call(this, e, u), n = 0;
                while ((o = s[n++]) && !e.isPropagationStopped()) {
                    e.currentTarget = o.elem, a = 0;
                    while ((i = o.handlers[a++]) && !e.isImmediatePropagationStopped()) (!e.namespace_re || e.namespace_re.test(i.namespace)) && (e.handleObj = i, 
                    e.data = i.data, r = ((x.event.special[i.origType] || {}).handle || i.handler).apply(o.elem, l), 
                    r !== t && (e.result = r) === !1 && (e.preventDefault(), e.stopPropagation()));
                }
                return c.postDispatch && c.postDispatch.call(this, e), e.result;
            }
        },
        handlers: function(e, n) {
            var r, i, o, a, s = [], l = n.delegateCount, u = e.target;
            if (l && u.nodeType && (!e.button || "click" !== e.type)) for (;u != this; u = u.parentNode || this) if (1 === u.nodeType && (u.disabled !== !0 || "click" !== e.type)) {
                for (o = [], a = 0; l > a; a++) i = n[a], r = i.selector + " ", o[r] === t && (o[r] = i.needsContext ? x(r, this).index(u) >= 0 : x.find(r, this, null, [ u ]).length), 
                o[r] && o.push(i);
                o.length && s.push({
                    elem: u,
                    handlers: o
                });
            }
            return n.length > l && s.push({
                elem: this,
                handlers: n.slice(l)
            }), s;
        },
        fix: function(e) {
            if (e[x.expando]) return e;
            var t, n, r, i = e.type, o = e, s = this.fixHooks[i];
            s || (this.fixHooks[i] = s = tt.test(i) ? this.mouseHooks : et.test(i) ? this.keyHooks : {}), 
            r = s.props ? this.props.concat(s.props) : this.props, e = new x.Event(o), t = r.length;
            while (t--) n = r[t], e[n] = o[n];
            return e.target || (e.target = o.srcElement || a), 3 === e.target.nodeType && (e.target = e.target.parentNode), 
            e.metaKey = !!e.metaKey, s.filter ? s.filter(e, o) : e;
        },
        props: "altKey bubbles cancelable ctrlKey currentTarget eventPhase metaKey relatedTarget shiftKey target timeStamp view which".split(" "),
        fixHooks: {},
        keyHooks: {
            props: "char charCode key keyCode".split(" "),
            filter: function(e, t) {
                return null == e.which && (e.which = null != t.charCode ? t.charCode : t.keyCode), 
                e;
            }
        },
        mouseHooks: {
            props: "button buttons clientX clientY fromElement offsetX offsetY pageX pageY screenX screenY toElement".split(" "),
            filter: function(e, n) {
                var r, i, o, s = n.button, l = n.fromElement;
                return null == e.pageX && null != n.clientX && (i = e.target.ownerDocument || a, 
                o = i.documentElement, r = i.body, e.pageX = n.clientX + (o && o.scrollLeft || r && r.scrollLeft || 0) - (o && o.clientLeft || r && r.clientLeft || 0), 
                e.pageY = n.clientY + (o && o.scrollTop || r && r.scrollTop || 0) - (o && o.clientTop || r && r.clientTop || 0)), 
                !e.relatedTarget && l && (e.relatedTarget = l === e.target ? n.toElement : l), e.which || s === t || (e.which = 1 & s ? 1 : 2 & s ? 3 : 4 & s ? 2 : 0), 
                e;
            }
        },
        special: {
            load: {
                noBubble: !0
            },
            focus: {
                trigger: function() {
                    if (this !== at() && this.focus) try {
                        return this.focus(), !1;
                    } catch (e) {}
                },
                delegateType: "focusin"
            },
            blur: {
                trigger: function() {
                    return this === at() && this.blur ? (this.blur(), !1) : t;
                },
                delegateType: "focusout"
            },
            click: {
                trigger: function() {
                    return x.nodeName(this, "input") && "checkbox" === this.type && this.click ? (this.click(), 
                    !1) : t;
                },
                _default: function(e) {
                    return x.nodeName(e.target, "a");
                }
            },
            beforeunload: {
                postDispatch: function(e) {
                    e.result !== t && (e.originalEvent.returnValue = e.result);
                }
            }
        },
        simulate: function(e, t, n, r) {
            var i = x.extend(new x.Event(), n, {
                type: e,
                isSimulated: !0,
                originalEvent: {}
            });
            r ? x.event.trigger(i, null, t) : x.event.dispatch.call(t, i), i.isDefaultPrevented() && n.preventDefault();
        }
    }, x.removeEvent = a.removeEventListener ? function(e, t, n) {
        e.removeEventListener && e.removeEventListener(t, n, !1);
    } : function(e, t, n) {
        var r = "on" + t;
        e.detachEvent && (typeof e[r] === i && (e[r] = null), e.detachEvent(r, n));
    }, x.Event = function(e, n) {
        return this instanceof x.Event ? (e && e.type ? (this.originalEvent = e, this.type = e.type, 
        this.isDefaultPrevented = e.defaultPrevented || e.returnValue === !1 || e.getPreventDefault && e.getPreventDefault() ? it : ot) : this.type = e, 
        n && x.extend(this, n), this.timeStamp = e && e.timeStamp || x.now(), this[x.expando] = !0, 
        t) : new x.Event(e, n);
    }, x.Event.prototype = {
        isDefaultPrevented: ot,
        isPropagationStopped: ot,
        isImmediatePropagationStopped: ot,
        preventDefault: function() {
            var e = this.originalEvent;
            this.isDefaultPrevented = it, e && (e.preventDefault ? e.preventDefault() : e.returnValue = !1);
        },
        stopPropagation: function() {
            var e = this.originalEvent;
            this.isPropagationStopped = it, e && (e.stopPropagation && e.stopPropagation(), 
            e.cancelBubble = !0);
        },
        stopImmediatePropagation: function() {
            this.isImmediatePropagationStopped = it, this.stopPropagation();
        }
    }, x.each({
        mouseenter: "mouseover",
        mouseleave: "mouseout"
    }, function(e, t) {
        x.event.special[e] = {
            delegateType: t,
            bindType: t,
            handle: function(e) {
                var n, r = this, i = e.relatedTarget, o = e.handleObj;
                return (!i || i !== r && !x.contains(r, i)) && (e.type = o.origType, n = o.handler.apply(this, arguments), 
                e.type = t), n;
            }
        };
    }), x.support.submitBubbles || (x.event.special.submit = {
        setup: function() {
            return x.nodeName(this, "form") ? !1 : (x.event.add(this, "click._submit keypress._submit", function(e) {
                var n = e.target, r = x.nodeName(n, "input") || x.nodeName(n, "button") ? n.form : t;
                r && !x._data(r, "submitBubbles") && (x.event.add(r, "submit._submit", function(e) {
                    e._submit_bubble = !0;
                }), x._data(r, "submitBubbles", !0));
            }), t);
        },
        postDispatch: function(e) {
            e._submit_bubble && (delete e._submit_bubble, this.parentNode && !e.isTrigger && x.event.simulate("submit", this.parentNode, e, !0));
        },
        teardown: function() {
            return x.nodeName(this, "form") ? !1 : (x.event.remove(this, "._submit"), t);
        }
    }), x.support.changeBubbles || (x.event.special.change = {
        setup: function() {
            return Z.test(this.nodeName) ? (("checkbox" === this.type || "radio" === this.type) && (x.event.add(this, "propertychange._change", function(e) {
                "checked" === e.originalEvent.propertyName && (this._just_changed = !0);
            }), x.event.add(this, "click._change", function(e) {
                this._just_changed && !e.isTrigger && (this._just_changed = !1), x.event.simulate("change", this, e, !0);
            })), !1) : (x.event.add(this, "beforeactivate._change", function(e) {
                var t = e.target;
                Z.test(t.nodeName) && !x._data(t, "changeBubbles") && (x.event.add(t, "change._change", function(e) {
                    !this.parentNode || e.isSimulated || e.isTrigger || x.event.simulate("change", this.parentNode, e, !0);
                }), x._data(t, "changeBubbles", !0));
            }), t);
        },
        handle: function(e) {
            var n = e.target;
            return this !== n || e.isSimulated || e.isTrigger || "radio" !== n.type && "checkbox" !== n.type ? e.handleObj.handler.apply(this, arguments) : t;
        },
        teardown: function() {
            return x.event.remove(this, "._change"), !Z.test(this.nodeName);
        }
    }), x.support.focusinBubbles || x.each({
        focus: "focusin",
        blur: "focusout"
    }, function(e, t) {
        var n = 0, r = function(e) {
            x.event.simulate(t, e.target, x.event.fix(e), !0);
        };
        x.event.special[t] = {
            setup: function() {
                0 === n++ && a.addEventListener(e, r, !0);
            },
            teardown: function() {
                0 === --n && a.removeEventListener(e, r, !0);
            }
        };
    }), x.fn.extend({
        on: function(e, n, r, i, o) {
            var a, s;
            if ("object" == typeof e) {
                "string" != typeof n && (r = r || n, n = t);
                for (a in e) this.on(a, n, r, e[a], o);
                return this;
            }
            if (null == r && null == i ? (i = n, r = n = t) : null == i && ("string" == typeof n ? (i = r, 
            r = t) : (i = r, r = n, n = t)), i === !1) i = ot; else if (!i) return this;
            return 1 === o && (s = i, i = function(e) {
                return x().off(e), s.apply(this, arguments);
            }, i.guid = s.guid || (s.guid = x.guid++)), this.each(function() {
                x.event.add(this, e, i, r, n);
            });
        },
        one: function(e, t, n, r) {
            return this.on(e, t, n, r, 1);
        },
        off: function(e, n, r) {
            var i, o;
            if (e && e.preventDefault && e.handleObj) return i = e.handleObj, x(e.delegateTarget).off(i.namespace ? i.origType + "." + i.namespace : i.origType, i.selector, i.handler), 
            this;
            if ("object" == typeof e) {
                for (o in e) this.off(o, n, e[o]);
                return this;
            }
            return (n === !1 || "function" == typeof n) && (r = n, n = t), r === !1 && (r = ot), 
            this.each(function() {
                x.event.remove(this, e, r, n);
            });
        },
        trigger: function(e, t) {
            return this.each(function() {
                x.event.trigger(e, t, this);
            });
        },
        triggerHandler: function(e, n) {
            var r = this[0];
            return r ? x.event.trigger(e, n, r, !0) : t;
        }
    });
    var st = /^.[^:#\[\.,]*$/, lt = /^(?:parents|prev(?:Until|All))/, ut = x.expr.match.needsContext, ct = {
        children: !0,
        contents: !0,
        next: !0,
        prev: !0
    };
    x.fn.extend({
        find: function(e) {
            var t, n = [], r = this, i = r.length;
            if ("string" != typeof e) return this.pushStack(x(e).filter(function() {
                for (t = 0; i > t; t++) if (x.contains(r[t], this)) return !0;
            }));
            for (t = 0; i > t; t++) x.find(e, r[t], n);
            return n = this.pushStack(i > 1 ? x.unique(n) : n), n.selector = this.selector ? this.selector + " " + e : e, 
            n;
        },
        has: function(e) {
            var t, n = x(e, this), r = n.length;
            return this.filter(function() {
                for (t = 0; r > t; t++) if (x.contains(this, n[t])) return !0;
            });
        },
        not: function(e) {
            return this.pushStack(ft(this, e || [], !0));
        },
        filter: function(e) {
            return this.pushStack(ft(this, e || [], !1));
        },
        is: function(e) {
            return !!ft(this, "string" == typeof e && ut.test(e) ? x(e) : e || [], !1).length;
        },
        closest: function(e, t) {
            var n, r = 0, i = this.length, o = [], a = ut.test(e) || "string" != typeof e ? x(e, t || this.context) : 0;
            for (;i > r; r++) for (n = this[r]; n && n !== t; n = n.parentNode) if (11 > n.nodeType && (a ? a.index(n) > -1 : 1 === n.nodeType && x.find.matchesSelector(n, e))) {
                n = o.push(n);
                break;
            }
            return this.pushStack(o.length > 1 ? x.unique(o) : o);
        },
        index: function(e) {
            return e ? "string" == typeof e ? x.inArray(this[0], x(e)) : x.inArray(e.jquery ? e[0] : e, this) : this[0] && this[0].parentNode ? this.first().prevAll().length : -1;
        },
        add: function(e, t) {
            var n = "string" == typeof e ? x(e, t) : x.makeArray(e && e.nodeType ? [ e ] : e), r = x.merge(this.get(), n);
            return this.pushStack(x.unique(r));
        },
        addBack: function(e) {
            return this.add(null == e ? this.prevObject : this.prevObject.filter(e));
        }
    });
    function pt(e, t) {
        do e = e[t]; while (e && 1 !== e.nodeType);
        return e;
    }
    x.each({
        parent: function(e) {
            var t = e.parentNode;
            return t && 11 !== t.nodeType ? t : null;
        },
        parents: function(e) {
            return x.dir(e, "parentNode");
        },
        parentsUntil: function(e, t, n) {
            return x.dir(e, "parentNode", n);
        },
        next: function(e) {
            return pt(e, "nextSibling");
        },
        prev: function(e) {
            return pt(e, "previousSibling");
        },
        nextAll: function(e) {
            return x.dir(e, "nextSibling");
        },
        prevAll: function(e) {
            return x.dir(e, "previousSibling");
        },
        nextUntil: function(e, t, n) {
            return x.dir(e, "nextSibling", n);
        },
        prevUntil: function(e, t, n) {
            return x.dir(e, "previousSibling", n);
        },
        siblings: function(e) {
            return x.sibling((e.parentNode || {}).firstChild, e);
        },
        children: function(e) {
            return x.sibling(e.firstChild);
        },
        contents: function(e) {
            return x.nodeName(e, "iframe") ? e.contentDocument || e.contentWindow.document : x.merge([], e.childNodes);
        }
    }, function(e, t) {
        x.fn[e] = function(n, r) {
            var i = x.map(this, t, n);
            return "Until" !== e.slice(-5) && (r = n), r && "string" == typeof r && (i = x.filter(r, i)), 
            this.length > 1 && (ct[e] || (i = x.unique(i)), lt.test(e) && (i = i.reverse())), 
            this.pushStack(i);
        };
    }), x.extend({
        filter: function(e, t, n) {
            var r = t[0];
            return n && (e = ":not(" + e + ")"), 1 === t.length && 1 === r.nodeType ? x.find.matchesSelector(r, e) ? [ r ] : [] : x.find.matches(e, x.grep(t, function(e) {
                return 1 === e.nodeType;
            }));
        },
        dir: function(e, n, r) {
            var i = [], o = e[n];
            while (o && 9 !== o.nodeType && (r === t || 1 !== o.nodeType || !x(o).is(r))) 1 === o.nodeType && i.push(o), 
            o = o[n];
            return i;
        },
        sibling: function(e, t) {
            var n = [];
            for (;e; e = e.nextSibling) 1 === e.nodeType && e !== t && n.push(e);
            return n;
        }
    });
    function ft(e, t, n) {
        if (x.isFunction(t)) return x.grep(e, function(e, r) {
            return !!t.call(e, r, e) !== n;
        });
        if (t.nodeType) return x.grep(e, function(e) {
            return e === t !== n;
        });
        if ("string" == typeof t) {
            if (st.test(t)) return x.filter(t, e, n);
            t = x.filter(t, e);
        }
        return x.grep(e, function(e) {
            return x.inArray(e, t) >= 0 !== n;
        });
    }
    function dt(e) {
        var t = ht.split("|"), n = e.createDocumentFragment();
        if (n.createElement) while (t.length) n.createElement(t.pop());
        return n;
    }
    var ht = "abbr|article|aside|audio|bdi|canvas|data|datalist|details|figcaption|figure|footer|header|hgroup|mark|meter|nav|output|progress|section|summary|time|video", gt = / jQuery\d+="(?:null|\d+)"/g, mt = RegExp("<(?:" + ht + ")[\\s/>]", "i"), yt = /^\s+/, vt = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/gi, bt = /<([\w:]+)/, xt = /<tbody/i, wt = /<|&#?\w+;/, Tt = /<(?:script|style|link)/i, Ct = /^(?:checkbox|radio)$/i, Nt = /checked\s*(?:[^=]|=\s*.checked.)/i, kt = /^$|\/(?:java|ecma)script/i, Et = /^true\/(.*)/, St = /^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g, At = {
        option: [ 1, "<select multiple='multiple'>", "</select>" ],
        legend: [ 1, "<fieldset>", "</fieldset>" ],
        area: [ 1, "<map>", "</map>" ],
        param: [ 1, "<object>", "</object>" ],
        thead: [ 1, "<table>", "</table>" ],
        tr: [ 2, "<table><tbody>", "</tbody></table>" ],
        col: [ 2, "<table><tbody></tbody><colgroup>", "</colgroup></table>" ],
        td: [ 3, "<table><tbody><tr>", "</tr></tbody></table>" ],
        _default: x.support.htmlSerialize ? [ 0, "", "" ] : [ 1, "X<div>", "</div>" ]
    }, jt = dt(a), Dt = jt.appendChild(a.createElement("div"));
    At.optgroup = At.option, At.tbody = At.tfoot = At.colgroup = At.caption = At.thead, 
    At.th = At.td, x.fn.extend({
        text: function(e) {
            return x.access(this, function(e) {
                return e === t ? x.text(this) : this.empty().append((this[0] && this[0].ownerDocument || a).createTextNode(e));
            }, null, e, arguments.length);
        },
        append: function() {
            return this.domManip(arguments, function(e) {
                if (1 === this.nodeType || 11 === this.nodeType || 9 === this.nodeType) {
                    var t = Lt(this, e);
                    t.appendChild(e);
                }
            });
        },
        prepend: function() {
            return this.domManip(arguments, function(e) {
                if (1 === this.nodeType || 11 === this.nodeType || 9 === this.nodeType) {
                    var t = Lt(this, e);
                    t.insertBefore(e, t.firstChild);
                }
            });
        },
        before: function() {
            return this.domManip(arguments, function(e) {
                this.parentNode && this.parentNode.insertBefore(e, this);
            });
        },
        after: function() {
            return this.domManip(arguments, function(e) {
                this.parentNode && this.parentNode.insertBefore(e, this.nextSibling);
            });
        },
        remove: function(e, t) {
            var n, r = e ? x.filter(e, this) : this, i = 0;
            for (;null != (n = r[i]); i++) t || 1 !== n.nodeType || x.cleanData(Ft(n)), n.parentNode && (t && x.contains(n.ownerDocument, n) && _t(Ft(n, "script")), 
            n.parentNode.removeChild(n));
            return this;
        },
        empty: function() {
            var e, t = 0;
            for (;null != (e = this[t]); t++) {
                1 === e.nodeType && x.cleanData(Ft(e, !1));
                while (e.firstChild) e.removeChild(e.firstChild);
                e.options && x.nodeName(e, "select") && (e.options.length = 0);
            }
            return this;
        },
        clone: function(e, t) {
            return e = null == e ? !1 : e, t = null == t ? e : t, this.map(function() {
                return x.clone(this, e, t);
            });
        },
        html: function(e) {
            return x.access(this, function(e) {
                var n = this[0] || {}, r = 0, i = this.length;
                if (e === t) return 1 === n.nodeType ? n.innerHTML.replace(gt, "") : t;
                if (!("string" != typeof e || Tt.test(e) || !x.support.htmlSerialize && mt.test(e) || !x.support.leadingWhitespace && yt.test(e) || At[(bt.exec(e) || [ "", "" ])[1].toLowerCase()])) {
                    e = e.replace(vt, "<$1></$2>");
                    try {
                        for (;i > r; r++) n = this[r] || {}, 1 === n.nodeType && (x.cleanData(Ft(n, !1)), 
                        n.innerHTML = e);
                        n = 0;
                    } catch (o) {}
                }
                n && this.empty().append(e);
            }, null, e, arguments.length);
        },
        replaceWith: function() {
            var e = x.map(this, function(e) {
                return [ e.nextSibling, e.parentNode ];
            }), t = 0;
            return this.domManip(arguments, function(n) {
                var r = e[t++], i = e[t++];
                i && (r && r.parentNode !== i && (r = this.nextSibling), x(this).remove(), i.insertBefore(n, r));
            }, !0), t ? this : this.remove();
        },
        detach: function(e) {
            return this.remove(e, !0);
        },
        domManip: function(e, t, n) {
            e = d.apply([], e);
            var r, i, o, a, s, l, u = 0, c = this.length, p = this, f = c - 1, h = e[0], g = x.isFunction(h);
            if (g || !(1 >= c || "string" != typeof h || x.support.checkClone) && Nt.test(h)) return this.each(function(r) {
                var i = p.eq(r);
                g && (e[0] = h.call(this, r, i.html())), i.domManip(e, t, n);
            });
            if (c && (l = x.buildFragment(e, this[0].ownerDocument, !1, !n && this), r = l.firstChild, 
            1 === l.childNodes.length && (l = r), r)) {
                for (a = x.map(Ft(l, "script"), Ht), o = a.length; c > u; u++) i = l, u !== f && (i = x.clone(i, !0, !0), 
                o && x.merge(a, Ft(i, "script"))), t.call(this[u], i, u);
                if (o) for (s = a[a.length - 1].ownerDocument, x.map(a, qt), u = 0; o > u; u++) i = a[u], 
                kt.test(i.type || "") && !x._data(i, "globalEval") && x.contains(s, i) && (i.src ? x._evalUrl(i.src) : x.globalEval((i.text || i.textContent || i.innerHTML || "").replace(St, "")));
                l = r = null;
            }
            return this;
        }
    });
    function Lt(e, t) {
        return x.nodeName(e, "table") && x.nodeName(1 === t.nodeType ? t : t.firstChild, "tr") ? e.getElementsByTagName("tbody")[0] || e.appendChild(e.ownerDocument.createElement("tbody")) : e;
    }
    function Ht(e) {
        return e.type = (null !== x.find.attr(e, "type")) + "/" + e.type, e;
    }
    function qt(e) {
        var t = Et.exec(e.type);
        return t ? e.type = t[1] : e.removeAttribute("type"), e;
    }
    function _t(e, t) {
        var n, r = 0;
        for (;null != (n = e[r]); r++) x._data(n, "globalEval", !t || x._data(t[r], "globalEval"));
    }
    function Mt(e, t) {
        if (1 === t.nodeType && x.hasData(e)) {
            var n, r, i, o = x._data(e), a = x._data(t, o), s = o.events;
            if (s) {
                delete a.handle, a.events = {};
                for (n in s) for (r = 0, i = s[n].length; i > r; r++) x.event.add(t, n, s[n][r]);
            }
            a.data && (a.data = x.extend({}, a.data));
        }
    }
    function Ot(e, t) {
        var n, r, i;
        if (1 === t.nodeType) {
            if (n = t.nodeName.toLowerCase(), !x.support.noCloneEvent && t[x.expando]) {
                i = x._data(t);
                for (r in i.events) x.removeEvent(t, r, i.handle);
                t.removeAttribute(x.expando);
            }
            "script" === n && t.text !== e.text ? (Ht(t).text = e.text, qt(t)) : "object" === n ? (t.parentNode && (t.outerHTML = e.outerHTML), 
            x.support.html5Clone && e.innerHTML && !x.trim(t.innerHTML) && (t.innerHTML = e.innerHTML)) : "input" === n && Ct.test(e.type) ? (t.defaultChecked = t.checked = e.checked, 
            t.value !== e.value && (t.value = e.value)) : "option" === n ? t.defaultSelected = t.selected = e.defaultSelected : ("input" === n || "textarea" === n) && (t.defaultValue = e.defaultValue);
        }
    }
    x.each({
        appendTo: "append",
        prependTo: "prepend",
        insertBefore: "before",
        insertAfter: "after",
        replaceAll: "replaceWith"
    }, function(e, t) {
        x.fn[e] = function(e) {
            var n, r = 0, i = [], o = x(e), a = o.length - 1;
            for (;a >= r; r++) n = r === a ? this : this.clone(!0), x(o[r])[t](n), h.apply(i, n.get());
            return this.pushStack(i);
        };
    });
    function Ft(e, n) {
        var r, o, a = 0, s = typeof e.getElementsByTagName !== i ? e.getElementsByTagName(n || "*") : typeof e.querySelectorAll !== i ? e.querySelectorAll(n || "*") : t;
        if (!s) for (s = [], r = e.childNodes || e; null != (o = r[a]); a++) !n || x.nodeName(o, n) ? s.push(o) : x.merge(s, Ft(o, n));
        return n === t || n && x.nodeName(e, n) ? x.merge([ e ], s) : s;
    }
    function Bt(e) {
        Ct.test(e.type) && (e.defaultChecked = e.checked);
    }
    x.extend({
        clone: function(e, t, n) {
            var r, i, o, a, s, l = x.contains(e.ownerDocument, e);
            if (x.support.html5Clone || x.isXMLDoc(e) || !mt.test("<" + e.nodeName + ">") ? o = e.cloneNode(!0) : (Dt.innerHTML = e.outerHTML, 
            Dt.removeChild(o = Dt.firstChild)), !(x.support.noCloneEvent && x.support.noCloneChecked || 1 !== e.nodeType && 11 !== e.nodeType || x.isXMLDoc(e))) for (r = Ft(o), 
            s = Ft(e), a = 0; null != (i = s[a]); ++a) r[a] && Ot(i, r[a]);
            if (t) if (n) for (s = s || Ft(e), r = r || Ft(o), a = 0; null != (i = s[a]); a++) Mt(i, r[a]); else Mt(e, o);
            return r = Ft(o, "script"), r.length > 0 && _t(r, !l && Ft(e, "script")), r = s = i = null, 
            o;
        },
        buildFragment: function(e, t, n, r) {
            var i, o, a, s, l, u, c, p = e.length, f = dt(t), d = [], h = 0;
            for (;p > h; h++) if (o = e[h], o || 0 === o) if ("object" === x.type(o)) x.merge(d, o.nodeType ? [ o ] : o); else if (wt.test(o)) {
                s = s || f.appendChild(t.createElement("div")), l = (bt.exec(o) || [ "", "" ])[1].toLowerCase(), 
                c = At[l] || At._default, s.innerHTML = c[1] + o.replace(vt, "<$1></$2>") + c[2], 
                i = c[0];
                while (i--) s = s.lastChild;
                if (!x.support.leadingWhitespace && yt.test(o) && d.push(t.createTextNode(yt.exec(o)[0])), 
                !x.support.tbody) {
                    o = "table" !== l || xt.test(o) ? "<table>" !== c[1] || xt.test(o) ? 0 : s : s.firstChild, 
                    i = o && o.childNodes.length;
                    while (i--) x.nodeName(u = o.childNodes[i], "tbody") && !u.childNodes.length && o.removeChild(u);
                }
                x.merge(d, s.childNodes), s.textContent = "";
                while (s.firstChild) s.removeChild(s.firstChild);
                s = f.lastChild;
            } else d.push(t.createTextNode(o));
            s && f.removeChild(s), x.support.appendChecked || x.grep(Ft(d, "input"), Bt), h = 0;
            while (o = d[h++]) if ((!r || -1 === x.inArray(o, r)) && (a = x.contains(o.ownerDocument, o), 
            s = Ft(f.appendChild(o), "script"), a && _t(s), n)) {
                i = 0;
                while (o = s[i++]) kt.test(o.type || "") && n.push(o);
            }
            return s = null, f;
        },
        cleanData: function(e, t) {
            var n, r, o, a, s = 0, l = x.expando, u = x.cache, c = x.support.deleteExpando, f = x.event.special;
            for (;null != (n = e[s]); s++) if ((t || x.acceptData(n)) && (o = n[l], a = o && u[o])) {
                if (a.events) for (r in a.events) f[r] ? x.event.remove(n, r) : x.removeEvent(n, r, a.handle);
                u[o] && (delete u[o], c ? delete n[l] : typeof n.removeAttribute !== i ? n.removeAttribute(l) : n[l] = null, 
                p.push(o));
            }
        },
        _evalUrl: function(e) {
            return x.ajax({
                url: e,
                type: "GET",
                dataType: "script",
                async: !1,
                global: !1,
                "throws": !0
            });
        }
    }), x.fn.extend({
        wrapAll: function(e) {
            if (x.isFunction(e)) return this.each(function(t) {
                x(this).wrapAll(e.call(this, t));
            });
            if (this[0]) {
                var t = x(e, this[0].ownerDocument).eq(0).clone(!0);
                this[0].parentNode && t.insertBefore(this[0]), t.map(function() {
                    var e = this;
                    while (e.firstChild && 1 === e.firstChild.nodeType) e = e.firstChild;
                    return e;
                }).append(this);
            }
            return this;
        },
        wrapInner: function(e) {
            return x.isFunction(e) ? this.each(function(t) {
                x(this).wrapInner(e.call(this, t));
            }) : this.each(function() {
                var t = x(this), n = t.contents();
                n.length ? n.wrapAll(e) : t.append(e);
            });
        },
        wrap: function(e) {
            var t = x.isFunction(e);
            return this.each(function(n) {
                x(this).wrapAll(t ? e.call(this, n) : e);
            });
        },
        unwrap: function() {
            return this.parent().each(function() {
                x.nodeName(this, "body") || x(this).replaceWith(this.childNodes);
            }).end();
        }
    });
    var Pt, Rt, Wt, $t = /alpha\([^)]*\)/i, It = /opacity\s*=\s*([^)]*)/, zt = /^(top|right|bottom|left)$/, Xt = /^(none|table(?!-c[ea]).+)/, Ut = /^margin/, Vt = RegExp("^(" + w + ")(.*)$", "i"), Yt = RegExp("^(" + w + ")(?!px)[a-z%]+$", "i"), Jt = RegExp("^([+-])=(" + w + ")", "i"), Gt = {
        BODY: "block"
    }, Qt = {
        position: "absolute",
        visibility: "hidden",
        display: "block"
    }, Kt = {
        letterSpacing: 0,
        fontWeight: 400
    }, Zt = [ "Top", "Right", "Bottom", "Left" ], en = [ "Webkit", "O", "Moz", "ms" ];
    function tn(e, t) {
        if (t in e) return t;
        var n = t.charAt(0).toUpperCase() + t.slice(1), r = t, i = en.length;
        while (i--) if (t = en[i] + n, t in e) return t;
        return r;
    }
    function nn(e, t) {
        return e = t || e, "none" === x.css(e, "display") || !x.contains(e.ownerDocument, e);
    }
    function rn(e, t) {
        var n, r, i, o = [], a = 0, s = e.length;
        for (;s > a; a++) r = e[a], r.style && (o[a] = x._data(r, "olddisplay"), n = r.style.display, 
        t ? (o[a] || "none" !== n || (r.style.display = ""), "" === r.style.display && nn(r) && (o[a] = x._data(r, "olddisplay", ln(r.nodeName)))) : o[a] || (i = nn(r), 
        (n && "none" !== n || !i) && x._data(r, "olddisplay", i ? n : x.css(r, "display"))));
        for (a = 0; s > a; a++) r = e[a], r.style && (t && "none" !== r.style.display && "" !== r.style.display || (r.style.display = t ? o[a] || "" : "none"));
        return e;
    }
    x.fn.extend({
        css: function(e, n) {
            return x.access(this, function(e, n, r) {
                var i, o, a = {}, s = 0;
                if (x.isArray(n)) {
                    for (o = Rt(e), i = n.length; i > s; s++) a[n[s]] = x.css(e, n[s], !1, o);
                    return a;
                }
                return r !== t ? x.style(e, n, r) : x.css(e, n);
            }, e, n, arguments.length > 1);
        },
        show: function() {
            return rn(this, !0);
        },
        hide: function() {
            return rn(this);
        },
        toggle: function(e) {
            return "boolean" == typeof e ? e ? this.show() : this.hide() : this.each(function() {
                nn(this) ? x(this).show() : x(this).hide();
            });
        }
    }), x.extend({
        cssHooks: {
            opacity: {
                get: function(e, t) {
                    if (t) {
                        var n = Wt(e, "opacity");
                        return "" === n ? "1" : n;
                    }
                }
            }
        },
        cssNumber: {
            columnCount: !0,
            fillOpacity: !0,
            fontWeight: !0,
            lineHeight: !0,
            opacity: !0,
            order: !0,
            orphans: !0,
            widows: !0,
            zIndex: !0,
            zoom: !0
        },
        cssProps: {
            "float": x.support.cssFloat ? "cssFloat" : "styleFloat"
        },
        style: function(e, n, r, i) {
            if (e && 3 !== e.nodeType && 8 !== e.nodeType && e.style) {
                var o, a, s, l = x.camelCase(n), u = e.style;
                if (n = x.cssProps[l] || (x.cssProps[l] = tn(u, l)), s = x.cssHooks[n] || x.cssHooks[l], 
                r === t) return s && "get" in s && (o = s.get(e, !1, i)) !== t ? o : u[n];
                if (a = typeof r, "string" === a && (o = Jt.exec(r)) && (r = (o[1] + 1) * o[2] + parseFloat(x.css(e, n)), 
                a = "number"), !(null == r || "number" === a && isNaN(r) || ("number" !== a || x.cssNumber[l] || (r += "px"), 
                x.support.clearCloneStyle || "" !== r || 0 !== n.indexOf("background") || (u[n] = "inherit"), 
                s && "set" in s && (r = s.set(e, r, i)) === t))) try {
                    u[n] = r;
                } catch (c) {}
            }
        },
        css: function(e, n, r, i) {
            var o, a, s, l = x.camelCase(n);
            return n = x.cssProps[l] || (x.cssProps[l] = tn(e.style, l)), s = x.cssHooks[n] || x.cssHooks[l], 
            s && "get" in s && (a = s.get(e, !0, r)), a === t && (a = Wt(e, n, i)), "normal" === a && n in Kt && (a = Kt[n]), 
            "" === r || r ? (o = parseFloat(a), r === !0 || x.isNumeric(o) ? o || 0 : a) : a;
        }
    }), e.getComputedStyle ? (Rt = function(t) {
        return e.getComputedStyle(t, null);
    }, Wt = function(e, n, r) {
        var i, o, a, s = r || Rt(e), l = s ? s.getPropertyValue(n) || s[n] : t, u = e.style;
        return s && ("" !== l || x.contains(e.ownerDocument, e) || (l = x.style(e, n)), 
        Yt.test(l) && Ut.test(n) && (i = u.width, o = u.minWidth, a = u.maxWidth, u.minWidth = u.maxWidth = u.width = l, 
        l = s.width, u.width = i, u.minWidth = o, u.maxWidth = a)), l;
    }) : a.documentElement.currentStyle && (Rt = function(e) {
        return e.currentStyle;
    }, Wt = function(e, n, r) {
        var i, o, a, s = r || Rt(e), l = s ? s[n] : t, u = e.style;
        return null == l && u && u[n] && (l = u[n]), Yt.test(l) && !zt.test(n) && (i = u.left, 
        o = e.runtimeStyle, a = o && o.left, a && (o.left = e.currentStyle.left), u.left = "fontSize" === n ? "1em" : l, 
        l = u.pixelLeft + "px", u.left = i, a && (o.left = a)), "" === l ? "auto" : l;
    });
    function on(e, t, n) {
        var r = Vt.exec(t);
        return r ? Math.max(0, r[1] - (n || 0)) + (r[2] || "px") : t;
    }
    function an(e, t, n, r, i) {
        var o = n === (r ? "border" : "content") ? 4 : "width" === t ? 1 : 0, a = 0;
        for (;4 > o; o += 2) "margin" === n && (a += x.css(e, n + Zt[o], !0, i)), r ? ("content" === n && (a -= x.css(e, "padding" + Zt[o], !0, i)), 
        "margin" !== n && (a -= x.css(e, "border" + Zt[o] + "Width", !0, i))) : (a += x.css(e, "padding" + Zt[o], !0, i), 
        "padding" !== n && (a += x.css(e, "border" + Zt[o] + "Width", !0, i)));
        return a;
    }
    function sn(e, t, n) {
        var r = !0, i = "width" === t ? e.offsetWidth : e.offsetHeight, o = Rt(e), a = x.support.boxSizing && "border-box" === x.css(e, "boxSizing", !1, o);
        if (0 >= i || null == i) {
            if (i = Wt(e, t, o), (0 > i || null == i) && (i = e.style[t]), Yt.test(i)) return i;
            r = a && (x.support.boxSizingReliable || i === e.style[t]), i = parseFloat(i) || 0;
        }
        return i + an(e, t, n || (a ? "border" : "content"), r, o) + "px";
    }
    function ln(e) {
        var t = a, n = Gt[e];
        return n || (n = un(e, t), "none" !== n && n || (Pt = (Pt || x("<iframe frameborder='0' width='0' height='0'/>").css("cssText", "display:block !important")).appendTo(t.documentElement), 
        t = (Pt[0].contentWindow || Pt[0].contentDocument).document, t.write("<!doctype html><html><body>"), 
        t.close(), n = un(e, t), Pt.detach()), Gt[e] = n), n;
    }
    function un(e, t) {
        var n = x(t.createElement(e)).appendTo(t.body), r = x.css(n[0], "display");
        return n.remove(), r;
    }
    x.each([ "height", "width" ], function(e, n) {
        x.cssHooks[n] = {
            get: function(e, r, i) {
                return r ? 0 === e.offsetWidth && Xt.test(x.css(e, "display")) ? x.swap(e, Qt, function() {
                    return sn(e, n, i);
                }) : sn(e, n, i) : t;
            },
            set: function(e, t, r) {
                var i = r && Rt(e);
                return on(e, t, r ? an(e, n, r, x.support.boxSizing && "border-box" === x.css(e, "boxSizing", !1, i), i) : 0);
            }
        };
    }), x.support.opacity || (x.cssHooks.opacity = {
        get: function(e, t) {
            return It.test((t && e.currentStyle ? e.currentStyle.filter : e.style.filter) || "") ? .01 * parseFloat(RegExp.$1) + "" : t ? "1" : "";
        },
        set: function(e, t) {
            var n = e.style, r = e.currentStyle, i = x.isNumeric(t) ? "alpha(opacity=" + 100 * t + ")" : "", o = r && r.filter || n.filter || "";
            n.zoom = 1, (t >= 1 || "" === t) && "" === x.trim(o.replace($t, "")) && n.removeAttribute && (n.removeAttribute("filter"), 
            "" === t || r && !r.filter) || (n.filter = $t.test(o) ? o.replace($t, i) : o + " " + i);
        }
    }), x(function() {
        x.support.reliableMarginRight || (x.cssHooks.marginRight = {
            get: function(e, n) {
                return n ? x.swap(e, {
                    display: "inline-block"
                }, Wt, [ e, "marginRight" ]) : t;
            }
        }), !x.support.pixelPosition && x.fn.position && x.each([ "top", "left" ], function(e, n) {
            x.cssHooks[n] = {
                get: function(e, r) {
                    return r ? (r = Wt(e, n), Yt.test(r) ? x(e).position()[n] + "px" : r) : t;
                }
            };
        });
    }), x.expr && x.expr.filters && (x.expr.filters.hidden = function(e) {
        return 0 >= e.offsetWidth && 0 >= e.offsetHeight || !x.support.reliableHiddenOffsets && "none" === (e.style && e.style.display || x.css(e, "display"));
    }, x.expr.filters.visible = function(e) {
        return !x.expr.filters.hidden(e);
    }), x.each({
        margin: "",
        padding: "",
        border: "Width"
    }, function(e, t) {
        x.cssHooks[e + t] = {
            expand: function(n) {
                var r = 0, i = {}, o = "string" == typeof n ? n.split(" ") : [ n ];
                for (;4 > r; r++) i[e + Zt[r] + t] = o[r] || o[r - 2] || o[0];
                return i;
            }
        }, Ut.test(e) || (x.cssHooks[e + t].set = on);
    });
    var cn = /%20/g, pn = /\[\]$/, fn = /\r?\n/g, dn = /^(?:submit|button|image|reset|file)$/i, hn = /^(?:input|select|textarea|keygen)/i;
    x.fn.extend({
        serialize: function() {
            return x.param(this.serializeArray());
        },
        serializeArray: function() {
            return this.map(function() {
                var e = x.prop(this, "elements");
                return e ? x.makeArray(e) : this;
            }).filter(function() {
                var e = this.type;
                return this.name && !x(this).is(":disabled") && hn.test(this.nodeName) && !dn.test(e) && (this.checked || !Ct.test(e));
            }).map(function(e, t) {
                var n = x(this).val();
                return null == n ? null : x.isArray(n) ? x.map(n, function(e) {
                    return {
                        name: t.name,
                        value: e.replace(fn, "\r\n")
                    };
                }) : {
                    name: t.name,
                    value: n.replace(fn, "\r\n")
                };
            }).get();
        }
    }), x.param = function(e, n) {
        var r, i = [], o = function(e, t) {
            t = x.isFunction(t) ? t() : null == t ? "" : t, i[i.length] = encodeURIComponent(e) + "=" + encodeURIComponent(t);
        };
        if (n === t && (n = x.ajaxSettings && x.ajaxSettings.traditional), x.isArray(e) || e.jquery && !x.isPlainObject(e)) x.each(e, function() {
            o(this.name, this.value);
        }); else for (r in e) gn(r, e[r], n, o);
        return i.join("&").replace(cn, "+");
    };
    function gn(e, t, n, r) {
        var i;
        if (x.isArray(t)) x.each(t, function(t, i) {
            n || pn.test(e) ? r(e, i) : gn(e + "[" + ("object" == typeof i ? t : "") + "]", i, n, r);
        }); else if (n || "object" !== x.type(t)) r(e, t); else for (i in t) gn(e + "[" + i + "]", t[i], n, r);
    }
    x.each("blur focus focusin focusout load resize scroll unload click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave change select submit keydown keypress keyup error contextmenu".split(" "), function(e, t) {
        x.fn[t] = function(e, n) {
            return arguments.length > 0 ? this.on(t, null, e, n) : this.trigger(t);
        };
    }), x.fn.extend({
        hover: function(e, t) {
            return this.mouseenter(e).mouseleave(t || e);
        },
        bind: function(e, t, n) {
            return this.on(e, null, t, n);
        },
        unbind: function(e, t) {
            return this.off(e, null, t);
        },
        delegate: function(e, t, n, r) {
            return this.on(t, e, n, r);
        },
        undelegate: function(e, t, n) {
            return 1 === arguments.length ? this.off(e, "**") : this.off(t, e || "**", n);
        }
    });
    var mn, yn, vn = x.now(), bn = /\?/, xn = /#.*$/, wn = /([?&])_=[^&]*/, Tn = /^(.*?):[ \t]*([^\r\n]*)\r?$/gm, Cn = /^(?:about|app|app-storage|.+-extension|file|res|widget):$/, Nn = /^(?:GET|HEAD)$/, kn = /^\/\//, En = /^([\w.+-]+:)(?:\/\/([^\/?#:]*)(?::(\d+)|)|)/, Sn = x.fn.load, An = {}, jn = {}, Dn = "*/".concat("*");
    try {
        yn = o.href;
    } catch (Ln) {
        yn = a.createElement("a"), yn.href = "", yn = yn.href;
    }
    mn = En.exec(yn.toLowerCase()) || [];
    function Hn(e) {
        return function(t, n) {
            "string" != typeof t && (n = t, t = "*");
            var r, i = 0, o = t.toLowerCase().match(T) || [];
            if (x.isFunction(n)) while (r = o[i++]) "+" === r[0] ? (r = r.slice(1) || "*", (e[r] = e[r] || []).unshift(n)) : (e[r] = e[r] || []).push(n);
        };
    }
    function qn(e, n, r, i) {
        var o = {}, a = e === jn;
        function s(l) {
            var u;
            return o[l] = !0, x.each(e[l] || [], function(e, l) {
                var c = l(n, r, i);
                return "string" != typeof c || a || o[c] ? a ? !(u = c) : t : (n.dataTypes.unshift(c), 
                s(c), !1);
            }), u;
        }
        return s(n.dataTypes[0]) || !o["*"] && s("*");
    }
    function _n(e, n) {
        var r, i, o = x.ajaxSettings.flatOptions || {};
        for (i in n) n[i] !== t && ((o[i] ? e : r || (r = {}))[i] = n[i]);
        return r && x.extend(!0, e, r), e;
    }
    x.fn.load = function(e, n, r) {
        if ("string" != typeof e && Sn) return Sn.apply(this, arguments);
        var i, o, a, s = this, l = e.indexOf(" ");
        return l >= 0 && (i = e.slice(l, e.length), e = e.slice(0, l)), x.isFunction(n) ? (r = n, 
        n = t) : n && "object" == typeof n && (a = "POST"), s.length > 0 && x.ajax({
            url: e,
            type: a,
            dataType: "html",
            data: n
        }).done(function(e) {
            o = arguments, s.html(i ? x("<div>").append(x.parseHTML(e)).find(i) : e);
        }).complete(r && function(e, t) {
            s.each(r, o || [ e.responseText, t, e ]);
        }), this;
    }, x.each([ "ajaxStart", "ajaxStop", "ajaxComplete", "ajaxError", "ajaxSuccess", "ajaxSend" ], function(e, t) {
        x.fn[t] = function(e) {
            return this.on(t, e);
        };
    }), x.extend({
        active: 0,
        lastModified: {},
        etag: {},
        ajaxSettings: {
            url: yn,
            type: "GET",
            isLocal: Cn.test(mn[1]),
            global: !0,
            processData: !0,
            async: !0,
            contentType: "application/x-www-form-urlencoded; charset=UTF-8",
            accepts: {
                "*": Dn,
                text: "text/plain",
                html: "text/html",
                xml: "application/xml, text/xml",
                json: "application/json, text/javascript"
            },
            contents: {
                xml: /xml/,
                html: /html/,
                json: /json/
            },
            responseFields: {
                xml: "responseXML",
                text: "responseText",
                json: "responseJSON"
            },
            converters: {
                "* text": String,
                "text html": !0,
                "text json": x.parseJSON,
                "text xml": x.parseXML
            },
            flatOptions: {
                url: !0,
                context: !0
            }
        },
        ajaxSetup: function(e, t) {
            return t ? _n(_n(e, x.ajaxSettings), t) : _n(x.ajaxSettings, e);
        },
        ajaxPrefilter: Hn(An),
        ajaxTransport: Hn(jn),
        ajax: function(e, n) {
            "object" == typeof e && (n = e, e = t), n = n || {};
            var r, i, o, a, s, l, u, c, p = x.ajaxSetup({}, n), f = p.context || p, d = p.context && (f.nodeType || f.jquery) ? x(f) : x.event, h = x.Deferred(), g = x.Callbacks("once memory"), m = p.statusCode || {}, y = {}, v = {}, b = 0, w = "canceled", C = {
                readyState: 0,
                getResponseHeader: function(e) {
                    var t;
                    if (2 === b) {
                        if (!c) {
                            c = {};
                            while (t = Tn.exec(a)) c[t[1].toLowerCase()] = t[2];
                        }
                        t = c[e.toLowerCase()];
                    }
                    return null == t ? null : t;
                },
                getAllResponseHeaders: function() {
                    return 2 === b ? a : null;
                },
                setRequestHeader: function(e, t) {
                    var n = e.toLowerCase();
                    return b || (e = v[n] = v[n] || e, y[e] = t), this;
                },
                overrideMimeType: function(e) {
                    return b || (p.mimeType = e), this;
                },
                statusCode: function(e) {
                    var t;
                    if (e) if (2 > b) for (t in e) m[t] = [ m[t], e[t] ]; else C.always(e[C.status]);
                    return this;
                },
                abort: function(e) {
                    var t = e || w;
                    return u && u.abort(t), k(0, t), this;
                }
            };
            if (h.promise(C).complete = g.add, C.success = C.done, C.error = C.fail, p.url = ((e || p.url || yn) + "").replace(xn, "").replace(kn, mn[1] + "//"), 
            p.type = n.method || n.type || p.method || p.type, p.dataTypes = x.trim(p.dataType || "*").toLowerCase().match(T) || [ "" ], 
            null == p.crossDomain && (r = En.exec(p.url.toLowerCase()), p.crossDomain = !(!r || r[1] === mn[1] && r[2] === mn[2] && (r[3] || ("http:" === r[1] ? "80" : "443")) === (mn[3] || ("http:" === mn[1] ? "80" : "443")))), 
            p.data && p.processData && "string" != typeof p.data && (p.data = x.param(p.data, p.traditional)), 
            qn(An, p, n, C), 2 === b) return C;
            l = p.global, l && 0 === x.active++ && x.event.trigger("ajaxStart"), p.type = p.type.toUpperCase(), 
            p.hasContent = !Nn.test(p.type), o = p.url, p.hasContent || (p.data && (o = p.url += (bn.test(o) ? "&" : "?") + p.data, 
            delete p.data), p.cache === !1 && (p.url = wn.test(o) ? o.replace(wn, "$1_=" + vn++) : o + (bn.test(o) ? "&" : "?") + "_=" + vn++)), 
            p.ifModified && (x.lastModified[o] && C.setRequestHeader("If-Modified-Since", x.lastModified[o]), 
            x.etag[o] && C.setRequestHeader("If-None-Match", x.etag[o])), (p.data && p.hasContent && p.contentType !== !1 || n.contentType) && C.setRequestHeader("Content-Type", p.contentType), 
            C.setRequestHeader("Accept", p.dataTypes[0] && p.accepts[p.dataTypes[0]] ? p.accepts[p.dataTypes[0]] + ("*" !== p.dataTypes[0] ? ", " + Dn + "; q=0.01" : "") : p.accepts["*"]);
            for (i in p.headers) C.setRequestHeader(i, p.headers[i]);
            if (p.beforeSend && (p.beforeSend.call(f, C, p) === !1 || 2 === b)) return C.abort();
            w = "abort";
            for (i in {
                success: 1,
                error: 1,
                complete: 1
            }) C[i](p[i]);
            if (u = qn(jn, p, n, C)) {
                C.readyState = 1, l && d.trigger("ajaxSend", [ C, p ]), p.async && p.timeout > 0 && (s = setTimeout(function() {
                    C.abort("timeout");
                }, p.timeout));
                try {
                    b = 1, u.send(y, k);
                } catch (N) {
                    if (!(2 > b)) throw N;
                    k(-1, N);
                }
            } else k(-1, "No Transport");
            function k(e, n, r, i) {
                var c, y, v, w, T, N = n;
                2 !== b && (b = 2, s && clearTimeout(s), u = t, a = i || "", C.readyState = e > 0 ? 4 : 0, 
                c = e >= 200 && 300 > e || 304 === e, r && (w = Mn(p, C, r)), w = On(p, w, C, c), 
                c ? (p.ifModified && (T = C.getResponseHeader("Last-Modified"), T && (x.lastModified[o] = T), 
                T = C.getResponseHeader("etag"), T && (x.etag[o] = T)), 204 === e || "HEAD" === p.type ? N = "nocontent" : 304 === e ? N = "notmodified" : (N = w.state, 
                y = w.data, v = w.error, c = !v)) : (v = N, (e || !N) && (N = "error", 0 > e && (e = 0))), 
                C.status = e, C.statusText = (n || N) + "", c ? h.resolveWith(f, [ y, N, C ]) : h.rejectWith(f, [ C, N, v ]), 
                C.statusCode(m), m = t, l && d.trigger(c ? "ajaxSuccess" : "ajaxError", [ C, p, c ? y : v ]), 
                g.fireWith(f, [ C, N ]), l && (d.trigger("ajaxComplete", [ C, p ]), --x.active || x.event.trigger("ajaxStop")));
            }
            return C;
        },
        getJSON: function(e, t, n) {
            return x.get(e, t, n, "json");
        },
        getScript: function(e, n) {
            return x.get(e, t, n, "script");
        }
    }), x.each([ "get", "post" ], function(e, n) {
        x[n] = function(e, r, i, o) {
            return x.isFunction(r) && (o = o || i, i = r, r = t), x.ajax({
                url: e,
                type: n,
                dataType: o,
                data: r,
                success: i
            });
        };
    });
    function Mn(e, n, r) {
        var i, o, a, s, l = e.contents, u = e.dataTypes;
        while ("*" === u[0]) u.shift(), o === t && (o = e.mimeType || n.getResponseHeader("Content-Type"));
        if (o) for (s in l) if (l[s] && l[s].test(o)) {
            u.unshift(s);
            break;
        }
        if (u[0] in r) a = u[0]; else {
            for (s in r) {
                if (!u[0] || e.converters[s + " " + u[0]]) {
                    a = s;
                    break;
                }
                i || (i = s);
            }
            a = a || i;
        }
        return a ? (a !== u[0] && u.unshift(a), r[a]) : t;
    }
    function On(e, t, n, r) {
        var i, o, a, s, l, u = {}, c = e.dataTypes.slice();
        if (c[1]) for (a in e.converters) u[a.toLowerCase()] = e.converters[a];
        o = c.shift();
        while (o) if (e.responseFields[o] && (n[e.responseFields[o]] = t), !l && r && e.dataFilter && (t = e.dataFilter(t, e.dataType)), 
        l = o, o = c.shift()) if ("*" === o) o = l; else if ("*" !== l && l !== o) {
            if (a = u[l + " " + o] || u["* " + o], !a) for (i in u) if (s = i.split(" "), s[1] === o && (a = u[l + " " + s[0]] || u["* " + s[0]])) {
                a === !0 ? a = u[i] : u[i] !== !0 && (o = s[0], c.unshift(s[1]));
                break;
            }
            if (a !== !0) if (a && e["throws"]) t = a(t); else try {
                t = a(t);
            } catch (p) {
                return {
                    state: "parsererror",
                    error: a ? p : "No conversion from " + l + " to " + o
                };
            }
        }
        return {
            state: "success",
            data: t
        };
    }
    x.ajaxSetup({
        accepts: {
            script: "text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"
        },
        contents: {
            script: /(?:java|ecma)script/
        },
        converters: {
            "text script": function(e) {
                return x.globalEval(e), e;
            }
        }
    }), x.ajaxPrefilter("script", function(e) {
        e.cache === t && (e.cache = !1), e.crossDomain && (e.type = "GET", e.global = !1);
    }), x.ajaxTransport("script", function(e) {
        if (e.crossDomain) {
            var n, r = a.head || x("head")[0] || a.documentElement;
            return {
                send: function(t, i) {
                    n = a.createElement("script"), n.async = !0, e.scriptCharset && (n.charset = e.scriptCharset), 
                    n.src = e.url, n.onload = n.onreadystatechange = function(e, t) {
                        (t || !n.readyState || /loaded|complete/.test(n.readyState)) && (n.onload = n.onreadystatechange = null, 
                        n.parentNode && n.parentNode.removeChild(n), n = null, t || i(200, "success"));
                    }, r.insertBefore(n, r.firstChild);
                },
                abort: function() {
                    n && n.onload(t, !0);
                }
            };
        }
    });
    var Fn = [], Bn = /(=)\?(?=&|$)|\?\?/;
    x.ajaxSetup({
        jsonp: "callback",
        jsonpCallback: function() {
            var e = Fn.pop() || x.expando + "_" + vn++;
            return this[e] = !0, e;
        }
    }), x.ajaxPrefilter("json jsonp", function(n, r, i) {
        var o, a, s, l = n.jsonp !== !1 && (Bn.test(n.url) ? "url" : "string" == typeof n.data && !(n.contentType || "").indexOf("application/x-www-form-urlencoded") && Bn.test(n.data) && "data");
        return l || "jsonp" === n.dataTypes[0] ? (o = n.jsonpCallback = x.isFunction(n.jsonpCallback) ? n.jsonpCallback() : n.jsonpCallback, 
        l ? n[l] = n[l].replace(Bn, "$1" + o) : n.jsonp !== !1 && (n.url += (bn.test(n.url) ? "&" : "?") + n.jsonp + "=" + o), 
        n.converters["script json"] = function() {
            return s || x.error(o + " was not called"), s[0];
        }, n.dataTypes[0] = "json", a = e[o], e[o] = function() {
            s = arguments;
        }, i.always(function() {
            e[o] = a, n[o] && (n.jsonpCallback = r.jsonpCallback, Fn.push(o)), s && x.isFunction(a) && a(s[0]), 
            s = a = t;
        }), "script") : t;
    });
    var Pn, Rn, Wn = 0, $n = e.ActiveXObject && function() {
        var e;
        for (e in Pn) Pn[e](t, !0);
    };
    function In() {
        try {
            return new e.XMLHttpRequest();
        } catch (t) {}
    }
    function zn() {
        try {
            return new e.ActiveXObject("Microsoft.XMLHTTP");
        } catch (t) {}
    }
    x.ajaxSettings.xhr = e.ActiveXObject ? function() {
        return !this.isLocal && In() || zn();
    } : In, Rn = x.ajaxSettings.xhr(), x.support.cors = !!Rn && "withCredentials" in Rn, 
    Rn = x.support.ajax = !!Rn, Rn && x.ajaxTransport(function(n) {
        if (!n.crossDomain || x.support.cors) {
            var r;
            return {
                send: function(i, o) {
                    var a, s, l = n.xhr();
                    if (n.username ? l.open(n.type, n.url, n.async, n.username, n.password) : l.open(n.type, n.url, n.async), 
                    n.xhrFields) for (s in n.xhrFields) l[s] = n.xhrFields[s];
                    n.mimeType && l.overrideMimeType && l.overrideMimeType(n.mimeType), n.crossDomain || i["X-Requested-With"] || (i["X-Requested-With"] = "XMLHttpRequest");
                    try {
                        for (s in i) l.setRequestHeader(s, i[s]);
                    } catch (u) {}
                    l.send(n.hasContent && n.data || null), r = function(e, i) {
                        var s, u, c, p;
                        try {
                            if (r && (i || 4 === l.readyState)) if (r = t, a && (l.onreadystatechange = x.noop, 
                            $n && delete Pn[a]), i) 4 !== l.readyState && l.abort(); else {
                                p = {}, s = l.status, u = l.getAllResponseHeaders(), "string" == typeof l.responseText && (p.text = l.responseText);
                                try {
                                    c = l.statusText;
                                } catch (f) {
                                    c = "";
                                }
                                s || !n.isLocal || n.crossDomain ? 1223 === s && (s = 204) : s = p.text ? 200 : 404;
                            }
                        } catch (d) {
                            i || o(-1, d);
                        }
                        p && o(s, c, p, u);
                    }, n.async ? 4 === l.readyState ? setTimeout(r) : (a = ++Wn, $n && (Pn || (Pn = {}, 
                    x(e).unload($n)), Pn[a] = r), l.onreadystatechange = r) : r();
                },
                abort: function() {
                    r && r(t, !0);
                }
            };
        }
    });
    var Xn, Un, Vn = /^(?:toggle|show|hide)$/, Yn = RegExp("^(?:([+-])=|)(" + w + ")([a-z%]*)$", "i"), Jn = /queueHooks$/, Gn = [ nr ], Qn = {
        "*": [ function(e, t) {
            var n = this.createTween(e, t), r = n.cur(), i = Yn.exec(t), o = i && i[3] || (x.cssNumber[e] ? "" : "px"), a = (x.cssNumber[e] || "px" !== o && +r) && Yn.exec(x.css(n.elem, e)), s = 1, l = 20;
            if (a && a[3] !== o) {
                o = o || a[3], i = i || [], a = +r || 1;
                do s = s || ".5", a /= s, x.style(n.elem, e, a + o); while (s !== (s = n.cur() / r) && 1 !== s && --l);
            }
            return i && (a = n.start = +a || +r || 0, n.unit = o, n.end = i[1] ? a + (i[1] + 1) * i[2] : +i[2]), 
            n;
        } ]
    };
    function Kn() {
        return setTimeout(function() {
            Xn = t;
        }), Xn = x.now();
    }
    function Zn(e, t, n) {
        var r, i = (Qn[t] || []).concat(Qn["*"]), o = 0, a = i.length;
        for (;a > o; o++) if (r = i[o].call(n, t, e)) return r;
    }
    function er(e, t, n) {
        var r, i, o = 0, a = Gn.length, s = x.Deferred().always(function() {
            delete l.elem;
        }), l = function() {
            if (i) return !1;
            var t = Xn || Kn(), n = Math.max(0, u.startTime + u.duration - t), r = n / u.duration || 0, o = 1 - r, a = 0, l = u.tweens.length;
            for (;l > a; a++) u.tweens[a].run(o);
            return s.notifyWith(e, [ u, o, n ]), 1 > o && l ? n : (s.resolveWith(e, [ u ]), 
            !1);
        }, u = s.promise({
            elem: e,
            props: x.extend({}, t),
            opts: x.extend(!0, {
                specialEasing: {}
            }, n),
            originalProperties: t,
            originalOptions: n,
            startTime: Xn || Kn(),
            duration: n.duration,
            tweens: [],
            createTween: function(t, n) {
                var r = x.Tween(e, u.opts, t, n, u.opts.specialEasing[t] || u.opts.easing);
                return u.tweens.push(r), r;
            },
            stop: function(t) {
                var n = 0, r = t ? u.tweens.length : 0;
                if (i) return this;
                for (i = !0; r > n; n++) u.tweens[n].run(1);
                return t ? s.resolveWith(e, [ u, t ]) : s.rejectWith(e, [ u, t ]), this;
            }
        }), c = u.props;
        for (tr(c, u.opts.specialEasing); a > o; o++) if (r = Gn[o].call(u, e, c, u.opts)) return r;
        return x.map(c, Zn, u), x.isFunction(u.opts.start) && u.opts.start.call(e, u), x.fx.timer(x.extend(l, {
            elem: e,
            anim: u,
            queue: u.opts.queue
        })), u.progress(u.opts.progress).done(u.opts.done, u.opts.complete).fail(u.opts.fail).always(u.opts.always);
    }
    function tr(e, t) {
        var n, r, i, o, a;
        for (n in e) if (r = x.camelCase(n), i = t[r], o = e[n], x.isArray(o) && (i = o[1], 
        o = e[n] = o[0]), n !== r && (e[r] = o, delete e[n]), a = x.cssHooks[r], a && "expand" in a) {
            o = a.expand(o), delete e[r];
            for (n in o) n in e || (e[n] = o[n], t[n] = i);
        } else t[r] = i;
    }
    x.Animation = x.extend(er, {
        tweener: function(e, t) {
            x.isFunction(e) ? (t = e, e = [ "*" ]) : e = e.split(" ");
            var n, r = 0, i = e.length;
            for (;i > r; r++) n = e[r], Qn[n] = Qn[n] || [], Qn[n].unshift(t);
        },
        prefilter: function(e, t) {
            t ? Gn.unshift(e) : Gn.push(e);
        }
    });
    function nr(e, t, n) {
        var r, i, o, a, s, l, u = this, c = {}, p = e.style, f = e.nodeType && nn(e), d = x._data(e, "fxshow");
        n.queue || (s = x._queueHooks(e, "fx"), null == s.unqueued && (s.unqueued = 0, l = s.empty.fire, 
        s.empty.fire = function() {
            s.unqueued || l();
        }), s.unqueued++, u.always(function() {
            u.always(function() {
                s.unqueued--, x.queue(e, "fx").length || s.empty.fire();
            });
        })), 1 === e.nodeType && ("height" in t || "width" in t) && (n.overflow = [ p.overflow, p.overflowX, p.overflowY ], 
        "inline" === x.css(e, "display") && "none" === x.css(e, "float") && (x.support.inlineBlockNeedsLayout && "inline" !== ln(e.nodeName) ? p.zoom = 1 : p.display = "inline-block")), 
        n.overflow && (p.overflow = "hidden", x.support.shrinkWrapBlocks || u.always(function() {
            p.overflow = n.overflow[0], p.overflowX = n.overflow[1], p.overflowY = n.overflow[2];
        }));
        for (r in t) if (i = t[r], Vn.exec(i)) {
            if (delete t[r], o = o || "toggle" === i, i === (f ? "hide" : "show")) continue;
            c[r] = d && d[r] || x.style(e, r);
        }
        if (!x.isEmptyObject(c)) {
            d ? "hidden" in d && (f = d.hidden) : d = x._data(e, "fxshow", {}), o && (d.hidden = !f), 
            f ? x(e).show() : u.done(function() {
                x(e).hide();
            }), u.done(function() {
                var t;
                x._removeData(e, "fxshow");
                for (t in c) x.style(e, t, c[t]);
            });
            for (r in c) a = Zn(f ? d[r] : 0, r, u), r in d || (d[r] = a.start, f && (a.end = a.start, 
            a.start = "width" === r || "height" === r ? 1 : 0));
        }
    }
    function rr(e, t, n, r, i) {
        return new rr.prototype.init(e, t, n, r, i);
    }
    x.Tween = rr, rr.prototype = {
        constructor: rr,
        init: function(e, t, n, r, i, o) {
            this.elem = e, this.prop = n, this.easing = i || "swing", this.options = t, this.start = this.now = this.cur(), 
            this.end = r, this.unit = o || (x.cssNumber[n] ? "" : "px");
        },
        cur: function() {
            var e = rr.propHooks[this.prop];
            return e && e.get ? e.get(this) : rr.propHooks._default.get(this);
        },
        run: function(e) {
            var t, n = rr.propHooks[this.prop];
            return this.pos = t = this.options.duration ? x.easing[this.easing](e, this.options.duration * e, 0, 1, this.options.duration) : e, 
            this.now = (this.end - this.start) * t + this.start, this.options.step && this.options.step.call(this.elem, this.now, this), 
            n && n.set ? n.set(this) : rr.propHooks._default.set(this), this;
        }
    }, rr.prototype.init.prototype = rr.prototype, rr.propHooks = {
        _default: {
            get: function(e) {
                var t;
                return null == e.elem[e.prop] || e.elem.style && null != e.elem.style[e.prop] ? (t = x.css(e.elem, e.prop, ""), 
                t && "auto" !== t ? t : 0) : e.elem[e.prop];
            },
            set: function(e) {
                x.fx.step[e.prop] ? x.fx.step[e.prop](e) : e.elem.style && (null != e.elem.style[x.cssProps[e.prop]] || x.cssHooks[e.prop]) ? x.style(e.elem, e.prop, e.now + e.unit) : e.elem[e.prop] = e.now;
            }
        }
    }, rr.propHooks.scrollTop = rr.propHooks.scrollLeft = {
        set: function(e) {
            e.elem.nodeType && e.elem.parentNode && (e.elem[e.prop] = e.now);
        }
    }, x.each([ "toggle", "show", "hide" ], function(e, t) {
        var n = x.fn[t];
        x.fn[t] = function(e, r, i) {
            return null == e || "boolean" == typeof e ? n.apply(this, arguments) : this.animate(ir(t, !0), e, r, i);
        };
    }), x.fn.extend({
        fadeTo: function(e, t, n, r) {
            return this.filter(nn).css("opacity", 0).show().end().animate({
                opacity: t
            }, e, n, r);
        },
        animate: function(e, t, n, r) {
            var i = x.isEmptyObject(e), o = x.speed(t, n, r), a = function() {
                var t = er(this, x.extend({}, e), o);
                (i || x._data(this, "finish")) && t.stop(!0);
            };
            return a.finish = a, i || o.queue === !1 ? this.each(a) : this.queue(o.queue, a);
        },
        stop: function(e, n, r) {
            var i = function(e) {
                var t = e.stop;
                delete e.stop, t(r);
            };
            return "string" != typeof e && (r = n, n = e, e = t), n && e !== !1 && this.queue(e || "fx", []), 
            this.each(function() {
                var t = !0, n = null != e && e + "queueHooks", o = x.timers, a = x._data(this);
                if (n) a[n] && a[n].stop && i(a[n]); else for (n in a) a[n] && a[n].stop && Jn.test(n) && i(a[n]);
                for (n = o.length; n--; ) o[n].elem !== this || null != e && o[n].queue !== e || (o[n].anim.stop(r), 
                t = !1, o.splice(n, 1));
                (t || !r) && x.dequeue(this, e);
            });
        },
        finish: function(e) {
            return e !== !1 && (e = e || "fx"), this.each(function() {
                var t, n = x._data(this), r = n[e + "queue"], i = n[e + "queueHooks"], o = x.timers, a = r ? r.length : 0;
                for (n.finish = !0, x.queue(this, e, []), i && i.stop && i.stop.call(this, !0), 
                t = o.length; t--; ) o[t].elem === this && o[t].queue === e && (o[t].anim.stop(!0), 
                o.splice(t, 1));
                for (t = 0; a > t; t++) r[t] && r[t].finish && r[t].finish.call(this);
                delete n.finish;
            });
        }
    });
    function ir(e, t) {
        var n, r = {
            height: e
        }, i = 0;
        for (t = t ? 1 : 0; 4 > i; i += 2 - t) n = Zt[i], r["margin" + n] = r["padding" + n] = e;
        return t && (r.opacity = r.width = e), r;
    }
    x.each({
        slideDown: ir("show"),
        slideUp: ir("hide"),
        slideToggle: ir("toggle"),
        fadeIn: {
            opacity: "show"
        },
        fadeOut: {
            opacity: "hide"
        },
        fadeToggle: {
            opacity: "toggle"
        }
    }, function(e, t) {
        x.fn[e] = function(e, n, r) {
            return this.animate(t, e, n, r);
        };
    }), x.speed = function(e, t, n) {
        var r = e && "object" == typeof e ? x.extend({}, e) : {
            complete: n || !n && t || x.isFunction(e) && e,
            duration: e,
            easing: n && t || t && !x.isFunction(t) && t
        };
        return r.duration = x.fx.off ? 0 : "number" == typeof r.duration ? r.duration : r.duration in x.fx.speeds ? x.fx.speeds[r.duration] : x.fx.speeds._default, 
        (null == r.queue || r.queue === !0) && (r.queue = "fx"), r.old = r.complete, r.complete = function() {
            x.isFunction(r.old) && r.old.call(this), r.queue && x.dequeue(this, r.queue);
        }, r;
    }, x.easing = {
        linear: function(e) {
            return e;
        },
        swing: function(e) {
            return .5 - Math.cos(e * Math.PI) / 2;
        }
    }, x.timers = [], x.fx = rr.prototype.init, x.fx.tick = function() {
        var e, n = x.timers, r = 0;
        for (Xn = x.now(); n.length > r; r++) e = n[r], e() || n[r] !== e || n.splice(r--, 1);
        n.length || x.fx.stop(), Xn = t;
    }, x.fx.timer = function(e) {
        e() && x.timers.push(e) && x.fx.start();
    }, x.fx.interval = 13, x.fx.start = function() {
        Un || (Un = setInterval(x.fx.tick, x.fx.interval));
    }, x.fx.stop = function() {
        clearInterval(Un), Un = null;
    }, x.fx.speeds = {
        slow: 600,
        fast: 200,
        _default: 400
    }, x.fx.step = {}, x.expr && x.expr.filters && (x.expr.filters.animated = function(e) {
        return x.grep(x.timers, function(t) {
            return e === t.elem;
        }).length;
    }), x.fn.offset = function(e) {
        if (arguments.length) return e === t ? this : this.each(function(t) {
            x.offset.setOffset(this, e, t);
        });
        var n, r, o = {
            top: 0,
            left: 0
        }, a = this[0], s = a && a.ownerDocument;
        if (s) return n = s.documentElement, x.contains(n, a) ? (typeof a.getBoundingClientRect !== i && (o = a.getBoundingClientRect()), 
        r = or(s), {
            top: o.top + (r.pageYOffset || n.scrollTop) - (n.clientTop || 0),
            left: o.left + (r.pageXOffset || n.scrollLeft) - (n.clientLeft || 0)
        }) : o;
    }, x.offset = {
        setOffset: function(e, t, n) {
            var r = x.css(e, "position");
            "static" === r && (e.style.position = "relative");
            var i = x(e), o = i.offset(), a = x.css(e, "top"), s = x.css(e, "left"), l = ("absolute" === r || "fixed" === r) && x.inArray("auto", [ a, s ]) > -1, u = {}, c = {}, p, f;
            l ? (c = i.position(), p = c.top, f = c.left) : (p = parseFloat(a) || 0, f = parseFloat(s) || 0), 
            x.isFunction(t) && (t = t.call(e, n, o)), null != t.top && (u.top = t.top - o.top + p), 
            null != t.left && (u.left = t.left - o.left + f), "using" in t ? t.using.call(e, u) : i.css(u);
        }
    }, x.fn.extend({
        position: function() {
            if (this[0]) {
                var e, t, n = {
                    top: 0,
                    left: 0
                }, r = this[0];
                return "fixed" === x.css(r, "position") ? t = r.getBoundingClientRect() : (e = this.offsetParent(), 
                t = this.offset(), x.nodeName(e[0], "html") || (n = e.offset()), n.top += x.css(e[0], "borderTopWidth", !0), 
                n.left += x.css(e[0], "borderLeftWidth", !0)), {
                    top: t.top - n.top - x.css(r, "marginTop", !0),
                    left: t.left - n.left - x.css(r, "marginLeft", !0)
                };
            }
        },
        offsetParent: function() {
            return this.map(function() {
                var e = this.offsetParent || s;
                while (e && !x.nodeName(e, "html") && "static" === x.css(e, "position")) e = e.offsetParent;
                return e || s;
            });
        }
    }), x.each({
        scrollLeft: "pageXOffset",
        scrollTop: "pageYOffset"
    }, function(e, n) {
        var r = /Y/.test(n);
        x.fn[e] = function(i) {
            return x.access(this, function(e, i, o) {
                var a = or(e);
                return o === t ? a ? n in a ? a[n] : a.document.documentElement[i] : e[i] : (a ? a.scrollTo(r ? x(a).scrollLeft() : o, r ? o : x(a).scrollTop()) : e[i] = o, 
                t);
            }, e, i, arguments.length, null);
        };
    });
    function or(e) {
        return x.isWindow(e) ? e : 9 === e.nodeType ? e.defaultView || e.parentWindow : !1;
    }
    x.each({
        Height: "height",
        Width: "width"
    }, function(e, n) {
        x.each({
            padding: "inner" + e,
            content: n,
            "": "outer" + e
        }, function(r, i) {
            x.fn[i] = function(i, o) {
                var a = arguments.length && (r || "boolean" != typeof i), s = r || (i === !0 || o === !0 ? "margin" : "border");
                return x.access(this, function(n, r, i) {
                    var o;
                    return x.isWindow(n) ? n.document.documentElement["client" + e] : 9 === n.nodeType ? (o = n.documentElement, 
                    Math.max(n.body["scroll" + e], o["scroll" + e], n.body["offset" + e], o["offset" + e], o["client" + e])) : i === t ? x.css(n, r, s) : x.style(n, r, i, s);
                }, n, a ? i : t, a, null);
            };
        });
    }), x.fn.size = function() {
        return this.length;
    }, x.fn.andSelf = x.fn.addBack, "object" == typeof module && module && "object" == typeof module.exports ? module.exports = x : (e.jQuery = e.$ = x, 
    "function" == typeof define && define.amd && define("jquery", [], function() {
        return x;
    }));
})(window);

(function(e, t) {
    function i(t, i) {
        var s, n, r, o = t.nodeName.toLowerCase();
        return "area" === o ? (s = t.parentNode, n = s.name, t.href && n && "map" === s.nodeName.toLowerCase() ? (r = e("img[usemap=#" + n + "]")[0], 
        !!r && a(r)) : !1) : (/input|select|textarea|button|object/.test(o) ? !t.disabled : "a" === o ? t.href || i : i) && a(t);
    }
    function a(t) {
        return e.expr.filters.visible(t) && !e(t).parents().addBack().filter(function() {
            return "hidden" === e.css(this, "visibility");
        }).length;
    }
    var s = 0, n = /^ui-id-\d+$/;
    e.ui = e.ui || {}, e.extend(e.ui, {
        version: "1.10.3",
        keyCode: {
            BACKSPACE: 8,
            COMMA: 188,
            DELETE: 46,
            DOWN: 40,
            END: 35,
            ENTER: 13,
            ESCAPE: 27,
            HOME: 36,
            LEFT: 37,
            NUMPAD_ADD: 107,
            NUMPAD_DECIMAL: 110,
            NUMPAD_DIVIDE: 111,
            NUMPAD_ENTER: 108,
            NUMPAD_MULTIPLY: 106,
            NUMPAD_SUBTRACT: 109,
            PAGE_DOWN: 34,
            PAGE_UP: 33,
            PERIOD: 190,
            RIGHT: 39,
            SPACE: 32,
            TAB: 9,
            UP: 38
        }
    }), e.fn.extend({
        focus: function(t) {
            return function(i, a) {
                return "number" == typeof i ? this.each(function() {
                    var t = this;
                    setTimeout(function() {
                        e(t).focus(), a && a.call(t);
                    }, i);
                }) : t.apply(this, arguments);
            };
        }(e.fn.focus),
        scrollParent: function() {
            var t;
            return t = e.ui.ie && /(static|relative)/.test(this.css("position")) || /absolute/.test(this.css("position")) ? this.parents().filter(function() {
                return /(relative|absolute|fixed)/.test(e.css(this, "position")) && /(auto|scroll)/.test(e.css(this, "overflow") + e.css(this, "overflow-y") + e.css(this, "overflow-x"));
            }).eq(0) : this.parents().filter(function() {
                return /(auto|scroll)/.test(e.css(this, "overflow") + e.css(this, "overflow-y") + e.css(this, "overflow-x"));
            }).eq(0), /fixed/.test(this.css("position")) || !t.length ? e(document) : t;
        },
        zIndex: function(i) {
            if (i !== t) return this.css("zIndex", i);
            if (this.length) for (var a, s, n = e(this[0]); n.length && n[0] !== document; ) {
                if (a = n.css("position"), ("absolute" === a || "relative" === a || "fixed" === a) && (s = parseInt(n.css("zIndex"), 10), 
                !isNaN(s) && 0 !== s)) return s;
                n = n.parent();
            }
            return 0;
        },
        uniqueId: function() {
            return this.each(function() {
                this.id || (this.id = "ui-id-" + ++s);
            });
        },
        removeUniqueId: function() {
            return this.each(function() {
                n.test(this.id) && e(this).removeAttr("id");
            });
        }
    }), e.extend(e.expr[":"], {
        data: e.expr.createPseudo ? e.expr.createPseudo(function(t) {
            return function(i) {
                return !!e.data(i, t);
            };
        }) : function(t, i, a) {
            return !!e.data(t, a[3]);
        },
        focusable: function(t) {
            return i(t, !isNaN(e.attr(t, "tabindex")));
        },
        tabbable: function(t) {
            var a = e.attr(t, "tabindex"), s = isNaN(a);
            return (s || a >= 0) && i(t, !s);
        }
    }), e("<a>").outerWidth(1).jquery || e.each([ "Width", "Height" ], function(i, a) {
        function s(t, i, a, s) {
            return e.each(n, function() {
                i -= parseFloat(e.css(t, "padding" + this)) || 0, a && (i -= parseFloat(e.css(t, "border" + this + "Width")) || 0), 
                s && (i -= parseFloat(e.css(t, "margin" + this)) || 0);
            }), i;
        }
        var n = "Width" === a ? [ "Left", "Right" ] : [ "Top", "Bottom" ], r = a.toLowerCase(), o = {
            innerWidth: e.fn.innerWidth,
            innerHeight: e.fn.innerHeight,
            outerWidth: e.fn.outerWidth,
            outerHeight: e.fn.outerHeight
        };
        e.fn["inner" + a] = function(i) {
            return i === t ? o["inner" + a].call(this) : this.each(function() {
                e(this).css(r, s(this, i) + "px");
            });
        }, e.fn["outer" + a] = function(t, i) {
            return "number" != typeof t ? o["outer" + a].call(this, t) : this.each(function() {
                e(this).css(r, s(this, t, !0, i) + "px");
            });
        };
    }), e.fn.addBack || (e.fn.addBack = function(e) {
        return this.add(null == e ? this.prevObject : this.prevObject.filter(e));
    }), e("<a>").data("a-b", "a").removeData("a-b").data("a-b") && (e.fn.removeData = function(t) {
        return function(i) {
            return arguments.length ? t.call(this, e.camelCase(i)) : t.call(this);
        };
    }(e.fn.removeData)), e.ui.ie = !!/msie [\w.]+/.exec(navigator.userAgent.toLowerCase()), 
    e.support.selectstart = "onselectstart" in document.createElement("div"), e.fn.extend({
        disableSelection: function() {
            return this.bind((e.support.selectstart ? "selectstart" : "mousedown") + ".ui-disableSelection", function(e) {
                e.preventDefault();
            });
        },
        enableSelection: function() {
            return this.unbind(".ui-disableSelection");
        }
    }), e.extend(e.ui, {
        plugin: {
            add: function(t, i, a) {
                var s, n = e.ui[t].prototype;
                for (s in a) n.plugins[s] = n.plugins[s] || [], n.plugins[s].push([ i, a[s] ]);
            },
            call: function(e, t, i) {
                var a, s = e.plugins[t];
                if (s && e.element[0].parentNode && 11 !== e.element[0].parentNode.nodeType) for (a = 0; s.length > a; a++) e.options[s[a][0]] && s[a][1].apply(e.element, i);
            }
        },
        hasScroll: function(t, i) {
            if ("hidden" === e(t).css("overflow")) return !1;
            var a = i && "left" === i ? "scrollLeft" : "scrollTop", s = !1;
            return t[a] > 0 ? !0 : (t[a] = 1, s = t[a] > 0, t[a] = 0, s);
        }
    });
})(jQuery);

(function(e, t) {
    var i = 0, s = Array.prototype.slice, a = e.cleanData;
    e.cleanData = function(t) {
        for (var i, s = 0; null != (i = t[s]); s++) try {
            e(i).triggerHandler("remove");
        } catch (n) {}
        a(t);
    }, e.widget = function(i, s, a) {
        var n, r, o, h, l = {}, u = i.split(".")[0];
        i = i.split(".")[1], n = u + "-" + i, a || (a = s, s = e.Widget), e.expr[":"][n.toLowerCase()] = function(t) {
            return !!e.data(t, n);
        }, e[u] = e[u] || {}, r = e[u][i], o = e[u][i] = function(e, i) {
            return this._createWidget ? (arguments.length && this._createWidget(e, i), t) : new o(e, i);
        }, e.extend(o, r, {
            version: a.version,
            _proto: e.extend({}, a),
            _childConstructors: []
        }), h = new s(), h.options = e.widget.extend({}, h.options), e.each(a, function(i, a) {
            return e.isFunction(a) ? (l[i] = function() {
                var e = function() {
                    return s.prototype[i].apply(this, arguments);
                }, t = function(e) {
                    return s.prototype[i].apply(this, e);
                };
                return function() {
                    var i, s = this._super, n = this._superApply;
                    return this._super = e, this._superApply = t, i = a.apply(this, arguments), this._super = s, 
                    this._superApply = n, i;
                };
            }(), t) : (l[i] = a, t);
        }), o.prototype = e.widget.extend(h, {
            widgetEventPrefix: r ? h.widgetEventPrefix : i
        }, l, {
            constructor: o,
            namespace: u,
            widgetName: i,
            widgetFullName: n
        }), r ? (e.each(r._childConstructors, function(t, i) {
            var s = i.prototype;
            e.widget(s.namespace + "." + s.widgetName, o, i._proto);
        }), delete r._childConstructors) : s._childConstructors.push(o), e.widget.bridge(i, o);
    }, e.widget.extend = function(i) {
        for (var a, n, r = s.call(arguments, 1), o = 0, h = r.length; h > o; o++) for (a in r[o]) n = r[o][a], 
        r[o].hasOwnProperty(a) && n !== t && (i[a] = e.isPlainObject(n) ? e.isPlainObject(i[a]) ? e.widget.extend({}, i[a], n) : e.widget.extend({}, n) : n);
        return i;
    }, e.widget.bridge = function(i, a) {
        var n = a.prototype.widgetFullName || i;
        e.fn[i] = function(r) {
            var o = "string" == typeof r, h = s.call(arguments, 1), l = this;
            return r = !o && h.length ? e.widget.extend.apply(null, [ r ].concat(h)) : r, o ? this.each(function() {
                var s, a = e.data(this, n);
                return a ? e.isFunction(a[r]) && "_" !== r.charAt(0) ? (s = a[r].apply(a, h), s !== a && s !== t ? (l = s && s.jquery ? l.pushStack(s.get()) : s, 
                !1) : t) : e.error("no such method '" + r + "' for " + i + " widget instance") : e.error("cannot call methods on " + i + " prior to initialization; " + "attempted to call method '" + r + "'");
            }) : this.each(function() {
                var t = e.data(this, n);
                t ? t.option(r || {})._init() : e.data(this, n, new a(r, this));
            }), l;
        };
    }, e.Widget = function() {}, e.Widget._childConstructors = [], e.Widget.prototype = {
        widgetName: "widget",
        widgetEventPrefix: "",
        defaultElement: "<div>",
        options: {
            disabled: !1,
            create: null
        },
        _createWidget: function(t, s) {
            s = e(s || this.defaultElement || this)[0], this.element = e(s), this.uuid = i++, 
            this.eventNamespace = "." + this.widgetName + this.uuid, this.options = e.widget.extend({}, this.options, this._getCreateOptions(), t), 
            this.bindings = e(), this.hoverable = e(), this.focusable = e(), s !== this && (e.data(s, this.widgetFullName, this), 
            this._on(!0, this.element, {
                remove: function(e) {
                    e.target === s && this.destroy();
                }
            }), this.document = e(s.style ? s.ownerDocument : s.document || s), this.window = e(this.document[0].defaultView || this.document[0].parentWindow)), 
            this._create(), this._trigger("create", null, this._getCreateEventData()), this._init();
        },
        _getCreateOptions: e.noop,
        _getCreateEventData: e.noop,
        _create: e.noop,
        _init: e.noop,
        destroy: function() {
            this._destroy(), this.element.unbind(this.eventNamespace).removeData(this.widgetName).removeData(this.widgetFullName).removeData(e.camelCase(this.widgetFullName)), 
            this.widget().unbind(this.eventNamespace).removeAttr("aria-disabled").removeClass(this.widgetFullName + "-disabled " + "ui-state-disabled"), 
            this.bindings.unbind(this.eventNamespace), this.hoverable.removeClass("ui-state-hover"), 
            this.focusable.removeClass("ui-state-focus");
        },
        _destroy: e.noop,
        widget: function() {
            return this.element;
        },
        option: function(i, s) {
            var a, n, r, o = i;
            if (0 === arguments.length) return e.widget.extend({}, this.options);
            if ("string" == typeof i) if (o = {}, a = i.split("."), i = a.shift(), a.length) {
                for (n = o[i] = e.widget.extend({}, this.options[i]), r = 0; a.length - 1 > r; r++) n[a[r]] = n[a[r]] || {}, 
                n = n[a[r]];
                if (i = a.pop(), s === t) return n[i] === t ? null : n[i];
                n[i] = s;
            } else {
                if (s === t) return this.options[i] === t ? null : this.options[i];
                o[i] = s;
            }
            return this._setOptions(o), this;
        },
        _setOptions: function(e) {
            var t;
            for (t in e) this._setOption(t, e[t]);
            return this;
        },
        _setOption: function(e, t) {
            return this.options[e] = t, "disabled" === e && (this.widget().toggleClass(this.widgetFullName + "-disabled ui-state-disabled", !!t).attr("aria-disabled", t), 
            this.hoverable.removeClass("ui-state-hover"), this.focusable.removeClass("ui-state-focus")), 
            this;
        },
        enable: function() {
            return this._setOption("disabled", !1);
        },
        disable: function() {
            return this._setOption("disabled", !0);
        },
        _on: function(i, s, a) {
            var n, r = this;
            "boolean" != typeof i && (a = s, s = i, i = !1), a ? (s = n = e(s), this.bindings = this.bindings.add(s)) : (a = s, 
            s = this.element, n = this.widget()), e.each(a, function(a, o) {
                function h() {
                    return i || r.options.disabled !== !0 && !e(this).hasClass("ui-state-disabled") ? ("string" == typeof o ? r[o] : o).apply(r, arguments) : t;
                }
                "string" != typeof o && (h.guid = o.guid = o.guid || h.guid || e.guid++);
                var l = a.match(/^(\w+)\s*(.*)$/), u = l[1] + r.eventNamespace, c = l[2];
                c ? n.delegate(c, u, h) : s.bind(u, h);
            });
        },
        _off: function(e, t) {
            t = (t || "").split(" ").join(this.eventNamespace + " ") + this.eventNamespace, 
            e.unbind(t).undelegate(t);
        },
        _delay: function(e, t) {
            function i() {
                return ("string" == typeof e ? s[e] : e).apply(s, arguments);
            }
            var s = this;
            return setTimeout(i, t || 0);
        },
        _hoverable: function(t) {
            this.hoverable = this.hoverable.add(t), this._on(t, {
                mouseenter: function(t) {
                    e(t.currentTarget).addClass("ui-state-hover");
                },
                mouseleave: function(t) {
                    e(t.currentTarget).removeClass("ui-state-hover");
                }
            });
        },
        _focusable: function(t) {
            this.focusable = this.focusable.add(t), this._on(t, {
                focusin: function(t) {
                    e(t.currentTarget).addClass("ui-state-focus");
                },
                focusout: function(t) {
                    e(t.currentTarget).removeClass("ui-state-focus");
                }
            });
        },
        _trigger: function(t, i, s) {
            var a, n, r = this.options[t];
            if (s = s || {}, i = e.Event(i), i.type = (t === this.widgetEventPrefix ? t : this.widgetEventPrefix + t).toLowerCase(), 
            i.target = this.element[0], n = i.originalEvent) for (a in n) a in i || (i[a] = n[a]);
            return this.element.trigger(i, s), !(e.isFunction(r) && r.apply(this.element[0], [ i ].concat(s)) === !1 || i.isDefaultPrevented());
        }
    }, e.each({
        show: "fadeIn",
        hide: "fadeOut"
    }, function(t, i) {
        e.Widget.prototype["_" + t] = function(s, a, n) {
            "string" == typeof a && (a = {
                effect: a
            });
            var r, o = a ? a === !0 || "number" == typeof a ? i : a.effect || i : t;
            a = a || {}, "number" == typeof a && (a = {
                duration: a
            }), r = !e.isEmptyObject(a), a.complete = n, a.delay && s.delay(a.delay), r && e.effects && e.effects.effect[o] ? s[t](a) : o !== t && s[o] ? s[o](a.duration, a.easing, n) : s.queue(function(i) {
                e(this)[t](), n && n.call(s[0]), i();
            });
        };
    });
})(jQuery);

(function(e) {
    var t = !1;
    e(document).mouseup(function() {
        t = !1;
    }), e.widget("ui.mouse", {
        version: "1.10.3",
        options: {
            cancel: "input,textarea,button,select,option",
            distance: 1,
            delay: 0
        },
        _mouseInit: function() {
            var t = this;
            this.element.bind("mousedown." + this.widgetName, function(e) {
                return t._mouseDown(e);
            }).bind("click." + this.widgetName, function(i) {
                return !0 === e.data(i.target, t.widgetName + ".preventClickEvent") ? (e.removeData(i.target, t.widgetName + ".preventClickEvent"), 
                i.stopImmediatePropagation(), !1) : undefined;
            }), this.started = !1;
        },
        _mouseDestroy: function() {
            this.element.unbind("." + this.widgetName), this._mouseMoveDelegate && e(document).unbind("mousemove." + this.widgetName, this._mouseMoveDelegate).unbind("mouseup." + this.widgetName, this._mouseUpDelegate);
        },
        _mouseDown: function(i) {
            if (!t) {
                this._mouseStarted && this._mouseUp(i), this._mouseDownEvent = i;
                var s = this, a = 1 === i.which, n = "string" == typeof this.options.cancel && i.target.nodeName ? e(i.target).closest(this.options.cancel).length : !1;
                return a && !n && this._mouseCapture(i) ? (this.mouseDelayMet = !this.options.delay, 
                this.mouseDelayMet || (this._mouseDelayTimer = setTimeout(function() {
                    s.mouseDelayMet = !0;
                }, this.options.delay)), this._mouseDistanceMet(i) && this._mouseDelayMet(i) && (this._mouseStarted = this._mouseStart(i) !== !1, 
                !this._mouseStarted) ? (i.preventDefault(), !0) : (!0 === e.data(i.target, this.widgetName + ".preventClickEvent") && e.removeData(i.target, this.widgetName + ".preventClickEvent"), 
                this._mouseMoveDelegate = function(e) {
                    return s._mouseMove(e);
                }, this._mouseUpDelegate = function(e) {
                    return s._mouseUp(e);
                }, e(document).bind("mousemove." + this.widgetName, this._mouseMoveDelegate).bind("mouseup." + this.widgetName, this._mouseUpDelegate), 
                i.preventDefault(), t = !0, !0)) : !0;
            }
        },
        _mouseMove: function(t) {
            return e.ui.ie && (!document.documentMode || 9 > document.documentMode) && !t.button ? this._mouseUp(t) : this._mouseStarted ? (this._mouseDrag(t), 
            t.preventDefault()) : (this._mouseDistanceMet(t) && this._mouseDelayMet(t) && (this._mouseStarted = this._mouseStart(this._mouseDownEvent, t) !== !1, 
            this._mouseStarted ? this._mouseDrag(t) : this._mouseUp(t)), !this._mouseStarted);
        },
        _mouseUp: function(t) {
            return e(document).unbind("mousemove." + this.widgetName, this._mouseMoveDelegate).unbind("mouseup." + this.widgetName, this._mouseUpDelegate), 
            this._mouseStarted && (this._mouseStarted = !1, t.target === this._mouseDownEvent.target && e.data(t.target, this.widgetName + ".preventClickEvent", !0), 
            this._mouseStop(t)), !1;
        },
        _mouseDistanceMet: function(e) {
            return Math.max(Math.abs(this._mouseDownEvent.pageX - e.pageX), Math.abs(this._mouseDownEvent.pageY - e.pageY)) >= this.options.distance;
        },
        _mouseDelayMet: function() {
            return this.mouseDelayMet;
        },
        _mouseStart: function() {},
        _mouseDrag: function() {},
        _mouseStop: function() {},
        _mouseCapture: function() {
            return !0;
        }
    });
})(jQuery);

(function(e) {
    var t = 5;
    e.widget("ui.slider", e.ui.mouse, {
        version: "1.10.3",
        widgetEventPrefix: "slide",
        options: {
            animate: !1,
            distance: 0,
            max: 100,
            min: 0,
            orientation: "horizontal",
            range: !1,
            step: 1,
            value: 0,
            values: null,
            change: null,
            slide: null,
            start: null,
            stop: null
        },
        _create: function() {
            this._keySliding = !1, this._mouseSliding = !1, this._animateOff = !0, this._handleIndex = null, 
            this._detectOrientation(), this._mouseInit(), this.element.addClass("ui-slider ui-slider-" + this.orientation + " ui-widget" + " ui-widget-content" + " ui-corner-all"), 
            this._refresh(), this._setOption("disabled", this.options.disabled), this._animateOff = !1;
        },
        _refresh: function() {
            this._createRange(), this._createHandles(), this._setupEvents(), this._refreshValue();
        },
        _createHandles: function() {
            var t, i, s = this.options, a = this.element.find(".ui-slider-handle").addClass("ui-state-default ui-corner-all"), n = "<a class='ui-slider-handle ui-state-default ui-corner-all' href='#'></a>", r = [];
            for (i = s.values && s.values.length || 1, a.length > i && (a.slice(i).remove(), 
            a = a.slice(0, i)), t = a.length; i > t; t++) r.push(n);
            this.handles = a.add(e(r.join("")).appendTo(this.element)), this.handle = this.handles.eq(0), 
            this.handles.each(function(t) {
                e(this).data("ui-slider-handle-index", t);
            });
        },
        _createRange: function() {
            var t = this.options, i = "";
            t.range ? (t.range === !0 && (t.values ? t.values.length && 2 !== t.values.length ? t.values = [ t.values[0], t.values[0] ] : e.isArray(t.values) && (t.values = t.values.slice(0)) : t.values = [ this._valueMin(), this._valueMin() ]), 
            this.range && this.range.length ? this.range.removeClass("ui-slider-range-min ui-slider-range-max").css({
                left: "",
                bottom: ""
            }) : (this.range = e("<div></div>").appendTo(this.element), i = "ui-slider-range ui-widget-header ui-corner-all"), 
            this.range.addClass(i + ("min" === t.range || "max" === t.range ? " ui-slider-range-" + t.range : ""))) : this.range = e([]);
        },
        _setupEvents: function() {
            var e = this.handles.add(this.range).filter("a");
            this._off(e), this._on(e, this._handleEvents), this._hoverable(e), this._focusable(e);
        },
        _destroy: function() {
            this.handles.remove(), this.range.remove(), this.element.removeClass("ui-slider ui-slider-horizontal ui-slider-vertical ui-widget ui-widget-content ui-corner-all"), 
            this._mouseDestroy();
        },
        _mouseCapture: function(t) {
            var i, s, a, n, r, o, h, l, u = this, c = this.options;
            return c.disabled ? !1 : (this.elementSize = {
                width: this.element.outerWidth(),
                height: this.element.outerHeight()
            }, this.elementOffset = this.element.offset(), i = {
                x: t.pageX,
                y: t.pageY
            }, s = this._normValueFromMouse(i), a = this._valueMax() - this._valueMin() + 1, 
            this.handles.each(function(t) {
                var i = Math.abs(s - u.values(t));
                (a > i || a === i && (t === u._lastChangedValue || u.values(t) === c.min)) && (a = i, 
                n = e(this), r = t);
            }), o = this._start(t, r), o === !1 ? !1 : (this._mouseSliding = !0, this._handleIndex = r, 
            n.addClass("ui-state-active").focus(), h = n.offset(), l = !e(t.target).parents().addBack().is(".ui-slider-handle"), 
            this._clickOffset = l ? {
                left: 0,
                top: 0
            } : {
                left: t.pageX - h.left - n.width() / 2,
                top: t.pageY - h.top - n.height() / 2 - (parseInt(n.css("borderTopWidth"), 10) || 0) - (parseInt(n.css("borderBottomWidth"), 10) || 0) + (parseInt(n.css("marginTop"), 10) || 0)
            }, this.handles.hasClass("ui-state-hover") || this._slide(t, r, s), this._animateOff = !0, 
            !0));
        },
        _mouseStart: function() {
            return !0;
        },
        _mouseDrag: function(e) {
            var t = {
                x: e.pageX,
                y: e.pageY
            }, i = this._normValueFromMouse(t);
            return this._slide(e, this._handleIndex, i), !1;
        },
        _mouseStop: function(e) {
            return this.handles.removeClass("ui-state-active"), this._mouseSliding = !1, this._stop(e, this._handleIndex), 
            this._change(e, this._handleIndex), this._handleIndex = null, this._clickOffset = null, 
            this._animateOff = !1, !1;
        },
        _detectOrientation: function() {
            this.orientation = "vertical" === this.options.orientation ? "vertical" : "horizontal";
        },
        _normValueFromMouse: function(e) {
            var t, i, s, a, n;
            return "horizontal" === this.orientation ? (t = this.elementSize.width, i = e.x - this.elementOffset.left - (this._clickOffset ? this._clickOffset.left : 0)) : (t = this.elementSize.height, 
            i = e.y - this.elementOffset.top - (this._clickOffset ? this._clickOffset.top : 0)), 
            s = i / t, s > 1 && (s = 1), 0 > s && (s = 0), "vertical" === this.orientation && (s = 1 - s), 
            a = this._valueMax() - this._valueMin(), n = this._valueMin() + s * a, this._trimAlignValue(n);
        },
        _start: function(e, t) {
            var i = {
                handle: this.handles[t],
                value: this.value()
            };
            return this.options.values && this.options.values.length && (i.value = this.values(t), 
            i.values = this.values()), this._trigger("start", e, i);
        },
        _slide: function(e, t, i) {
            var s, a, n;
            this.options.values && this.options.values.length ? (s = this.values(t ? 0 : 1), 
            2 === this.options.values.length && this.options.range === !0 && (0 === t && i > s || 1 === t && s > i) && (i = s), 
            i !== this.values(t) && (a = this.values(), a[t] = i, n = this._trigger("slide", e, {
                handle: this.handles[t],
                value: i,
                values: a
            }), s = this.values(t ? 0 : 1), n !== !1 && this.values(t, i, !0))) : i !== this.value() && (n = this._trigger("slide", e, {
                handle: this.handles[t],
                value: i
            }), n !== !1 && this.value(i));
        },
        _stop: function(e, t) {
            var i = {
                handle: this.handles[t],
                value: this.value()
            };
            this.options.values && this.options.values.length && (i.value = this.values(t), 
            i.values = this.values()), this._trigger("stop", e, i);
        },
        _change: function(e, t) {
            if (!this._keySliding && !this._mouseSliding) {
                var i = {
                    handle: this.handles[t],
                    value: this.value()
                };
                this.options.values && this.options.values.length && (i.value = this.values(t), 
                i.values = this.values()), this._lastChangedValue = t, this._trigger("change", e, i);
            }
        },
        value: function(e) {
            return arguments.length ? (this.options.value = this._trimAlignValue(e), this._refreshValue(), 
            this._change(null, 0), undefined) : this._value();
        },
        values: function(t, i) {
            var s, a, n;
            if (arguments.length > 1) return this.options.values[t] = this._trimAlignValue(i), 
            this._refreshValue(), this._change(null, t), undefined;
            if (!arguments.length) return this._values();
            if (!e.isArray(arguments[0])) return this.options.values && this.options.values.length ? this._values(t) : this.value();
            for (s = this.options.values, a = arguments[0], n = 0; s.length > n; n += 1) s[n] = this._trimAlignValue(a[n]), 
            this._change(null, n);
            this._refreshValue();
        },
        _setOption: function(t, i) {
            var s, a = 0;
            switch ("range" === t && this.options.range === !0 && ("min" === i ? (this.options.value = this._values(0), 
            this.options.values = null) : "max" === i && (this.options.value = this._values(this.options.values.length - 1), 
            this.options.values = null)), e.isArray(this.options.values) && (a = this.options.values.length), 
            e.Widget.prototype._setOption.apply(this, arguments), t) {
              case "orientation":
                this._detectOrientation(), this.element.removeClass("ui-slider-horizontal ui-slider-vertical").addClass("ui-slider-" + this.orientation), 
                this._refreshValue();
                break;

              case "value":
                this._animateOff = !0, this._refreshValue(), this._change(null, 0), this._animateOff = !1;
                break;

              case "values":
                for (this._animateOff = !0, this._refreshValue(), s = 0; a > s; s += 1) this._change(null, s);
                this._animateOff = !1;
                break;

              case "min":
              case "max":
                this._animateOff = !0, this._refreshValue(), this._animateOff = !1;
                break;

              case "range":
                this._animateOff = !0, this._refresh(), this._animateOff = !1;
            }
        },
        _value: function() {
            var e = this.options.value;
            return e = this._trimAlignValue(e);
        },
        _values: function(e) {
            var t, i, s;
            if (arguments.length) return t = this.options.values[e], t = this._trimAlignValue(t);
            if (this.options.values && this.options.values.length) {
                for (i = this.options.values.slice(), s = 0; i.length > s; s += 1) i[s] = this._trimAlignValue(i[s]);
                return i;
            }
            return [];
        },
        _trimAlignValue: function(e) {
            if (this._valueMin() >= e) return this._valueMin();
            if (e >= this._valueMax()) return this._valueMax();
            var t = this.options.step > 0 ? this.options.step : 1, i = (e - this._valueMin()) % t, s = e - i;
            return 2 * Math.abs(i) >= t && (s += i > 0 ? t : -t), parseFloat(s.toFixed(5));
        },
        _valueMin: function() {
            return this.options.min;
        },
        _valueMax: function() {
            return this.options.max;
        },
        _refreshValue: function() {
            var t, i, s, a, n, r = this.options.range, o = this.options, h = this, l = this._animateOff ? !1 : o.animate, u = {};
            this.options.values && this.options.values.length ? this.handles.each(function(s) {
                i = 100 * ((h.values(s) - h._valueMin()) / (h._valueMax() - h._valueMin())), u["horizontal" === h.orientation ? "left" : "bottom"] = i + "%", 
                e(this).stop(1, 1)[l ? "animate" : "css"](u, o.animate), h.options.range === !0 && ("horizontal" === h.orientation ? (0 === s && h.range.stop(1, 1)[l ? "animate" : "css"]({
                    left: i + "%"
                }, o.animate), 1 === s && h.range[l ? "animate" : "css"]({
                    width: i - t + "%"
                }, {
                    queue: !1,
                    duration: o.animate
                })) : (0 === s && h.range.stop(1, 1)[l ? "animate" : "css"]({
                    bottom: i + "%"
                }, o.animate), 1 === s && h.range[l ? "animate" : "css"]({
                    height: i - t + "%"
                }, {
                    queue: !1,
                    duration: o.animate
                }))), t = i;
            }) : (s = this.value(), a = this._valueMin(), n = this._valueMax(), i = n !== a ? 100 * ((s - a) / (n - a)) : 0, 
            u["horizontal" === this.orientation ? "left" : "bottom"] = i + "%", this.handle.stop(1, 1)[l ? "animate" : "css"](u, o.animate), 
            "min" === r && "horizontal" === this.orientation && this.range.stop(1, 1)[l ? "animate" : "css"]({
                width: i + "%"
            }, o.animate), "max" === r && "horizontal" === this.orientation && this.range[l ? "animate" : "css"]({
                width: 100 - i + "%"
            }, {
                queue: !1,
                duration: o.animate
            }), "min" === r && "vertical" === this.orientation && this.range.stop(1, 1)[l ? "animate" : "css"]({
                height: i + "%"
            }, o.animate), "max" === r && "vertical" === this.orientation && this.range[l ? "animate" : "css"]({
                height: 100 - i + "%"
            }, {
                queue: !1,
                duration: o.animate
            }));
        },
        _handleEvents: {
            keydown: function(i) {
                var s, a, n, r, o = e(i.target).data("ui-slider-handle-index");
                switch (i.keyCode) {
                  case e.ui.keyCode.HOME:
                  case e.ui.keyCode.END:
                  case e.ui.keyCode.PAGE_UP:
                  case e.ui.keyCode.PAGE_DOWN:
                  case e.ui.keyCode.UP:
                  case e.ui.keyCode.RIGHT:
                  case e.ui.keyCode.DOWN:
                  case e.ui.keyCode.LEFT:
                    if (i.preventDefault(), !this._keySliding && (this._keySliding = !0, e(i.target).addClass("ui-state-active"), 
                    s = this._start(i, o), s === !1)) return;
                }
                switch (r = this.options.step, a = n = this.options.values && this.options.values.length ? this.values(o) : this.value(), 
                i.keyCode) {
                  case e.ui.keyCode.HOME:
                    n = this._valueMin();
                    break;

                  case e.ui.keyCode.END:
                    n = this._valueMax();
                    break;

                  case e.ui.keyCode.PAGE_UP:
                    n = this._trimAlignValue(a + (this._valueMax() - this._valueMin()) / t);
                    break;

                  case e.ui.keyCode.PAGE_DOWN:
                    n = this._trimAlignValue(a - (this._valueMax() - this._valueMin()) / t);
                    break;

                  case e.ui.keyCode.UP:
                  case e.ui.keyCode.RIGHT:
                    if (a === this._valueMax()) return;
                    n = this._trimAlignValue(a + r);
                    break;

                  case e.ui.keyCode.DOWN:
                  case e.ui.keyCode.LEFT:
                    if (a === this._valueMin()) return;
                    n = this._trimAlignValue(a - r);
                }
                this._slide(i, o, n);
            },
            click: function(e) {
                e.preventDefault();
            },
            keyup: function(t) {
                var i = e(t.target).data("ui-slider-handle-index");
                this._keySliding && (this._keySliding = !1, this._stop(t, i), this._change(t, i), 
                e(t.target).removeClass("ui-state-active"));
            }
        }
    });
})(jQuery);

(function(e) {
    e.color = {};
    e.color.make = function(t, n, r, i) {
        var s = {};
        s.r = t || 0;
        s.g = n || 0;
        s.b = r || 0;
        s.a = i != null ? i : 1;
        s.add = function(e, t) {
            for (var n = 0; n < e.length; ++n) {
                s[e.charAt(n)] += t;
            }
            return s.normalize();
        };
        s.scale = function(e, t) {
            for (var n = 0; n < e.length; ++n) {
                s[e.charAt(n)] *= t;
            }
            return s.normalize();
        };
        s.toString = function() {
            if (s.a >= 1) {
                return "rgb(" + [ s.r, s.g, s.b ].join(",") + ")";
            } else {
                return "rgba(" + [ s.r, s.g, s.b, s.a ].join(",") + ")";
            }
        };
        s.normalize = function() {
            function e(e, t, n) {
                return t < e ? e : t > n ? n : t;
            }
            s.r = e(0, parseInt(s.r), 255);
            s.g = e(0, parseInt(s.g), 255);
            s.b = e(0, parseInt(s.b), 255);
            s.a = e(0, s.a, 1);
            return s;
        };
        s.clone = function() {
            return e.color.make(s.r, s.b, s.g, s.a);
        };
        return s.normalize();
    };
    e.color.extract = function(t, n) {
        var r;
        do {
            r = t.css(n).toLowerCase();
            if (r != "" && r != "transparent") {
                break;
            }
            t = t.parent();
        } while (!e.nodeName(t.get(0), "body"));
        if (r == "rgba(0, 0, 0, 0)") {
            r = "transparent";
        }
        return e.color.parse(r);
    };
    e.color.parse = function(n) {
        var r, i = e.color.make;
        if (r = /rgb\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*\)/.exec(n)) {
            return i(parseInt(r[1], 10), parseInt(r[2], 10), parseInt(r[3], 10));
        }
        if (r = /rgba\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]+(?:\.[0-9]+)?)\s*\)/.exec(n)) {
            return i(parseInt(r[1], 10), parseInt(r[2], 10), parseInt(r[3], 10), parseFloat(r[4]));
        }
        if (r = /rgb\(\s*([0-9]+(?:\.[0-9]+)?)\%\s*,\s*([0-9]+(?:\.[0-9]+)?)\%\s*,\s*([0-9]+(?:\.[0-9]+)?)\%\s*\)/.exec(n)) {
            return i(parseFloat(r[1]) * 2.55, parseFloat(r[2]) * 2.55, parseFloat(r[3]) * 2.55);
        }
        if (r = /rgba\(\s*([0-9]+(?:\.[0-9]+)?)\%\s*,\s*([0-9]+(?:\.[0-9]+)?)\%\s*,\s*([0-9]+(?:\.[0-9]+)?)\%\s*,\s*([0-9]+(?:\.[0-9]+)?)\s*\)/.exec(n)) {
            return i(parseFloat(r[1]) * 2.55, parseFloat(r[2]) * 2.55, parseFloat(r[3]) * 2.55, parseFloat(r[4]));
        }
        if (r = /#([a-fA-F0-9]{2})([a-fA-F0-9]{2})([a-fA-F0-9]{2})/.exec(n)) {
            return i(parseInt(r[1], 16), parseInt(r[2], 16), parseInt(r[3], 16));
        }
        if (r = /#([a-fA-F0-9])([a-fA-F0-9])([a-fA-F0-9])/.exec(n)) {
            return i(parseInt(r[1] + r[1], 16), parseInt(r[2] + r[2], 16), parseInt(r[3] + r[3], 16));
        }
        var s = e.trim(n).toLowerCase();
        if (s == "transparent") {
            return i(255, 255, 255, 0);
        } else {
            r = t[s] || [ 0, 0, 0 ];
            return i(r[0], r[1], r[2]);
        }
    };
    var t = {
        aqua: [ 0, 255, 255 ],
        azure: [ 240, 255, 255 ],
        beige: [ 245, 245, 220 ],
        black: [ 0, 0, 0 ],
        blue: [ 0, 0, 255 ],
        brown: [ 165, 42, 42 ],
        cyan: [ 0, 255, 255 ],
        darkblue: [ 0, 0, 139 ],
        darkcyan: [ 0, 139, 139 ],
        darkgrey: [ 169, 169, 169 ],
        darkgreen: [ 0, 100, 0 ],
        darkkhaki: [ 189, 183, 107 ],
        darkmagenta: [ 139, 0, 139 ],
        darkolivegreen: [ 85, 107, 47 ],
        darkorange: [ 255, 140, 0 ],
        darkorchid: [ 153, 50, 204 ],
        darkred: [ 139, 0, 0 ],
        darksalmon: [ 233, 150, 122 ],
        darkviolet: [ 148, 0, 211 ],
        fuchsia: [ 255, 0, 255 ],
        gold: [ 255, 215, 0 ],
        green: [ 0, 128, 0 ],
        indigo: [ 75, 0, 130 ],
        khaki: [ 240, 230, 140 ],
        lightblue: [ 173, 216, 230 ],
        lightcyan: [ 224, 255, 255 ],
        lightgreen: [ 144, 238, 144 ],
        lightgrey: [ 211, 211, 211 ],
        lightpink: [ 255, 182, 193 ],
        lightyellow: [ 255, 255, 224 ],
        lime: [ 0, 255, 0 ],
        magenta: [ 255, 0, 255 ],
        maroon: [ 128, 0, 0 ],
        navy: [ 0, 0, 128 ],
        olive: [ 128, 128, 0 ],
        orange: [ 255, 165, 0 ],
        pink: [ 255, 192, 203 ],
        purple: [ 128, 0, 128 ],
        violet: [ 128, 0, 128 ],
        red: [ 255, 0, 0 ],
        silver: [ 192, 192, 192 ],
        white: [ 255, 255, 255 ],
        yellow: [ 255, 255, 0 ]
    };
})(jQuery);

(function(e) {
    function t(t, r, s, o) {
        function x(e, t) {
            t = [ S ].concat(t);
            for (var n = 0; n < e.length; ++n) e[n].apply(this, t);
        }
        function T() {
            for (var t = 0; t < o.length; ++t) {
                var n = o[t];
                n.init(S);
                if (n.options) e.extend(true, a, n.options);
            }
        }
        function N(t) {
            var n;
            e.extend(true, a, t);
            if (a.xaxis.color == null) a.xaxis.color = a.grid.color;
            if (a.yaxis.color == null) a.yaxis.color = a.grid.color;
            if (a.xaxis.tickColor == null) a.xaxis.tickColor = a.grid.tickColor;
            if (a.yaxis.tickColor == null) a.yaxis.tickColor = a.grid.tickColor;
            if (a.grid.borderColor == null) a.grid.borderColor = a.grid.color;
            if (a.grid.tickColor == null) a.grid.tickColor = e.color.parse(a.grid.color).scale("a", .22).toString();
            for (n = 0; n < Math.max(1, a.xaxes.length); ++n) a.xaxes[n] = e.extend(true, {}, a.xaxis, a.xaxes[n]);
            for (n = 0; n < Math.max(1, a.yaxes.length); ++n) a.yaxes[n] = e.extend(true, {}, a.yaxis, a.yaxes[n]);
            if (a.xaxis.noTicks && a.xaxis.ticks == null) a.xaxis.ticks = a.xaxis.noTicks;
            if (a.yaxis.noTicks && a.yaxis.ticks == null) a.yaxis.ticks = a.yaxis.noTicks;
            if (a.x2axis) {
                a.xaxes[1] = e.extend(true, {}, a.xaxis, a.x2axis);
                a.xaxes[1].position = "top";
            }
            if (a.y2axis) {
                a.yaxes[1] = e.extend(true, {}, a.yaxis, a.y2axis);
                a.yaxes[1].position = "right";
            }
            if (a.grid.coloredAreas) a.grid.markings = a.grid.coloredAreas;
            if (a.grid.coloredAreasColor) a.grid.markingsColor = a.grid.coloredAreasColor;
            if (a.lines) e.extend(true, a.series.lines, a.lines);
            if (a.points) e.extend(true, a.series.points, a.points);
            if (a.bars) e.extend(true, a.series.bars, a.bars);
            if (a.shadowSize != null) a.series.shadowSize = a.shadowSize;
            for (n = 0; n < a.xaxes.length; ++n) _(d, n + 1).options = a.xaxes[n];
            for (n = 0; n < a.yaxes.length; ++n) _(v, n + 1).options = a.yaxes[n];
            for (var r in E) if (a.hooks[r] && a.hooks[r].length) E[r] = E[r].concat(a.hooks[r]);
            x(E.processOptions, [ a ]);
        }
        function C(e) {
            u = k(e);
            D();
            P();
        }
        function k(t) {
            var n = [];
            for (var r = 0; r < t.length; ++r) {
                var i = e.extend(true, {}, a.series);
                if (t[r].data != null) {
                    i.data = t[r].data;
                    delete t[r].data;
                    e.extend(true, i, t[r]);
                    t[r].data = i.data;
                } else i.data = t[r];
                n.push(i);
            }
            return n;
        }
        function L(e, t) {
            var n = e[t + "axis"];
            if (typeof n == "object") n = n.n;
            if (typeof n != "number") n = 1;
            return n;
        }
        function A() {
            return e.grep(d.concat(v), function(e) {
                return e;
            });
        }
        function O(e) {
            var t = {}, n, r;
            for (n = 0; n < d.length; ++n) {
                r = d[n];
                if (r && r.used) t["x" + r.n] = r.c2p(e.left);
            }
            for (n = 0; n < v.length; ++n) {
                r = v[n];
                if (r && r.used) t["y" + r.n] = r.c2p(e.top);
            }
            if (t.x1 !== undefined) t.x = t.x1;
            if (t.y1 !== undefined) t.y = t.y1;
            return t;
        }
        function M(e) {
            var t = {}, n, r, i;
            for (n = 0; n < d.length; ++n) {
                r = d[n];
                if (r && r.used) {
                    i = "x" + r.n;
                    if (e[i] == null && r.n == 1) i = "x";
                    if (e[i] != null) {
                        t.left = r.p2c(e[i]);
                        break;
                    }
                }
            }
            for (n = 0; n < v.length; ++n) {
                r = v[n];
                if (r && r.used) {
                    i = "y" + r.n;
                    if (e[i] == null && r.n == 1) i = "y";
                    if (e[i] != null) {
                        t.top = r.p2c(e[i]);
                        break;
                    }
                }
            }
            return t;
        }
        function _(t, n) {
            if (!t[n - 1]) t[n - 1] = {
                n: n,
                direction: t == d ? "x" : "y",
                options: e.extend(true, {}, t == d ? a.xaxis : a.yaxis)
            };
            return t[n - 1];
        }
        function D() {
            var t;
            var n = u.length, r = [], i = [];
            for (t = 0; t < u.length; ++t) {
                var s = u[t].color;
                if (s != null) {
                    --n;
                    if (typeof s == "number") i.push(s); else r.push(e.color.parse(u[t].color));
                }
            }
            for (t = 0; t < i.length; ++t) {
                n = Math.max(n, i[t] + 1);
            }
            var o = [], f = 0;
            t = 0;
            while (o.length < n) {
                var l;
                if (a.colors.length == t) l = e.color.make(100, 100, 100); else l = e.color.parse(a.colors[t]);
                var c = f % 2 == 1 ? -1 : 1;
                l.scale("rgb", 1 + c * Math.ceil(f / 2) * .2);
                o.push(l);
                ++t;
                if (t >= a.colors.length) {
                    t = 0;
                    ++f;
                }
            }
            var h = 0, p;
            for (t = 0; t < u.length; ++t) {
                p = u[t];
                if (p.color == null) {
                    p.color = o[h].toString();
                    ++h;
                } else if (typeof p.color == "number") p.color = o[p.color].toString();
                if (p.lines.show == null) {
                    var m, g = true;
                    for (m in p) if (p[m] && p[m].show) {
                        g = false;
                        break;
                    }
                    if (g) p.lines.show = true;
                }
                p.xaxis = _(d, L(p, "x"));
                p.yaxis = _(v, L(p, "y"));
            }
        }
        function P() {
            function b(e, t, n) {
                if (t < e.datamin && t != -r) e.datamin = t;
                if (n > e.datamax && n != r) e.datamax = n;
            }
            var t = Number.POSITIVE_INFINITY, n = Number.NEGATIVE_INFINITY, r = Number.MAX_VALUE, i, s, o, a, f, l, c, h, p, d, v, m, g, y;
            e.each(A(), function(e, r) {
                r.datamin = t;
                r.datamax = n;
                r.used = false;
            });
            for (i = 0; i < u.length; ++i) {
                l = u[i];
                l.datapoints = {
                    points: []
                };
                x(E.processRawData, [ l, l.data, l.datapoints ]);
            }
            for (i = 0; i < u.length; ++i) {
                l = u[i];
                var w = l.data, S = l.datapoints.format;
                if (!S) {
                    S = [];
                    S.push({
                        x: true,
                        number: true,
                        required: true
                    });
                    S.push({
                        y: true,
                        number: true,
                        required: true
                    });
                    if (l.bars.show || l.lines.show && l.lines.fill) {
                        S.push({
                            y: true,
                            number: true,
                            required: false,
                            defaultValue: 0
                        });
                        if (l.bars.horizontal) {
                            delete S[S.length - 1].y;
                            S[S.length - 1].x = true;
                        }
                    }
                    l.datapoints.format = S;
                }
                if (l.datapoints.pointsize != null) continue;
                l.datapoints.pointsize = S.length;
                h = l.datapoints.pointsize;
                c = l.datapoints.points;
                insertSteps = l.lines.show && l.lines.steps;
                l.xaxis.used = l.yaxis.used = true;
                for (s = o = 0; s < w.length; ++s, o += h) {
                    y = w[s];
                    var T = y == null;
                    if (!T) {
                        for (a = 0; a < h; ++a) {
                            m = y[a];
                            g = S[a];
                            if (g) {
                                if (g.number && m != null) {
                                    m = +m;
                                    if (isNaN(m)) m = null; else if (m == Infinity) m = r; else if (m == -Infinity) m = -r;
                                }
                                if (m == null) {
                                    if (g.required) T = true;
                                    if (g.defaultValue != null) m = g.defaultValue;
                                }
                            }
                            c[o + a] = m;
                        }
                    }
                    if (T) {
                        for (a = 0; a < h; ++a) {
                            m = c[o + a];
                            if (m != null) {
                                g = S[a];
                                if (g.x) b(l.xaxis, m, m);
                                if (g.y) b(l.yaxis, m, m);
                            }
                            c[o + a] = null;
                        }
                    } else {
                        if (insertSteps && o > 0 && c[o - h] != null && c[o - h] != c[o] && c[o - h + 1] != c[o + 1]) {
                            for (a = 0; a < h; ++a) c[o + h + a] = c[o + a];
                            c[o + 1] = c[o - h + 1];
                            o += h;
                        }
                    }
                }
            }
            for (i = 0; i < u.length; ++i) {
                l = u[i];
                x(E.processDatapoints, [ l, l.datapoints ]);
            }
            for (i = 0; i < u.length; ++i) {
                l = u[i];
                c = l.datapoints.points, h = l.datapoints.pointsize;
                var N = t, C = t, k = n, L = n;
                for (s = 0; s < c.length; s += h) {
                    if (c[s] == null) continue;
                    for (a = 0; a < h; ++a) {
                        m = c[s + a];
                        g = S[a];
                        if (!g || m == r || m == -r) continue;
                        if (g.x) {
                            if (m < N) N = m;
                            if (m > k) k = m;
                        }
                        if (g.y) {
                            if (m < C) C = m;
                            if (m > L) L = m;
                        }
                    }
                }
                if (l.bars.show) {
                    var O = l.bars.align == "left" ? 0 : -l.bars.barWidth / 2;
                    if (l.bars.horizontal) {
                        C += O;
                        L += O + l.bars.barWidth;
                    } else {
                        N += O;
                        k += O + l.bars.barWidth;
                    }
                }
                b(l.xaxis, N, k);
                b(l.yaxis, C, L);
            }
            e.each(A(), function(e, r) {
                if (r.datamin == t) r.datamin = null;
                if (r.datamax == n) r.datamax = null;
            });
        }
        function H(n, r) {
            var i = document.createElement("canvas");
            i.className = r;
            i.width = g;
            i.height = y;
            if (!n) e(i).css({
                position: "absolute",
                left: 0,
                top: 0
            });
            e(i).appendTo(t);
            if (!i.getContext) i = window.G_vmlCanvasManager.initElement(i);
            i.getContext("2d").save();
            return i;
        }
        function B() {
            g = t.width();
            y = t.height();
            if (g <= 0 || y <= 0) throw "Invalid dimensions for plot, width = " + g + ", height = " + y;
        }
        function j(e) {
            if (e.width != g) e.width = g;
            if (e.height != y) e.height = y;
            var t = e.getContext("2d");
            t.restore();
            t.save();
        }
        function F() {
            var n, r = t.children("canvas.base"), i = t.children("canvas.overlay");
            if (r.length == 0 || i == 0) {
                t.html("");
                t.css({
                    padding: 0
                });
                if (t.css("position") == "static") t.css("position", "relative");
                B();
                f = H(true, "base");
                l = H(false, "overlay");
                n = false;
            } else {
                f = r.get(0);
                l = i.get(0);
                n = true;
            }
            h = f.getContext("2d");
            p = l.getContext("2d");
            c = e([ l, f ]);
            if (n) {
                t.data("plot").shutdown();
                S.resize();
                p.clearRect(0, 0, g, y);
                c.unbind();
                t.children().not([ f, l ]).remove();
            }
            t.data("plot", S);
        }
        function I() {
            if (a.grid.hoverable) {
                c.mousemove(ht);
                c.mouseleave(pt);
            }
            if (a.grid.clickable) c.click(dt);
            x(E.bindEvents, [ c ]);
        }
        function q() {
            if (lt) clearTimeout(lt);
            c.unbind("mousemove", ht);
            c.unbind("mouseleave", pt);
            c.unbind("click", dt);
            x(E.shutdown, [ c ]);
        }
        function R(e) {
            function t(e) {
                return e;
            }
            var n, r, i = e.options.transform || t, s = e.options.inverseTransform;
            if (e.direction == "x") {
                n = e.scale = b / Math.abs(i(e.max) - i(e.min));
                r = Math.min(i(e.max), i(e.min));
            } else {
                n = e.scale = w / Math.abs(i(e.max) - i(e.min));
                n = -n;
                r = Math.max(i(e.max), i(e.min));
            }
            if (i == t) e.p2c = function(e) {
                return (e - r) * n;
            }; else e.p2c = function(e) {
                return (i(e) - r) * n;
            };
            if (!s) e.c2p = function(e) {
                return r + e / n;
            }; else e.c2p = function(e) {
                return s(r + e / n);
            };
        }
        function U(n) {
            function c(r, i) {
                return e('<div style="position:absolute;top:-10000px;' + i + 'font-size:smaller">' + '<div class="' + n.direction + "Axis " + n.direction + n.n + 'Axis">' + r.join("") + "</div></div>").appendTo(t);
            }
            var r = n.options, i, s = n.ticks || [], o = [], u, a = r.labelWidth, f = r.labelHeight, l;
            if (n.direction == "x") {
                if (a == null) a = Math.floor(g / (s.length > 0 ? s.length : 1));
                if (f == null) {
                    o = [];
                    for (i = 0; i < s.length; ++i) {
                        u = s[i].label;
                        if (u) o.push('<div class="tickLabel" style="float:left;width:' + a + 'px">' + u + "</div>");
                    }
                    if (o.length > 0) {
                        o.push('<div style="clear:left"></div>');
                        l = c(o, "width:10000px;");
                        f = l.height();
                        l.remove();
                    }
                }
            } else if (a == null || f == null) {
                for (i = 0; i < s.length; ++i) {
                    u = s[i].label;
                    if (u) o.push('<div class="tickLabel">' + u + "</div>");
                }
                if (o.length > 0) {
                    l = c(o, "");
                    if (a == null) a = l.children().width();
                    if (f == null) f = l.find("div.tickLabel").height();
                    l.remove();
                }
            }
            if (a == null) a = 0;
            if (f == null) f = 0;
            n.labelWidth = a;
            n.labelHeight = f;
        }
        function z(t) {
            var n = t.labelWidth, r = t.labelHeight, i = t.options.position, s = t.options.tickLength, o = a.grid.axisMargin, u = a.grid.labelMargin, f = t.direction == "x" ? d : v, l;
            var c = e.grep(f, function(e) {
                return e && e.options.position == i && e.reserveSpace;
            });
            if (e.inArray(t, c) == c.length - 1) o = 0;
            if (s == null) s = "full";
            var h = e.grep(f, function(e) {
                return e && e.reserveSpace;
            });
            var p = e.inArray(t, h) == 0;
            if (!p && s == "full") s = 5;
            if (!isNaN(+s)) u += +s;
            if (t.direction == "x") {
                r += u;
                if (i == "bottom") {
                    m.bottom += r + o;
                    t.box = {
                        top: y - m.bottom,
                        height: r
                    };
                } else {
                    t.box = {
                        top: m.top + o,
                        height: r
                    };
                    m.top += r + o;
                }
            } else {
                n += u;
                if (i == "left") {
                    t.box = {
                        left: m.left + o,
                        width: n
                    };
                    m.left += n + o;
                } else {
                    m.right += n + o;
                    t.box = {
                        left: g - m.right,
                        width: n
                    };
                }
            }
            t.position = i;
            t.tickLength = s;
            t.box.padding = u;
            t.innermost = p;
        }
        function W(e) {
            if (e.direction == "x") {
                e.box.left = m.left;
                e.box.width = b;
            } else {
                e.box.top = m.top;
                e.box.height = w;
            }
        }
        function X() {
            var t, n = A();
            e.each(n, function(e, t) {
                t.show = t.options.show;
                if (t.show == null) t.show = t.used;
                t.reserveSpace = t.show || t.options.reserveSpace;
                V(t);
            });
            allocatedAxes = e.grep(n, function(e) {
                return e.reserveSpace;
            });
            m.left = m.right = m.top = m.bottom = 0;
            if (a.grid.show) {
                e.each(allocatedAxes, function(e, t) {
                    J(t);
                    K(t);
                    Q(t, t.ticks);
                    U(t);
                });
                for (t = allocatedAxes.length - 1; t >= 0; --t) z(allocatedAxes[t]);
                var r = a.grid.minBorderMargin;
                if (r == null) {
                    r = 0;
                    for (t = 0; t < u.length; ++t) r = Math.max(r, u[t].points.radius + u[t].points.lineWidth / 2);
                }
                for (var i in m) {
                    m[i] += a.grid.borderWidth;
                    m[i] = Math.max(r, m[i]);
                }
            }
            b = g - m.left - m.right;
            w = y - m.bottom - m.top;
            e.each(n, function(e, t) {
                R(t);
            });
            if (a.grid.show) {
                e.each(allocatedAxes, function(e, t) {
                    W(t);
                });
                tt();
            }
            at();
        }
        function V(e) {
            var t = e.options, n = +(t.min != null ? t.min : e.datamin), r = +(t.max != null ? t.max : e.datamax), i = r - n;
            if (i == 0) {
                var s = r == 0 ? 1 : .01;
                if (t.min == null) n -= s;
                if (t.max == null || t.min != null) r += s;
            } else {
                var o = t.autoscaleMargin;
                if (o != null) {
                    if (t.min == null) {
                        n -= i * o;
                        if (n < 0 && e.datamin != null && e.datamin >= 0) n = 0;
                    }
                    if (t.max == null) {
                        r += i * o;
                        if (r > 0 && e.datamax != null && e.datamax <= 0) r = 0;
                    }
                }
            }
            e.min = n;
            e.max = r;
        }
        function J(t) {
            var r = t.options;
            var i;
            if (typeof r.ticks == "number" && r.ticks > 0) i = r.ticks; else i = .3 * Math.sqrt(t.direction == "x" ? g : y);
            var s = (t.max - t.min) / i, o, u, a, f, l, c, h;
            if (r.mode == "time") {
                var p = {
                    second: 1e3,
                    minute: 60 * 1e3,
                    hour: 60 * 60 * 1e3,
                    day: 24 * 60 * 60 * 1e3,
                    month: 30 * 24 * 60 * 60 * 1e3,
                    year: 365.2425 * 24 * 60 * 60 * 1e3
                };
                var m = [ [ 1, "second" ], [ 2, "second" ], [ 5, "second" ], [ 10, "second" ], [ 30, "second" ], [ 1, "minute" ], [ 2, "minute" ], [ 5, "minute" ], [ 10, "minute" ], [ 30, "minute" ], [ 1, "hour" ], [ 2, "hour" ], [ 4, "hour" ], [ 8, "hour" ], [ 12, "hour" ], [ 1, "day" ], [ 2, "day" ], [ 3, "day" ], [ .25, "month" ], [ .5, "month" ], [ 1, "month" ], [ 2, "month" ], [ 3, "month" ], [ 6, "month" ], [ 1, "year" ] ];
                var b = 0;
                if (r.minTickSize != null) {
                    if (typeof r.tickSize == "number") b = r.tickSize; else b = r.minTickSize[0] * p[r.minTickSize[1]];
                }
                for (var l = 0; l < m.length - 1; ++l) if (s < (m[l][0] * p[m[l][1]] + m[l + 1][0] * p[m[l + 1][1]]) / 2 && m[l][0] * p[m[l][1]] >= b) break;
                o = m[l][0];
                a = m[l][1];
                if (a == "year") {
                    c = Math.pow(10, Math.floor(Math.log(s / p.year) / Math.LN10));
                    h = s / p.year / c;
                    if (h < 1.5) o = 1; else if (h < 3) o = 2; else if (h < 7.5) o = 5; else o = 10;
                    o *= c;
                }
                t.tickSize = r.tickSize || [ o, a ];
                u = function(e) {
                    var t = [], r = e.tickSize[0], i = e.tickSize[1], s = new Date(e.min);
                    var o = r * p[i];
                    if (i == "second") s.setUTCSeconds(n(s.getUTCSeconds(), r));
                    if (i == "minute") s.setUTCMinutes(n(s.getUTCMinutes(), r));
                    if (i == "hour") s.setUTCHours(n(s.getUTCHours(), r));
                    if (i == "month") s.setUTCMonth(n(s.getUTCMonth(), r));
                    if (i == "year") s.setUTCFullYear(n(s.getUTCFullYear(), r));
                    s.setUTCMilliseconds(0);
                    if (o >= p.minute) s.setUTCSeconds(0);
                    if (o >= p.hour) s.setUTCMinutes(0);
                    if (o >= p.day) s.setUTCHours(0);
                    if (o >= p.day * 4) s.setUTCDate(1);
                    if (o >= p.year) s.setUTCMonth(0);
                    var u = 0, a = Number.NaN, f;
                    do {
                        f = a;
                        a = s.getTime();
                        t.push(a);
                        if (i == "month") {
                            if (r < 1) {
                                s.setUTCDate(1);
                                var l = s.getTime();
                                s.setUTCMonth(s.getUTCMonth() + 1);
                                var c = s.getTime();
                                s.setTime(a + u * p.hour + (c - l) * r);
                                u = s.getUTCHours();
                                s.setUTCHours(0);
                            } else s.setUTCMonth(s.getUTCMonth() + r);
                        } else if (i == "year") {
                            s.setUTCFullYear(s.getUTCFullYear() + r);
                        } else s.setTime(a + o);
                    } while (a < e.max && a != f);
                    return t;
                };
                f = function(t, n) {
                    var i = new Date(t);
                    if (r.timeformat != null) return e.plot.formatDate(i, r.timeformat, r.monthNames);
                    var s = n.tickSize[0] * p[n.tickSize[1]];
                    var o = n.max - n.min;
                    var u = r.twelveHourClock ? " %p" : "";
                    if (s < p.minute) fmt = "%h:%M:%S" + u; else if (s < p.day) {
                        if (o < 2 * p.day) fmt = "%h:%M" + u; else fmt = "%b %d %h:%M" + u;
                    } else if (s < p.month) fmt = "%b %d"; else if (s < p.year) {
                        if (o < p.year) fmt = "%b"; else fmt = "%b %y";
                    } else fmt = "%y";
                    return e.plot.formatDate(i, fmt, r.monthNames);
                };
            } else {
                var w = r.tickDecimals;
                var E = -Math.floor(Math.log(s) / Math.LN10);
                if (w != null && E > w) E = w;
                c = Math.pow(10, -E);
                h = s / c;
                if (h < 1.5) o = 1; else if (h < 3) {
                    o = 2;
                    if (h > 2.25 && (w == null || E + 1 <= w)) {
                        o = 2.5;
                        ++E;
                    }
                } else if (h < 7.5) o = 5; else o = 10;
                o *= c;
                if (r.minTickSize != null && o < r.minTickSize) o = r.minTickSize;
                t.tickDecimals = Math.max(0, w != null ? w : E);
                t.tickSize = r.tickSize || o;
                u = function(e) {
                    var t = [];
                    var r = n(e.min, e.tickSize), i = 0, s = Number.NaN, o;
                    do {
                        o = s;
                        s = r + i * e.tickSize;
                        t.push(s);
                        ++i;
                    } while (s < e.max && s != o);
                    return t;
                };
                f = function(e, t) {
                    return e.toFixed(t.tickDecimals);
                };
            }
            if (r.alignTicksWithAxis != null) {
                var S = (t.direction == "x" ? d : v)[r.alignTicksWithAxis - 1];
                if (S && S.used && S != t) {
                    var x = u(t);
                    if (x.length > 0) {
                        if (r.min == null) t.min = Math.min(t.min, x[0]);
                        if (r.max == null && x.length > 1) t.max = Math.max(t.max, x[x.length - 1]);
                    }
                    u = function(e) {
                        var t = [], n, r;
                        for (r = 0; r < S.ticks.length; ++r) {
                            n = (S.ticks[r].v - S.min) / (S.max - S.min);
                            n = e.min + n * (e.max - e.min);
                            t.push(n);
                        }
                        return t;
                    };
                    if (t.mode != "time" && r.tickDecimals == null) {
                        var T = Math.max(0, -Math.floor(Math.log(s) / Math.LN10) + 1), N = u(t);
                        if (!(N.length > 1 && /\..*0$/.test((N[1] - N[0]).toFixed(T)))) t.tickDecimals = T;
                    }
                }
            }
            t.tickGenerator = u;
            if (e.isFunction(r.tickFormatter)) t.tickFormatter = function(e, t) {
                return "" + r.tickFormatter(e, t);
            }; else t.tickFormatter = f;
        }
        function K(t) {
            var n = t.options.ticks, r = [];
            if (n == null || typeof n == "number" && n > 0) r = t.tickGenerator(t); else if (n) {
                if (e.isFunction(n)) r = n({
                    min: t.min,
                    max: t.max
                }); else r = n;
            }
            var i, s;
            t.ticks = [];
            for (i = 0; i < r.length; ++i) {
                var o = null;
                var u = r[i];
                if (typeof u == "object") {
                    s = +u[0];
                    if (u.length > 1) o = u[1];
                } else s = +u;
                if (o == null) o = t.tickFormatter(s, t);
                if (!isNaN(s)) t.ticks.push({
                    v: s,
                    label: o
                });
            }
        }
        function Q(e, t) {
            if (e.options.autoscaleMargin && t.length > 0) {
                if (e.options.min == null) e.min = Math.min(e.min, t[0].v);
                if (e.options.max == null && t.length > 1) e.max = Math.max(e.max, t[t.length - 1].v);
            }
        }
        function G() {
            h.clearRect(0, 0, g, y);
            var e = a.grid;
            if (e.show && e.backgroundColor) Z();
            if (e.show && !e.aboveData) et();
            for (var t = 0; t < u.length; ++t) {
                x(E.drawSeries, [ h, u[t] ]);
                nt(u[t]);
            }
            x(E.draw, [ h ]);
            if (e.show && e.aboveData) et();
        }
        function Y(e, t) {
            var n, r, s, o, u = A();
            for (i = 0; i < u.length; ++i) {
                n = u[i];
                if (n.direction == t) {
                    o = t + n.n + "axis";
                    if (!e[o] && n.n == 1) o = t + "axis";
                    if (e[o]) {
                        r = e[o].from;
                        s = e[o].to;
                        break;
                    }
                }
            }
            if (!e[o]) {
                n = t == "x" ? d[0] : v[0];
                r = e[t + "1"];
                s = e[t + "2"];
            }
            if (r != null && s != null && r > s) {
                var a = r;
                r = s;
                s = a;
            }
            return {
                from: r,
                to: s,
                axis: n
            };
        }
        function Z() {
            h.save();
            h.translate(m.left, m.top);
            h.fillStyle = xt(a.grid.backgroundColor, w, 0, "rgba(255, 255, 255, 0)");
            h.fillRect(0, 0, b, w);
            h.restore();
        }
        function et() {
            var t;
            h.save();
            h.translate(m.left, m.top);
            var n = a.grid.markings;
            if (n) {
                if (e.isFunction(n)) {
                    var r = S.getAxes();
                    r.xmin = r.xaxis.min;
                    r.xmax = r.xaxis.max;
                    r.ymin = r.yaxis.min;
                    r.ymax = r.yaxis.max;
                    n = n(r);
                }
                for (t = 0; t < n.length; ++t) {
                    var i = n[t], s = Y(i, "x"), o = Y(i, "y");
                    if (s.from == null) s.from = s.axis.min;
                    if (s.to == null) s.to = s.axis.max;
                    if (o.from == null) o.from = o.axis.min;
                    if (o.to == null) o.to = o.axis.max;
                    if (s.to < s.axis.min || s.from > s.axis.max || o.to < o.axis.min || o.from > o.axis.max) continue;
                    s.from = Math.max(s.from, s.axis.min);
                    s.to = Math.min(s.to, s.axis.max);
                    o.from = Math.max(o.from, o.axis.min);
                    o.to = Math.min(o.to, o.axis.max);
                    if (s.from == s.to && o.from == o.to) continue;
                    s.from = s.axis.p2c(s.from);
                    s.to = s.axis.p2c(s.to);
                    o.from = o.axis.p2c(o.from);
                    o.to = o.axis.p2c(o.to);
                    if (s.from == s.to || o.from == o.to) {
                        h.beginPath();
                        h.strokeStyle = i.color || a.grid.markingsColor;
                        h.lineWidth = i.lineWidth || a.grid.markingsLineWidth;
                        h.moveTo(s.from, o.from);
                        h.lineTo(s.to, o.to);
                        h.stroke();
                    } else {
                        h.fillStyle = i.color || a.grid.markingsColor;
                        h.fillRect(s.from, o.to, s.to - s.from, o.from - o.to);
                    }
                }
            }
            var r = A(), u = a.grid.borderWidth;
            for (var f = 0; f < r.length; ++f) {
                var l = r[f], c = l.box, p = l.tickLength, d, v, g, y;
                if (!l.show || l.ticks.length == 0) continue;
                h.strokeStyle = l.options.tickColor || e.color.parse(l.options.color).scale("a", .22).toString();
                h.lineWidth = 1;
                if (l.direction == "x") {
                    d = 0;
                    if (p == "full") v = l.position == "top" ? 0 : w; else v = c.top - m.top + (l.position == "top" ? c.height : 0);
                } else {
                    v = 0;
                    if (p == "full") d = l.position == "left" ? 0 : b; else d = c.left - m.left + (l.position == "left" ? c.width : 0);
                }
                if (!l.innermost) {
                    h.beginPath();
                    g = y = 0;
                    if (l.direction == "x") g = b; else y = w;
                    if (h.lineWidth == 1) {
                        d = Math.floor(d) + .5;
                        v = Math.floor(v) + .5;
                    }
                    h.moveTo(d, v);
                    h.lineTo(d + g, v + y);
                    h.stroke();
                }
                h.beginPath();
                for (t = 0; t < l.ticks.length; ++t) {
                    var E = l.ticks[t].v;
                    g = y = 0;
                    if (E < l.min || E > l.max || p == "full" && u > 0 && (E == l.min || E == l.max)) continue;
                    if (l.direction == "x") {
                        d = l.p2c(E);
                        y = p == "full" ? -w : p;
                        if (l.position == "top") y = -y;
                    } else {
                        v = l.p2c(E);
                        g = p == "full" ? -b : p;
                        if (l.position == "left") g = -g;
                    }
                    if (h.lineWidth == 1) {
                        if (l.direction == "x") d = Math.floor(d) + .5; else v = Math.floor(v) + .5;
                    }
                    h.moveTo(d, v);
                    h.lineTo(d + g, v + y);
                }
                h.stroke();
            }
            if (u) {
                h.lineWidth = u;
                h.strokeStyle = a.grid.borderColor;
                h.strokeRect(-u / 2, -u / 2, b + u, w + u);
            }
            h.restore();
        }
        function tt() {
            t.find(".tickLabels").remove();
            var e = [ '<div class="tickLabels" style="font-size:smaller">' ];
            var n = A();
            for (var r = 0; r < n.length; ++r) {
                var i = n[r], s = i.box;
                if (!i.show) continue;
                e.push('<div class="' + i.direction + "Axis " + i.direction + i.n + 'Axis" style="color:' + i.options.color + '">');
                for (var o = 0; o < i.ticks.length; ++o) {
                    var u = i.ticks[o];
                    if (!u.label || u.v < i.min || u.v > i.max) continue;
                    var a = {}, f;
                    if (i.direction == "x") {
                        f = "center";
                        a.left = Math.round(m.left + i.p2c(u.v) - i.labelWidth / 2);
                        if (i.position == "bottom") a.top = s.top + s.padding; else a.bottom = y - (s.top + s.height - s.padding);
                    } else {
                        a.top = Math.round(m.top + i.p2c(u.v) - i.labelHeight / 2);
                        if (i.position == "left") {
                            a.right = g - (s.left + s.width - s.padding);
                            f = "right";
                        } else {
                            a.left = s.left + s.padding;
                            f = "left";
                        }
                    }
                    a.width = i.labelWidth;
                    var l = [ "position:absolute", "text-align:" + f ];
                    for (var c in a) l.push(c + ":" + a[c] + "px");
                    e.push('<div class="tickLabel" style="' + l.join(";") + '">' + u.label + "</div>");
                }
                e.push("</div>");
            }
            e.push("</div>");
            t.append(e.join(""));
        }
        function nt(e) {
            if (e.lines.show) rt(e);
            if (e.bars.show) ot(e);
            if (e.points.show) it(e);
        }
        function rt(e) {
            function t(e, t, n, r, i) {
                var s = e.points, o = e.pointsize, u = null, a = null;
                h.beginPath();
                for (var f = o; f < s.length; f += o) {
                    var l = s[f - o], c = s[f - o + 1], p = s[f], d = s[f + 1];
                    if (l == null || p == null) continue;
                    if (c <= d && c < i.min) {
                        if (d < i.min) continue;
                        l = (i.min - c) / (d - c) * (p - l) + l;
                        c = i.min;
                    } else if (d <= c && d < i.min) {
                        if (c < i.min) continue;
                        p = (i.min - c) / (d - c) * (p - l) + l;
                        d = i.min;
                    }
                    if (c >= d && c > i.max) {
                        if (d > i.max) continue;
                        l = (i.max - c) / (d - c) * (p - l) + l;
                        c = i.max;
                    } else if (d >= c && d > i.max) {
                        if (c > i.max) continue;
                        p = (i.max - c) / (d - c) * (p - l) + l;
                        d = i.max;
                    }
                    if (l <= p && l < r.min) {
                        if (p < r.min) continue;
                        c = (r.min - l) / (p - l) * (d - c) + c;
                        l = r.min;
                    } else if (p <= l && p < r.min) {
                        if (l < r.min) continue;
                        d = (r.min - l) / (p - l) * (d - c) + c;
                        p = r.min;
                    }
                    if (l >= p && l > r.max) {
                        if (p > r.max) continue;
                        c = (r.max - l) / (p - l) * (d - c) + c;
                        l = r.max;
                    } else if (p >= l && p > r.max) {
                        if (l > r.max) continue;
                        d = (r.max - l) / (p - l) * (d - c) + c;
                        p = r.max;
                    }
                    if (l != u || c != a) h.moveTo(r.p2c(l) + t, i.p2c(c) + n);
                    u = p;
                    a = d;
                    h.lineTo(r.p2c(p) + t, i.p2c(d) + n);
                }
                h.stroke();
            }
            function n(e, t, n) {
                var r = e.points, i = e.pointsize, s = Math.min(Math.max(0, n.min), n.max), o = 0, u, a = false, f = 1, l = 0, c = 0;
                while (true) {
                    if (i > 0 && o > r.length + i) break;
                    o += i;
                    var p = r[o - i], d = r[o - i + f], v = r[o], m = r[o + f];
                    if (a) {
                        if (i > 0 && p != null && v == null) {
                            c = o;
                            i = -i;
                            f = 2;
                            continue;
                        }
                        if (i < 0 && o == l + i) {
                            h.fill();
                            a = false;
                            i = -i;
                            f = 1;
                            o = l = c + i;
                            continue;
                        }
                    }
                    if (p == null || v == null) continue;
                    if (p <= v && p < t.min) {
                        if (v < t.min) continue;
                        d = (t.min - p) / (v - p) * (m - d) + d;
                        p = t.min;
                    } else if (v <= p && v < t.min) {
                        if (p < t.min) continue;
                        m = (t.min - p) / (v - p) * (m - d) + d;
                        v = t.min;
                    }
                    if (p >= v && p > t.max) {
                        if (v > t.max) continue;
                        d = (t.max - p) / (v - p) * (m - d) + d;
                        p = t.max;
                    } else if (v >= p && v > t.max) {
                        if (p > t.max) continue;
                        m = (t.max - p) / (v - p) * (m - d) + d;
                        v = t.max;
                    }
                    if (!a) {
                        h.beginPath();
                        h.moveTo(t.p2c(p), n.p2c(s));
                        a = true;
                    }
                    if (d >= n.max && m >= n.max) {
                        h.lineTo(t.p2c(p), n.p2c(n.max));
                        h.lineTo(t.p2c(v), n.p2c(n.max));
                        continue;
                    } else if (d <= n.min && m <= n.min) {
                        h.lineTo(t.p2c(p), n.p2c(n.min));
                        h.lineTo(t.p2c(v), n.p2c(n.min));
                        continue;
                    }
                    var g = p, y = v;
                    if (d <= m && d < n.min && m >= n.min) {
                        p = (n.min - d) / (m - d) * (v - p) + p;
                        d = n.min;
                    } else if (m <= d && m < n.min && d >= n.min) {
                        v = (n.min - d) / (m - d) * (v - p) + p;
                        m = n.min;
                    }
                    if (d >= m && d > n.max && m <= n.max) {
                        p = (n.max - d) / (m - d) * (v - p) + p;
                        d = n.max;
                    } else if (m >= d && m > n.max && d <= n.max) {
                        v = (n.max - d) / (m - d) * (v - p) + p;
                        m = n.max;
                    }
                    if (p != g) {
                        h.lineTo(t.p2c(g), n.p2c(d));
                    }
                    h.lineTo(t.p2c(p), n.p2c(d));
                    h.lineTo(t.p2c(v), n.p2c(m));
                    if (v != y) {
                        h.lineTo(t.p2c(v), n.p2c(m));
                        h.lineTo(t.p2c(y), n.p2c(m));
                    }
                }
            }
            h.save();
            h.translate(m.left, m.top);
            h.lineJoin = "round";
            var r = e.lines.lineWidth, i = e.shadowSize;
            if (r > 0 && i > 0) {
                h.lineWidth = i;
                h.strokeStyle = "rgba(0,0,0,0.1)";
                var s = Math.PI / 18;
                t(e.datapoints, Math.sin(s) * (r / 2 + i / 2), Math.cos(s) * (r / 2 + i / 2), e.xaxis, e.yaxis);
                h.lineWidth = i / 2;
                t(e.datapoints, Math.sin(s) * (r / 2 + i / 4), Math.cos(s) * (r / 2 + i / 4), e.xaxis, e.yaxis);
            }
            h.lineWidth = r;
            h.strokeStyle = e.color;
            var o = ut(e.lines, e.color, 0, w);
            if (o) {
                h.fillStyle = o;
                n(e.datapoints, e.xaxis, e.yaxis);
            }
            if (r > 0) t(e.datapoints, 0, 0, e.xaxis, e.yaxis);
            h.restore();
        }
        function it(e) {
            function t(e, t, n, r, i, s, o, u) {
                var a = e.points, f = e.pointsize;
                for (var l = 0; l < a.length; l += f) {
                    var c = a[l], p = a[l + 1];
                    if (c == null || c < s.min || c > s.max || p < o.min || p > o.max) continue;
                    h.beginPath();
                    c = s.p2c(c);
                    p = o.p2c(p) + r;
                    if (u == "circle") h.arc(c, p, t, 0, i ? Math.PI : Math.PI * 2, false); else u(h, c, p, t, i);
                    h.closePath();
                    if (n) {
                        h.fillStyle = n;
                        h.fill();
                    }
                    h.stroke();
                }
            }
            h.save();
            h.translate(m.left, m.top);
            var n = e.points.lineWidth, r = e.shadowSize, i = e.points.radius, s = e.points.symbol;
            if (n > 0 && r > 0) {
                var o = r / 2;
                h.lineWidth = o;
                h.strokeStyle = "rgba(0,0,0,0.1)";
                t(e.datapoints, i, null, o + o / 2, true, e.xaxis, e.yaxis, s);
                h.strokeStyle = "rgba(0,0,0,0.2)";
                t(e.datapoints, i, null, o / 2, true, e.xaxis, e.yaxis, s);
            }
            h.lineWidth = n;
            h.strokeStyle = e.color;
            t(e.datapoints, i, ut(e.points, e.color), 0, false, e.xaxis, e.yaxis, s);
            h.restore();
        }
        function st(e, t, n, r, i, s, o, u, a, f, l, c) {
            var h, p, d, v, m, g, y, b, w;
            if (l) {
                b = g = y = true;
                m = false;
                h = n;
                p = e;
                v = t + r;
                d = t + i;
                if (p < h) {
                    w = p;
                    p = h;
                    h = w;
                    m = true;
                    g = false;
                }
            } else {
                m = g = y = true;
                b = false;
                h = e + r;
                p = e + i;
                d = n;
                v = t;
                if (v < d) {
                    w = v;
                    v = d;
                    d = w;
                    b = true;
                    y = false;
                }
            }
            if (p < u.min || h > u.max || v < a.min || d > a.max) return;
            if (h < u.min) {
                h = u.min;
                m = false;
            }
            if (p > u.max) {
                p = u.max;
                g = false;
            }
            if (d < a.min) {
                d = a.min;
                b = false;
            }
            if (v > a.max) {
                v = a.max;
                y = false;
            }
            h = u.p2c(h);
            d = a.p2c(d);
            p = u.p2c(p);
            v = a.p2c(v);
            if (o) {
                f.beginPath();
                f.moveTo(h, d);
                f.lineTo(h, v);
                f.lineTo(p, v);
                f.lineTo(p, d);
                f.fillStyle = o(d, v);
                f.fill();
            }
            if (c > 0 && (m || g || y || b)) {
                f.beginPath();
                f.moveTo(h, d + s);
                if (m) f.lineTo(h, v + s); else f.moveTo(h, v + s);
                if (y) f.lineTo(p, v + s); else f.moveTo(p, v + s);
                if (g) f.lineTo(p, d + s); else f.moveTo(p, d + s);
                if (b) f.lineTo(h, d + s); else f.moveTo(h, d + s);
                f.stroke();
            }
        }
        function ot(e) {
            function t(t, n, r, i, s, o, u) {
                var a = t.points, f = t.pointsize;
                for (var l = 0; l < a.length; l += f) {
                    if (a[l] == null) continue;
                    st(a[l], a[l + 1], a[l + 2], n, r, i, s, o, u, h, e.bars.horizontal, e.bars.lineWidth);
                }
            }
            h.save();
            h.translate(m.left, m.top);
            h.lineWidth = e.bars.lineWidth;
            h.strokeStyle = e.color;
            var n = e.bars.align == "left" ? 0 : -e.bars.barWidth / 2;
            var r = e.bars.fill ? function(t, n) {
                return ut(e.bars, e.color, t, n);
            } : null;
            t(e.datapoints, n, n + e.bars.barWidth, 0, r, e.xaxis, e.yaxis);
            h.restore();
        }
        function ut(t, n, r, i) {
            var s = t.fill;
            if (!s) return null;
            if (t.fillColor) return xt(t.fillColor, r, i, n);
            var o = e.color.parse(n);
            o.a = typeof s == "number" ? s : .4;
            o.normalize();
            return o.toString();
        }
        function at() {
            t.find(".legend").remove();
            if (!a.legend.show) return;
            var n = [], r = false, i = a.legend.labelFormatter, s, o;
            for (var f = 0; f < u.length; ++f) {
                s = u[f];
                o = s.label;
                if (!o) continue;
                if (f % a.legend.noColumns == 0) {
                    if (r) n.push("</tr>");
                    n.push("<tr>");
                    r = true;
                }
                if (i) o = i(o, s);
                n.push('<td class="legendColorBox"><div style="border:1px solid ' + a.legend.labelBoxBorderColor + ';padding:1px"><div style="width:4px;height:0;border:5px solid ' + s.color + ';overflow:hidden"></div></div></td>' + '<td class="legendLabel">' + o + "</td>");
            }
            if (r) n.push("</tr>");
            if (n.length == 0) return;
            var l = '<table style="font-size:smaller;color:' + a.grid.color + '">' + n.join("") + "</table>";
            if (a.legend.container != null) e(a.legend.container).html(l); else {
                var c = "", h = a.legend.position, p = a.legend.margin;
                if (p[0] == null) p = [ p, p ];
                if (h.charAt(0) == "n") c += "top:" + (p[1] + m.top) + "px;"; else if (h.charAt(0) == "s") c += "bottom:" + (p[1] + m.bottom) + "px;";
                if (h.charAt(1) == "e") c += "right:" + (p[0] + m.right) + "px;"; else if (h.charAt(1) == "w") c += "left:" + (p[0] + m.left) + "px;";
                var d = e('<div class="legend">' + l.replace('style="', 'style="position:absolute;' + c + ";") + "</div>").appendTo(t);
                if (a.legend.backgroundOpacity != 0) {
                    var v = a.legend.backgroundColor;
                    if (v == null) {
                        v = a.grid.backgroundColor;
                        if (v && typeof v == "string") v = e.color.parse(v); else v = e.color.extract(d, "background-color");
                        v.a = 1;
                        v = v.toString();
                    }
                    var g = d.children();
                    e('<div style="position:absolute;width:' + g.width() + "px;height:" + g.height() + "px;" + c + "background-color:" + v + ';"> </div>').prependTo(d).css("opacity", a.legend.backgroundOpacity);
                }
            }
        }
        function ct(e, t, n) {
            var r = a.grid.mouseActiveRadius, i = r * r + 1, s = null, o = false, f, l;
            for (f = u.length - 1; f >= 0; --f) {
                if (!n(u[f])) continue;
                var c = u[f], h = c.xaxis, p = c.yaxis, d = c.datapoints.points, v = c.datapoints.pointsize, m = h.c2p(e), g = p.c2p(t), y = r / h.scale, b = r / p.scale;
                if (h.options.inverseTransform) y = Number.MAX_VALUE;
                if (p.options.inverseTransform) b = Number.MAX_VALUE;
                if (c.lines.show || c.points.show) {
                    for (l = 0; l < d.length; l += v) {
                        var w = d[l], E = d[l + 1];
                        if (w == null) continue;
                        if (w - m > y || w - m < -y || E - g > b || E - g < -b) continue;
                        var S = Math.abs(h.p2c(w) - e), x = Math.abs(p.p2c(E) - t), T = S * S + x * x;
                        if (T < i) {
                            i = T;
                            s = [ f, l / v ];
                        }
                    }
                }
                if (c.bars.show && !s) {
                    var N = c.bars.align == "left" ? 0 : -c.bars.barWidth / 2, C = N + c.bars.barWidth;
                    for (l = 0; l < d.length; l += v) {
                        var w = d[l], E = d[l + 1], k = d[l + 2];
                        if (w == null) continue;
                        if (u[f].bars.horizontal ? m <= Math.max(k, w) && m >= Math.min(k, w) && g >= E + N && g <= E + C : m >= w + N && m <= w + C && g >= Math.min(k, E) && g <= Math.max(k, E)) s = [ f, l / v ];
                    }
                }
            }
            if (s) {
                f = s[0];
                l = s[1];
                v = u[f].datapoints.pointsize;
                return {
                    datapoint: u[f].datapoints.points.slice(l * v, (l + 1) * v),
                    dataIndex: l,
                    series: u[f],
                    seriesIndex: f
                };
            }
            return null;
        }
        function ht(e) {
            if (a.grid.hoverable) vt("plothover", e, function(e) {
                return e["hoverable"] != false;
            });
        }
        function pt(e) {
            if (a.grid.hoverable) vt("plothover", e, function(e) {
                return false;
            });
        }
        function dt(e) {
            vt("plotclick", e, function(e) {
                return e["clickable"] != false;
            });
        }
        function vt(e, n, r) {
            var i = c.offset(), s = n.pageX - i.left - m.left, o = n.pageY - i.top - m.top, u = O({
                left: s,
                top: o
            });
            u.pageX = n.pageX;
            u.pageY = n.pageY;
            var f = ct(s, o, r);
            if (f) {
                f.pageX = parseInt(f.series.xaxis.p2c(f.datapoint[0]) + i.left + m.left);
                f.pageY = parseInt(f.series.yaxis.p2c(f.datapoint[1]) + i.top + m.top);
            }
            if (a.grid.autoHighlight) {
                for (var l = 0; l < ft.length; ++l) {
                    var h = ft[l];
                    if (h.auto == e && !(f && h.series == f.series && h.point[0] == f.datapoint[0] && h.point[1] == f.datapoint[1])) bt(h.series, h.point);
                }
                if (f) yt(f.series, f.datapoint, e);
            }
            t.trigger(e, [ u, f ]);
        }
        function mt() {
            if (!lt) lt = setTimeout(gt, 30);
        }
        function gt() {
            lt = null;
            p.save();
            p.clearRect(0, 0, g, y);
            p.translate(m.left, m.top);
            var e, t;
            for (e = 0; e < ft.length; ++e) {
                t = ft[e];
                if (t.series.bars.show) St(t.series, t.point); else Et(t.series, t.point);
            }
            p.restore();
            x(E.drawOverlay, [ p ]);
        }
        function yt(e, t, n) {
            if (typeof e == "number") e = u[e];
            if (typeof t == "number") {
                var r = e.datapoints.pointsize;
                t = e.datapoints.points.slice(r * t, r * (t + 1));
            }
            var i = wt(e, t);
            if (i == -1) {
                ft.push({
                    series: e,
                    point: t,
                    auto: n
                });
                mt();
            } else if (!n) ft[i].auto = false;
        }
        function bt(e, t) {
            if (e == null && t == null) {
                ft = [];
                mt();
            }
            if (typeof e == "number") e = u[e];
            if (typeof t == "number") t = e.data[t];
            var n = wt(e, t);
            if (n != -1) {
                ft.splice(n, 1);
                mt();
            }
        }
        function wt(e, t) {
            for (var n = 0; n < ft.length; ++n) {
                var r = ft[n];
                if (r.series == e && r.point[0] == t[0] && r.point[1] == t[1]) return n;
            }
            return -1;
        }
        function Et(t, n) {
            var r = n[0], i = n[1], s = t.xaxis, o = t.yaxis;
            if (r < s.min || r > s.max || i < o.min || i > o.max) return;
            var u = t.points.radius + t.points.lineWidth / 2;
            p.lineWidth = u;
            p.strokeStyle = e.color.parse(t.color).scale("a", .5).toString();
            var a = 1.5 * u, r = s.p2c(r), i = o.p2c(i);
            p.beginPath();
            if (t.points.symbol == "circle") p.arc(r, i, a, 0, 2 * Math.PI, false); else t.points.symbol(p, r, i, a, false);
            p.closePath();
            p.stroke();
        }
        function St(t, n) {
            p.lineWidth = t.bars.lineWidth;
            p.strokeStyle = e.color.parse(t.color).scale("a", .5).toString();
            var r = e.color.parse(t.color).scale("a", .5).toString();
            var i = t.bars.align == "left" ? 0 : -t.bars.barWidth / 2;
            st(n[0], n[1], n[2] || 0, i, i + t.bars.barWidth, 0, function() {
                return r;
            }, t.xaxis, t.yaxis, p, t.bars.horizontal, t.bars.lineWidth);
        }
        function xt(t, n, r, i) {
            if (typeof t == "string") return t; else {
                var s = h.createLinearGradient(0, r, 0, n);
                for (var o = 0, u = t.colors.length; o < u; ++o) {
                    var a = t.colors[o];
                    if (typeof a != "string") {
                        var f = e.color.parse(i);
                        if (a.brightness != null) f = f.scale("rgb", a.brightness);
                        if (a.opacity != null) f.a *= a.opacity;
                        a = f.toString();
                    }
                    s.addColorStop(o / (u - 1), a);
                }
                return s;
            }
        }
        var u = [], a = {
            colors: [ "#edc240", "#afd8f8", "#cb4b4b", "#4da74d", "#9440ed" ],
            legend: {
                show: true,
                noColumns: 1,
                labelFormatter: null,
                labelBoxBorderColor: "#ccc",
                container: null,
                position: "ne",
                margin: 5,
                backgroundColor: null,
                backgroundOpacity: .85
            },
            xaxis: {
                show: null,
                position: "bottom",
                mode: null,
                color: null,
                tickColor: null,
                transform: null,
                inverseTransform: null,
                min: null,
                max: null,
                autoscaleMargin: null,
                ticks: null,
                tickFormatter: null,
                labelWidth: null,
                labelHeight: null,
                reserveSpace: null,
                tickLength: null,
                alignTicksWithAxis: null,
                tickDecimals: null,
                tickSize: null,
                minTickSize: null,
                monthNames: null,
                timeformat: null,
                twelveHourClock: false
            },
            yaxis: {
                autoscaleMargin: .02,
                position: "left"
            },
            xaxes: [],
            yaxes: [],
            series: {
                points: {
                    show: false,
                    radius: 3,
                    lineWidth: 2,
                    fill: true,
                    fillColor: "#ffffff",
                    symbol: "circle"
                },
                lines: {
                    lineWidth: 2,
                    fill: false,
                    fillColor: null,
                    steps: false
                },
                bars: {
                    show: false,
                    lineWidth: 2,
                    barWidth: 1,
                    fill: true,
                    fillColor: null,
                    align: "left",
                    horizontal: false
                },
                shadowSize: 3
            },
            grid: {
                show: true,
                aboveData: false,
                color: "#545454",
                backgroundColor: null,
                borderColor: null,
                tickColor: null,
                labelMargin: 5,
                axisMargin: 8,
                borderWidth: 2,
                minBorderMargin: null,
                markings: null,
                markingsColor: "#f4f4f4",
                markingsLineWidth: 2,
                clickable: false,
                hoverable: false,
                autoHighlight: true,
                mouseActiveRadius: 10
            },
            hooks: {}
        }, f = null, l = null, c = null, h = null, p = null, d = [], v = [], m = {
            left: 0,
            right: 0,
            top: 0,
            bottom: 0
        }, g = 0, y = 0, b = 0, w = 0, E = {
            processOptions: [],
            processRawData: [],
            processDatapoints: [],
            drawSeries: [],
            draw: [],
            bindEvents: [],
            drawOverlay: [],
            shutdown: []
        }, S = this;
        S.setData = C;
        S.setupGrid = X;
        S.draw = G;
        S.getPlaceholder = function() {
            return t;
        };
        S.getCanvas = function() {
            return f;
        };
        S.getPlotOffset = function() {
            return m;
        };
        S.width = function() {
            return b;
        };
        S.height = function() {
            return w;
        };
        S.offset = function() {
            var e = c.offset();
            e.left += m.left;
            e.top += m.top;
            return e;
        };
        S.getData = function() {
            return u;
        };
        S.getAxes = function() {
            var t = {}, n;
            e.each(d.concat(v), function(e, n) {
                if (n) t[n.direction + (n.n != 1 ? n.n : "") + "axis"] = n;
            });
            return t;
        };
        S.getXAxes = function() {
            return d;
        };
        S.getYAxes = function() {
            return v;
        };
        S.c2p = O;
        S.p2c = M;
        S.getOptions = function() {
            return a;
        };
        S.highlight = yt;
        S.unhighlight = bt;
        S.triggerRedrawOverlay = mt;
        S.pointOffset = function(e) {
            return {
                left: parseInt(d[L(e, "x") - 1].p2c(+e.x) + m.left),
                top: parseInt(v[L(e, "y") - 1].p2c(+e.y) + m.top)
            };
        };
        S.shutdown = q;
        S.resize = function() {
            B();
            j(f);
            j(l);
        };
        S.hooks = E;
        T(S);
        N(s);
        F();
        C(r);
        X();
        G();
        I();
        var ft = [], lt = null;
    }
    function n(e, t) {
        return t * Math.floor(e / t);
    }
    e.plot = function(n, r, i) {
        var s = new t(e(n), r, i, e.plot.plugins);
        return s;
    };
    e.plot.version = "0.7";
    e.plot.plugins = [];
    e.plot.formatDate = function(e, t, n) {
        var r = function(e) {
            e = "" + e;
            return e.length == 1 ? "0" + e : e;
        };
        var i = [];
        var s = false, o = false;
        var u = e.getUTCHours();
        var a = u < 12;
        if (n == null) n = [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ];
        if (t.search(/%p|%P/) != -1) {
            if (u > 12) {
                u = u - 12;
            } else if (u == 0) {
                u = 12;
            }
        }
        for (var f = 0; f < t.length; ++f) {
            var l = t.charAt(f);
            if (s) {
                switch (l) {
                  case "h":
                    l = "" + u;
                    break;

                  case "H":
                    l = r(u);
                    break;

                  case "M":
                    l = r(e.getUTCMinutes());
                    break;

                  case "S":
                    l = r(e.getUTCSeconds());
                    break;

                  case "d":
                    l = "" + e.getUTCDate();
                    break;

                  case "m":
                    l = "" + (e.getUTCMonth() + 1);
                    break;

                  case "y":
                    l = "" + e.getUTCFullYear();
                    break;

                  case "b":
                    l = "" + n[e.getUTCMonth()];
                    break;

                  case "p":
                    l = a ? "" + "am" : "" + "pm";
                    break;

                  case "P":
                    l = a ? "" + "AM" : "" + "PM";
                    break;

                  case "0":
                    l = "";
                    o = true;
                    break;
                }
                if (l && o) {
                    l = r(l);
                    o = false;
                }
                i.push(l);
                if (!o) s = false;
            } else {
                if (l == "%") s = true; else i.push(l);
            }
        }
        return i.join("");
    };
})(jQuery);

$.widget("ui.labeledslider", $.ui.slider, {
    version: "@VERSION",
    options: {
        tickInterval: 0,
        tweenLabels: true,
        tickLabels: null
    },
    uiSlider: null,
    tickInterval: 0,
    tweenLabels: true,
    _create: function() {
        this._detectOrientation();
        this.uiSlider = this.element.wrap('<div class="ui-slider-wrapper ui-widget"></div>').before('<div class="ui-slider-labels">').parent().addClass(this.orientation).css("font-size", this.element.css("font-size"));
        this._super();
        this.element.removeClass("ui-widget");
        this._alignWithStep();
        if (this.orientation == "horizontal") {
            this.uiSlider.width(this.element.width());
        } else {
            this.uiSlider.height(this.element.height());
        }
        this._drawLabels();
    },
    _drawLabels: function() {
        var e = this.options.tickLabels || {}, t = this.uiSlider.children(".ui-slider-labels"), n = this.orientation == "horizontal" ? "left" : "bottom", r = this.options.min, i = this.options.max, s = this.tickInterval, o = (i - r) / s, u = 0;
        t.html("");
        for (;u <= o; u++) {
            $("<div>").addClass("ui-slider-label-ticks").css(n, Math.round(u / o * 1e4) / 100 + "%").html("<span>" + (e[u * s + r] ? e[u * s + r] : this.options.tweenLabels ? u * s + r : "") + "</span>").appendTo(t);
        }
    },
    _setOption: function(e, t) {
        this._super(e, t);
        switch (e) {
          case "tickInterval":
          case "tickLabels":
          case "min":
          case "max":
          case "step":
            this._alignWithStep();
            this._drawLabels();
            break;

          case "orientation":
            this.element.removeClass("horizontal vertical").addClass(this.orientation);
            this._drawLabels();
            break;
        }
    },
    _alignWithStep: function() {
        if (this.options.tickInterval < this.options.step) this.tickInterval = this.options.step; else this.tickInterval = this.options.tickInterval;
    },
    _destroy: function() {
        this._super();
        this.uiSlider.replaceWith(this.element);
    },
    widget: function() {
        return this.uiSlider;
    }
});

$(document).ready(onLoad);

$(window).unload(onUnload);