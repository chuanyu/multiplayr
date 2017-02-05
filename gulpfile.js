'use strict';

let build = require('node-web-build');
let gulp = require('gulp');
let webpack = require('webpack');

build.webpack.setConfig({ webpack: webpack });

build.postCopy.setConfig({
  copyTo: {
    'build': ['src/**/*.png', 'src/**/*.css'],
    'build/client/static': ['src/client/static/*.html']
  },
  shouldFlatten: false
});

build.typescript.setConfig({ 'libDir': 'build' });

// process *.Example.tsx as text.
build.text.setConfig({ textMatch: ['src/**/*.txt', 'src/**/*.Example.tsx', 'src/**/*.Props.ts'] });

// change the port of serve.
build.serve.setConfig({
  port: 4323
});

let isProduction = process.argv.indexOf('--production') >= 0;
let isNuke = process.argv.indexOf('clean') >= 0;

if (isProduction || isNuke) {
  build.setConfig({
    libAMDFolder: 'lib-amd'
  });
}

/** @todo: Enable css modules when ready. */
// build.sass.setConfig({ useCSSModules: true });

// initialize tasks.
build.initialize(gulp);
