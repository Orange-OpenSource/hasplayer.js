var isLive=true;
var mediaObject;
var inCreation = true;
var results = [];


function onSilverlightError(){
	console.info("error");
}


function toTest() {
	
	/*
	var deferred = Q.defer();
	mediaObject.onPlayingStart = function() {
		if (!deferred.promise.isFulfilled()) {
			results.push(new Date() - startTime);
			deferred.resolve();
		}
	};

	var startTime = new Date();
	*/
	var params = {
		"request":'{"streamToLoad": {"url": "http://2is7server1.rd.francetelecom.com/VOD/BBB-SD/big_buck_bunny_1080p_stereo.ism/Manifest","autoplay": true,"smoothStreaming": true,"backURL": "","mastURL": ""}}'
	};

    mediaObject.load(params);
    /*return deferred.promise;*/
}

function onSilverLightBoxLoad(sender){
	if (sender != null && sender != 0) {
		var plugin = sender.getHost();
		try {
			mediaObject = plugin.Content.mediaObject;
		}catch (e) {
			console.error(e);
		}
	}else{
		mediaObject = document.getElementById("BoxSl").Content.mediaObject;
	}

				
	// mediaObject.settings.EnableFramerateCounter = true;
/*
	var result = Q(null);
    var i = 1;
    while(i>0) {
            result = result.then(toTest);
        i--;
    }

	result.finally(function() {
        document.getElementById("result").innerHTML = JSON.stringify(results) + ' moy : '+moyenne(results)+'ms';
        mediaObject.pause();
    });
	
	
	toTest();
	*/
}

function startVideo() {
	toTest();
}


function embedSL(){
	
	var slParams ={
		source:"CorePlayer.xap",
		id:"BoxSl",
		parentElement:document.getElementById("boxContainer"),
		initParams:"GUIMode=All,jsId=BoxSl,JSEnabled=true,mode=TVOD,logUrl=debug,MenuOn=false",
		properties:{
			width:"512",
			height:"308",
			windowless:"true",
			version:"5.0",
			alt:"Silverlight n'est pas installé",
			EnableGPUAcceleration:"true",
			EnableCacheVisualization:"false",/*
			EnableFrameRateCounter:'true',*/
			autoUpgrade:"true",
			uiculture:"fr",
			enableHTMLAccess:"true"
		},
		events:{
			"onError":onSilverlightError,
			"onLoad":onSilverLightBoxLoad
		},
		context:window
	};

	Silverlight.createObjectEx(slParams);
}


function moyenne(tab) {
    var somme = 0;
    for (var i = 0, j = tab.length; i < j; i++) {
        somme += tab[i];
    }
    return somme / tab.length;
}
