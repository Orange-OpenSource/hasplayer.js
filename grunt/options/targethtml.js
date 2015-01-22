module.exports = function (grunt) {

	var log4j = grunt.option('log4j') || false;

	return log4j ? {
		build: {
			files: {
			}
		}
	} : {
		build: {
			files: {
				'<%= path %>/index.html': '<%= path %>/index.html',
				'<%= path %>/source/playerSrc.html': '<%= path %>/source/playerSrc.html'
			}
		}
	};
};
