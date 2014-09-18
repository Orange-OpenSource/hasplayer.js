

module.exports = function(grunt) {

	var log = grunt.option('log') || false;

	if(log) {
		logOption = [];
	} else {
		logOption = ['self.debug.log','this.debug.log','rslt.debug.log'];
	}

	return {
		generated: {
			options: {
				compress:{
					pure_funcs: logOption,
					global_defs: {
						DEBUG: true
					},
					drop_console : true,
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