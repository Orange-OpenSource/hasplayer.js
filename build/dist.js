/**
 * This file is used to send dist directory to current branch (only on master branch)
 */

var exec = require('child_process').exec,
    fs = require('fs'),
    path = require('path'),
    del = require('del');



// Shell gitCommands
var gitCommands = {
    currentBranch: "git branch | grep \\* | cut -d ' ' -f2",
    configUser: "git config user.name \"Travis-CI\"",
    configEmail: "git config user.email \"bertrand.berthelot@orange.com\"",
    add: "git add dist -f",
    commit: "git commit -am \"Send dist files from Travis-CI [ci skip]\"",
};

var branchName = '';

/**
 * Executes a shell command and returns result in a promise.
 * @return {Promise} the promise that will be resolved when command is executed
 */
var execCommand = function (cmd) {
    var p = new Promise(function (resolve, reject) {
        var parentDir = path.resolve(process.cwd(), '.');
        exec(cmd, {
            cwd: parentDir
        }, function (err, stdout, stderr) {
            var stdoutstr = stdout.toString();
            var stderrstr = stderr.toString();

            if (stdoutstr !== '') {
                console.log(stdoutstr);
            }

            if(stderrstr!== '') {
                console.log(stderrstr);
            }

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
var getBranchName = function () {
    if (process.env.TRAVIS_BRANCH) {
        return Promise.resolve(process.env.TRAVIS_BRANCH);
    } else {
        return execCommand(gitCommands.currentBranch);
    }
};

var updateGitCommands = function (branch) {
    gitCommands.clone = "git clone -b " + branch + " https://github.com/Orange-OpenSource/hasplayer.js.git " + branch;
    gitCommands.push = "git push \"git@github.com:Orange-OpenSource/hasplayer.js.git\" " + branch;
};

// Steps
// 1 - Check branch name
// 2 - Clean branch directory
// 3 - Checkout branch from github
// 4 - Copy 'dist' directory contents into corresponding subfolder of branch
// 5 - Add, commit and push changes to Github

// 1 - Check branch name
getBranchName().then(
    function (branch) {
        branch = branch.replace(/\s/g, '').trim();
        console.info('Branch: ' + branch);
        if (branch !== 'master' && branch !== 'npmdist') {
            // For any other branch than master 'branch', do not dist
            return Promise.reject('Dist only on Master branch');
        }

        branchName = branch;
        updateGitCommands(branch);
        return Promise.resolve();
    })

// 2 - Clean branch directory
    .then(function () {
    console.info('Clean branch working directory');
    return del(branchName + '/**/*', {
        force: true,
        dot: true
    });
})

// 3 - Checkout branch from github
    .then(function () {
    console.info('Checkout branch');
    return execCommand(gitCommands.clone);
})

// 4 - Copy 'dist' directory contents into corresponding subfolder of branch
    .then(function () {
    var folder = branchName + '/dist';
    if (!fs.existsSync(folder)) {
        console.info('Create new folder: ', folder);
        fs.mkdirSync(folder);
    }
    console.info('Copy dist/* into ' + folder);
    return execCommand('cp -r dist/* ' + folder);
})


// 5 - Add, commit and push changes to Github
    .then(function () {
    return execCommand('cd ' + branchName + ' && pwd');
})

    .then(function () {
    return execCommand('cd ' + branchName + ' && ' + gitCommands.configUser);
})

    .then(function () {
    return execCommand('cd ' + branchName + ' && ' + gitCommands.configEmail);
})
    .then(function () {
    return execCommand('cd ' + branchName + ' && ' + gitCommands.add);
})

    .then(function () {
    execCommand('cd ' + branchName + ' && ' + gitCommands.commit);
})

    .then(function () {
    execCommand('cd ' + branchName + ' && ' + gitCommands.push);
})
    .catch(function (err) {
    console.error(err);
    throw new Error(err);
});
