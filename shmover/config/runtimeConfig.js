var extend = require('extend');
var mainConfig = require("../../../config/config");
var baseConfig = require('./baseConfig');
var fs = require('fs');


var config;


config = extend(true, mainConfig, config);
config = extend(true, baseConfig, config);
config = extend(true, config, {
    qrs: {
        localCertPath: config.certificates.certPath
            // repoAccountUserDirectory: 'INTERNAL',
            // repoAccountUserId: 'sa_repository'
    }
});
module.exports = config;