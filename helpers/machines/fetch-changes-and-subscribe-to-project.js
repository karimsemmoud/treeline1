module.exports = {


  friendlyName: 'Fetch changes and subcribe to project (pack or app)',


  description: 'Sync with the server to get a changelog for this project and subscribe to socket events for future changes.',


  cacheable: true,


  inputs: {

    id: {
      description: 'The unique id of the project.',
      example: 'mikermcneil/export-test',
      required: true
    },

    type: {
      friendlyName: 'Type',
      description: 'The type of Treeline project ("app" or "machinepack")',
      example: 'machinepack',
      required: true,
    },

    secret: {
      description: 'The Treeline secret key of an account w/ access to this project.',
      example: '29f559ae-3bec-4d0a-8458-1f4e32a72407',
      protect: true,
      required: true
    },

    socket: {
      friendlyName: 'Socket',
      description: 'The client socket to use to make the virtual request.',
      extendedDescription: 'This client socket must already be connected to the Treeline API. It must be capable of making virtual requests (e.g. spawned by sails.io.js).',
      example: '===',
      readOnly: true
    },

    treelineApiUrl: {
      description: 'The base URL for the Treeline API (useful if you\'re in a country that can\'t use SSL, etc.)',
      extendedDescription: 'Note that this is only used for HTTP fallback.',
      // TODO: implement HTTP fallback
      example: 'https://api.treeline.io',
      defaultsTo: 'https://api.treeline.io'
    },

    machineHashes: {
      description: 'An array of mappings between machine identities and the hash calculated from the corresponding machine definition.',
      extendedDescription: 'If provided, these hashes will be sent to the server, and the relevant machine definitions will only be initially fetched if their hashes are different from what is already stored on Treeline.io.',
      example: [{
        machine: 'some-machine-identity',
        hash: '1390ba9z9140$1-3a914n4'
      }]
    },

    packHash: {
      description: 'A hash string calculated from the pack metadata.',
      example: 'a8319azj39$29130nfan3',
      extendedDescription: 'If provided, this hash will be sent to the server, and the pack metadata will only be initially fetched if the hash is different from what is already stored on Treeline.io.',
    },

  },


  exits: {

    success: {
      friendlyName: 'then',
      variableName: 'packChangelog',
      example: [{
        id: 'irlnathan/machinepack-foobar',
        verb: 'set',
        definition: {}
      }],
    },

  },


  fn: function(inputs, exits) {
    var util = require('util');
    var MPJson = require('machinepack-json');

    // TODO: make this work for apps too using this:
    // (inputs.type === 'machinepack' ? inputs.id : '_project_' + inputs.id

    // TODO: pull into mp-sockets (also implement http fallback)
    inputs.socket.request({
      method: 'get',
      url: '/api/v1/machinepacks/'+inputs.id+'/sync',
      headers: { 'x-auth': inputs.secret },
      params: {
        // Send along hashes of each machine, as well as one
        // additional hash for the pack's package.json metadata.
        packHash: inputs.packHash,
        machineHashes: inputs.machineHashes
      }
    }, function serverResponded (body, jwr) {
      // console.log('Sails responded with: ', body); console.log('with headers: ', jwr.headers); console.log('and with status code: ', jwr.statusCode);
      // console.log('jwr.error???',jwr.error);
      if (jwr.error) {

        // Set up an exit via 'forbidden'.
        if (jwr.statusCode === 401) {
          jwr.exit = 'forbidden';
        }

        // If initial pack subscription fails, kill the scribe server
        // and stop listening to changes
        return exits(jwr);
      }

      // Parse packs changelog
      MPJson.parse({
        json: body,
        schema: [{
          id: 'irlnathan/machinepack-foobar',
          verb: 'set',
          definition: {}
        }]
      }).exec({
        error: exits.error,
        success: function (jsonData){
          if (!jsonData.id) {
            return exits.error(new Error('Unexpected response from Treeline:'+util.inspect(jsonData,{depth: null})));
          }
          return exits.success(jsonData);
        }
      });// </MpJson.parse>

    }); //</socket.request>

  }

};
