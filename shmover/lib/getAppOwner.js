var qrsInteract = require("qrs-interact");
var qrsInstance = require("./qrsInstance");
var Promise = require("bluebird");

var qrs = new qrsInteract(qrsInstance);

function getAppOwner(appId) {
    return new Promise(function(resolve) {
        qrs.Get("app/full?filter=id eq " + appId)
            .then(function(result) {
                resolve(result.body[0].owner);
            })
    })
}

module.exports = getAppOwner;