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

function importSheet(hostname, appId, owner, importInfo) {
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
                        //return serializeSheet(app, "sheet");
                        //start by importing dimensions, measures, and visualizations
                        return Promise.all([importDimensions(x.app, importInfo.dimProps), importMeasures(x.app, importInfo.measProps), importViz(x.app, importInfo.vizProps)])

                    })
                    .then(function(resultArray) {
                        //now that dims, measures, and viz are imported it's time to import the sheets that use them.
                        return serializeSheet(app, "sheet");
                    })
                    .then(function(sheetArray) {
                        return Promise.all(importInfo.sheets.map(function(sheet) {
                            var sheetResult = sheetArray.filter(function(existingSheet) {
                                return existingSheet.qProperty.qMetaDef.title.includes(sheet.qProperty.qMetaDef.title);
                            })
                            if (sheetResult.length != 0) {
                                var sortedSheetResult = sheetResult.sort(function(a, b) {
                                    return b.qProperty.qMetaDef.title.length - a.qProperty.qMetaDef.title.length
                                });
                                sheet.qProperty.qMetaDef.title = sortedSheetResult[0].qProperty.qMetaDef.title + "_shmover";

                            }
                            //sheet.sheet.qProperty.qExtendsId = "";
                            return sheet;
                        }));

                    })
                    .then(function(resultArray) {
                        //Now create the sheets
                        return Promise.all(resultArray.map(function(sheet) {
                            return x.app.createObject(sheet.qProperty)
                                .then(function(handle) {
                                    console.log("Got to hear")
                                    return handle.getLayout()
                                        .then(function(layout) {
                                            logger.info("shmoved sheet id is: " + layout.qInfo.qId);
                                            sheet.qProperty.qInfo.qId = layout.qInfo.qId;
                                            return handle.setFullPropertyTree(sheet)
                                                .then(function() {
                                                    console.log("Sheet created");
                                                    return;
                                                })
                                        })
                                })
                        }))
                    })
                    .then(function(resultArray) {
                        console.log(resultArray);
                        x.app.session.close();
                        resolve(resultArray);
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

function importViz(app, vizs) {
    return new Promise(function(resolve) {
        if (vizs !== undefined) {
            getMeasureList(app)
                .then(function(destViz) {
                    //first get the differences
                    var matches = [];
                    if (destViz.length == 0) {
                        //nothing exists in the destination app, send all measures in.
                        logger.info("no viz exist in destination app so I'm loadin' them all!", loggerObject);

                    } else {
                        logger.info("There are master viz in the destination app, don't want to create dupes of existing master viz do we?", loggerObject);
                        destViz.forEach(function(v) {
                            matches.push(_.find(vizs, function(viz) {
                                return v.qId == viz.qInfo.qId;
                            }));
                        })

                        // now let's get the differences if any
                        vizs = _.difference(vizs, matches);

                        console.log(vizs);

                        //now let's update names where necessary.
                        destViz.forEach(function(v) {
                            vizs.forEach(function(viz, index) {
                                if (viz.qMetaDef.title == v.qTitle) {
                                    vizs[index].qMetaDef.title = viz.qMetaDef.title + "_shmover"
                                }
                            });
                        });
                    }

                    if (vizs.length > 0) {
                        return Promise.all(vizs.map(function(srcViz) {
                            return app.createObject(srcViz)
                                .then(function(handle) {
                                    logger.info(srcViz.qInfo.qId + ": " + srcViz.qMetaDef.title + " created.");
                                    return srcViz.qInfo.qId + ": " + srcViz.qMetaDef.title + " created.";
                                })
                        }));
                    } else {
                        logger.info("all master viz matched so no new master viz created.", loggerObject);
                        resolve("no master viz created because it was not necessary");
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
            console.log("no MasterViz used in this sheet")
            resolve("no MasterViz used in this sheet");
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

function getVizList(app) {
    var vizList = {
        qAppObjectListDef: {
            qType: "masterobject",
            qData: {
                id: "/qInfo/qId"
            }
        },
        qInfo: {
            qId: 'masterobjectList',
            qType: 'masterobjectList'
        },
        qMetaDef: {},
        qExtendsId: ''
    };

    return app.createSessionObject(vizList)
        .then(function(list) {
            return list.getLayout().then(function(layout) {
                return Promise.all(layout.qAppObjectList.qItems.map(function(v) {
                    return app.getObject(v.qInfo.qId).then(function(handle) {
                        return {
                            qId: v.qInfo.qId,
                            qTitle: v.qMeta.title
                        }
                    });
                }));
            });
        });
}