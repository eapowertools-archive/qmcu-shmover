var enigma = require("enigma.js");
var enigmaInstance = require("./enigmaInstance");
var logger = require("./logger");
var Promise = require("bluebird");
var serializeSheet = require("../node_modules/serializeApp/lib/getList");
var config = require("../config");
var extend = require("extend");
var _ = require("lodash");

var loggerObject = {
    module: "export.js"
};

function exportSheet(hostname, appId, sheetIds) {
    return new Promise(function(resolve, reject) {
        var x = {};
        logger.info("appId:" + appId);
        logger.info("sheetIds to export:" + sheetIds.length);
        config = extend(true, config, {
            engine: {
                hostname: hostname
            }
        });
        var dims = [];
        var meas = [];
        var vizs = [];
        return enigma.getService('qix', enigmaInstance(config))
            .then(function(qix) {
                logger.info("Connected to QIX.", loggerObject);
                return qix.global.openDoc(appId, '', '', '', true)
                    .then(function(app) {
                        x.appId = appId;
                        x.sheetIds = sheetIds;
                        x.app = app;
                        logger.info("app opened")
                        return serializeSheet(app, "sheet");
                    })
                    .then(function(sheetArray) {
                        // console.log(sheetArray[0]);
                        var sheetResults = sheetArray.filter(function(sheet) {
                            return this.indexOf(sheet.qProperty.qInfo.qId) >= 0
                        }, sheetIds);
                        //console.log(JSON.stringify(sheetResult));
                        x.sheetResults = sheetResults;
                        return sheetResults;
                    })
                    .then(function(sheets) {
                        return Promise.all(sheets.map(function(sheet) {
                            var sheetObjects = sheet.qChildren;
                            if (sheet.qChildren.length > 0) {
                                sheetObjects.forEach(function(object) {
                                    if (object.qProperty.hasOwnProperty("qExtendsId")) {
                                        vizs = vizs.concat(object.qProperty.qExtendsId);
                                    }

                                    //y.uniqueVizs = _.uniq(vizs);

                                    if (object.qProperty.hasOwnProperty("qHyperCubeDef")) {
                                        if (object.qProperty.qHyperCubeDef.qDimensions.length > 0) {
                                            dims = dims.concat(object.qProperty.qHyperCubeDef.qDimensions);
                                        }
                                        // else {
                                        //     dims = [];
                                        // }
                                        if (object.qProperty.qHyperCubeDef.qMeasures.length > 0) {
                                            meas = meas.concat(object.qProperty.qHyperCubeDef.qMeasures);
                                        }
                                        // else {
                                        //     meas = [];
                                        // }
                                        //make unique
                                        //x.uniqueDims = _.uniqBy(dims, 'qLibraryId');
                                        //x.uniqueMeas = _.uniqBy(meas, 'qLibraryId');
                                    }
                                    // else {
                                    //     x.uniqueDims = [];
                                    //     x.uniqueMeas = [];
                                    //     return [];
                                    // }
                                });
                            }
                            return sheet;
                            // else {
                            //     x.uniqueDims = [];
                            //     x.uniqueMeas = [];
                            //     return [];
                            // }
                        }))
                    })
                    .then(function(resultArray) {
                        //this is a list of all the sheets to be copied over.
                        //because we are done, we can get to unique dims, measures, and viz, then get props and add to a new object to return.
                        console.log(resultArray);
                        var uniqueDims = _.uniqBy(dims, 'qLibraryId');
                        var uniqueMeas = _.uniqBy(meas, 'qLibraryId');
                        var uniqueVizs = _.uniq(vizs);
                        x.sheets = resultArray;
                        x.uniqueDims = uniqueDims;
                        x.uniqueMeas = uniqueMeas;
                        x.uniqueVizs = uniqueVizs;
                        return;

                    })
                    .then(function() {
                        if (x.uniqueDims.length > 0) {
                            return getDimProps(x.app, x.uniqueDims);
                        } else {
                            return [];
                        }
                    })
                    .then(function(dimProps) {
                        x.dimProps = dimProps;
                        if (x.uniqueMeas.length > 0) {
                            return getMeasProps(x.app, x.uniqueMeas);
                        } else {
                            return [];
                        }

                    })
                    .then(function(measProps) {
                        x.measProps = measProps;
                        return;
                    })
                    .then(function() {
                        if (x.uniqueVizs.length > 0) {
                            return getVizProps(x.app, x.uniqueVizs);
                        } else {
                            return [];
                        }
                    })
                    .then(function(vizProps) {
                        x.vizProps = vizProps;
                        x.app.session.close();
                        logger.info("Export Complete");
                        resolve(x);
                    });

            })
            .catch(function(error) {
                logger.error(error, loggerObject);
                reject(error);
            });
    })

}



module.exports = exportSheet;

function getDimProps(app, dims) {
    return new Promise(function(resolve) {
        Promise.all(dims.map(function(dim) {
                if (dim.qLibraryId) {
                    return app.getDimension(dim.qLibraryId)
                        .then(function(item) {
                            return item.getProperties()
                                .then(function(props) {
                                    return {
                                        qInfo: props.qInfo,
                                        qDim: props.qDim,
                                        qMetaDef: props.qMetaDef
                                    };
                                })
                        })
                        .catch(function(error) {
                            console.log("No definition for library ID: " + dim.qLibraryId);
                        });
                } else {
                    console.log("No dim library item found.")
                }
            }))
            .then(function(resultArray) {
                var finalArray = resultArray.filter(function(item) {
                    return item !== undefined;
                });
                resolve(finalArray);
            });
    })

}

function getMeasProps(app, measures) {
    return new Promise(function(resolve) {
        Promise.all(measures.map(function(meas) {
                if (meas.qLibraryId) {
                    return app.getMeasure(meas.qLibraryId)
                        .then(function(item) {
                            return item.getProperties()
                                .then(function(props) {
                                    return props;
                                })
                        })
                        .catch(function(error) {
                            console.log("No definition for library ID: " + meas.qLibraryId);
                        });
                } else {
                    console.log("No measure library item found.")
                }
            }))
            .then(function(resultArray) {
                var finalArray = resultArray.filter(function(item) {
                    return item !== undefined;
                });
                resolve(finalArray);
            });
    })

}

function getVizProps(app, vizs) {
    return new Promise(function(resolve) {
        Promise.all(vizs.map(function(viz) {
                if (viz) {
                    return app.getObject(viz)
                        .then(function(item) {
                            return item.getProperties()
                                .then(function(props) {
                                    return {
                                        qInfo: props.qInfo,
                                        qMetaDef: props.qMetaDef,
                                        showTitles: props.showTitles,
                                        title: props.title,
                                        subtitle: props.subtitle,
                                        footnote: props.footnote,
                                        labels: props.labels,
                                        color: props.color,
                                        legend: props.legend,
                                        visualization: props.visualization,
                                        masterVersion: props.masterVersion,
                                        qHyperCubeDef: props.qHyperCubeDef
                                    };
                                })
                        })
                        .catch(function(error) {
                            console.log("No definition for Master Visualization ID: " + viz);
                        });
                } else {
                    console.log("No master library visualization item found.")
                }
            }))
            .then(function(resultArray) {
                var finalArray = resultArray.filter(function(item) {
                    return item !== undefined;
                });
                resolve(finalArray);
            });
    })

}