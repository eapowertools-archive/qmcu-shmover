var enigma = require("enigma.js");
var enigmaInstance = require("./enigmaInstance");
var logger = require("./logger");
var Promise = require("bluebird");
var config = require("../config");
var extend = require("extend");
var _ = require("lodash");
var serializeSheet = require("../node_modules/serializeApp/lib/getList");

var loggerObject = {
    module: "import.js"
};

function importSheet(hostname, appId, owner, sheet) {
    return new Promise(function(resolve, reject) {
        config = extend(true, config, {
            engine: {
                hostname: hostname,
                userDirectory: owner.userDirectory,
                userId: owner.userId
            }
        });

        var x = {};
        return enigma.getService('qix', enigmaInstance(config))
            .then(function(qix) {
                logger.info("Connected to QIX.", loggerObject);
                return qix.global.openDoc(appId, '', '', '', true)
                    .then(function(app) {
                        //get a sheet list and see if a similar named sheet exists
                        x.app = app;
                        return serializeSheet(app, "sheet");
                    })
                    .then(function(sheetArray) {

                        var sheetResult = sheetArray.filter(function(existingSheet) {
                            return existingSheet.qProperty.qMetaDef.title.includes(sheet.sheet.qProperty.qMetaDef.title);
                        })
                        if (sheetResult.length != 0) {
                            var sortedSheetResult = sheetResult.sort(function(a, b) {
                                return b.qProperty.qMetaDef.title.length - a.qProperty.qMetaDef.title.length
                            });
                            sheet.sheet.qProperty.qMetaDef.title = sortedSheetResult[0].qProperty.qMetaDef.title + "_shmover";

                        }
                        sheet.sheet.qProperty.qExtendsId = "";
                        return sheet;
                    })
                    .then(function(sheet) {
                        return x.app.createObject(sheet.sheet.qProperty)
                            .then(function(handle) {
                                console.log("Got to hear")
                                return handle.getLayout()
                                    .then(function(layout) {
                                        logger.info("shmoved sheet id is: " + layout.qInfo.qId);
                                        sheet.sheet.qProperty.qInfo.qId = layout.qInfo.qId;
                                        return handle.setFullPropertyTree(sheet.sheet)

                                        .then(function() {
                                            console.log("importing dims and measures");
                                            return Promise.all([importDimensions(x.app, sheet.dimProps), importMeasures(x.app, sheet.measProps)])
                                                .then(function(resultArray) {
                                                    console.log(resultArray);
                                                    x.app.session.close();
                                                    resolve(resultArray);
                                                })
                                        });
                                    })
                            })
                    })
                    .catch(function(error) {
                        reject(new Error("Error!::" + JSON.stringify(error)));
                    })
            })
    })
}

module.exports = importSheet;


function closeApp(app) {
    app.session.close();
}

function importDimensions(app, dims) {
    return new Promise(function(resolve) {
        if (dims !== undefined) {
            var strShmover;
            getDimList(app)
                .then(function(destDims) {
                    //first get the differences
                    var matches = [];
                    if (destDims.length == 0) {
                        //nothing exists in the destination app, send all dimensions in.
                        logger.info("no dims exist in destination app so I'm loadin' them all!", loggerObject);

                    } else {
                        logger.info("There are dims in the destination app, don't want to create dupes of existing dimensions do we?", loggerObject);
                        destDims.forEach(function(destDim) {
                            matches.push(_.find(dims, function(dim) {
                                return destDim.qId == dim.qInfo.qId;
                            }));
                        })

                        // now let's get the differences if any
                        dims = _.difference(dims, matches);

                        //now let's update names where necessary.
                        destDims.forEach(function(destDim) {
                            dims.forEach(function(dim, index) {
                                if (dim.qMetaDef.title == destDim.qTitle) {
                                    dims[index].qMetaDef.title = dim.qMetaDef.title + "_shmover"
                                }
                            })
                        })

                    }

                    if (dims.length > 0) {
                        return Promise.all(dims.map(function(srcDim) {
                            return app.createDimension(srcDim)
                                .then(function(handle) {
                                    logger.info(srcDim.qInfo.qId + ": " + srcDim.qMetaDef.title + " created.");
                                    return srcDim.qInfo.qId + ": " + srcDim.qMetaDef.title + " created.";
                                })
                        }));
                    } else {
                        logger.info("all dims matched so no new dimensions created.", loggerObject);
                        resolve("all dims matched so no new dimensions created.");
                    }
                })
                .then(function(resultArray) {
                    resolve(resultArray)
                })
                .catch(function(error) {
                    logger.error(error);
                    resolve(error);
                });
        } else {
            console.log("no dims used in this sheet")
            resolve("no dims used in this sheet");
        }
    });
}

function importMeasures(app, measures) {
    return new Promise(function(resolve) {
        if (measures !== undefined) {
            getMeasureList(app)
                .then(function(destMeas) {
                    //first get the differences
                    var matches = [];
                    if (destMeas.length == 0) {
                        //nothing exists in the destination app, send all measures in.
                        logger.info("no measures exist in destination app so I'm loadin' them all!", loggerObject);

                    } else {
                        logger.info("There are measures in the destination app, don't want to create dupes of existing measures do we?", loggerObject);
                        destMeas.forEach(function(m) {
                            matches.push(_.find(measures, function(measure) {
                                return m.qId == measure.qInfo.qId;
                            }));
                        })

                        // now let's get the differences if any
                        measures = _.difference(measures, matches);

                        console.log(measures);

                        //now let's update names where necessary.
                        destMeas.forEach(function(m) {
                            measures.forEach(function(measure, index) {
                                if (measure.qMetaDef.title == m.qTitle) {
                                    measures[index].qMetaDef.title = measure.qMetaDef.title + "_shmover"
                                }
                            });
                        });
                    }

                    if (measures.length > 0) {
                        return Promise.all(measures.map(function(srcMeasure) {
                            return app.createMeasure(srcMeasure)
                                .then(function(handle) {
                                    logger.info(srcMeasure.qInfo.qId + ": " + srcMeasure.qMetaDef.title + " created.");
                                    return srcMeasure.qInfo.qId + ": " + srcMeasure.qMetaDef.title + " created.";
                                })
                        }));
                    } else {
                        logger.info("all measures matched so no new measures created.", loggerObject);
                        resolve("no measures created because it was not necessary");
                    }
                })
                .then(function(resultArray) {
                    resolve(resultArray)
                })
                .catch(function(error) {
                    logger.error(error);
                    resolve(error)
                });
        } else {
            console.log("no measures used in this sheet")
            resolve("no measures used in this sheet");
        }

    });
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
        .catch(function(error) {
            logger.error(error);
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