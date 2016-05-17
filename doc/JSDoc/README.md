# hasplayer.js

hasplayer.js is a javascript implementation of a video player based on the W3C premium extensions, i.e. [MSE](https://dvcs.w3.org/hg/html-media/raw-file/tip/media-source/media-source.html) and [EME](https://dvcs.w3.org/hg/html-media/raw-file/tip/encrypted-media/encrypted-media.html).

hasplayer.js is an extension of the [dash.js](https://github.com/Dash-Industry-Forum/dash.js) project with the aim of supporting additional http adaptive streaming protocols such as Microsoft Smooth Streaming protocol and Apple Http Live Streaming.

If your intent is to use the player code without contributing back to this project, then use the MASTER branch which holds the approved and stable public releases.

If your goal is to improve or extend the code and contribute back to this project, then you should make your changes in, and submit a pull request against, the DEVELOPMENT branch. 

## Getting Started

Create a video element somewhere in your html. For our purposes, make sure to set the controls property to true.
```
<video id="videoPlayer" controls="true"></video>
```

Add hasplayer.js to the end of the body.
```
<body>
  ...
  <script src="yourPathToHasplayer/hasplayer.js"></script>
</body>
```

Now comes the good stuff. We need to create an MediaPlayer. Then we need to initialize it, attach it to our "videoPlayer" and then tell it where to get the video from. We will do this in an anonymous self executing function, that way it will run as soon as the page loads. So, here is how we do it:
``` js
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
```
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
```
<!doctype html>
<html>
    <head>
        <title>Hasplayer.js Rocks</title>
    </head>
    <body>
        <div>
            <video id="videoPlayer" controls="true"></video>
        </div>
        <script src="yourPathToHasplayer/hasplayer.js"></script>
        <script>
            (function(){
                var stream = {
                    url: "http://playready.directtaps.net/smoothstreaming/SSWSS720H264/SuperSpeedway_720.ism/Manifest",
                    protData: {
                        com.microsoft.playready: {
                            laURL: "http://roap.purplecast.us/test/services/StandardPlayReadyAquireLicenseByContent.cfm?distrib=olps",
                            customData: "B2C99B73-CA41-4003-84A3AA16CE92B304"
                        }
                    }
                };
                var mediaPlayer = new MediaPlayer();
                mediaPlayer.init(document.querySelector("#videoPlayer"));
                mediaPlayer.load(stream);
            })();
        </script>
    </body>
</html>
```
## Events

MediaPlayer offers events to be notified of differents events on video streaming. Those events are, for a part, sent by the HTML5 video element, and for an other part, sent by hasPlayer.js.
 
```
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
```
function onPlayBitrateChanged(e) {
    handlePlayBitrate(e.detail.bitrate, e.detail.time);
};
```

### Errors

The following table provides the list of the errors and warnings that can be notified by the MediaPlayer (see MediaPlayer's [addEventListener()](MediaPlayer.html#addEventListener) function).

<!-- build:ERRORS_TABLE -->
<!-- endbuild -->

