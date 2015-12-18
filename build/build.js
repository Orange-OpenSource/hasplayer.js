var execSync = require('child_process').execSync,
    args = process.argv.slice(2),

    buildHasplayer = function() {
        console.log('+-----------------------------------------+\n' +
            '|               Build HasPlayer           |\n' +
            '+-----------------------------------------+\n');
        execSync('grunt build_hasplayer ' + args.join(' '), {
            stdio: 'inherit'
        });
    },

    buildDashIf = function() {
        console.log('+-----------------------------------------+\n' +
            '|            Build DashIF sample          |\n' +
            '+-----------------------------------------+\n');
        execSync('grunt build_dashif_sample ' + args.join(' '), {
            stdio: 'inherit'
        });
    };

buildHasplayer();
buildDashIf();