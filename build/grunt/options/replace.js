module.exports = {

    infos: {
        options: {
            patterns: [
            {
                match: 'REVISION',
                replacement: '<%= meta.revision %>'
            },
            {
                match: 'TIMESTAMP',
                replacement: '<%= (new Date().getDate())+"."+(new Date().getMonth()+1)+"."+(new Date().getFullYear())+"_"+(new Date().getHours())+":"+(new Date().getMinutes())+":"+(new Date().getSeconds()) %>'
            }
            ]
        },
        files: [
            {expand: true, flatten: true, src: ['<%= path %>/hasplayer.js', '<%= path %>/hasplayer.min.js'], dest: '<%= path %>'}
        ]
    },

    dashifInfos: {
        options: {
            patterns: [
            {
                match: 'REVISION',
                replacement: '<%= meta.revision %>'
            },
            {
                match: 'TIMESTAMP',
                replacement: '<%= (new Date().getDate())+"."+(new Date().getMonth()+1)+"."+(new Date().getFullYear())+"_"+(new Date().getHours())+":"+(new Date().getMinutes())+":"+(new Date().getSeconds()) %>'
            }
            ]
        },
        files: [
            {expand: true, flatten: true, src: ['<%= path %>/dashif.js', '<%= path %>/player.js'], dest: '<%= path %>'}
        ]
    },

    sourceForBuild: {
        options: {
            patterns: [
            {
                match: /"[ \S]*\/Context.js"/,
                replacement: '"../<%= preprocesspath %>/Context.js"'
            },
            {
                match: /"[ \S]*\/Stream.js"/,
                replacement: '"../<%= preprocesspath %>/Stream.js"'
            },
            {
                match: /"[ \S]*\/MssParser.js"/,
                replacement: '"../<%= preprocesspath %>/MssParser.js"'
            },
            {
                match: /<!-- source -->/,
                replacement: '<!-- build:js hasplayer.js -->'
            },
            {
                match: /<!-- \/source -->/,
                replacement: '<!-- endbuild -->'
            }
            ]
        },
        files: [
            {expand: true, flatten: true, src: ['<%= preprocesspath %>/playerSrc.html'], dest: '<%= path %>/source/'}
        ]
    },

    sourceByBuild: {
        options: {
            patterns: [
            {
                match: /<!-- source -->([\s\S]*?)<!-- \/source -->/,
                replacement: '<script src="hasplayer.js"></script>'
            },
            {
                match: /<!-- metricsagent -->([\s\S]*?)<!-- \/metricsagent -->/,
                replacement: '<script src="metricsagent.js"></script>'
            }
            ]
        },
        files: [
            {expand: true, flatten: true, src: ['<%= path %>/player.html'], dest: '<%= path %>'},
            {expand: true, flatten: true, src: ['<%= path %>/dashif.html'], dest: '<%= path %>'}
        ]
    },

    copyright: {
        options: {
            patterns: [
            {
                match: /\/\/COPYRIGHT/g,
                replacement: '<%= grunt.file.read("../LICENSE") %>\n\n'
            }
            ]
        },
        files: [
        {expand: true, flatten: true, src: ['<%= path %>/hasplayer.js', '<%= path %>/hasplayer.min.js'], dest: '<%= path %>'}
        ]
    },

    dashifNoCopyright: {
        options: {
            patterns: [
            {
                match: /\/\/COPYRIGHT/g,
                replacement: ''
            }
            ]
        },
        files: [
        {expand: true, flatten: true, src: ['<%= path %>/dashif.js', '<%= path %>/player.js'], dest: '<%= path %>'}
        ]
    },

    chromecastId:{
        options:{
            patterns: [
                {
                    match: /7E99FD26/g,
                    replacement: '9ECD1B68'
                }
            ]
        },
        files:[
        {expand: true, src:['<%= path %>/dashif.js']}
        ]
    }
};
