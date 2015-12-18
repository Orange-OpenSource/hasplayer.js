module.exports = {

    info: {
        options: {
            tasks: [{
                name: 'build_hasplayer',
                info: 'Create built and minified versions of the player (without samples). Options:\n\n' +
                    '-protocol dash,mss,hls     Embed specified protocols. Dash is always included but specifying it alone will exclude other protocols.\n\n' +
                    '-protection                Include/exclude protection module.\n\n' +
                    '-analytics                 Include/exclude analytics.\n\n'
            }, {
                name: 'build_dashif_sample',
                info: 'Create built version of DashIF sample application.\n' +
                      'It requires hasplayer with NO proxy.\n'
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
