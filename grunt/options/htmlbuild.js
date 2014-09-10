module.exports = {
	dist: {
		src: '<%= path %>/dashif.html',
		dest: '<%= path %>',
		options: {
			beautify: false,
			relative: true,
			styles: {
				main: ['<%= path %>/style.css']
			}
		}
	}
};