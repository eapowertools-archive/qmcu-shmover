var exportStuff = require("./export");
var importStuff = require("./import");
var getAppOwner = require("./getAppOwner");
var Promise = require("bluebird");

var socket = require('socket.io-client')('https://localhost:9945', {
    secure: true,
    reconnect: true
});

function exportImport(srcHost, srcAppId, sheets, destHost, destAppId) {
    return new Promise(function(resolve, reject) {
        socket.emit("shmover", "Export started.")
        exportStuff(srcHost, srcAppId, sheets)
            .then(function(result) {
                socket.emit("shmover", "Export complete.  Obtaining destination application owner");
                return getAppOwner(destHost, destAppId)
                    .then(function(owner) {
                        socket.emit("shmover", "Owner identified.  Passing information to import operation.");
                        return importStuff(destHost, destAppId, owner, result)
                            .then(function(result) {
                                socket.emit("shmover", "Import complete.")
                                resolve(result);
                            })
                            .catch(function(error) {
                                socket.emit("shmover", "An error occurred during import: " + error.message);
                                reject(error)
                            })
                    })
            })
            .catch(function(error) {
                socket.emit("shmover", "An error occurred during shmover process: " + error.message);
                reject(error);
            });
    });
}

module.exports = exportImport;