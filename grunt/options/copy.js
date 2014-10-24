module.exports = {
	html: {
		files: [
		{src: '<%= orangeApps %>/index.html', dest: '<%= path %>/index.html'},
		{src: '<%= appDashif %>/index.html', dest: '<%= path %>/dashif.html'},
		{src: '<%= appDemoPlayer %>/index.html', dest: '<%= path %>/player.html'}
		]
	}
};