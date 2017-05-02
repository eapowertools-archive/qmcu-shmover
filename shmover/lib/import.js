var enigma = require("enigma.js");
var enigmaInstance = require("./enigmaInstance");
var logger = require("./logger");
var Promise = require("bluebird");
var config = require("../config/testConfig");
var extend = require("extend");
var _ = require("lodash");


var loggerObject = {
    module: "import.js"
};

function importSheet(appId, owner, sheet) {

    config = extend(true, config, {
        engine: {
            userDirectory: owner.userDirectory,
            userId: owner.userId
        }
    });


    return enigma.getService('qix', enigmaInstance(config))
        .then(function(qix) {
            logger.info("Connected to QIX.", loggerObject);
            return qix.global.openDoc(appId, '', '', '', true)
                .then(function(app) {
                    return app.createObject(sheet.sheet.qProperty)
                        .then(function(handle) {
                            console.log("Got to hear")
                            return handle.setFullPropertyTree(sheet.sheet)
                                .then(function() {
                                    console.log("and here");
                                    return sheet.sheet.qProperty.qInfo.qId;
                                })
                                .then(function() {
                                    return Promise.all([importDimensions(app, sheet.dimProps), importMeasures(app, sheet.measProps)])
                                })
                                .catch(function(error) {
                                    throw new Error("Error!");
                                    //return error;
                                })
                        })
                })
        })
        .catch(function(error) {
            throw new Error("Error!");
        })
}



module.exports = importSheet;


function importDimensions(app, dims) {
    return new Promise(function(resolve) {
        var strShmover;
        getDimList(app)
            .then(function(destDims) {
                //list of dims existing in the destination app.  Time to find matches.
                if (destDims.length == 0) {
                    //nothing exists in the destination app, send all dimensions in.
                    return Promise.all(dims.map(function(srcDim) {
                        return app.createDimension(srcDim)
                            .then(function(handle) {
                                return srcDim.qInfo.qId + ": " + srcDim.qMetaDef.title + " created.";
                            })
                    }));
                } else {
                    //I need to see which ones exist and which ones don't.
                    return Promise.all(destDims.map(function(d) {
                        //find dim within destDims
                        strShmover = "";
                        var dimMatch = _.find(dims, function(srcDim) {
                            if (d.qTitle == srcDim.qMetaDef.title && d.qId == srcDim.qInfo.qId) {
                                return false;
                            } else if (d.qId == srcDim.qInfo.qId && d.qTitle !== srcDim.qMetaDef.title) {
                                return true;
                            } else if (d.qId !== srcDim.qInfo.qId && d.qTitle == srcDim.qMetaDef.title) {
                                strShmover = "_shmover";
                                return true;
                            } else {
                                return true;
                            }
                        });

                        if (dimMatch !== undefined) {
                            dimMatch.qMetaDef.title = dimMatch.qMetaDef.title + strShmover;
                            return app.createDimension(dimMatch)
                                .then(function(handle) {
                                    return dimMatch.qInfo.qId + ": " + dimMatch.qMetaDef.title + " created.";
                                })
                        } else {
                            return "Dimension exists in destination application.";
                        }

                    }));
                }

            })
            .then(function(resultArray) {
                resolve(resultArray)
            })

    })
}

function importMeasures(app, measures) {
    return new Promise(function(resolve) {
        var strShmover;
        getMeasureList(app)
            .then(function(destMeas) {
                //list of measures existing in the destination app.  Time to find matches.
                if (destMeas.length == 0) {
                    //nothing exists in the destination app, send all measures in.
                    return Promise.all(measures.map(function(srcMeas) {
                        return app.createMeasure(srcMeas)
                            .then(function(handle) {
                                return srcMeas.qInfo.qId + ": " + srcMeas.qMetaDef.title + " created.";
                            })
                    }));
                } else {
                    //I need to see which ones exist and which ones don't.
                    return Promise.all(destMeas.map(function(m) {
                        //find dim within destDims
                        strShmover = "";
                        var measMatch = _.find(measures, function(srcMeas) {
                            if (m.qTitle == srcMeas.qMetaDef.title && m.qId == srcMeas.qInfo.qId) {
                                return false;
                            } else if (m.qId == srcMeas.qInfo.qId && m.qTitle !== srcMeas.qMetaDef.title) {
                                return true;
                            } else if (m.qId !== srcMeas.qInfo.qId && m.qTitle == srcMeas.qMetaDef.title) {
                                strShmover = "_shmover";
                                return true;
                            } else {
                                return true;
                            }
                        });

                        if (measMatch !== undefined) {
                            measMatch.qMetaDef.title = measMatch.qMetaDef.title + strShmover;
                            return app.createDimension(measMatch)
                                .then(function(handle) {
                                    return measMatch.qInfo.qId + ": " + measMatch.qMetaDef.title + " created.";
                                })
                        } else {
                            return "Dimension exists in destination application.";
                        }

                    }));
                }

            })
            .then(function(resultArray) {
                resolve(resultArray)
            })

    })
}


function getDimList(app) {
    var dimList = {
        qDimensionListDef: {
            qType: 'dimension',
            qData: {
                info: '/qDimInfos'
            },
            qMeta: {}
        },
        qInfo: { qId: "DimensionList", qType: "DimensionList" }
    };

    return app.createSessionObject(dimList)
        .then(function(list) {
            return list.getLayout()
                .then(function(layout) {
                    return Promise.all(layout.qDimensionList.qItems.map(function(d) {
                        return {
                            qId: d.qInfo.qId,
                            qTitle: d.qMeta.title
                        }
                    }));
                })
        })

}

function getMeasureList(app) {
    var measList = {
        qMeasureListDef: {
            qType: 'measure',
            qData: {
                info: '/qDimInfos'
            },
            qMeta: {}
        },
        qInfo: { qId: "MeasureList", qType: "MeasureList" }
    };

    return app.createSessionObject(measList)
        .then(function(list) {
            return list.getLayout()
                .then(function(layout) {
                    return Promise.all(layout.qMeasureList.qItems.map(function(m) {
                        return {
                            qId: m.qInfo.qId,
                            qTitle: m.qMeta.title
                        }
                    }));
                })
        })
}