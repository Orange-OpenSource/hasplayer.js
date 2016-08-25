// usefull require
var exec = require('child_process').exec,
    fs = require('fs'),
    del = require('del'),
    jsdom  = require('jsdom').jsdom,
    serializeDocument = require("jsdom").serializeDocument;


var config = {
    versionFile:'dist/version.properties',
    ghPagesDir : 'out',
    versionDir: 'dev', /*default deploy directory */
    newRelease:false
};


// shell commands
var commands = {
    ssh_travis:{
        chmod:"chmod 600 travis_deploy",
        evaluate:"eval `ssh-agent -s`",
        register:"ssh-add travis_deploy"
    },
    currentBranch: "git branch | grep \\* | cut -d ' ' -f2",
    ghPages:{
        clone:"git clone -b gh-pages https://github.com/Orange-OpenSource/hasplayer.js.git ./out",
        configUser: "git config user.name \"Travis-CI\"" ,
        configEmail: "git config user.email \"mbrechet.ext@orange.com\"",
        addAll: "git add --all",
        commit: "git commit -am \"automatic deploy from Travis-CI\"",
        push: "git push \"git@github.com:Orange-OpenSource/hasplayer.js.git\" gh-pages:gh-pages"
    }
};

/**
 * execute a shell command and return result in a promise
 * @return Promise a promise resolved when command is executed
 */
var execCommand = function(cmd){
    var p = new Promise(function(resolve, reject){
        exec(cmd, function(err, stdout, stderr){
            if(!err){
                console.log(stdout);
                resolve(stdout);
            }else{
                reject(stderr);
            }
        });
    });
    return p;
};


var registerTravisSSH = function(){
    return execCommand(commands.ssh_travis.chmod)
            .then(execCommand.bind(null,commands.ssh_travis.evalute))
            .then(execCommand.bind(null,commands.ssh_travis.register));
        
};


// sep of deploy
// 1 - get branch name
// 2 - if branch in on master extract foldername in version.properties
// 3 - clean out directory
// 4 - checkout gh-pages from github in out directory 
// 5 - copy dist directory in appropriate folder on ghpage
// 6 - upate index if its new release
// 6 - add all changes
// 7 - commit changes
// 8 - push changes



// 1 - get branch name
execCommand(commands.currentBranch).then(
    function(branch){
        branch = branch.replace(/\s/g, '');
        console.log("branch :" + branch, branch==='master', branch.length);
// 2 - if branch in not in develop extract foldername in version.properties
        if(branch==='master'){
            console.log('create new version');
            var content = fs.readFileSync(config.versionFile, 'utf8');
            console.info('content', content, typeof content);
            config.versionDir = content.split('=')[1];
            console.info('newRelease', config.versionDir);
            config.newRelease= true;
        }
 // 3 - clean out directory       
        return del(config.ghPagesDir+'/**/*', {force:true, dot:true});
    }
)
// register travis
.then(registerTravisSSH)
// 4 - checkout gh-pages
.then(execCommand.bind(null,commands.ghPages.clone))
.then(function(){
// 5 - copy dist directory in appropriate folder on ghpage
    if(config.newRelease){
        console.info('create new dir', config.versionDir);
        // test if exists 
        var path = config.ghPagesDir+'/'+config.versionDir;
        if(!fs.existsSync(path)){
            fs.mkdirSync(path);
        }else{
            config.newRelease= false;
        }
        
    }
    var command = 'cd '+ config.ghPagesDir + ' && cp  -r ../dist/* ./'+config.versionDir;
    return command;
})
.then(execCommand)
.then(function(){
    if(config.newRelease){
        var index = fs.readFileSync(config.ghPagesDir+'/index.html', 'utf-8');
        console.log(index.indexOf('Version '+config.versionDir) === -1);
        var doc = jsdom(index);
        var links = doc.querySelectorAll('a');
        // create new entry
        var newLink = doc.createElement('a');
        newLink.href = config.versionDir +  '/index.html';
        newLink.textContent =  'Version '+config.versionDir;
        var lastLink = links[links.length - 1];
        doc.body.insertBefore(newLink, lastLink);
        var br = doc.createElement('br');
        doc.body.insertBefore(br, lastLink);
        var serializedDocument = serializeDocument(doc);
        console.info("modify ", serializedDocument);
        fs.writeFileSync(config.ghPagesDir+'/index.html',serializedDocument);
        
    }
})
.then(execCommand.bind(null,commands.ghPages.configUser))
.then(execCommand.bind(null,commands.ghPages.configEmail))
.then(execCommand.bind(null,'cd '+config.ghPagesDir + ' && '+commands.ghPages.addAll))
.then(execCommand.bind(null,'cd '+config.ghPagesDir + ' && '+commands.ghPages.commit))
.then(execCommand.bind(null,commands.ghPages.push))
.catch(function(err){console.error(err);});