var PACKAGE_JSON_FILE = './package.json',
    RELEASES_NOTES_FILE = './RELEASES NOTES.txt';

var child = require('child_process'),
    fs = require('fs'),
    semver = require('semver'),
    yargs = require('yargs'),
    argv = yargs
        .usage("$0 --start [--type major|minor|patch] [--version <version>] \n$0 --finish")
        .default('type', 'minor')
        .argv;

function execSync(command) {
    console.info('Exec command: ' + command);
    var res = child.execSync(command);
    res = String(res).trim();
    return res;
}

function gitGetCurrentBranch() {
    return execSync('git rev-parse --abbrev-ref HEAD');
}

function gitIsRepoClean() {
    // '-uno' => do not hwo untracked files
    return execSync('git status -s -uno').length === 0;
}

function gitGetLastTag() {
    return execSync('git describe --abbrev=0 --tags');
}

function gitGetCommits(startTag, endTag) {
    return execSync('git log ' + startTag + '...' + endTag + ' --format=%f').split('\n');
}

function gitCheckout(branch) {
    return execSync('git checkout ' + branch);
}

function gitPull() {
    return execSync('git pull --all');
}

function gitCommit(message) {
    if (!message || message.length === 0) {
        console.error('Please provide a commit message');
        return;
    }
    return execSync('git commit -am \"' + message + '\"');
}

function gitPush() {
    execSync('git push --all');
    execSync('git push --tags');
}

function gitFlowStart(type, version) {
    return execSync('git flow ' + type + ' start ' + version);
}

function gitFlowFinish(type, version) {

    try {
        execSync('git flow ' + type + ' finish -F ' + version + ' -m \"' + type + ' v' + version + '\"');
    } catch (err) {
        // In case of hotfix, there will be a conflict when merging hotfix branch into development with package.json file (version value)
        // Then resolve the merge and finish again the hotfix
        if (type === 'hotfix') {
            execSync('git checkout --ours package.json');
            execSync('git commit -am \"Merge tag v' + version + ' into development\"');
            execSync('git flow ' + type + ' finish -F ' + version + ' -m \"' + type + ' v' + version + '\"');
        }
    }
}

function prependFile(path, data) {

    var options = {
            encoding: 'utf8',
            mode: 438 /*=0666*/
        },
        appendOptions = {
            encoding: options.encoding,
            mode: options.mode,
            flags: 'w'
        },
        currentFileData = "";

    // Open and read input file
    try {
        currentFileData = fs.readFileSync(path, options);
    } catch (err) {
        console.error('Failed to open file ' + path);
        return;
    }

    // Prepend data and write file
    fs.writeFileSync(path, data + currentFileData, appendOptions);
}

function generateReleaseNotes(version) {
    var notes= "";

    // Get current date
    var date = new Date(),
        y = date.getFullYear().toString(),
        m = (date.getMonth() + 1).toString(),
        d = date.getDate().toString(),
        MM = m[1] ? m : "0" + m[0],
        DD = d[1] ? d : "0" + d[0];

    notes = '### Release Notes v' + version + ' (' + y + '/' + MM + '/' + DD + ')\n';

    // Get last/previous tag
    var lastTag = gitGetLastTag();

    // Get commits since last tag
    var commits = gitGetCommits(lastTag, 'HEAD');
    for (var i =0; i < commits.length; i++) {
        notes += '* ' + commits[i] + '\n';
    }
    notes += '\n';

    return notes;
}

function startRelease() {

    var releaseType = argv.type === 'patch' ? 'hotfix' : 'release';

    // Check if repository is clean
    if (!gitIsRepoClean()) {
        console.error("Repository is not clean");
        return;
    }

    if (releaseType === 'hotfix') {
        // Checkout master branch
        gitCheckout('master');
    } else {
        // Checkout development branch
        gitCheckout('development');
    }

    // Read package.json file
    var pkg = require(PACKAGE_JSON_FILE);

    // Get current version from package.json and increment it:
    // - if version ends with '-dev' suffix, then suffix is removed
    // - else version number is incremented
    console.info("Current version: " + pkg.version);
    console.info("Release type: " + argv.type);
    var version = argv.version ? argv.version : semver.inc(pkg.version, argv.type);
    pkg.version = version;
    console.info("=> Release version: " + pkg.version);

    // Start git flow release
    console.info('Start git ' + releaseType + ' v' + pkg.version);
    gitFlowStart(releaseType, pkg.version);

    // Write/update and commit package.jon file with the new version number
    fs.writeFileSync(PACKAGE_JSON_FILE, JSON.stringify(pkg, null, '  '), {encoding: 'utf8',mode: 438 /*=0666*/});
    gitCommit('v' + pkg.version);

    // Generate release notes, write/update and commit 'RELEASE NOTES.txt' file
    var notes = generateReleaseNotes(version);
    prependFile(RELEASES_NOTES_FILE, notes);

    console.info("Please complete and commit release notes...");
}

function finishRelease() {

    // Get flow type
    var branch = gitGetCurrentBranch(),
        releaseType = branch.startsWith('release/') ? 'release' : (branch.startsWith('hotfix/') ? 'hotfix' : null);

    // Check if we are on release branch
    if (releaseType === null) {
        console.error('Current branch = ' + branch + '. Please checkout current release/hotfix branch');
        return;
    }

    // Update local branches
    // gitPull();

    // Read package.json file
    var pkg = require(PACKAGE_JSON_FILE);

    // Finish git flow
    console.info('Finish git ' + releaseType + ' v' + pkg.version);
    gitFlowFinish(releaseType, pkg.version);

    if (releaseType === 'release') {
        // Increment version number for next release version in development
        gitCheckout('development');
        var version = semver.inc(pkg.version, 'minor');
        version += '-dev';
        pkg.version = version;
        console.info("Next release version in development: " + pkg.version);
        fs.writeFileSync(PACKAGE_JSON_FILE, JSON.stringify(pkg, null, '  '), {encoding: 'utf8',mode: 438 /*=0666*/});
        gitCommit('v' + pkg.version);
    }

    // Push all branches and tags to remote
    gitPush();
}

///////////////////////////////////////////////////////////////////////////////////////////////////

if (argv.start) {
    startRelease();
} else if (argv.finish) {
    finishRelease();
} else {
    yargs.showHelp();
}

