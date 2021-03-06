#!/usr/bin/env node

var chalk = require('chalk');
var Spinner = require('cli-spinner').Spinner;
var spinner = new Spinner(chalk.gray('Syncing dependencies... %s'));
spinner.setSpinnerString('|/-\\');

require('machine-as-script')({

  machine: require('../helpers/machines/start-developing-project'),

  args: ['type']

}).configure({

  onHasKeychain: function (username){
    var chalk = require('chalk');
    console.log(chalk.gray('You are logged in to Treeline as "'+username+'".'));
  },
  onLoadProjectInfo: function (projectInfo){
    var chalk = require('chalk');
    console.log(chalk.gray('Identified '+projectInfo.type+': "'+projectInfo.friendlyName+'"'));
  },
  onConnecting: function (){
    var chalk = require('chalk');
    console.log(chalk.gray('Connecting...'));
  },
  onReconnectError: function (){
    var chalk = require('chalk');
    console.log(chalk.red('Unable to reconnect to remote.'));
  },
  onReconnectSuccess: function (){
    var chalk = require('chalk');
    console.log(chalk.gray('✔ Successfully reconnected to remote.'));
  },
  // onInitialConnectSuccess: function (){
  //   var chalk = require('chalk');
  //   console.log(chalk.gray('Now connected to Treeline mothership.'));
  // },
  onSyncing: function (){
    var chalk = require('chalk');
    console.log(chalk.gray('Receiving from remote...'));
  },
  onNpmInstall: function (){
    spinner.start();
    // console.log(chalk.gray('Syncing dependencies...'));
  },
  onNpmInstallError: function (err){
    spinner.stop();
    console.log();
    var chalk = require('chalk');
    console.log(chalk.red('Encountered an error installing NPM dependencies.'));
    console.log(chalk.grey('One or more NPM dependencies of a custom machine may have an invalid range.'));
    console.log();
    console.log(chalk.grey('Full error below:'));
    console.log(err.message);
  },
  onNpmInstallSuccess: function (){
    spinner.stop();
    console.log();
    var chalk = require('chalk');
    console.log(chalk.gray('✔ Finished syncing dependencies.'));
  },
  onSyncError: function (err){
    spinner.stop();
    console.log();
    var chalk = require('chalk');
    console.error(chalk.red('Failed while attempting to sync changes from the Treeline remote.'));
    // TODO: write error details to a log file
  },
  // onSyncSuccess: function (){
  //   var chalk = require('chalk');
  //   console.log(chalk.gray('Successfully synchronized local project with updated logic from http://treeline.io.'));
  // },
  onInitialSyncSuccess: function (url){
    var chalk = require('chalk');
    console.log(chalk.gray('Now listening to %s for updates...'), url);
    console.log(chalk.gray('(remote changes will automatically generate code in this directory)'));
  },
  onPreviewServerLifted: function (url){
    var chalk = require('chalk');
    console.log('Preview server is now running at:');
    console.log(chalk.blue(chalk.underline(url)));
    console.log(chalk.gray('(press <CTRL+C> to quit at any time)'));
  },
  onSocketDisconnect: function (){
    var chalk = require('chalk');
    console.error();
    console.error('Whoops, looks like you\'ve '+chalk.red('lost connection to the internet.'));
    console.error('Would you check your connection and try again?  While unlikely, it is also possible that the Treeline mothership went offline (i.e. our servers are down.)');
    console.error('If you\'re having trouble reconnecting and think that might be the case, please send us a note at support@treeline.io.  Thanks!');
    console.error('Attempting to reconnect...   (press <CTRL+C> to quit)');
    // TODO: ping api server via HTTP to see if it's alive, and use that to log a more helpful message
  },
  onFlushError: function (err){
    console.error();
    console.error('Failed to flush local router after synchronizing project files from http://treeline.io.');
    // TODO: write error details to a log file
  }
}).exec({

  // success: function (){
  //   // On success, do nothing.
  //   // (having this here disables the default "OK" log)
  // },

  notLinked: function (){
    var chalk = require('chalk');
    console.log('The current directory is '+ chalk.yellow('not linked') +' to Treeline.');
    process.exit(1);
  },

  cantDetermineType: function() {
    var chalk = require('chalk');
    console.error("Could not determine the type of Treeline project in this folder.  Please run `treeline preview app` or `treeline preview machinepack`.");
    process.exit(1);
  },


  noApps: function (data){
    var chalk = require('chalk');
    console.log();
    console.log('Looks like you don\'t have any apps in your account yet, %s.', chalk.cyan(data.username));
    console.log('You should visit http://treeline.io and create one!');
    console.log('Hint: if you are not %s, do `treeline logout` and try again.', chalk.cyan(data.username));
    process.exit(1);
  },

  noMachinepacks: function (data){
    var chalk = require('chalk');
    console.log();
    console.log('Looks like you don\'t have any machinepacks in your account yet, %s.', chalk.cyan(data.username));
    console.log('You should visit http://treeline.io and create one!');
    console.log('Hint: if you are not %s, do `treeline logout` and try again.', chalk.cyan(data.username));
    process.exit(1);
  },

  forbidden: function (){
    var chalk = require('chalk');
    console.log();
    console.log(chalk.bold(chalk.yellow('Your keychain is no longer valid.')));
    console.log('It may have expired; or your account may have been suspended (but that\'s pretty unlikely-- you seem nice).');
    console.log('It is also possible that your Treeline keychain file is corrupted or misconfigured.');
    console.log('Please log in again with `treeline login`. If you continue to run into issues, contact '+chalk.underline('support@treeline.io')+'.');
    process.exit(1);
  },

  notFound: function (){
    var chalk = require('chalk');
    console.log();
    console.log(chalk.bold(chalk.yellow('The linked remote project cannot be found.')));
    console.log();
    console.log('This probably means you deleted the project on '+chalk.underline('https://treeline.io')+'.');
    console.log('It is also possible that the Treeline linkfile in this directory is corrupted.');
    console.log('If you have further issues, or need to restore from one of our emergency backups, contact '+chalk.underline('support@treeline.io')+'.');
    console.log(chalk.gray('Note that you can continue to use the local code that\'s already been synced for this project.'));
    console.log(chalk.gray('To do so, run this command again with the '+chalk.bold('--offline')+' flag set.'));
    process.exit(1);
  },

  unrecognizedCredentials: function (){
    var chalk = require('chalk');
    console.log();
    console.log(chalk.bold(chalk.yellow('Unrecognized username/password combination.')));
    console.log('Please try again, or visit '+chalk.underline('http://treeline.io')+' to reset your password or locate your username.');
    process.exit(1);
  },

  requestFailed: function(url) {
    var chalk = require('chalk');
    console.log(chalk.red('Could not communicate with the Treeline mothership') + (url?(chalk.red(' at ')+url):'') + chalk.red('.') + chalk.red(' Are you connected to the internet?'));
    console.log(chalk.gray('(if you don\'t have a stable internet connection, try `--offline` mode)'));
    process.exit(1);
  },

  badCliVersion: function(results) {
    var chalk = require('chalk');
    console.log(chalk.red('This version of the CLI (v' + results.current + ') is not compatible with the current Treeline API!'));
    console.log(chalk.gray('Please upgrade by running `npm install -g treeline`'));
    process.exit(1);
  },

  error: function(err) {
    var util = require('util');
    var _ = require('lodash');
    var chalk = require('chalk');

    // We'll attempt to display an error summary in a more attractive way,
    // if there even is a more attractive way... Or an error summary.
    var summary;
    try {
      if (_.isString(err.message) && err.message.length < 100) {
        summary = err.message;
      }
    }
    catch (e) {}

    console.error();
    console.error('--');
    console.error('An unexpected error occurred, and the Treeline client had to exit.');
    console.error('If you continue to see issues, please contact '+chalk.underline('support@treeline.io')+' with details.');
    console.error('Thanks for being a part of the Treeline beta!');
    console.error();
    console.error();

    if (summary) {
      console.error('Error summary:');
      console.error(chalk.yellow(summary));
      console.error();
    }

    console.error('Technical details:');
    var technicalDetails = _.isError(err) ? err.stack : err;
    technicalDetails = _.isString(technicalDetails) ? technicalDetails : util.inspect(technicalDetails, { depth: null });
    console.error(chalk.gray(technicalDetails));
    process.exit(1);
  },

  success: function() {
    console.log(require('../helpers').buildAsciiArt().execSync());
  }

});
