module.exports = {
	main: {
		options: {
			mode: 'zip',
			archive: '<%= path %>/hasplayer.js.zip'
		},
        files: [
            {
                expand: true,
                cwd: '<%= path %>',
                src: ['*'],
                dest: '/',
            }
        ]
	}
};