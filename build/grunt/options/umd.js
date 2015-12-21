module.exports = function(grunt){

    return {
        all: {
            options: {
                src: './.tmp/concat/hasplayer.js',
                dest: './.tmp/concat/hasplayer.js',
                template:'./grunt/templates/umd.hbs',
                objectToExport: 'MediaPlayer'
            }
        }
    };
};