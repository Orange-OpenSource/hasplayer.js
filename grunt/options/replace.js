module.exports = {
	all: {
		options: {
			patterns: [
			{
				match: 'REVISIONTOREPLACE',
				replacement: '<%= meta.revision %>'
			},
			{
				match: 'TIMESTAMPTOREPLACE',
				replacement: '<%= (new Date().getDate())+"."+(new Date().getMonth()+1)+"."+(new Date().getFullYear())+"_"+(new Date().getHours())+":"+(new Date().getMinutes())+":"+(new Date().getSeconds()) %>'
			}
			]
		},
		files: [
		{expand: true, flatten: true, src: ['<%= path %>/hasplayer.js', '<%= path %>/dashif.js', '<%= path %>/player.js'], dest: '<%= path %>'}
		]
	},
	source: {
		options: {
			patterns: [
			{
				match: /<!-- source -->([\s\S]*?)<!-- \/source -->/,
				replacement: '<%= grunt.file.read("samples/playerSrc.html") %>'
			}
			]
		},
		files: [
		{expand: true, flatten: true, src: ['<%= appDemoPlayer %>/index.html'], dest: '<%= appDemoPlayer %>'},
		{expand: true, flatten: true, src: ['<%= app4Ever %>/index.html'], dest: '<%= app4Ever %>'},
		{expand: true, flatten: true, src: ['<%= appDashif %>/index.html'], dest: '<%= appDashif %>'},
		{expand: true, flatten: true, src: ['<%= appABRTest %>/current.html'], dest: '<%= appABRTest %>'}
		]
	},
	sourceForBuild: {
		options: {
			patterns: [
			{
				match: /<!-- source -->/,
				replacement: '<!-- build:js hasplayer.js-->'
			},
			{
				match: /<!-- \/source -->/,
				replacement: '<!-- endbuild -->'
			}
			]
		},
		files: [
		{expand: true, flatten: true, src: ['<%= orangeApps %>/playerSrc.html'], dest: '<%= path %>/source'}
		]
	},
	sourceByBuild: {
		options: {
			patterns: [
			{
				match: /<!-- source -->([\s\S]*?)<!-- \/source -->/,
				replacement: '<script src="hasplayer.js"></script>'
			}
			]
		},
		files: [
		{expand: true, flatten: true, src: ['<%= path %>/player.html'], dest: '<%= path %>'},
		{expand: true, flatten: true, src: ['<%= path %>/dashif.html'], dest: '<%= path %>'}
		]
	}
};