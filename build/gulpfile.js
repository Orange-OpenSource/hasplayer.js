var gulp = require('gulp'),
    // node packages
    del = require('del'),
    path = require('path'),
    fs = require('fs'),
    runSequence = require('run-sequence'),
    // gulp packages
    banner = require('gulp-banner'),
    concat = require('gulp-concat'),
    footer = require('gulp-footer'),
    git = require('gulp-git'),
    htmlReplace = require('gulp-html-replace'),
    jsdoc = require('gulp-jsdoc3'),
    jshint = require('gulp-jshint'),
    preprocess = require('gulp-preprocess'),
    rename = require('gulp-rename'),
    replace = require('gulp-replace'),
    uglify = require('gulp-uglify'),
    umd = require('gulp-umd'),
    zip = require('gulp-zip'),
    // custom import
    pkg = require('../package.json'),
    sources = require('./sources.json'),
    // command line options
    argv = require('yargs')
        .default('protection', true)
        .default('mss', true)
        .default('hls', true)
        .argv;


var comment = '<%= pkg.copyright %>\n\n/* Last build : <%= pkg.gitDate %>_<%= pkg.gitTime %> / git revision : <%= pkg.gitRevision %> */\n\n';

var jshint_ignore_start = '/* jshint ignore:start */\n';
var jshint_ignore_end = '\n/* jshint ignore:end */';

var config = {
    distDir: '../dist',
    doc: {
        dir: '../dist/doc/',
        source: '../app/js/streaming/MediaPlayer.js',
        readme: '../README.md',
        errorsTable: './jsdoc/errors.html'
    },
    jsdoc: {
        'opts': {
            'destination': '../dist/doc/'
        },
        'templates': {
            'theme': 'united',
            'linenums': true,
            "cleverLinks": false,
            "monospaceLinks": false,
            "collapseSymbols": false
        },
        "tags": {
            "allowUnknownTags": true
        }
    }
};

// Create the final globs for sources according to command line options
var sourcesGlob = sources.default;

if (argv.protection) {
    sourcesGlob = sourcesGlob.concat(sources.protection);
}

if (argv.hls) {
    sourcesGlob = sourcesGlob.concat(sources.hls);
}

if (argv.mss) {
    sourcesGlob = sourcesGlob.concat(sources.mss);
}

gulp.task('clean', function(done) {
    return (function() {
        del([config.distDir + '**/*'], {
            force: true,
            dot: true
        });
        done();
    })();
});

gulp.task('package-info', function() {
    // Get last abbreviated commit hash
    git.exec({args: 'log -1 --format=%h', quiet: true}, function (err, stdout) {
        pkg.gitRevision = stdout.replace(/(\r\n|\n|\r)/gm,"");
    });
    // Get last commit date
    git.exec({args: 'log -1 --format=%cD', quiet: true}, function (err, stdout) {
        var date = new Date(stdout);
        pkg.gitDate = (date.getFullYear()) + '-' + (date.getMonth() + 1) + '-' + (date.getDate());
        pkg.gitTime = (date.getHours()) + ':' + (date.getMinutes()) + ':' + (date.getSeconds());
    });
    fs.readFile('../COPYRIGHT', null, function(err, _data) {
        pkg.copyright = _data;
    });
});

gulp.task('lint', function() {
    return gulp.src(sourcesGlob)
        .pipe(jshint())
        .pipe(jshint.reporter('jshint-stylish'));
});

gulp.task('build', ['clean', 'package-info', 'lint'], function() {

    // Integrate libs after doing lint
    sourcesGlob = sourcesGlob.concat(sources.libs);

    // Initialize preprocess context
    var context = {};
    for (var option in  argv) {
        if (typeof argv[option] === 'boolean') {
            context[option.toUpperCase()] = argv[option];
        }
    }

    return gulp.src(sourcesGlob)
        .pipe(concat(pkg.name))
        .pipe(preprocess({
            context: context
        }))
        .pipe(umd({
            namespace: function() {
                return 'MediaPlayer';
            },
            template: path.join(__dirname, 'umd.js')
        }))
        .pipe(replace(/VERSION[\s*]=[\s*]['\\](.*)['\\]/g, 'VERSION = \'' + pkg.version + '\''))
        .pipe(replace(/@@TIMESTAMP/, pkg.gitDate + '_' + pkg.gitTime))
        .pipe(replace(/@@REVISION/, pkg.gitRevision))
        .pipe(banner(comment, {
            pkg: pkg
        }))
        .pipe(gulp.dest(config.distDir))
        .pipe(uglify())
        .pipe(banner(jshint_ignore_start))
        .pipe(footer(jshint_ignore_end))
        .pipe(banner(comment, {
            pkg: pkg
        }))
        .pipe(rename(pkg.name.replace('.js', '.min.js')))
        .pipe(gulp.dest(config.distDir));
});

gulp.task('build-samples', ['build-dashif', 'build-demoplayer', 'copy-index']);

var replaceSourcesByBuild = function() {
    return replace(/<!-- sources -->([\s\S]*?)<!-- endsources -->/, '<script src="../../' + pkg.name + '"></script>');
};

gulp.task('build-dashif', function() {
    return gulp.src(['../samples/Dash-IF/**'])
        .pipe(replaceSourcesByBuild())
        .pipe(gulp.dest(config.distDir + '/samples/Dash-IF/'));
});

gulp.task('build-demoplayer', function() {
    return gulp.src(['../samples/DemoPlayer/**'])
        .pipe(replaceSourcesByBuild())
        .pipe(gulp.dest(config.distDir + '/samples/DemoPlayer/'));
});

gulp.task('copy-index', ['package-info'], function() {
    return gulp.src('../index.html')
        .pipe(replace(/@@VERSION/g, pkg.version))
        .pipe(replace(/@@DATE/, pkg.gitDate))
        .pipe(gulp.dest(config.distDir));
});

gulp.task('releases-notes', function() {
    return gulp.src('../RELEASES NOTES.txt')
        .pipe(gulp.dest(config.distDir));
});

gulp.task('doc', function() {
    // Include version in jsdoc system name
    config.jsdoc.templates.systemName = pkg.name + ' ' + pkg.version;
    return gulp.src([config.doc.readme, config.doc.source], {read: true})
        .pipe(jsdoc(config.jsdoc));
});

gulp.task('zip', function() {
    return gulp.src(config.distDir + '/**/*')
        .pipe(zip(pkg.name + '.zip'))
        .pipe(gulp.dest(config.distDir));
});

gulp.task('version', function() {
    fs.writeFileSync(config.distDir + '/version.properties', 'VERSION=' + pkg.version);
});

gulp.task('watch', function() {
    gulp.watch(sourcesGlob, ['build']);
    gulp.watch(['../samples/DemoPlayer/**'], ['build-demoplayer']);
    gulp.watch(['../samples/Dash-IF/**'], ['build-dashif']);
});

gulp.task("default", function(cb) {
    runSequence('build', ['build-samples', 'doc'],
        'releases-notes',
        'zip',
        'version',
        cb);
});