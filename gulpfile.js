'use strict';

const dir ={
  src: './src/',
  build: './build/'
};

const { series, parallel, src, dest, watch } = require('gulp');
const plumber = require('gulp-plumber');
const sass = require('gulp-sass');
const sourcemaps = require('gulp-sourcemaps');
const postcss = require('gulp-postcss');
const autoprefixer = require('autoprefixer');
const browserSync = require('browser-sync').create();
const del = require('del');
const pug = require('gulp-pug');

const uglify = require('gulp-uglify');
const rename = require('gulp-rename');
const webpack = require('webpack');
const webpackStream = require('webpack-stream');

const ghpages = require('gh-pages');
const path = require('path');
const svgstore = require('gulp-svgstore');
const svgmin = require('gulp-svgmin');
const concat = require('gulp-concat');


function styles() {
  return src(`${dir.src}scss/style.scss`)
    .pipe(plumber())
    .pipe(sourcemaps.init())
    .pipe(sass())
    .pipe(postcss([
      autoprefixer({browsers: ['last 2 version'], grid: true}),
    ]))
    .pipe(sourcemaps.write('/'))
    .pipe(dest(`${dir.build}css`))
    .pipe(browserSync.stream());
}
exports.styles = styles;

function buildHTML() {
  return src(`${dir.src}/*.pug`)
  .pipe(plumber())
  .pipe(pug({pretty: true}))
  .pipe(dest(dir.build))
}
exports.buildHTML = buildHTML;

function copyImg() {
  return src(`${dir.src}img/**/*.{jpg,jpeg,png,gif,svg,webp}`)
    .pipe(plumber())
    .pipe(dest(`${dir.build}img/`));
}
exports.copyImg = copyImg;

function buildSvgSprite() {
  return src(`${dir.src}svg-sprite/*.svg`)
    .pipe(svgmin(function (file) {
      return {
        plugins: [{
          cleanupIDs: { minify: true }
        }]
      }
    }))
    .pipe(svgstore({ inlineSvg: true }))
    .pipe(rename('sprite.svg'))
    .pipe(dest(`${dir.build}img/`));
}
exports.buildSvgSprite = buildSvgSprite;

function copyFonts() {
  return src(`${dir.src}fonts/**/*.{woff2,woff}`)
    .pipe(plumber())
    .pipe(dest(`${dir.build}fonts/`));
}
exports.copyFonts = copyFonts;


function copyVendorsJs() {
  return src([
      './node_modules/picturefill/dist/picturefill.min.js',
      './node_modules/svg4everybody/dist/svg4everybody.min.js',
    ])
    .pipe(plumber())
    .pipe(dest(`${dir.build}js/`));
}
exports.copyVendorsJs = copyVendorsJs;

function buildVendorsJs() {
  return src([
      './node_modules/jquery/dist/jquery.min.js',
      './node_modules/slick-carousel/slick/slick.min.js',
    ])
    .pipe(plumber())
    .pipe(concat('vendors.js'))
    .pipe(uglify())
    .pipe(rename({ suffix: '.min' }))
    .pipe(dest(`${dir.build}js/`));
}
exports.buildVendorsJs = buildVendorsJs;

function javascript() {
  return src(`${dir.src}js/script.js`)
    .pipe(plumber())
    .pipe(webpackStream({
      mode: 'development',
      output: {
        filename: 'script.js',
      },
      module: {
        rules: [
          {
            test: /\.(js)$/,
            exclude: /(node_modules)/,
            loader: 'babel-loader',
            query: {
              presets: ['@babel/preset-env']
            }
          }
        ]
      },
    }))
    .pipe(uglify())
    .pipe(rename({ suffix: '.min' }))
    .pipe(dest(`${dir.build}js`));
}
exports.javascript = javascript;


function clean() {
  return del(dir.build)
}
exports.clean = clean;

function deploy(cb) {
  ghpages.publish(path.join(process.cwd(), dir.build), cb);
  }
exports.deploy = deploy;

function serve() {
  browserSync.init({
    server: dir.build,
    startPath: 'index.html',
    open: false,
    port: 8080,
  });
  watch(`${dir.src}scss/**/*.scss`, { delay: 100 }, styles);
  watch(`${dir.src}**/*.pug`).on('change', series(
    buildHTML,
    browserSync.reload
  ));
  watch(`${dir.src}js/**/*.js`).on('change', series(
    javascript,
    browserSync.reload
  ));
  watch(`${dir.src}svg-sprite/*.svg`).on('all', series(
    buildSvgSprite,
    browserSync.reload
  ));
}

exports.build = series(
  clean,
  parallel(styles, buildHTML, copyImg, buildSvgSprite, copyFonts, copyVendorsJs, buildVendorsJs, javascript)
)

exports.default = series(
  clean,
  parallel(styles, buildHTML, copyImg, buildSvgSprite, copyFonts, copyVendorsJs, buildVendorsJs, javascript),
  serve
);

