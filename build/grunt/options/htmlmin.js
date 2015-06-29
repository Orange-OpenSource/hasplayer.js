module.exports = {

    main: {
        options: {
            removeComments: true,
            collapseWhitespace: false,
            minifyCSS: true,
            minifyJS: false
        },
        files: {
            '<%= path %>/index.html': '<%= path %>/index.html',
            '<%= path %>/dashif.html': '<%= path %>/dashif.html',
            '<%= path %>/player.html': '<%= path %>/player.html'
        }
    }

};