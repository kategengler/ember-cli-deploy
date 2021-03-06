'use strict';

var AWS         = require('aws-sdk');
var chalk       = require('chalk');
var fs          = require('fs');
var path        = require('path');
var mime        = require('mime');
var Promise     = require('../ext/promise');
var SilentError = require('../errors/silent');
var findAssets  = require('../utilities/find-assets');
var S3Uploader  = require('../utilities/s3-uploader');

function DeployAssetsTask(options) {
  this.project = options.project;
  this.ui      = options.ui;
};

DeployAssetsTask.prototype.run = function(options) {
  var distDir           = options.distDir;
  var absoluteDistDir   = this.project.root + '/' + distDir;
  var ui                = this.ui;
  var s3AccessKeyId     = options.s3.key;
  var s3SecretAccessKey = options.s3.secret;
  var s3Bucket          = options.s3.bucket;
  var s3Region          = options.s3.region;

  if (!fs.existsSync(absoluteDistDir)) {
    var message = chalk.yellow('Unable to find dist directory [' + distDir + '/].  Ensure you have run `ember build` before running this task.  See `ember help` for more details\n');

    return Promise.reject(new SilentError(message));
  }

  var assets = findAssets({
    pattern: '**/*.{js,css,png,gif,jpg,ttf,svg,eot,woff}',
    cwd: absoluteDistDir
  });

  if (!assets.length) {
    var message = chalk.red('There are no assets to deploy\n');

    return Promise.reject(new SilentError(message));
  }

  var uploader = new S3Uploader({
    accessKeyId: s3AccessKeyId,
    secretAccessKey: s3SecretAccessKey,
    region: s3Region,
    bucket: s3Bucket
  });

  var promises = [];
  assets.forEach(function(filePath) {
    var params = {
      cwd: absoluteDistDir,
      filePath: filePath
    };

    var promise = uploader.uploadFile(params)
      .then(function(uploadedFilePath) {
        var message = chalk.green('\nSuccessfully uploaded: ' + uploadedFilePath);
        ui.write(message);
      }, function(error, filePath) {
        var message = chalk.red('\nUpload failed: ' + uploadedFilePath);
        ui.write(message);
      });

    promises.push(promise);
  });

  var promise = Promise.all(promises)
    .then(function() {
      ui.write(chalk.bold.gray('\n\nTo deploy index.html run:'));
      ui.write(chalk.gray('\nember deploy:index\n\n'));
    });

  return promise;
};

module.exports = DeployAssetsTask;
