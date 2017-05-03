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
        var body = {
            srcHost: srcHost,
            srcAppId: srcAppId,
            sheets: sheets,
            destHost: destHost,
            destAppId: destAppId
        }
        return $http.post("./shmover/exportimport", body)
            .then(function(response) {
                return response.data;
            })
    }

    function resetForm($http, model) {
        model.srcServer = "";
        model.srcApps = [];
        model.srcSheets = [];
        model.selectedSheets = [];
        model.destServer = "";
        model.destApps = [];
        model.destSheets = [];
        model.selectedSrcApp = null;
        model.selectedDestApp = null;
        model.showSrcSheets = false;
        model.valSheetSelection = false;
        model.valDestAppSelected = false;
    }

    function shmoverController($scope, $http, $timeout, qmcuWindowLocationService) {
        var model = this;
        model.srcServer = "";
        model.srcApps = [];
        model.srcSheets = [];
        model.selectedSheets = [];
        model.destServer = "";
        model.destApps = [];
        model.destSheets = [];
        model.showSrcSheets = false;
        model.showDestSheets = false;
        model.valSheetSelection = false;
        model.valDestAppSelected = false;
        model.host = qmcuWindowLocationService.host;

        model.$onInit = function() {

        }

        model.loadSourceApps = function() {
            fetchApps($http, model.srcServer)
                .then(function(apps) {
                    apps.unshift({ "id": "headerRow", "name": "Select an App from the Dropdown", "showInput": true });
                    model.srcApps = apps;
                    model.selectedSrcApp = model.srcApps[0];
                    model.showSrcSheets = false;
                    model.destServer = model.srcServer;
                });
        }

        model.loadDestApps = function() {
            fetchApps($http, model.destServer)
                .then(function(apps) {
                    apps.unshift({ "id": "headerRow", "name": "Select an App from the Dropdown", "showInput": true });
                    model.destApps = apps;
                    model.selectedDestApp = model.destApps[0];
                    model.showDestSheets = false;
                });
        }

        model.selectSrcApp = function(appId) {
            model.srcSheets = [];
            if (appId == "headerRow") {
                model.showSrcSheets = false;
            } else {
                fetchSheets($http, model.srcServer, appId)
                    .then(function(sheets) {
                        model.srcSheets = sheets;
                        model.showSrcSheets = true;
                    });
            }
        }

        model.selectDestApp = function(appId) {
            model.destSheets = [];
            if (appId == "headerRow") {
                model.showDestSheets = false;
                model.valDestAppSelected = false;
            } else {
                fetchSheets($http, model.destServer, appId)
                    .then(function(sheets) {
                        model.destSheets = sheets;
                        model.showDestSheets = true;
                        model.valDestAppSelected = true;
                    });
            }
        }

        model.checkBoxSheets = function(isChecked, sheetId) {
            console.log(isChecked + ":" + sheetId);
            if (isChecked) {
                model.selectedSheets.push(sheetId);
            } else {
                var index = model.selectedSheets.indexOf(sheetId);
                model.selectedSheets.splice(index, 1);
            }
            if (model.selectedSheets.length > 0) {
                model.valSheetSelection = true;
            } else {
                model.valSheetSelection = false;
            }
        };

        model.moveIt = function() {
            //send the sheets to move.
            moveSheets($http, model.srcServer, model.selectedSrcApp.id, model.selectedSheets, model.destServer, model.selectedDestApp.id)
                .then(function(response) {
                    console.log(response);
                    $timeout(function() { resetForm($http, model) }, 3000)
                        .then(function() {
                            $scope.form.$setPristine();
                            $scope.form.$setUntouched();
                            console.log("Form Reset");
                        });
                })
        }

    }

    module.component("shmoverBody", {
        transclude: true,
        templateUrl: "plugins/shmover/shmover-body.html",
        controllerAs: "model",
        controller: ["$scope", "$http", "$timeout", "qmcuWindowLocationService", shmoverController]
    });


}());