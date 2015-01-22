

module.exports = function(grunt) {

	var log = grunt.option('log') || grunt.option('log4j') ||false,
		dropConsole = !log,
		logLevels = ["error", "warn", "info", "debug", "log"],
		logOption = [];

	if (!log) {
		for (var i = 0; i < logLevels.length; i++) {
			logOption.push("self.debug." + logLevels[i]);
			logOption.push("this.debug." + logLevels[i]);
			logOption.push("rslt.debug." + logLevels[i]);
		}
	}

	return {
		generated: {
			options: {
				compress:{
					pure_funcs: logOption,
					drop_console : dropConsole,
					drop_debugger: true,
					warnings: true
				},
				banner: '@@COPYRIGHTTOREPLACE/* Last build : @@TIMESTAMPTOREPLACE / git revision : @@REVISIONTOREPLACE */\n'
			}
		},
		json: {
			options: {
				beautify : false,
				mangle: false
			},
			files: {
				'<%= path %>/json.js': ['<%= path %>/json.js']
			}
		}
	};

};