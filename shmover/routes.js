var express = require('express');
var bodyParser = require("body-parser");
var parseUrlencoded = bodyParser.urlencoded({ extended: false });
var fs = require("fs");
var path = require("path");
var Promise = require("bluebird");
var qrsInteract = require("qrs-interact");
var config = require('./config');
var exportImport = require("./lib/main");

var socket = require('socket.io-client')('https://localhost:9945', {
    secure: true,
    reconnect: true
});

var router = express.Router();


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

var qrsConfig;

if (!config.thisServer.devMode) {
    qrsConfig = {
        hostname: config.qrs.hostname,
        localCertPath: config.qrs.localCertPath,
        headers: {
            "Cookie": "",
            "Content-Type": "application/json"
        }
    };
} else {
    qrsConfig = {
        hostname: config.qrs.hostname,
        localCertPath: config.qrs.localCertPath
    };
}

var qrs = new qrsInteract(qrsConfig);

if (!config.thisServer.devMode) {
    router.use(function(req, res, next) {
        // console.log("session cookie in use: " + sessionName[0].sessionCookieHeaderName);
        // console.log("cookie to be used: " + cookies[0]);
        if (req.proxyPath.length !== 0) {
            qrs.UpdateVirtualProxyPrefix(req.proxyPath.replace("/", ""));
        }
        qrs.UseCookie(req.sessionCookieToUse);

        next();
    })
}

router.use('/lib', express.static(config.thisServer.pluginPath + "/shmover/lib"));
router.use('/data', express.static(config.thisServer.pluginPath + "/shmover/data"));
router.use('/output', express.static(config.thisServer.pluginPath + "/shmover/output"));



router.route("/exportimport")
    .post(function(req, res) {
        var body = req.body;
        // var stuff = 
        // {
        //     srcHost: body.srcHost,
        //     srcAppId: body.srcAppId,
        //     sheets:body.sheets,
        //     destHost: body.destHost,
        //     destAppId: body.destAppId
        // }

        socket.emit("shmover", "Commencing sheet export process");
        socket.emit("shmover", "Duplicating sheets from " + body.srcAppId + " on " + body.srcHost + " to " + body.destAppId + " on " + body.destHost);

        exportImport(body.srcHost, body.srcAppId, body.sheets, body.destHost, body.destAppId)
            .then(function(response) {
                socket.emit("shmover", "Sheet Mover processing complete.");
                res.json(response);
            })
            .catch(function(error) {
                socket.emit("shmover", "An error occurred with Sheet Mover: " + error.stack);
                res.status(400).json(error);
            })
    })

router.route("/getapplist")
    .post(function(req, res) {
        var body = req.body;
        qrs.UpdateHostname(req.body.hostname);
        console.log("Getting Applist");
        socket.emit("shmover", "getting applist");
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