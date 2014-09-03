var player,
    video,
    context,
    results;
        

function toTest() {
    console.log("toTest");
    var deferred = Q.defer();

    video.addEventListener("playing", function() {
        if (!deferred.promise.isFulfilled()) {
            results.push(new Date() - startTime);
            console.error(results);
            deferred.resolve();
        }
    });

    var startTime = new Date();
    
    player.attachSource('http://2is7server1.rd.francetelecom.com/VOD/BBB-SD/big_buck_bunny_1080p_stereo.ism/Manifest');

    return deferred.promise;
}


function moyenne(tab) {
    var somme = 0;
    for (var elem in tab) {
        somme += tab[elem];
    }

    return somme / tab.length;
}

function onLoaded() {

    ////////////////////////////////////////
    //
    // Player Setup
    //
    ////////////////////////////////////////

    video = document.querySelector("video");
    context = new Custom.di.CustomContext();
    player = new MediaPlayer(context);

    player.startup();
   
    player.attachView(video);
    player.setAutoPlay(true);
    
    
    results = [];
 
    var result = Q(null);
    var i = 20;
    while(i>0) {
        result = result.then(toTest);
        i--;
    }
    
    result.finally(function() {
        document.getElementById("result").innerHTML = JSON.stringify(results) + ' moy : '+moyenne(results)+'ms';
        video.pause();
    });

}
