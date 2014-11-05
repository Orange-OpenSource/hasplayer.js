module.exports = function(grunt) {

	grunt.config.set('path', 'build');

	grunt.registerTask('zip', [
		'compress:main'
		]);
};