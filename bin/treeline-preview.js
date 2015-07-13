#!/usr/bin/env node

require('machine-as-script')({

  machine: require('../helpers/machines/start-developing-project'),

  args: ['type']

}).configure({

  onHasKeychain: function (username){
    var chalk = require('chalk');
    console.log(chalk.gray('Located keychain file: will identify as "'+username+'".'));
  },
  onLoadProjectInfo: function (projectInfo){
    var chalk = require('chalk');
    console.log(chalk.gray('Identified '+projectInfo.type+': "'+projectInfo.friendlyName+'"'));
  },
  onConnecting: function (){
    var chalk = require('chalk');
    console.log(chalk.gray('Connecting...'));
  },
  // onInitialConnectSuccess: function (){
  //   var chalk = require('chalk');
  //   console.log(chalk.gray('Now connected to Treeline mothership.'));
  // },
  onSyncing: function (){
    var chalk = require('chalk');
    console.log(chalk.gray('Syncing...'));
  },
  onSyncError: function (err){
    var chalk = require('chalk');
    console.error(chalk.red('Failed while attempting to sync changes from the Treeline mothership.'));
    // TODO: write error details to a log file
  },
  // onSyncSuccess: function (){
  //   var chalk = require('chalk');
  //   console.log(chalk.gray('Successfully synchronized local project with updated logic from http://treeline.io.'));
  // },
  onInitialSyncSuccess: function (){
    var chalk = require('chalk');
    console.log(chalk.gray('Now listening to http://treeline.io for updates...'));
    console.log(chalk.gray('(remote changes will automatically generate code in this directory'));
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

  notLinked: function (){
    var chalk = require('chalk');
    console.log('The current directory is '+ chalk.yellow('not linked') +' to Treeline.');
    process.exit(1);
  },

  noApps: function (data){
    var chalk = require('chalk');
    console.log();
    console.log('Looks like you don\'t have any apps in your account yet, %s.', chalk.cyan(data.username));
    console.log('You should visit http://treeline.io and create one!');
    process.exit(1);
  },

  requestFailed: function(url) {
    var chalk = require('chalk');
    console.log(chalk.red('Could not communicate with the Treeline mothership') + (url?(chalk.red(' at ')+url):'') + chalk.red('.') + chalk.red(' Are you connected to the internet?'));
    console.log(chalk.gray('(if you don\'t have a stable internet connection, try `--offline` mode)'));
    process.exit(1);
  },

  error: function(err) {
    var util = require('util');
    var _ = require('lodash');
    var chalk = require('chalk');
    console.error();
    console.error('An unexpected error occurred, and the Treeline client had to exit.');
    console.error('If you continue to see issues, please contact '+chalk.underline('support@treeline.io')+' with details.');
    console.error('Thanks for being a part of the Treeline beta!');
    console.error();
    console.error('Technical error details:');
    console.error(chalk.gray(util.inspect(_.isError(err)?err.stack:err), {depth: null}));
    process.exit(1);
  }

});
