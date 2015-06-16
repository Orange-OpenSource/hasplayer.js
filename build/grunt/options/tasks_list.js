module.exports = {

    info: {
        options: {
            tasks: [
                {name: 'build', info: 'Create built and minified versions of the player with some samples to try out.\n\n' +
                                      '-protocol dash,mss,hls' + '\t\t' + 'Embed specified protocols. Dash is always included but specifying it alone will exclude other protocols.\n\n' +
                                      '-no-protection'         + '\t\t' + 'Exclude protection module.\n\n'},
                {name: 'doc', info: 'Generate API documentation.\n'},
                {name: 'source', info: 'Replace the player source files in each samples by the ones in samples/playerSrc.html.\n'},
                {name: 'test', info: 'Run a syntaxic test on each player source file and show errors/warnings.\n'},
                {name: 'help', info: 'Well... you\'re running it ;)\n'}
            ]
        }
    }

};
