module.exports = {

    'playerSrc': {
        options: {
            assetsDirs : ['<%= path %>/source'],
            type: 'html'
        },
        files: {src: ['<%= path %>/source/playerSrc.html']}
    },

    'dashif': {
        options: {
            assetsDirs : ['<%= path %>'],
            type: 'html'
        },
        files: {src: ['<%= path %>/dashif.html', '<%= path %>/player.html']}
    }
};