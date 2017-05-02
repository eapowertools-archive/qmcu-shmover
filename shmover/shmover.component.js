(function() {
    "use strict";
    var module = angular.module("QMCUtilities", []);

    function fetchApps($http, hostname) {
        return $http.post("./shmover/getapplist", { hostname: hostname })
            .then(function(response) {
                return response.data;
            });
    }

    function fetchSheets($http, hostname, appId) {
        var body = {
            hostname: hostname,
            appId: appId
        }
        return $http.post("./shmover/getsheetlist", body)
            .then(function(response) {
                console.log(response.data);
                return response.data;
            });
    }

    function moveSheets($http, srcHost, srcAppId, sheets, destHost, destAppId) {
        var body ={
            srcHost: srcHost,
            srcAppId: srcAppId,
            sheets: sheet,
            destHost: destHost,
            destAppId: destAppId
        }
        return $http.post("./shmover/exportimport", body)
        .then(function(response)
        {
            return response.data;
        })
    }

    function shmoverController($scope, $http) {
        var model = this;
        model.srcServer = "";
        model.srcApps = [];
        model.srcSheets = [];
        model.selectedSheets = [];
        model.destServer = "";
        model.destApps = [];
        model.destSheets = [];


        model.$onInit = function() {

        }

        model.loadSourceApps = function() {
            fetchApps($http, model.srcServer)
                .then(function(apps) {
                    return model.srcApps = apps;
                });
        }

        model.loadDestApps = function() {
            fetchApps($http, model.destServer)
                .then(function(apps) {
                    return model.destApps = apps;
                });
        }

        model.selectSrcApp = function(appId){
            model.srcSheets =[];
            fetchSheets($http,model.srcServer,appId)
            .then(function(sheets)
            {
                return model.srcSheets = sheets;
            });
        }

        model.moveIt = function(appId)
        {
            //send the sheets to move.
        }

     }

    module.component("shmoverBody", {
        transclude: true,
        templateUrl: "plugins/shmover/shmover-body.html",
        controllerAs: "model",
        controller: ["$scope", "$http", shmoverController]
    });


}());