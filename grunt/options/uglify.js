module.exports = {

	generated: {
		options: {
			compress:{
				pure_funcs: [
				'self.debug.log',
				'this.debug.log',
				'rslt.debug.log'
				],
				global_defs: {
					DEBUG: true
				},
				drop_console : true,
				drop_debugger: true,
				warnings: true
			},
			banner: '/* Last build : @@TIMESTAMPTOREPLACE / git revision : @@REVISIONTOREPLACE */\n'
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