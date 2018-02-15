// This script is used to package and deploy built version of the project into 
// Github project page (https://orange-opensource.github.io/hasplayer.js/) 
// Steps for deployment
// 1 - Get version
// 2 - Get commit date
// 3 - Clean gh-pages directory
// 4 - Checkout gh-pages branch
// 5 - Copy and update release files into corresponding subfolder of gh-pages
// 6 - Zip release files
// 7 - Upate project home page (index.html) in case of a new release
// 8 - Add, commit and push changes on gh-pages branch to repository

var exec = require('child_process').exec,
    fs = require('fs-extra'),
    archiver = require('archiver'),
    pkg = require('../package.json');

// Shell gitCommands
var gitCommands = {
    currentBranch:  "git rev-parse --abbrev-ref HEAD",
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

// 1 - Get version
getBranchName().then(
    function (branch) {
        branch = branch.replace(/\s/g, '').trim();
        console.info('Branch: ' + branch);
        console.info('Version: ' + pkg.version);
        
        // Determine output directory according to branch
        if (branch === 'master') {
            // For 'master' branch, outup directory is version number
            pkg.dir = pkg.version;
        } else if (branch === 'development') {
            // For 'development' branch, outup directory is 'development'
            pkg.dir = 'development';
        } else {
            // For any other branch than 'master' or 'developmment', do not deploy
            return Promise.reject('Branch not deployed');
        }

        return Promise.resolve();
    }
)

// 2 - Get commit date
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
    return fs.remove('gh-pages/');
})

// 4 - Checkout gh-pages branch
.then(function () {
    console.info('Checkout gh-pages');
    return execCommand(gitCommands.clone);
})

// 5 - Copy and update release files into corresponding subfolder of gh-pages
.then(function() {
    var path = 'gh-pages/' + pkg.dir + '/';

    // Create/empty output folder
    fs.emptyDirSync(path);

    // Copy 'dist'
    console.info('Copy dist into ' + path);
    fs.copySync('dist', path + 'dist');

    // Copy 'doc'
    console.info('Copy doc into ' + path);
    fs.copySync('doc', path + 'doc');

    // Copy 'samples'
    console.info('Copy samples/* into ' + path);
    fs.copySync('samples', path + 'samples');

    // Copy 'RELEASE_NOTES.txt'
    console.info('Copy RELEASES NOTES.txt into ' + path);
    fs.copySync('RELEASES NOTES.txt', path + '/RELEASES NOTES.txt');
    
    // Copy and update index.html
    console.info('Copy and update index.html');
    var index = fs.readFileSync('index.html', 'utf-8');
    index = index.replace(/@@VERSION/g, pkg.version);
    index = index.replace(/@@DATE/, pkg.date);
    fs.writeFileSync(path + 'index.html', index);
    
    return Promise.resolve();
})

// 6 - Zip release files
.then(function() {
    return new Promise(function(resolve/*, reject*/) {
        var path = 'gh-pages/' + pkg.dir + '/';
        var zipFile = 'hasplayer.js-v' + pkg.version + '.zip';
        var output = fs.createWriteStream(zipFile);
        var archive = archiver('zip', {
            zlib: { level: 9 } // Sets the compression level.
        });

        // archive.on('warning', function(err) {
        //     console.log('warning: ' + err);
        // });
        
        // archive.on('error', function(err) {
        //     console.log('error: ' + err);
        // });

        output.on('close', function() {
            fs.moveSync(zipFile, path + zipFile, { overwrite: true })
            resolve();
        });

        console.info('Zip folder ' + path + ' into file ' + zipFile);
        archive.pipe(output);
        archive.directory(path, false);
        archive.finalize();
    });
})

// 7 - Update index.html file content, and update 'latest' symbolic link
.then(function() {
    // Open index.html file
    var path = 'gh-pages/index.html';
    var index = fs.readFileSync(path, 'utf-8');

    // Check if file has to be updated
    if (index.indexOf(pkg.dir) === -1) {
        var pos = index.indexOf('<p/>');
        if (pos !== -1) {
            // Insert new link (before 'development' version)
            console.info('Update index.html');
            index = index.substring(0, pos - 1) +
                    '\n<a href=\"' + pkg.dir + '/index.html\">Version ' + pkg.dir + '</a> - (' + pkg.date + ')<br/>\n' +
                    index.substring(pos, index.length - 1);
            fs.writeFileSync(path, index);

            // Update 'latest' symbolic link
            console.info('Update \'latest\' symbolic link');
            fs.removeSync('gh-pages/latest');
            fs.ensureSymlinkSync('gh-pages/' + pkg.dir, 'gh-pages/latest');
        }
    }
    
    return Promise.resolve();
})

// 8 - Add, commit and push changes on gh-pages branch to repository
.then(execCommand.bind(null, 'cd gh-pages && '+ gitCommands.configUser))
.then(execCommand.bind(null, 'cd gh-pages && '+ gitCommands.configEmail))
.then(execCommand.bind(null, 'cd gh-pages && '+ gitCommands.add))
.then(execCommand.bind(null, 'cd gh-pages && '+ gitCommands.commit))
.then(execCommand.bind(null, 'cd gh-pages && '+ gitCommands.push))
.catch(function(err){
    console.error(err);
    throw new Error(err);
});