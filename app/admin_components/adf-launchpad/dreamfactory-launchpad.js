'use strict';


angular.module('dfLaunchPad', ['ngRoute', 'dfUtility', 'dfTable'])
    .constant('MOD_LAUNCHPAD_ROUTER_PATH', '/launchpad')
    .constant('MOD_LAUNCHPAD_ASSET_PATH', 'admin_components/adf-launchpad/')
    .config(['$routeProvider', 'MOD_LAUNCHPAD_ROUTER_PATH', 'MOD_LAUNCHPAD_ASSET_PATH',
        function ($routeProvider, MOD_LAUNCHPAD_ROUTER_PATH, MOD_LAUNCHPAD_ASSET_PATH) {
            $routeProvider
                .when(MOD_LAUNCHPAD_ROUTER_PATH, {
                    templateUrl: MOD_LAUNCHPAD_ASSET_PATH + 'views/main.html',
                    controller: 'LaunchpadCtrl',
                    resolve: {}
                });
        }])
    .run(['DSP_URL', '$templateCache', function (DSP_URL, $templateCache) {


    }])
    .controller('LaunchpadCtrl', ['$scope', 'UserDataService', 'SystemConfigDataService', function($scope, UserDataService, SystemConfigDataService) {

        $scope.apps = [];
        $scope.noAppsMsg = false;
        $scope.onlyNoGroupApps = false;


        $scope.$watch(function() {return UserDataService.getCurrentUser()}, function (newValue, oldValue) {

            if (!newValue) return;

            $scope.apps = [];


            if (newValue.hasOwnProperty('app_groups')) {

                angular.forEach(newValue.app_groups, function (appGroup) {

                    if (appGroup.apps.length) {

                        angular.forEach(appGroup.apps, function (app, index) {
                            if (!app.launch_url) {
                                appGroup.apps.splice(index, 1);
                            }
                        });

                        $scope.apps.push(appGroup)
                    }
                })
            }

            if (newValue.hasOwnProperty('no_group_apps') && newValue.no_group_apps.length > 0) {

                $scope.onlyNoGroupApps = $scope.apps.length === 0;

                var temp = [];

                angular.forEach(newValue.no_group_apps, function (app, index) {
                    if (app.launch_url) {
                        temp.push(app);
                    }
                });


                if ($scope.onlyNoGroupApps) {
                    $scope.apps = temp
                }
                else {
                    $scope.apps.push({name: 'Your Apps', id:'000', apps: temp});
                }
            }


            $scope.noAppsMsg = $scope.apps.length === 0

        }, true)
    }])

    .directive('dfAppGroup', ['MOD_LAUNCHPAD_ASSET_PATH', function (MOD_LAUNCHPAD_ASSET_PATH) {


        return {
            restrict: 'E',
            scope: {
                appGroup: '='
            },
            replace: true,
            templateUrl: MOD_LAUNCHPAD_ASSET_PATH + 'views/df-app-group.html',
            link: function(scope, elem, attrs) {

            }
        }
    }])

    .directive('dfApp', ['MOD_LAUNCHPAD_ASSET_PATH', '$window', function (MOD_LAUNCHPAD_ASSET_PATH, $window) {

        return {
            restrict: 'E',
            scope: {
                app: '='
            },
            replace: true,
            templateUrl: MOD_LAUNCHPAD_ASSET_PATH + 'views/df-app.html',
            link: function(scope, elem, attrs) {


                scope.launchApp = function (app) {

                    scope._launchApp(app);
                };

                scope._launchApp = function (app) {

                    $window.open(app.launch_url);
                };
            }
        }
    }]);


