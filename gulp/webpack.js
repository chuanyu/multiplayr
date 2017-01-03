'use strict'

var gulp = require('gulp');
var gutil = require('gulp-util');
var webpack = require('webpack');
var webpackConfig = require(process.cwd() + '/webpack.config');

gulp.task('webpack', ['typescript'], function(callback) {
    webpack(webpackConfig, function(err, stats) {
        if (err) {
            throw new gutil.PluginError('webpack', err);
        }

        gutil.log('[webpack]', stats.toString({
            // output options
        }));

        callback();
    });
});