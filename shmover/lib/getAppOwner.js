var qrsInteract = require("qrs-interact");
var qrsInstance = require("./qrsInstance");
var Promise = require("bluebird");

var qrs = new qrsInteract(qrsInstance);

function getAppOwner(hostname,appId) {
    return new Promise(function(resolve) {
        qrs.UpdateHostname(hostname);
        qrs.Get("app/full?filter=id eq " + appId)
            .then(function(result) {
                console.log("Identified Owner");
                resolve(result.body[0].owner);
            })
            .catch(function(error)
            {
                throw new Error(error);
            });
    })
}

module.exports = getAppOwner;