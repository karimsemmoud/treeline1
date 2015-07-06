module.exports = {


  friendlyName: 'Start interactive development session (app)',


  description: 'Lift the app in the current directory, streaming down updated backend code if necessary.',


  inputs: {

    dir: {
      description: 'Path to the local project.',
      extendedDescription: 'If unspecified, defaults to the current working directory.  If provided as a relative path, this will be resolved from the current working directory.',
      example: '/Users/mikermcneil/Desktop/foo'
    },

    keychainPath: {
      description: 'Path to the keychain file on this computer. Defaults to `.treeline.secret.json` in the home directory.',
      extendedDescription: 'If provided as a relative path, this will be resolved from the current working directory.',
      example: '/Users/mikermcneil/Desktop/foo'
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

    noApps: {
      description: 'No apps belong to the account associated with this computer.',
      example: {
        username: 'mikermcneil'
      }
    },

    unrecognizedCredentials: {
      description: 'Unrecognized username/password combination.',
      extendedDescription: 'Please try again or visit http://treeline.io to reset your password or locate your username.'
    },

    requestFailed: {
      description: 'Could not communicate with Treeline.io -- are you connected to the internet?'
    },

    success: {
      description: 'Done.',
      example: '==='
    },

  },


  fn: function (inputs, exits){
    var util = require('util');
    var path = require('path');
    var chalk = require('chalk');
    var async = require('async');
    var _ = require('lodash');
    var debug = require('debug')('treeline-cli');
    var Urls = require('machinepack-urls');
    var NPM = require('machinepack-npm');
    var legacyPreviewCode = require('../legacy/lib/actions');
    var thisPack = require('../');
    var publicPack = require('../../');



    async.auto({

      // Make sure the treeline API is alive
      pingServer: function(next) {
        thisPack.pingServer({url: inputs.treelineApiUrl}).exec({
          error: function (err){
            return next(err);
          },
          success: function (){
            return next();
          },
          noResponse: function (){
            return next('requestFailed');
          }
        });
      },

      checkForUpdates: function(next) {
        // Fetch the package.json string for the `treeline` package from the public NPM registry.
        NPM.fetchInfo({
          packageName: 'treeline',
        }).exec({
          // An unexpected error occurred.  We'll ignore it.
          error: function (err){
           return next();
          },
          // Oh my.  This would be bad.  But it's probably just a problem with NPM, so we'll ignore it.
          packageNotFound: function (){
           return next();
          },
          // OK. Let's parse this sucker.
          success: function (packageJsonString){
            try {
              // Parse metadata for the latest version of the NPM package given a package.json string.
              var latestPackageJson = NPM.parsePackageJson({
                json: packageJsonString,
              }).execSync();
              // Get our own package.json
              var ourPackageJson = require(path.resolve(__dirname, "..", "package.json"));
              // If ours doesn't match the latest, show a helpful reminder
              if (ourPackageJson.version !== latestPackageJson.version) {
                console.log(chalk.bgCyan(chalk.black("A new version of Treeline (v " + latestPackageJson.version + ") is available!  Run"), chalk.red(chalk.bold("npm install -g treeline")) + chalk.black(" to update.")));
              }
            }
            catch (e) {
              // Don't worry about errors in the above; we'll just
              // try again next time.
            }
            next();
          },
        });
      },

      checkForTreelineGeneratedFiles: [function(next) {
        require('fs').open(path.resolve(process.cwd(), "api", "responses", "response.js"), "r", function(err) {
          if (err && err.code == 'ENOENT') {
            console.log(chalk.red("Could not find api/responses/response.js: was this app generated with `treeline new`?"));
          }
          return next();
        });
      }],

      // Get login credentials
      me: ['checkForUpdates', function (next){
        thisPack.readKeychain({
          keychainPath: inputs.keychainPath
        }).exec({
          error: function (err) {
            return next(err);
          },
          doesNotExist: function (){
            publicPack.login({
              keychainPath: inputs.keychainPath,
              treelineApiUrl: inputs.treelineApiUrl
            }).exec({
              error: next,
              success: function (me){
                return next(null, me);
              }
            });
          },
          success: function (me){
            return next(null, me);
          }
        });
      }],

      // Figure out which project to lift
      link: ['me', function (next){
        thisPack.readLinkfile({
          dir: inputs.dir
        }).exec({
          error: function (err) {
            if (err) return next(err);
          },
          doesNotExist: function (){
            publicPack.link({
              type: 'app',
              dir: inputs.dir,
              keychainPath: inputs.keychainPath,
              treelineApiUrl: inputs.treelineApiUrl,
            }).exec({
              error: next,
              noApps: function (output){
                return next({exit: 'noApps', output: output});
              },
              success: function (linkedProject){
                return next(null, linkedProject);
              }
            });
          },
          success: function (linkedProject){

            if (linkedProject.type !== 'app') {
              return next(new Error('The Treeline project in this directory is not an app.  Try `treeline preview machinepack`.'));
            }

            // Spit out a message before doing the "npm install" steps
            console.log(chalk.grey('Ensuring dependencies are up to date...'));
            return next(null, linkedProject);
          }
        });
      }],

      // Make sure there's a package.json
      packageJson: ['link', ensurePackageJson],

      // Make sure there is a postinstall script
      // (this converts old projects to new projects)
      ensurePostInstall: ['packageJson', ensurePostInstall],

      // Make sure dependencies are installed
      _installedDependencies: ['packageJson', ensureMachineDependencies],

      // Lift app
      _liftedApp: ['_installedDependencies', function(next, asyncData) {

        legacyPreviewCode.run(
          (function buildConf (){
            var conf = {
              targetProject: {
                id: asyncData.link.id,
                fullName: asyncData.link.displayName
              },
              credentials: {
                secret: asyncData.me.secret
              },
              config: {
                treelineURL: inputs.treelineApiUrl
              }
            };
            debug('Will connect using:',conf);

            // build `conf` object for the delight of existing preview code
            return conf;
          })(),
          [{/* ...? */}],
          next
        );
      }]

    }, function (err, results) {
      if (err) {
        if (err === 'requestFailed'){
          return exits.requestFailed(err);
        }
        if (_.isObject(err) && err.exit === 'noApps'){
          return exits.noApps(err.output);
        }
        return exits(err);
      }
      return exits.success(results._liftedApp);
    });




    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


    var fs = require('fs');
    var fse = require('fs-extra');
    var exec = require('child_process').exec;

    function ensurePackageJson(cb, results) {
      // Check for existing package.json
      if (fs.existsSync(path.resolve(process.cwd(), "package.json"))) {
        return cb();
      }
      fse.outputJSON(path.resolve(process.cwd(), "package.json"), {
        name: results.link.identity,
        version: "0.0.0"
      }, cb);
    }

    function ensurePostInstall(cb, results) {
      // Check for existing postinstall script
      var dir = process.cwd();

      thisPack.addPostinstallScript({
        destination: dir
      }).exec({
        error: function(e) {
          return cb(e);
        },
        success: function() {
          return cb();
        }
      });
    }

    function ensureMachineDependencies (cb) {
      debug("Running npm install...");
      // Always "npm install", in case something got interrupted
      exec("npm install machine", {cwd: process.cwd()}, function(err, stdout) {
        if (err) {return cb(err);}
        exec("npm install sails-hook-machines", {cwd: process.cwd()}, function(err, stdout) {
          debug(stdout);
          cb(err);
        });
      });
    }

  }

};
