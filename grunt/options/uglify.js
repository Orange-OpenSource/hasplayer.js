

module.exports = function(grunt) {

	var log = grunt.option('log') || false;
	var logOption = ['self.debug.log','this.debug.log','rslt.debug.log'];
	var dropConsole = true;

	if(log) {
		logOption = [];
		dropConsole = false;
	}

	return {
		generated: {
			options: {
				compress:{
					pure_funcs: logOption,
					global_defs: {
						DEBUG: true
					},
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