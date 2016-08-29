var MetricsTreeConverter = function () {
    "use strict";

    var bufferLevelMetricToTreeMetric = function (bufferLevelMetrics) {
            var treeMetrics = [],
                treeMetric,
                bufferMetric,
                tMetric,
                levelMetric,
                i;

            for (i = 0; i < bufferLevelMetrics.length; i += 1) {
                bufferMetric = bufferLevelMetrics[i];

                treeMetric = {};
                treeMetric.text = "Buffer: " + (i + 1);
                treeMetric.items = [];
                treeMetric.collapsed = true;

                tMetric = {};
                tMetric.text = "t: " + bufferMetric.t;

                levelMetric = {};
                levelMetric.text = "level: " + bufferMetric.level;

                treeMetric.items.push(tMetric);
                treeMetric.items.push(levelMetric);

                treeMetrics.push(treeMetric);
            }

            return treeMetrics;
        },


        manifesfToTreeMetrics = function (manifest) {
            var treeManifest = [];
            var period,
                baseUrl,
                duration,
                adaptationSet,
                p,
                adapation,
                repres,
                r;
            try {
                var periods = manifest.Period_asArray;
                //for each Period
                for (var i in periods) {
                    p = periods[i];
                    period = {};
                    period.text = "Period";
                    period.items = [];
                    period.collapsed = true;
                    // base Url attribute
                    baseUrl = {};
                    baseUrl.text = "BaseUrl : "+p.BaseURL;
                    period.items.push(baseUrl);
                    // duration attribute
                    duration = {
                        text : "duration : "+p.duration
                    };
                    period.items.push(duration);

                    //for each adaptationSet
                    adaptationSet = {};
                    adaptationSet.text = "AdapationSet";
                    adaptationSet.collapsed = true;
                    adaptationSet.items= [];
                    for (var j in p.AdaptationSet_asArray) {
                        var as = p.AdaptationSet_asArray[j];
                        adapation = {
                            text:"AdaptationSet : "+as.type
                        };
                        adapation.items = [];
                        adapation.collapsed = true;

                        //representations
                        for (var k=0; k<as.Representation_asArray.length; k++) {
                            repres = as.Representation_asArray[k];
                            r = {text: "Representation id:"+repres.id};
                            r.items = [
                                {text: "bandwidth: "+repres.bandwidth},
                                {text: "codecs: "+repres.codecs}
                            ];
                            r.collapsed = true;

                            if (r.AudioChannelConfiguration) {
                                r.items.push({
                                    text: "AudioChannelConfiguration",
                                    items: [{text: "value: "+r.AudioChannelConfiguration.value}],
                                    collapsed: true
                                });
                            }

                            adapation.items.push(r);
                        }

                        //SegmentTemplate
                        adapation.items.push({
                            text: "SegmentTemplate",
                            items: [
                                {text: "media: "+as.SegmentTemplate.media},
                                {text: "timescale: "+as.SegmentTemplate.timescale}
                            ],
                            collapsed: true
                        });

                        adaptationSet.items.push(adapation);
                    }
                    period.items.push(adaptationSet);
                    treeManifest.push(period);
                }
            } catch (e) {
                console.error("Error in periodsToTreeMetrics : ",e);
            }


            return treeManifest;
        },

        playListTraceMetricsToTreeMetrics = function (playListTrace) {
            var treeMetrics = [],
                treeMetric,
                bufferMetric,
                representationidMetric,
                subreplevelMetric,
                startMetric,
                durationMetric,
                playbackspeedMetric,
                stopreasonMetric,
                i;

            for (i = 0; i < playListTrace.length; i += 1) {
                bufferMetric = playListTrace[i];

                treeMetric = {};
                treeMetric.text = "Trace: " + (i + 1);
                treeMetric.items = [];
                treeMetric.collapsed = true;

                representationidMetric = {};
                representationidMetric.text = "representationid: " + bufferMetric.representationid;

                subreplevelMetric = {};
                subreplevelMetric.text = "subreplevel: " + bufferMetric.subreplevel;

                startMetric = {};
                startMetric.text = "start: " + bufferMetric.start;

                durationMetric = {};
                durationMetric.text = "duration: " + bufferMetric.duration;

                playbackspeedMetric = {};
                playbackspeedMetric.text = "playbackspeed: " + bufferMetric.playbackspeed;

                stopreasonMetric = {};
                stopreasonMetric.text = "stopreason: " + bufferMetric.stopreason;

                treeMetric.items.push(representationidMetric);
                treeMetric.items.push(subreplevelMetric);
                treeMetric.items.push(startMetric);
                treeMetric.items.push(durationMetric);
                treeMetric.items.push(playbackspeedMetric);
                treeMetric.items.push(stopreasonMetric);

                treeMetrics.push(treeMetric);
            }

            return treeMetrics;
        },

        playListMetricToTreeMetric = function (playListMetrics) {
            var treeMetrics = [],
                treeMetric,
                bufferMetric,
                startMetric,
                mstartMetric,
                startTypeMetric,
                traceMetric,
                i;

            for (i = 0; i < playListMetrics.length; i += 1) {
                bufferMetric = playListMetrics[i];

                treeMetric = {};
                treeMetric.text = "PlayList: " + (i + 1);
                treeMetric.items = [];
                treeMetric.collapsed = true;

                startMetric = {};
                startMetric.text = "start: " + bufferMetric.start;

                mstartMetric = {};
                mstartMetric.text = "mstart: " + bufferMetric.mstart;

                startTypeMetric = {};
                startTypeMetric.text = "starttype: " + bufferMetric.starttype;

                traceMetric = {};
                traceMetric.text = "trace";
                traceMetric.items = playListTraceMetricsToTreeMetrics(bufferMetric.trace);

                treeMetric.items.push(startMetric);
                treeMetric.items.push(mstartMetric);
                treeMetric.items.push(startTypeMetric);
                treeMetric.items.push(traceMetric);

                treeMetrics.push(treeMetric);
            }

            return treeMetrics;
        },

        representationSwitchToTreeMetrics = function (representationSwitch) {
            var treeMetrics = [],
                treeMetric,
                bufferMetric,
                tMetric,
                mtMetric,
                toMetric,
                ltoMetric,
                i;

            for (i = 0; i < representationSwitch.length; i += 1) {
                bufferMetric = representationSwitch[i];

                treeMetric = {};
                treeMetric.text = "Representation Switch: " + (i + 1);
                treeMetric.items = [];
                treeMetric.collapsed = true;

                tMetric = {};
                tMetric.text = "t: " + bufferMetric.t;

                mtMetric = {};
                mtMetric.text = "mt: " + bufferMetric.mt;

                toMetric = {};
                toMetric.text = "to: " + bufferMetric.to;

                ltoMetric = {};
                ltoMetric.text = "lto: " + bufferMetric.lto;

                treeMetric.items.push(tMetric);
                treeMetric.items.push(mtMetric);
                treeMetric.items.push(toMetric);
                treeMetric.items.push(ltoMetric);

                treeMetrics.push(treeMetric);
            }

            return treeMetrics;
        },

        playbackQualityToTreeMetrics = function (playbackQuality) {
            var treeMetrics = [],
                treeMetric,
                metric,
                i;

            for (i = 0; i < playbackQuality.length; i += 1) {
                metric = playbackQuality[i];

                treeMetric = {
                    text: "Playback Quality: " + (i + 1),
                    items: [
                        { text: "t:" + metric.t },
                        { text: "mt:" + metric.mt },
                        { text: "droppedFrames:" + metric.droppedFrames },
                        { text: "totalVideoFrames:" + metric.totalVideoFrames }
                    ]
                };
                treeMetric.collapsed = true;
                treeMetrics.push(treeMetric);
            }

            return treeMetrics;
        },

        videoResolutionToTreeMetrics = function (videoResolution) {
            var treeMetrics = [],
                treeMetric,
                metric,
                i;

            for (i = 0; i < videoResolution.length; i += 1) {
                metric = videoResolution[i];

                treeMetric = {
                    text: "Video Resolution: " + (i + 1),
                    items: [
                        { text: "t:" + metric.t },
                        { text: "mt:" + metric.mt },
                        { text: "width:" + metric.width },
                        { text: "height:" + metric.height }
                    ]
                };
                treeMetric.collapsed = true;
                treeMetrics.push(treeMetric);
            }

            return treeMetrics;
        },

        httpRequestTraceToTreeMetric = function (httpRequestTrace) {
            var treeMetrics = [],
                treeMetric,
                bufferMetric,
                sMetric,
                dMetric,
                bMetric,
                i;

            for (i = 0; i < httpRequestTrace.length; i += 1) {
                bufferMetric = httpRequestTrace[i];

                treeMetric = {};
                treeMetric.text = "Trace: " + (i + 1);
                treeMetric.items = [];
                treeMetric.collapsed = true;

                sMetric = {};
                sMetric.text = "s: " + bufferMetric.s;

                dMetric = {};
                dMetric.text = "d: " + bufferMetric.d;

                bMetric = {};
                bMetric.text = "b: " + bufferMetric.b.toString();

                treeMetric.items.push(sMetric);
                treeMetric.items.push(dMetric);
                treeMetric.items.push(bMetric);

                treeMetrics.push(treeMetric);
            }
        },

        httpRequestToTreeMetric = function (httpRequest) {
            var treeMetrics = [],
                treeMetric,
                bufferMetric,
                tcpidMetric,
                typeMetric,
                urlMetric,
                actualurlMetric,
                rangeMetric,
                trequestMetric,
                tresponseMetric,
                responsecodeMetric,
                intervalMetric,
                mediadurationMetric,
                traceMetric,
                i;

            for (i = 0; i < httpRequest.length; i += 1) {
                bufferMetric = httpRequest[i];

                treeMetric = {};
                treeMetric.text = "Http Request: " + (i + 1);
                treeMetric.items = [];
                treeMetric.collapsed = true;

                tcpidMetric = {};
                tcpidMetric.text = "tcpid: " + bufferMetric.tcpid;

                typeMetric = {};
                typeMetric.text = "type: " + bufferMetric.type;

                urlMetric = {};
                urlMetric.text = "url: " + bufferMetric.url;

                actualurlMetric = {};
                actualurlMetric.text = "actualurl: " + bufferMetric.actualurl;

                rangeMetric = {};
                rangeMetric.text = "range: " + bufferMetric.range;

                trequestMetric = {};
                trequestMetric.text = "trequest: " + bufferMetric.trequest;

                tresponseMetric = {};
                tresponseMetric.text = "tresponse: " + bufferMetric.tresponse;

                responsecodeMetric = {};
                responsecodeMetric.text = "responsecode: " + bufferMetric.responsecode;

                intervalMetric = {};
                intervalMetric.text = "interval: " + bufferMetric.interval;

                mediadurationMetric = {};
                mediadurationMetric.text = "mediaduration: " + bufferMetric.mediaduration;

                traceMetric = {};
                traceMetric.text = "trace";
                traceMetric.items = httpRequestTraceToTreeMetric(bufferMetric.trace);

                treeMetric.items.push(tcpidMetric);
                treeMetric.items.push(typeMetric);
                treeMetric.items.push(urlMetric);
                treeMetric.items.push(actualurlMetric);
                treeMetric.items.push(rangeMetric);
                treeMetric.items.push(trequestMetric);
                treeMetric.items.push(tresponseMetric);
                treeMetric.items.push(responsecodeMetric);
                treeMetric.items.push(intervalMetric);
                treeMetric.items.push(mediadurationMetric);
                treeMetric.items.push(traceMetric);

                treeMetrics.push(treeMetric);
            }

            return treeMetrics;
        },

        tcpConnectionToTreeMetric = function (tcpConnection) {
            var treeMetrics = [],
                treeMetric,
                bufferMetric,
                tcpidMetric,
                destMetric,
                topenMetric,
                tcloseMetric,
                tconnectMetric,
                i;

            for (i = 0; i < tcpConnection.length; i += 1) {
                bufferMetric = tcpConnection[i];

                treeMetric = {};
                treeMetric.text = "TCP Connection: " + (i + 1);
                treeMetric.items = [];
                treeMetric.collapsed = true;

                tcpidMetric = {};
                tcpidMetric.text = "tcpid: " + bufferMetric.tcpid;

                destMetric = {};
                destMetric.text = "dest: " + bufferMetric.dest;

                topenMetric = {};
                topenMetric.text = "topen: " + bufferMetric.topen;

                tcloseMetric = {};
                tcloseMetric.text = "tclose: " + bufferMetric.tclose;

                tconnectMetric = {};
                tconnectMetric.text = "tconnect: " + bufferMetric.tconnect;

                treeMetric.items.push(tcpidMetric);
                treeMetric.items.push(destMetric);
                treeMetric.items.push(topenMetric);
                treeMetric.items.push(tcloseMetric);
                treeMetric.items.push(tconnectMetric);

                treeMetrics.push(treeMetric);
            }

            return treeMetrics;
        },

        toTreeViewDataSource = function (metrics,metricsExt) {
            var bufferTreeMetrics = bufferLevelMetricToTreeMetric(metrics.BufferLevel),
                playListMetrics = playListMetricToTreeMetric(metrics.PlayList),
                representationSwitchMetrics = representationSwitchToTreeMetrics(metrics.RepSwitchList),
                playbackQualityMetrics = playbackQualityToTreeMetrics(metrics.PlaybackQuality),
                videoResolutionMetrics = videoResolutionToTreeMetrics(metrics.VideoResolution),
                httpRequestMetrics = httpRequestToTreeMetric(metrics.HttpList),
                tcpConnectionMetrics = tcpConnectionToTreeMetric(metrics.TcpList),
                manifestTreeMetrics = manifesfToTreeMetrics(metricsExt.manifestModel.getValue()),
                dataSource;

            dataSource = [
                {
                    text: "Buffer Level",
                    items: bufferTreeMetrics,
                    collapsed: true
                },
                {
                    text: "Representation Switch",
                    items: representationSwitchMetrics,
                    collapsed: true
                },
                {
                    text: "Playback Quality",
                    items: playbackQualityMetrics,
                    collapsed: true
                },
                {
                    text: "Video Resolution",
                    items: videoResolutionMetrics,
                    collapsed: true
                },
                {
                    text: "Play List",
                    items: playListMetrics,
                    collapsed: true
                },
                {
                    text: "HTTP Request",
                    items: httpRequestMetrics,
                    collapsed: true
                },
                {
                    text: "TCP Connection",
                    items: tcpConnectionMetrics,
                    collapsed: true
                },
                {
                    text: "Manifest",
                    items : manifestTreeMetrics,
                    collapsed: true
                }
            ];

            return dataSource;
        };

    return {
        toTreeViewDataSource: toTreeViewDataSource
    };
};
