module.exports = {

    hasplayer: {
        src: '<%= path %>/source/playerSrc.html'
    },

    dashif: {
        src: [
            '<%= appDashif %>/index.html',
            '<%= appDemoPlayer %>/index.html'
        ]
    },

    options: {
        dest: '<%= path %>'
    }
};