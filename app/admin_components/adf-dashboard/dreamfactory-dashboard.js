'use strict';

// Declare our new module
angular.module('dfDashboard', ['dfUtility'])

    // Set a constant so we can access the 'local' path of our assets
    .constant('MOD_DASHBOARD_ASSET_PATH', 'admin_components/adf-dashboard/')
//    .constant('MOD_DASHBOARD_ROUTER_PATH', '/dashboard')
    .constant('MOD_DASHBOARD_ROUTER_PATH', '/quickstart')
    .config(['$routeProvider', 'MOD_DASHBOARD_ROUTER_PATH', 'MOD_DASHBOARD_ASSET_PATH',
        function ($routeProvider, MOD_DASHBOARD_ROUTER_PATH, MOD_DASHBOARD_ASSET_PATH) {
            $routeProvider
                .when(MOD_DASHBOARD_ROUTER_PATH, {
                    templateUrl: MOD_DASHBOARD_ASSET_PATH + 'views/main.html',
                    controller: 'DashboardCtrl',
                    resolve: {
                        checkCurrentUser: ['UserDataService', '$location', function (UserDataService, $location) {

                            var currentUser = UserDataService.getCurrentUser();


                            // If there is no currentUser and we don't allow guest users
                            if (!currentUser) {
                                $location.url('/login')
                            }

                            // There is a currentUser but they are not an admin
                            else if (currentUser && !currentUser.is_sys_admin) {

                                $location.url('/launchpad')
                            }
                        }]
                    }
                });
        }])

    .run(['DSP_URL', '$http', function (DSP_URL, $http) {

    }])

    .controller('DashboardCtrl', ['$scope', function($scope) {


        $scope.$parent.title = 'Quickstart';
//        $scope.$parent.title = 'Dashboard';

        // Set module links
        $scope.links = [
            {
                name: 'quick-start',
                label: 'QuickStart',
                path: 'quick-start'
            }
//            {
//                name: 'dashboard-home',
//                label: 'Home',
//                path: 'dashboard-home'
//            },
//            {
//                name: 'about',
//                label: 'About',
//                path: 'about'
//            }
//            {
//                name: 'usage',
//                label: 'Usage',
//                path: 'usage'
//            }
        ];

    }])

    .directive('dfDashboardHome', ['MOD_DASHBOARD_ASSET_PATH', function (MOD_DASHBOARD_ASSET_PATH) {


        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_DASHBOARD_ASSET_PATH + 'views/df-dashboard-home.html',
            link: function (scope, elem, attrs) {



            }
        }
    }])

    .directive('dfQuickStart', ['MOD_DASHBOARD_ASSET_PATH', 'dfApplicationData', 'dfNotify', function (MOD_DASHBOARD_ASSET_PATH, dfApplicationData, dfNotify) {


        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_DASHBOARD_ASSET_PATH + 'views/df-quick-start.html',
            link: function (scope, elem, attrs) {


                var App = function  (appData) {

                    var _app = {
                        name: '',
                        native: false,
                        is_url_external: '0',
                        api_name: '',
                        description: '',
                        storage_service_id: null,
                        storage_container: 'applications',
                        launch_url: '',
                        roles:[]
                    };

                    appData = appData || _app;

                    return {
                        __dfUI: {
                            selected: false,
                            devLocal: null
                        },
                        record: angular.copy(appData),
                        recordCopy: angular.copy(appData)
                    }
                };


                scope.step = 1;

                scope.app = new App();

                scope.storageServices = dfApplicationData.getApiData('service', {type: 'Local File Storage,File Storage'});
                scope.storageContainers = [];



                scope.setStep = function (step) {

                   scope._setStep(step);
                };



                scope._saveAppToServer = function (requestDataObj) {

                    return dfApplicationData.saveApiData('app', requestDataObj).$promise;
                };

                scope._prepareAppData = function (record) {

                    var _app = angular.copy(record);

                    if (_app.record.native) {

                        // No need for storage service.  Make sure
                        // it's set to null
                        _app.record.storage_service_id = null;
                        _app.record.storage_container = null;

                        // we take care of the app name for the user
                        _app.record.name = _app.record.api_name;

                        // no need for a launch_url
                        _app.record.launch_url = "";

                        // this is actually supposed to be a bool but
                        // we have set the radio buttons value to -1
                        // to distinguish it from a url supplied app
                        _app.record.is_url_external = 0;

                        // prepare data to be sent to server
                        return _app.record;
                    }
                    else {

                        if (_app.__dfUI.devLocal == 1) {

                            // No need for storage service.  Make sure
                            // it's set to null
                            _app.record.storage_service_id = null;
                            _app.record.storage_container = null;

                        }
                        else {

                            angular.forEach(scope.storageServices, function (service) {

                                if (service.type === 'Local File Storage') {
                                    _app.record.storage_service_id = service.id
                                }
                                else {

                                    var messageOptions = {
                                        module: 'Quickstart Error',
                                        type: 'error',
                                        provider: 'dreamfactory',
                                        message: 'No local file storage service found.'
                                    }

                                    dfNotify.error(messageOptions);
                                }
                            });

                            _app.record.storage_container = 'applications';
                        }

                        _app.record.is_url_external = false;

                        // we take care of the app name for the user
                        _app.record.name = _app.record.api_name;


                        return _app.record;
                    }
                };

                scope._createApp = function (stepOnSuccess) {

                    // Create our request obj
                    var requestDataObj = {
                        params: {
                            fields: '*',
                            related: 'roles'
                        },
                        data: scope._prepareAppData(scope.app)
                    };


                    scope._saveAppToServer(requestDataObj).then(
                        function (result) {

                            // notify success
                            var messageOptions = {
                                module: 'Apps',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: scope.app.record.api_name + ' saved successfully.'
                            };

                            dfNotify.success(messageOptions);

                            scope.app = new App (result);

                            if (!scope.app.record.is_url_external && !scope.app.record.storage_service_id) {
                                scope.app.record['native'] = true;
                            }

                            scope.step = stepOnSuccess;
                        },
                        function (reject) {

                            var messageOptions = {
                                module: 'Api Error',
                                type: 'error',
                                provider: 'dreamfactory',
                                message: reject
                            };

                            dfNotify.error(messageOptions);

                        }
                    )
                }

                scope._setStep = function (step) {

                    // Do they want a native ios or android app
                    if ( step == 2 && scope.app.record.native === 1) {

                        scope._createApp(4);
                        return;

                    }
                    else if (step == 3 && scope.app.record.native == 0) {

                        scope._createApp(4);
                        return;
                    }


                    scope.step = step;
                }

            }
        }
    }])

    .directive('dfAbout', ['MOD_DASHBOARD_ASSET_PATH', function (MOD_DASHBOARD_ASSET_PATH) {


        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_DASHBOARD_ASSET_PATH + 'views/df-about.html',
            link: function (scope, elem, attrs) {
            }
        }
    }])

    .directive('dfUsage', ['MOD_DASHBOARD_ASSET_PATH', function (MOD_DASHBOARD_ASSET_PATH) {


        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_DASHBOARD_ASSET_PATH + 'views/df-usage.html',
            link: function (scope, elem, attrs) {
            }
        }
    }]);

