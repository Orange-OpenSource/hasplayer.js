module.exports = {

    info: {
        options: {
            tasks: [
                {name: 'build', info: 'Create builded and minified versions of the player with some samples to try out\n'},
                {name: 'source', info: 'Replace the player source files in each samples by the ones in samples/playerSrc.html\n'},
                {name: 'test', info: 'Run a syntaxic test on each player source file and show errors/warnings\n'},
                {name: 'help', info: 'Well... you\'re running it ;)\n'}
            ]
        }
    }

};