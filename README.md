# hasplayer.js

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
    * npm install -g gulp

### Build / Run

npm run build

The build task can be configured in order to select supported protocol(s) and to integrate or not EME support.
For example:

1. No hls support, no EME support:
    * npm build -hls=false -protection=false
2. No hls support, no MSS support:
    * npm build -hls=false -mss=false

## Demo

A builded version of the hasplayer.js and samples is available ah this address:

http://orange-opensource.github.io/hasplayer.js

## License

All code in this repository is covered by the [BSD-3 license](http://opensource.org/licenses/BSD-3-Clause).
See LICENSE file for copyright details.


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

## Documentation

Full [API Documentation](http://orange-opensource.github.io/hasplayer.js/dev/doc/index.html) is available describing MediaPlayer public methods and events.

This API documentation can be generated using following gulp command:

npm run doc

