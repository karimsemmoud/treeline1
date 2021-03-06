/**
 * 404 injection hook
 */

var path = require('path');
var _ = require('lodash');

module.exports = function(options) {

  if(!options) {
    options = {};
  }

  var projectId = options.projectId;
  var treelineUrl = options.url;
  var xAuth = options.xAuth;

  return function(sails) {
    return {
      initialize: function(cb) {

        sails.on('router:after', function () {

          // sails.router.bind('all /*', {
          //   skipAssets: true,
          //   target: function fourOhFour (req, res) {
          //     var _inputs = _.merge({}, req.body, req.query);
          //     var url = req.url.split('?')[0];
          //     var method = req.method;

          //     // Build out input objects
          //     var inputs = _.reduce(_inputs, function(memo, example, key) {
          //       memo[key] = {
          //         example: example
          //       };

          //       return memo;
          //     }, {});

          //     try {
          //       var treelineLocal = {
          //         treelineUrl: treelineUrl + '/api/v1/projects/' + projectId + '/routes',
          //         xAuth: xAuth,
          //         data: {
          //           project: projectId,
          //           inputs: inputs,
          //           path: url,
          //           method: method
          //         }
          //       };

          //       var dir = path.resolve(__dirname, '../../assets/404');
          //       res.view(dir, { layout: false, locals: { data: JSON.stringify(treelineLocal) }});
          //     }
          //     catch(err) {
          //       res.serverError(err);
          //     }
          //   }
          // });

        });

        cb();

      }

    };
  };
};
