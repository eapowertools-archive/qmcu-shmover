var exportStuff = require("./export");
var importStuff = require("./import");
var getAppOwner = require("./getAppOwner");
var Promise = require("bluebird");

function exportImport(srcHost, srcAppId,sheets,destHost, destAppId)
{
    return new Promise(function(resolve, reject)
    {
    
            exportStuff(srcHost, srcAppId, sheets[0])
            .then(function(result)
            {
                return getAppOwner(destHost, destAppId)
                .then(function(owner)
                {
                    return importStuff(destHost, destAppId, owner, result)
                    .then(function(result)
                    {
                        resolve(result);
                    })
                    .catch(function(error)
                    {
                        reject(error)
                    })
                })
            })
        
    });
}

module.exports = exportImport;