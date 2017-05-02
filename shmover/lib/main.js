var exportStuff = require("./export");
var importStuff = require("./import");
var getAppOwner = require("./getAppOwner");
var Promise = require("bluebird");

function exportImport(srcHost, srcAppId,sheets,destHost, destAppId)
{
    return new Promise(function(resolve, reject)
    {
        Promise.all(sheets.map(function(sheetId)
        {
            return exportStuff(srcHost, srcAppId, sheetId)
            .then(function(result)
            {
                return getAppOwner(destHost, destAppId)
                .then(function(owner)
                {
                    return importStuff(destHost, destAppId, owner, result)
                    .then(function(result)
                    {
                        return result
                    })
                })
            })
        }))
        .then(function(resultArray)
        {
            resolve(resultArray)
        })
        .catch(function(error)
        {
            reject(error)
        })
    })
}
