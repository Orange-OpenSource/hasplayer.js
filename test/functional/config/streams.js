define({

    MSS_LIVE_1: {
        "name": "Big Bug Bunny",
        "protocol": "MSS",
        "type": "Live",
        "url": "http://2is7server1.rd.francetelecom.com/C4/C4-51_BBB.isml/Manifest",
        "videoBitrates": [230000, 331000, 477000, 688000, 991000, 1427000, 2100000],
        "video_fragment_pattern":"(video)",
        "audio_fragment_pattern":"(audio)"
    },
    MSS_VOD_1: {
        "name": "SuperSpeedway",
        "protocol": "MSS",
        "type": "VOD",
        "url": "http://playready.directtaps.net/smoothstreaming/SSWSS720H264/SuperSpeedway_720.ism/Manifest",
        "videoBitrates": [320000,680000,1100000,1600000,2100000],
        "duration": 120
    }
});
