module.exports = {

    info: {
        options: {
            tasks: [{
                name: 'build',
                info: 'Create built and minified versions of the player with some samples to try out. Options:\n\n' +
                    '-protocol dash,mss,hls     Embed specified protocols. Dash is always included but specifying it alone will exclude other protocols.\n\n' +
                    '-protection                Include/exclude protection module.\n\n'
            }, {
                name: 'test',
                info: 'Run a syntaxic test on each player source file and show errors/warnings.\n'
            }, {
                name: 'help',
                info: 'Well... you\'re running it ;)\n'
            }]

        }
    }

};
