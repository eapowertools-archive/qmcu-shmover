var express = require('express');
var router = express.Router();
var bodyParser = require("body-parser");
var parseUrlencoded = bodyParser.urlencoded({ extended: false });
var fs = require("fs");
var path = require("path");
var Promise = require("bluebird");

var qrsConfig = require('./lib/qrsInstance');
var qrsInteract = require("qrs-interact");
var config = require('./config/runtimeConfig');

var winston = require("winston");
require("winston-daily-rotate-file");

//set up logging
var logger = new(winston.Logger)({
    level: config.logging.logLevel,
    transports: [
        new(winston.transports.Console)(),
        new(winston.transports.DailyRotateFile)({ filename: config.logging.logPath + "qmcu-shmover.log", prepend: true })
    ]
});

logger.info("qmcu-shmover logging started");

var qrs = new qrsInteract(qrsConfig);

router.use(function(req, res, next) {
    // console.log("session cookie in use: " + sessionName[0].sessionCookieHeaderName);
    // console.log("cookie to be used: " + cookies[0]);
    if (req.proxyPath.length !== 0) {
        qrs.UpdateVirtualProxyPrefix(req.proxyPath.replace("/", ""));
    } else {
        qrs.UpdateVirtualProxyPrefix("");
    }
    qrs.UseCookie(req.sessionCookieToUse);

    next();
})

router.use('/lib', express.static(config.thisServer.pluginPath + "/shmover/lib"));
router.use('/data', express.static(config.thisServer.pluginPath + "/shmover/data"));
router.use('/output', express.static(config.thisServer.pluginPath + "/shmover/output"));


router.route("/export")
    .post(function(req, res) {
        logger.info("Starting shmover export process", { module: "shmover-routes", method: "export" });
        var body = req.body;
        //send in body.appId and body.sheetId
    });

router.route("/import")
    .post(function(req, res) {
        logger.info("Copying sheets to their new home", { module: "shmover-routes", method: "import" });
        var body = req.body;
        //send in destination app as body.appId and sheet Object information as body.sheetProps 
    })

router.route("/getapplist")
    .post(function(req, res) {
        var body = req.body;
        qrs.UpdateHostname(req.body.hostname);

        qrs.Get("app/full")
            .then(function(result) {
                res.json(result.body)
            });
    });

router.route("/getsheetlist")
    .post(function(req, res) {
        var body = req.body;
        qrs.UpdateHostname(req.body.hostname);

        qrs.Get("app/object/full?filter=objectType eq 'sheet' and app.id eq " + req.body.appId)
            .then(function(result) {
                res.json(result.body);
            });
    });

module.exports = router;