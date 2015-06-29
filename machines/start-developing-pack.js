module.exports = {


  friendlyName: 'Start interactive development session (machinepack)',


  description: 'Preview the machinepack in the current directory, streaming down updated code as changes are made on https://treeline.io.',


  extendedDescription: 'Note that this will run the `scribe` tool as a local server (http://localhost:1492).',


  inputs: {

    onAuthenticated: {
      description: 'An optional notifier function that will be called when authentication is complete.',
      example: '->',
      defaultsTo: function (){}
    },

    onConnected: {
      description: 'An optional notifier function that will be called when a connection is established with Treeline.io and this pack is being initially synchronized with the server.',
      example: '->',
      defaultsTo: function (){}
    },

    onSyncError: {
      description: 'An optional notifier function that will be called when Treeline attempts to sync remote changes to the local pack, but it fails.',
      example: '->',
      defaultsTo: function (){}
    },

    onSyncSuccess: {
      description: 'An optional notifier function that will be called when Treeline attempts to sync remote changes to the local pack and it works.',
      example: '->',
      defaultsTo: function (){}
    },

    onSocketDisconnect: {
      description: 'An optional notifier function that will be called if/when the remote connection with http://treeline.io is lost (and as the local Treeline client attempts to reconnect).',
      example: '->',
      defaultsTo: function (){}
    },

    onFlushError: {
      description: 'An optional notifier function that will be called if/when the router of the locally-running app cannot be flushed.',
      example: '->',
      defaultsTo: function (){}
    },

    localPort: {
      description: 'The local port to run the `scribe` utility on.  Defaults to 1492.',
      example: 1492,
      defaultsTo: 1492
    },

    treelineApiUrl: {
      description: 'The base URL for the Treeline API (useful if you\'re in a country that can\'t use SSL, etc.)',
      example: 'http://api.treeline.io',
      defaultsTo: 'https://api.treeline.io'
    }

  },


  exits: {

    error: {
      description: 'Unexpected error occurred.'
    },

    notLinked: {
      description: 'The current working directory is not linked to an app or machinepack on Treeline.io.'
    },

    noMachinepacks: {
      description: 'No machinepacks belong to the account associated with this computer.',
      example: {
        username: 'mikermcneil'
      }
    },

    forbidden: {
      description: 'Unrecognized username/password combination.',
      extendedDescription: 'Please try again or visit http://treeline.io to reset your password or locate your username.'
    },

    requestFailed: {
      description: 'Could not communicate with Treeline.io -- are you connected to the internet?'
    },

    success: {
      description: 'The success exit should never be triggered.'
    },

  },


  fn: function (inputs, exits){

    var _ = require('lodash');
    var Http = require('machinepack-http');
    var thisPack = require('../');
    var getSocketAndConnect = require('../standalone/sails-client');


    // var errMsg = '';
    // errMsg += '\n';
    // errMsg += 'Sorry-- interactive pack preview is not implemented yet.';
    // errMsg += '\n';
    // errMsg +=  'But we\'re working on it!  If you\'re curious, keep an eye on the repo for updates:';
    // errMsg += '\n';
    // errMsg += 'http://github.com/treelinehq/treeline';
    // return exits.error(errMsg);

    thisPack.loginIfNecessary({
      treelineApiUrl: inputs.treelineApiUrl
    }).exec({
      error: exits.error,
      success: function (me) {
        thisPack.linkIfNecessary({
          type: 'machinepack',
          treelineApiUrl: inputs.treelineApiUrl
        }).exec({
          error: exits.error,
          success: function (linkedProject) {
            if (linkedProject.type !== 'machinepack') {
              return exits.error('The project in this directory is not a machinepack.  Maybe try `treeline preview app` instead?');
            }

            // Trigger optional notifier function.
            inputs.onAuthenticated();

            // Lift the `scribe` utility as a sails server running on a local port.
            // (this port should be configurable)
            // TODO

            // Read local pack and compute hash of the meaningful information.
            LocalMachinepacks.getSignature({
              dir: process.cwd()
            }).exec({
              error: exits.error,
              success: function (packSignature) {

                // Now we'll start up a synchronized development session by
                // listening for changes from Treeline by first connecting a socket,
                // then sending a GET request to subscribe to this particular pack.
                // With that request, send hash of local pack to treeline.io, requesting
                // an update if anything has changed (note that this will also subscribe
                // our socket to future changes)
                getSocketAndConnect({
                  baseUrl: inputs.treelineApiUrl
                }, function (err, socket) {
                  if (err) {
                    return exits.error(err);
                  }

                  // Trigger optional notifier function.
                  inputs.onConnected();

                  socket.request({
                    method: 'get',
                    // TODO: plug in the real URL and headers here
                    url: '/api/v1/machine-packs/rachaelshaw',
                    headers: { 'x-profile': 'rachaelshaw' },
                    params: {
                      // Send the hash strings
                      packHash: packSignature.packHash,
                      machineHashes: packSignature.machineHashes
                    }
                  }, function serverResponded (body, JWR) {
                    // console.log('Sails responded with: ', body); console.log('with headers: ', JWR.headers); console.log('and with status code: ', JWR.statusCode);
                    // console.log('JWR.error???',JWR.error);
                    if (JWR.error) {
                      // If initial pack subscription fails, kill the scribe server
                      // and stop listening to changes
                      return exits.error(JWR.error);
                    }

                    // Now subscribed.

                    // If treeline.io responded with a changelog, that means something
                    // changed, so immediately apply it to our local pack on disk.
                    if (_.isArray(body)) {
                      thisPack.syncRemoteChanges({
                        type: 'machinepack',
                        changelog: body,
                        onSyncSuccess: inputs.onSyncSuccess,
                        localPort: inputs.localPort
                      }).exec({
                        // If applying a pack changelog to the local machinepack
                        // fails, then trigger the `onSyncError` notifier function.
                        error: function (err){
                          inputs.onSyncError(err);
                        },
                        // If reloading the pack in scribe fails, then trigger the
                        // `onFlushError` notifier function.
                        couldNotFlush: function (err){
                          inputs.onFlushError(err);
                        },
                        success: function (){ /* everything is hunky dory */ },
                      });
                    }

                  });

                  // If treeline.io says something changed, apply the changelog
                  // it provides to our local pack on disk.
                  socket.on('pack:changed', function (msg){

                    thisPack.syncRemoteChanges({
                      type: 'machinepack',
                      changelog: msg.changelog,
                      onSyncSuccess: inputs.onSyncSuccess,
                      localPort: inputs.localPort
                    }).exec({
                      // If applying a pack changelog to the local machinepack
                      // fails, then trigger the `onSyncError` notifier function.
                      error: function (err){
                        inputs.onSyncError(err);
                      },
                      // If reloading the pack in scribe fails, then trigger the
                      // `onFlushError` notifier function.
                      couldNotFlush: function (err){
                        inputs.onFlushError(err);
                      },
                      success: function (){ /* everything is hunky dory */ },
                    });
                  });

                  // Trigger `onSocketDisconnect` if the connection to treeline.io is broken
                  socket.on('disconnect', function() {
                    inputs.onSocketDisconnect();
                  });

                  // If anything goes horribly wrong or the process is stopped manually w/ <CTRL+C>,
                  // then ensure we:
                  //  • stop listening for changes
                  //  • kill the local server running `scribe`
                  // TODO

                });
              }
            });


          }
        });
      }
    });

  }

};