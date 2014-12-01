module.exports = {
	html: {
		files: [
		{src: '<%= orangeApps %>/index.html', dest: '<%= path %>/index.html'},
		{src: '<%= appDashif %>/index.html', dest: '<%= path %>/dashif.html'},
		{src: '<%= appDashif %>/hasplayer_config.json', dest: '<%= path %>/hasplayer_config.json'},
		{src: '<%= appDemoPlayer %>/index.html', dest: '<%= path %>/player.html'}
		]
	}
};