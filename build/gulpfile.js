var gulp = require('gulp'),
    // node packages
    del = require('del'),
    path = require('path'),
    git = require('git-rev'),
    fs = require('fs'),
    runSequence = require('run-sequence'),
    // gulp packages
    uglify = require('gulp-uglify'),
    concat = require('gulp-concat'),
    preprocess = require('gulp-preprocess'),
    rename = require('gulp-rename'),
    umd = require('gulp-umd'),
    jshint = require('gulp-jshint'),
    banner = require('gulp-banner'),
    jsdoc = require('gulp-jsdoc'),
    replaceHtml = require('gulp-html-replace'),
    // used to intercat with .html files
    //usemin = require('gulp-usemin'),
    //minifyCss = require('gulp-minify-css'),
    replace = require('gulp-replace'),
    zip = require('gulp-zip'),
    // custom import
    pkg = require('../package.json'),
    option = require('./gulp/option'),
    sources = require('./gulp/sources.json');


var comment = '<%= pkg.copyright %>\n\n/* Last build : <%= pkg.date %>_<%= pkg.time %> / git revision : <%= pkg.revision %> */\n\n';

var config = {
    distDir: '../dist',
    doc: {
        dir: '../dist/doc/',
        template: '../node_modules/gulp-jsdoc/node_modules/ink-docstrap/template',
        readMe: '../doc/JSDoc/README.md',
        errorTable: '../doc/JSDoc/HasPlayerErrors.html',
        fileSource: '../app/js/streaming/MediaPlayer.js'
    }
};

var options = {
    protection: true,
    analytics: false,
    hls: true,
    mss: true
};

//initialize option with arguments given in params and default params;
option.init(process.argv, options);

// create the final globs for sources according to options
var sourcesGlob = sources.default;
if (gulp.option('protection')) {
    sourcesGlob = sourcesGlob.concat(sources.protection);
}

if (gulp.option('hls')) {
    sourcesGlob = sourcesGlob.concat(sources.hls);
}

if (gulp.option('mss')) {
    sourcesGlob = sourcesGlob.concat(sources.mss);
}

gulp.task("default", function(cb) {
    runSequence('build', ['build-samples', 'doc'],
        'releases-notes',
        'zip',
        'version',
        cb);
});

gulp.task('generateDoc', function() {
    return gulp.src([config.doc.fileSource, config.doc.readMe])
        .pipe(jsdoc(config.doc.dir, {
            path: config.doc.template,
            'theme': 'united',
            'linenums': true,
            'navType': 'vertical'
        }))
        .pipe(gulp.dest(config.doc.dir));
});

gulp.task('doc', ['generateDoc'], function() {
    return gulp.src(['../dist/doc/index.html'])
        .pipe(replaceHtml({
            'ERRORS_TABLE': {
                src: fs.readFileSync(config.doc.errorTable).toString(),
                tpl: '<div src="%f".js></div>'
            }
        }))
        .pipe(gulp.dest(config.doc.dir));
});

gulp.task('clean', function(done) {
    return (function() {
        del([config.distDir + '**/*'], {
            force: true,
            dot: true
        });
        done();
    })();
});

gulp.task('lint', function() {
    return gulp.src(sourcesGlob)
        .pipe(jshint())
        .pipe(jshint.reporter('jshint-stylish'));
});

gulp.task('package-info', function() {
    git.short(function(str) {
        pkg.revision = str;
    });
    fs.readFile('../LICENSE', null, function(err, _data) {
        pkg.copyright = _data;
    });
    pkg.date = (new Date().getFullYear()) + '-' + (new Date().getMonth() + 1) + '-' + (new Date().getDate());
    pkg.time = (new Date().getHours()) + ':' + (new Date().getMinutes()) + ':' + (new Date().getSeconds());
});

gulp.task('version', function() {
    fs.writeFileSync(config.distDir + '/version.properties', 'VERSION=' + pkg.version);
});

gulp.task('build', ['clean', 'package-info', 'lint'], function() {
    // integrate libs after doing lint
    sourcesGlob = sources.libs.concat(sourcesGlob);
    return gulp.src(sourcesGlob)
        .pipe(concat(pkg.name))
        .pipe(preprocess({
            context: gulp.option.all()
        }))
        .pipe(umd({
            namespace: function() {
                return 'MediaPlayer';
            },
            template: path.join(__dirname, 'gulp/umd.js')
        }))
        .pipe(replace(/VERSION[\s*]=[\s*]['\\](\d.\d.\d_dev)['\\]/g, 'VERSION = \'' + pkg.version + '\''))
        .pipe(replace(/@@TIMESTAMP/, pkg.date + '_' + pkg.time))
        .pipe(replace(/@@REVISION/, pkg.revision))
        .pipe(banner(comment, {
            pkg: pkg
        }))
        .pipe(gulp.dest(config.distDir))
        .pipe(uglify())
        .pipe(banner(comment, {
            pkg: pkg
        }))
        .pipe(rename(pkg.name.replace('.js', '.min.js')))
        .pipe(gulp.dest(config.distDir));
});

// sample build
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
    return gulp.src('gulp/index.html')
        .pipe(replace(/@@VERSION/g, pkg.version))
        .pipe(replace(/@@DATE/, pkg.date))
        .pipe(gulp.dest(config.distDir));
});

gulp.task('zip', function() {
    return gulp.src(config.distDir + '/**/*')
        .pipe(zip(pkg.name + '.zip'))
        .pipe(gulp.dest(config.distDir));
});
