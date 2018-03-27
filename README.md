# hasplayer.js [![Build Status](https://travis-ci.org/Orange-OpenSource/hasplayer.js.svg?branch=development&style=flat-square)](https://travis-ci.org/Orange-OpenSource/hasplayer.js)

hasplayer.js is a javascript implementation of a video player based on the W3C premium extensions, i.e. [MSE](https://dvcs.w3.org/hg/html-media/raw-file/tip/media-source/media-source.html) and [EME](https://dvcs.w3.org/hg/html-media/raw-file/tip/encrypted-media/encrypted-media.html).

hasplayer.js is an extension of the [dash.js](https://github.com/Dash-Industry-Forum/dash.js) project with the aim of supporting additional http adaptive streaming protocols such as Microsoft Smooth Streaming protocol and Apple Http Live Streaming.

If your intent is to use the player code without contributing back to this project, then use the MASTER branch which holds the approved and stable public releases.

If your goal is to improve or extend the code and contribute back to this project, then you should make your changes in, and submit a pull request against, the DEVELOPMENT branch.

Learn more about versions and roadmap on the [wiki](https://github.com/Orange-OpenSource/hasplayer.js/wiki).

## Quick Start

### Reference Player

1. Download 'master', 'development' or latest tagged release.
2. Extract hasplayer.js and move the entire folder to localhost (or run any http server instance at the root of the hasplayer.js folder).
3. Open any sample from the samples folder in your MSE capable web browser.

### Install Dependencies

1. [install nodejs](http://nodejs.org/)
2. [install gulp](https://github.com/gulpjs/gulp/blob/master/docs/getting-started.md)

```
npm install -g gulp
```

### Build / Run

npm run build

The build task can be configured in order to select supported protocol(s) and to integrate or not EME support.
For example:

1. No hls support, no EME support:
```
npm run build -- --no-hls --no-protection
```
2. No hls support, no MSS support:
```
npm run build -- --no-hls --no-mss
```

## Demo

A builded version of the hasplayer.js and samples is available at this address:

http://orange-opensource.github.io/hasplayer.js

## License

All code in this repository is covered by the [BSD-3 license](http://opensource.org/licenses/BSD-3-Clause).
See LICENSE file for copyright details.


## Getting Started

Create a video element somewhere in your html. For our purposes, make sure to set the controls property to true.
```html
<video id="videoPlayer" controls="true"></video>
```

Add hasplayer.js to the end of the body.
```html
<body>
  ...
  <script src="yourPathToHasplayer/hasplayer.js"></script>
</body>
```

Now comes the good stuff. We need to create an MediaPlayer. Then we need to initialize it, attach it to our "videoPlayer" and then tell it where to get the video from. We will do this in an anonymous self executing function, that way it will run as soon as the page loads. So, here is how we do it:
```js
(function(){
    var stream = {
        url: "http://playready.directtaps.net/smoothstreaming/SSWSS720H264/SuperSpeedway_720.ism/Manifest"
    };
    var mediaPlayer = new MediaPlayer();
    MediaPlayer.init(document.querySelector("#videoPlayer"));
    MediaPlayer.load(stream);
})();
```

When it is all done, it should look similar to this:
```html
<!doctype html>
<html>
    <head>
        <title>hasplayer.js Rocks</title>
    </head>
    <body>
        <div>
            <video id="videoPlayer" controls="true"></video>
        </div>
        <script src="yourPathToHasplayer/hasplayer.js"></script>
        <script>
            (function(){
                var stream = {
                    url: "http://playready.directtaps.net/smoothstreaming/SSWSS720H264/SuperSpeedway_720.ism/Manifest"
                };
                var mediaPlayer = new MediaPlayer();
                mediaPlayer.init(document.querySelector("#videoPlayer"));
                mediaPlayer.load(stream);
            })();
        </script>
    </body>
</html>
```
## DRM Video Stream
In the case of protected content, here is an example illustrating setting of the protection data:
```js
    var stream = {
        url: "<manifest_url>",
        protData: {
            "<key_system>": {
                laURL: "<licenser_url>",
                withCredentials: "<license_request_withCredentials_value (true or false)>",
                cdmData: "<CDM_specific_data>", // Supported by PlayReady key system (using MS-prefixed EME API) only
                serverCertificate: "<license_server_certificate (as Base64 string)>"
                audioRobustness: "<audio_robustness_level>" // Considered for Widevine key system only
                videoRobustness: "<video_robustness_level>" // Considered for Widevine key system only
            }
        }
    };
    mediaPlayer.load(stream);
```

### HLS and FairPlay on Safari/OSx
In order to playback HLS protected contents with FairPlay DRM, a specific mode is available which consists in streaming and playing the content directly with the &lt;video&gt; element, and in managing the exchanges between the FairPlay CDM and the licenser using EME.
To activate this mode on Safari/OSx you need to explicitely indicate the protocol type, i.e. 'HLS', for the input stream:

```js
    var stream = {
        url: "<manifest_url>",
        protocol= "HLS",
        protData: {
            "com.apple.fps.1_0": {
                laURL: "<licenser_url>",
                withCredentials: "<license_request_withCredentials_value (true or false)>",
                serverCertificate: "<license_server_certificate (as Base64 string)>"
            }
        }
    };
    mediaPlayer.load(stream);
```

Since native player is used to achieve streaming session, some parts of the MediaPlayer API have no effect (functions relative to streaming and ABR configuration, DVR, trick mode...).
However, API for audio and subtitles tracks management is functional.

## Events

MediaPlayer offers events to be notified of differents events on video streaming. Those events are, for a part, sent by the HTMLMediaElement (&lt;video&gt;), and for an other part, sent by the MediaPlayer.

```js
function registerMediaPlayerEvents() {
    // MediaPlayer events
    mediaPlayer.addEventListener("error", onError);
    mediaPlayer.addEventListener("warning", onWarning);
    mediaPlayer.addEventListener("cueEnter", onCueEnter);
    mediaPlayer.addEventListener("cueExit", onCueExit);
    mediaPlayer.addEventListener("play_bitrate", onPlayBitrateChanged);
    mediaPlayer.addEventListener("download_bitrate", onDownloadBitrateChanged);
    mediaPlayer.addEventListener("manifestUrlUpdate", onManifestUrlUpdate);
    mediaPlayer.addEventListener("metricAdded", onMetricAdded);
    mediaPlayer.addEventListener("metricChanged", onMetricChanged);
    mediaPlayer.addEventListener("bufferLevel_updated", onBufferLevelUpdated);
    mediaPlayer.addEventListener("state_changed", onStateChanged);
    // <video> element events
    mediaPlayer.addEventListener("loadeddata", onload);
    mediaPlayer.addEventListener("play", onPlay);
    mediaPlayer.addEventListener("pause", onPause);
    mediaPlayer.addEventListener("timeupdate", onTimeUpdate);
    mediaPlayer.addEventListener("volumechange", onVolumeChange);
};
```
For instance, callback function looks like this :
```js
function onPlayBitrateChanged(e) {
    handlePlayBitrate(e.detail.bitrate, e.detail.time);
};
```

## Documentation

Full [API Documentation](http://orange-opensource.github.io/hasplayer.js/development/doc/jsdoc/index.html) is available describing MediaPlayer public methods and events.

This API documentation can be generated using following gulp command:
```
npm run doc
```

### Tested With

[<img src="https://cloud.githubusercontent.com/assets/7864462/12837037/452a17c6-cb73-11e5-9f39-fc96893bc9bf.png" alt="Browser Stack Logo" width="300">](https://www.browserstack.com/)
