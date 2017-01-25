var exec = require('child_process').exec,
    fs = require('fs'),
    del = require('del'),
    pkg = require('../package.json');


// Shell gitCommands
var gitCommands = {
    currentBranch:  "git branch | grep \\* | cut -d ' ' -f2",
    commitDate:     "git log -1 --format=%cD",
    clone:          "git clone -b gh-pages https://github.com/Orange-OpenSource/hasplayer.js.git gh-pages",
    configUser:     "git config user.name \"Travis-CI\"",
    configEmail:    "git config user.email \"bertrand.berthelot@orange.com\"",
    add:            "git add --all",
    commit:         "git commit -am \"Automatic build from Travis-CI\"",
    push:           "git push \"git@github.com:Orange-OpenSource/hasplayer.js.git\" gh-pages:gh-pages"
};

/**
 * Executes a shell command and returns result in a promise.
 * @return {Promise} the promise that will be resolved when command is executed
 */
var execCommand = function(cmd) {
    var p = new Promise(function(resolve, reject) {
        exec(cmd, function(err, stdout, stderr) {
            if (!err) {
                resolve(stdout);
            } else {
                reject(stderr);
            }
        });
    });
    return p;
};

/**
 * Returns the current branch name.
 * @return {String} the current branch name
 */
var getBranchName = function() {
    if (process.env.TRAVIS_BRANCH) {
        return Promise.resolve(process.env.TRAVIS_BRANCH);
    } else {
        return execCommand(gitCommands.currentBranch);
    }
};

// Steps for deployment
// 1 - Get version
// 2 - Get date
// 3 - Clean gh-pages directory
// 4 - Checkout gh-pages from github
// 5 - Copy 'dist' directory contents into corresponding subfolder of gh-pages
// 6 - Upate home file (index.html) in case of a new release
// 7 - Add, commit and push changes to Github

// 1 - Get version
getBranchName().then(
    function (branch) {
        branch = branch.replace(/\s/g, '').trim();
        console.info('Branch: ' + branch);

        // If 'development' branch set version to 'development'
        if (branch === 'development') {
            pkg.version = 'development';
        } else if (branch !== 'master') {
            // For any other branch than master 'branch', do not deploy
            return Promise.reject('Branch not deployed');
        }
        console.info('Version: ' + pkg.version);

        return Promise.resolve();
    }
)

// 2 - Get date
.then(function () {
    return execCommand(gitCommands.commitDate).then(
        function (cdate) {
            var date = new Date(cdate);
            pkg.date = (date.getFullYear()) + '-' + (date.getMonth() + 1) + '-' + (date.getDate());
            console.info('Date: ' + pkg.date);
            return Promise.resolve();
        }
    );
})

// 3 - Clean gh-pages directory
.then(function () {
    console.info('Clean gh-pages working directory');
    return del('gh-pages/**/*', {force:true, dot:true});
})

// 4 - Checkout gh-pages from github
.then(function () {
    console.info('Checkout gh-pages');
    return execCommand(gitCommands.clone);
})

// 5 - Copy 'dist' directory contents into corresponding subfolder of gh-pages
.then(function() {
    var path = 'gh-pages/' + pkg.version;
    if (!fs.existsSync(path)) {
        console.info('Create new folder: ', path);
        fs.mkdirSync(path);
    }
    console.info('Copy dist/* into ' + path);
    return execCommand('cp -r dist/* ' + path);
})

// 6 - Upate home file (index.html) in case of a new release
.then(function() {
    // Open index.html file
    var path = 'gh-pages/index.html';
    var index = fs.readFileSync(path, 'utf-8');

    // Check if file has to be updated
    if (index.indexOf(pkg.version) === -1) {
        var pos = index.indexOf('<p/>');
        if (pos !== -1) {
            // Insert new link (before 'development' version)
            console.info('Update index.html');
            index = index.substring(0, pos - 1) +
                    '\n<a href=\"' + pkg.version + '/index.html\">Version ' + pkg.version + '</a> - (' + pkg.date + ')<br/>\n' +
                    index.substring(pos, index.length - 1);
            fs.writeFileSync(path, index);
        }
    }
    return Promise.resolve();
})

// 7 - Add, commit and push changes to Github
.then(execCommand.bind(null, 'cd gh-pages && '+ gitCommands.configUser))
.then(execCommand.bind(null, 'cd gh-pages && '+ gitCommands.configEmail))
.then(execCommand.bind(null, 'cd gh-pages && '+ gitCommands.add))
.then(execCommand.bind(null, 'cd gh-pages && '+ gitCommands.commit))
.then(execCommand.bind(null, 'cd gh-pages && '+ gitCommands.push))
.catch(function(err){
    console.error(err);
    throw new Error(err);
});