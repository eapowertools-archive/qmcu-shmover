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

function exportSheet(hostname, appId, sheetId) {
    return new Promise(function(resolve, reject) {
        var x = {};
        logger.info("appId:" + appId);
        logger.info("sheetId:" + sheetId);
        config = extend(true, config, {
            engine: {
                hostname: hostname
            }
        });
        return enigma.getService('qix', enigmaInstance(config))
            .then(function(qix) {
                logger.info("Connected to QIX.", loggerObject);
                return qix.global.openDoc(appId, '', '', '', true)
                    .then(function(app) {
                        x.appId = appId;
                        x.sheetId = sheetId;
                        x.app = app;
                        logger.info("app opened")
                        return serializeSheet(app, "sheet");
                    })
                    .then(function(sheetArray) {
                        // console.log(sheetArray[0]);
                        var sheetResult = sheetArray.filter(function(sheet) {
                                return sheet.qProperty.qInfo.qId === sheetId;
                            })
                            //console.log(JSON.stringify(sheetResult));
                        x.sheet = sheetResult[0];
                        return sheetResult[0];
                    })
                    .then(function(sheet) {
                        var sheetObjects = sheet.qChildren;
                        var dims = [];
                        var meas = [];
                        sheetObjects.forEach(function(object) {
                            dims = dims.concat(object.qProperty.qHyperCubeDef.qDimensions);
                            meas = meas.concat(object.qProperty.qHyperCubeDef.qMeasures);
                        });
                        //make unique
                        x.uniqueDims = _.uniqBy(dims, 'qLibraryId');
                        x.uniqueMeas = _.uniqBy(meas, 'qLibraryId');
                        return getDimProps(x.app, x.uniqueDims);
                    })
                    .then(function(dimProps) {
                        x.dimProps = dimProps;
                        return getMeasProps(x.app, x.uniqueMeas);

                    })
                    .then(function(measProps) {
                        x.measProps = measProps;
                        logger.info("Export Complete");
                        x.app.session.close();
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