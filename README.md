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
2. [install grunt](http://gruntjs.com/getting-started)
    * npm install -g grunt-cli

### Build / Run

1. Change directories to the build folder
    * cd build/
2. Install all Node Modules defined in package.json 
    * npm install
3. Run build task for building hasplayer
    * grunt build_hasplayer
4. You can also check for other available targets by running:
    * grunt help

The build task can be configured in order to select supported protocol(s) and to integrate or not EME support.
For example:

    # grunt build_hasplayer -protocol mss -protection=false (mss support only, no EME support)

## Demo

A builded version of the hasplayer.js and samples is available at this address:

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
Now comes the good stuff. We need to create a context. Then from that context we create a media player, initialize it, attach it to our "videoPlayer" and then tell it where to get the video from. We will do this in an anonymous self executing function, that way it will run as soon as the page loads. So, here is how we do it:
``` js
(function(){
    var url = "http://playready.directtaps.net/smoothstreaming/SSWSS720H264/SuperSpeedway_720.ism/Manifest";
    var context = new MediaPlayer.di.Context();
    var player = new MediaPlayer(context);
    player.startup();
    player.attachView(document.querySelector("#videoPlayer"));
    player.attachSource(url);
})();
```

When it is all done, it should look similar to this:
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
                var url = "http://playready.directtaps.net/smoothstreaming/SSWSS720H264/SuperSpeedway_720.ism/Manifest";
                var context = new MediaPlayer.di.Context();
                var player = new MediaPlayer(context);
                player.startup();
                player.attachView(document.querySelector("#videoPlayer"));
                player.attachSource(url);
            })();
        </script>
    </body>
</html>
```
