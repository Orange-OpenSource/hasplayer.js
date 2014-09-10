module.exports = {
	all: ["app/js/*/**/*.js"],
	options: {
		jshintrc: ".jshintrc",
		reporter: require('jshint-stylish')
	}
};