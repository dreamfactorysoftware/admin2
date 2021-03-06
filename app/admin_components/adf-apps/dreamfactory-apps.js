'use strict';

// @TODO: Issue with updating apps is_url_external property

angular.module('dfApps', ['ngRoute', 'dfUtility', 'dfApplication', 'dfHelp', 'dfTable'])

    .constant('MOD_APPS_ROUTER_PATH', '/apps')

    .constant('MOD_APPS_ASSET_PATH', 'admin_components/adf-apps/')

    .config(['$routeProvider', 'MOD_APPS_ROUTER_PATH', 'MOD_APPS_ASSET_PATH',
        function ($routeProvider, MOD_APPS_ROUTER_PATH, MOD_APPS_ASSET_PATH) {
            $routeProvider
                .when(MOD_APPS_ROUTER_PATH, {
                    templateUrl: MOD_APPS_ASSET_PATH + 'views/main.html',
                    controller: 'AppsCtrl',
                    resolve: {
                        checkAppObj:['dfApplicationData', function (dfApplicationData) {

                            if (dfApplicationData.initInProgress) {

                                return dfApplicationData.initDeferred.promise;
                            }
                        }],

                        checkCurrentUser: ['UserDataService', '$location', '$q', function (UserDataService, $location, $q) {

                            var currentUser = UserDataService.getCurrentUser(),
                                defer = $q.defer();

                            // If there is no currentUser and we don't allow guest users
                            if (!currentUser) {

                                $location.url('/login');

                                // This will stop the route from loading anything
                                // it's caught by the global error handler in
                                // app.js
                                throw {
                                    routing: true
                                }
                            }

                            // There is a currentUser but they are not an admin
                            else if (currentUser && !currentUser.is_sys_admin) {

                                $location.url('/launchpad');

                                // This will stop the route from loading anything
                                // it's caught by the global error handler in
                                // app.js
                                throw {
                                    routing: true
                                }
                            }

                            defer.resolve();
                            return defer.promise;
                        }]
                    }
                });
        }])

    .run(['DSP_URL', '$templateCache', function (DSP_URL, $templateCache) {



    }])

    .controller('AppsCtrl', ['$scope', function($scope) {


        // Set Title in parent
        $scope.$parent.title = 'Apps';

        // Set module links
        $scope.links = [
            {
                name: 'manage-apps',
                label: 'Manage',
                path: 'manage-apps'
            },
            {
                name: 'create-app',
                label: 'Create',
                path: 'create-app'
            },
            {
                name: 'import-app',
                label: 'Import',
                path: 'import-app'
            },
            {
                name: 'app-groups',
                label: 'Groups',
                path: 'app-groups'
            }
        ];

        // Set empty section options
        $scope.emptySectionOptions = {
            title: 'You have no Apps!',
            text: 'Click the button below to get started building your first application.  You can always create new applications by clicking the tab located in the section menu to the left.',
            buttonText: 'Create An App!',
            viewLink: $scope.links[1]
        };


        $scope.$on('$destroy', function (e) {

        });
    }])

    .directive('dfAppDetails', ['MOD_APPS_ASSET_PATH', 'DSP_URL', 'UserDataService', '$location', 'dfServerInfoService', 'dfApplicationData', 'dfApplicationPrefs', 'dfNotify', 'dfObjectService', function(MOD_APPS_ASSET_PATH, DSP_URL, UserDataService, $location, dfServerInfoService, dfApplicationData, dfApplicationPrefs, dfNotify, dfObjectService) {

        return {

            restrict: 'E',
            scope: {
                appData: '=?',
                newApp: '=?'
            },
            templateUrl: MOD_APPS_ASSET_PATH + 'views/df-app-details.html',
            link: function (scope, elem, attrs) {

                var getLocalFileStorageServiceId = function () {

                    var a = dfApplicationData.getApiData('service', {type: 'Local File Storage'});

                    return  a && a.length ? a[0].id : null;
                }

                // Need to refactor into factory.
                var App = function  (appData) {

                    var _app = {
                        name: '',
                        native: true,
                        is_url_external: '0',
                        api_name: '',
                        description: '',
                        storage_service_id: getLocalFileStorageServiceId(),
                        storage_container: 'applications',
                        launch_url: '',
                        url: '',
                        roles:[]
                    };

                    appData = appData || _app;

                    return {
                        __dfUI: {
                            selected: false
                        },
                        record: angular.copy(appData),
                        recordCopy: angular.copy(appData)
                    }
                };

                // Need to refactor into factory.
                var Role = function (roleData) {

                    return {

                        __dfUI: {
                            selected: false
                        },
                        record: roleData

                    }
                }

                scope.appsPrepFunc = function(appsDataArr) {

                    var newAppsArr = [];

                    angular.forEach(appsDataArr, function(appData) {

                        var _newApp = new App(appData);

                        newAppsArr.push(_newApp);
                    });

                    return newAppsArr;
                };

                scope.rolesPrepFunc = function(rolesDataArr) {

                    var newRolesArr = [];

                    angular.forEach(rolesDataArr, function (roleData) {

                        var _newRoleObj = new Role(roleData);

                        newRolesArr.push(_newRoleObj);
                    });

                    return newRolesArr;
                };


                scope.currentServer = dfServerInfoService.currentServer();

                scope.app = null;

                scope.roles = null;

                // Radio button options
                scope.locations = [
                    {
                        label: 'File Storage',
                        value: '0'
                    },
                    {
                        label: 'Native device or remote client/desktop.',
                        value: '-1'
                    },
                    {
                        label: 'Supply a URL for the application',
                        value: '1'
                    }
                ];


                // Other data
                scope.roles = scope.rolesPrepFunc(dfApplicationData.getApiData('role'));
                scope.storageServices = dfApplicationData.getApiData('service', {type: 'Local File Storage,Remote File Storage'});
                scope.storageContainers = [];

                if (scope.newApp) {
                    scope.app = new App();
                }

                // PUBLIC API
                scope.saveApp = function () {

                    if (scope.newApp) {

                        scope._saveApp();
                    }
                    else {
                        scope._updateApp();
                    }

                };

                scope.closeApp = function () {

                    scope._closeApp();
                }


                // PRIVATE API
                scope._prepareAppData = function (record) {


                    // Collect roles that have been selected for app
                    // and add them to roles prop on app.
                    scope._addRolesToApp();

                    var _app = angular.copy(record);

                    switch (_app.record.is_url_external) {


                        case '0':

                            // prepare data to be sent to server
                            return _app.record;

                        case '-1':

                            // No need for storage service.  Make sure
                            // it's set to null
                            _app.record.storage_service_id = null;
                            _app.record.storage_container = null;

                            // no need for a launch_url
                            _app.record.launch_url = "";

                            // this is actually supposed to be a bool but
                            // we have set the radio buttons value to -1
                            // to distinguish it from a url supplied app
                            _app.record.is_url_external = 0;

                            return _app.record;

                        case '1':

                            // No need for storage service.  Make sure
                            // it's set to null
                            _app.record.storage_service_id = null;
                            _app.record.storage_container = null;

                            return _app.record

                        default:


                    }

                };

                scope._saveAppToServer = function (requestDataObj) {

                    return dfApplicationData.saveApiData('app', requestDataObj).$promise;
                };

                scope._updateAppToServer = function (requestDataObj) {

                    return dfApplicationData.updateApiData('app', requestDataObj).$promise;
                };

                scope._selectRole = function(role) {

                    role.__dfUI.selected = !role.__dfUI.selected;
                };

                scope._addRolesToApp = function () {

                    // Let's make sure we start with an empty array
                    scope.app.record.roles = [];

                    // Loop through roles
                    angular.forEach(scope.roles, function (role) {

                        // Is this a selected role
                        if (role.__dfUI.selected) {

                            // yes.  Add to array
                            scope.app.record.roles.push(role.record);
                        }
                    })
                };

                scope._resetSelectedRoles = function () {

                    angular.forEach(scope.roles, function(role) {
                        if ((role.hasOwnProperty('__dfUI') && role.__dfUI.hasOwnProperty('selected')) && role.__dfUI.selected) {
                            role.__dfUI.selected = false;
                        }
                    })
                };

                scope._resetAppDetails = function() {

                    if (scope.newApp) {
                        scope.app = new App();
                    }
                    else {

                        scope.appData = null;
                    }

                    scope._resetSelectedRoles();
                };

                scope._setExternalUrl = function(data) {

                    // If this isn't a new app and it has the 'is_url_external' property
                    if (!scope.newApp && data.hasOwnProperty('is_url_external')) {

                        // If url is not external and there is a launch url
                        // This is a hosted app
                        if (data.is_url_external == 0 && data.launch_url.length > 0) {

                            data.is_url_external = '0';
                        }

                        // If the url is external
                        // This app has a user supplied url
                        else if (data.is_url_external == 1) {

                            data.is_url_external = '1';
                        }

                        // This app is native ios/android
                        // or remote client desktop app
                        else {
                            data.is_url_external = '-1';

                        }
                    }
                }


                // COMPLEX IMPLEMENTATION
                scope._saveApp = function () {

                    // Create our request obj
                    var requestDataObj = {
                        params: {
                            fields: '*',
                            related: 'roles'
                        },
                        data: scope._prepareAppData(scope.app)
                    };

                    // send to the server
                    scope._saveAppToServer(requestDataObj).then(
                        function(result) {

                            // notify success
                            var messageOptions = {
                                module: 'Apps',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: scope.app.record.api_name + ' saved successfully.'
                            };

                            dfNotify.success(messageOptions);

                            // clean form
                            scope._resetAppDetails();

                        },

                        function(reject) {

                            var messageOptions = {
                                module: 'Api Error',
                                type: 'error',
                                provider: 'dreamfactory',
                                message: reject
                            };


                            dfNotify.error(messageOptions);
                        }
                    ).finally(
                            function() {

                                // console.log('Save App Finally')
                            }
                        )
                };

                scope._updateApp = function () {

                    // Create our request obj
                    var requestDataObj = {
                        params: {
                            fields: '*',
                            related: 'roles'
                        },
                        data: scope._prepareAppData(scope.app)
                    };

                    // send to the server
                    scope._updateAppToServer(requestDataObj).then(
                        function(result) {

                            // notify success
                            var messageOptions = {
                                module: 'Apps',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: scope.app.record.name + ' updated successfully.'
                            };

                            dfNotify.success(messageOptions);

                            scope._setExternalUrl(result);

                            scope.app = new App(result);


                            // clean form
                            // reset app
                            if (dfApplicationPrefs.getPrefs().sections.app.autoClose) {
                                scope._resetAppDetails();
                            }

                        },

                        function(reject) {

                            var messageOptions = {
                                module: 'Api Error',
                                type: 'error',
                                provider: 'dreamfactory',
                                message: reject
                            };


                            dfNotify.error(messageOptions);
                        }
                    ).finally(
                        function() {

                            // console.log('Save App Finally')
                        }
                    )
                };

                scope._closeApp = function () {


                    if (!dfObjectService.compareObjectsAsJson(scope.app.record, scope.app.recordCopy)) {

                        if (!dfNotify.confirmNoSave()) {

                            return false;
                        }
                    }
                    

                    scope._resetAppDetails();
                };


                // WATCHERS

                var watchAppStorageService = scope.$watch('app.record.storage_service_id', function(newValue, oldValue) {

                    // No new value....return
                    if (!newValue) return false;

                    var i =0;

                    scope.storageContainers = [];
                    while (i < scope.storageServices.length) {

                        if (scope.storageServices[i].id === newValue) {

                            angular.forEach(scope.storageServices[i].components, function(component) {

                                if (component !== '' && component !== '*') {

                                    scope.storageContainers.push(component)
                                }
                            })
                        }

                        i++
                    }

                    // scope._setExternalUrl(newValue);
                });

                var watchAppData = scope.$watch('appData', function (newValue, oldValue) {

                    if (!newValue) return false;

                    scope._setExternalUrl(newValue);

                    scope.app = new App(newValue);


                    angular.forEach(scope.roles, function(roleObj) {

                        var i = 0;

                        while (i < scope.app.record.roles.length) {

                            if (roleObj.record.id === scope.app.record.roles[i].id) {

                                roleObj.__dfUI.selected = true;
                            }

                            i++
                        }
                    });


                });

                // MESSAGES
                scope.$on('$destroy', function(e) {

                    watchAppStorageService();
                    watchAppData();
                });


                // HELP

                scope.dfHelp = {
                    applicationName: {
                        title: 'Application API Name',
                        text: 'This is your API KEY. It must be included with each API request as a query ' +
                            'param (app_name=yourappname) or a header (X-DreamFactory-Application-Name: yourappname).'
                    },
                    displayName: {
                        title: "Display Name",
                        text: 'The display name or label for your app, seen by users of the app in the LaunchPad UI.' +
                        ' It is usually different from the API name used in API requests.'
                    },
                    description: {
                        title: "Description",
                        text: 'The app description, seen by users of the app in the LaunchPad UI.'
                    },
                    appLocation: {
                        title: "App Location",
                        text: 'Select File Storage if you want to store your app code on your DSP or some other ' +
                            'remote file storage. Select Native for native apps or running the app ' +
                            'from code on your local machine (CORS required). Select URL to specify a URL for your app.'
                    },
                    storageService: {
                        title: "Storage Service",
                        text: 'Where to store the files for your app.'
                    },
                    storageContainer: {
                        title: "Storage Container",
                        text: 'The container on the selected storage service.'
                    },
                    defaultPath: {
                        title: "Default Path",
                        text: 'The is the file to load when your app is run. Default is index.html.'
                    },
                    remoteUrl: {
                        title: "Remote Url",
                        text: 'Applications can consist of only a URL. ' +
                            'This could be an app on some other server or a web site URL.'
                    },
                    assignRole: {
                        title: "Assigning a Role",
                        text: 'Each user who is assigned to one of the selected roles will have access to this ' +
                            'app. Go to the Roles tab to create and manage roles.'
                    }
                }
            }
        }
    }])

    .directive('dfManageApps', ['MOD_APPS_ASSET_PATH', 'dfApplicationData', 'dfApplicationPrefs', 'dfReplaceParams', 'dfNotify', '$window', function(MOD_APPS_ASSET_PATH, dfApplicationData, dfApplicationPrefs, dfReplaceParams, dfNotify, $window) {

        return {

            restrict: 'E',
            scope: false,
            templateUrl: MOD_APPS_ASSET_PATH + 'views/df-manage-apps.html',
            link: function (scope, elem, attrs) {


                var ManagedApp = function (appData) {

                    return {
                        __dfUI: {
                            selected: false
                        },
                        record: appData
                    }
                };


                scope.currentViewMode = dfApplicationPrefs.getPrefs().sections.app.manageViewMode;

                scope.apps = null;

                scope.currentEditApp = null;

                scope.fields = [
                    {
                        name: 'id',
                        label: 'Id',
                        active: true
                    },
                    {
                        name: 'api_name',
                        label: 'API Name',
                        active: true
                    },
                    {
                        name: 'name',
                        label: 'Name',
                        active: true
                    },
                    {
                        name: 'description',
                        label: 'Description',
                        active: true
                    }
                ];

                scope.order = {
                    orderBy: 'id',
                    orderByReverse: false
                };

                scope.selectedApps = [];

                scope.removeFilesOnDelete = false;



                // PUBLIC API
                scope.launchApp = function (app) {

                    scope._launchApp(app);
                };

                scope.editApp = function (app) {

                    scope._editApp(app);
                };

                scope.exportApp = function (app) {

                    scope._exportApp(app);
                };

                scope.deleteApp = function (app) {

                    // Confirm we want to delete app
                    if (dfNotify.confirm("Delete " + app.record.name + "?")) {

                        // Is this app a web app and do we have access to the file storage?
                        if (!app.record.native && app.record.storage_service_id != null) {

                            // It is.  Do we want to delete the files as well?
                            scope.removeFilesOnDelete = dfNotify.confirm('Delete application files? Pressing cancel will retain the files in storage.');
                        }
                        scope._deleteApp(app);
                    }
                };

                scope.orderOnSelect = function (fieldObj) {

                    scope._orderOnSelect(fieldObj);
                };

                scope.setSelected = function (app) {

                    scope._setSelected(app);
                };

                scope.deleteSelectedApps = function () {

                    if (dfNotify.confirm("Delete selected apps?")) {
                        scope.removeFilesOnDelete = dfNotify.confirm('Delete application files?');
                        scope._deleteSelectedApps();
                    }
                };



                // PRIVATE API
                scope._deleteFromServer = function(requestDataObj) {

                    return dfApplicationData.deleteApiData('app', requestDataObj).$promise;
                };



                // COMPLEX IMPLEMENTATION
                scope._launchApp = function (app) {

                    $window.open(dfReplaceParams(app.record.launch_url, app.record.name));
                };

                scope._editApp = function (app) {

                    scope.currentEditApp = app;
                };

                scope._exportApp = function (app) {


                };

                scope._deleteApp = function (app) {

                    var requestDataObj = {
                        params: {
                            delete_storage: scope.removeFilesOnDelete,
                            related: 'roles',
                            fields: '*'
                        },
                        data: app.record
                    };


                    scope._deleteFromServer(requestDataObj).then(
                        function(result) {

                            // notify success
                            var messageOptions = {
                                module: 'Apps',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'App successfully deleted.'
                            };

                            dfNotify.success(messageOptions);

                        },

                        function(reject) {

                            // notify success
                            var messageOptions = {
                                module: 'Api Error',
                                type: 'error',
                                provider: 'dreamfactory',
                                message: reject
                            };

                            dfNotify.success(messageOptions);

                        }
                    ).finally(
                            function() {

                                // console.log('Delete App Finally')
                            }
                        )
                };

                scope._orderOnSelect = function (fieldObj) {

                    var orderedBy = scope.order.orderBy;

                    if (orderedBy === fieldObj.name) {
                        scope.order.orderByReverse = !scope.order.orderByReverse;
                    } else {
                        scope.order.orderBy = fieldObj.name;
                        scope.order.orderByReverse = false;
                    }
                };

                scope._setSelected = function (app) {

                    var i = 0;

                    while (i < scope.selectedApps.length) {

                        if (app.record.id === scope.selectedApps[i]) {

                            app.__dfUI.selected = false;
                            scope.selectedApps.splice(i, 1);
                            return;
                        }

                        i++
                    }

                    app.__dfUI.selected = true;
                    scope.selectedApps.push(app.record.id);

                };

                scope._deleteSelectedApps = function () {

                    var requestDataObj = {
                        params: {
                            ids: scope.selectedApps.join(','),
                            fields: '*',
                            rollback: true,
                            delete_storage: scope.removeFilesOnDelete
                        }
                    };


                    scope._deleteFromServer(requestDataObj).then(

                        function(result) {

                            var messageOptions = {
                                module: 'Apps',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'Apps deleted successfully.'
                            };

                            dfNotify.success(messageOptions);

                            scope.selectedApps = [];

                            scope.$broadcast('toolbar:paginate:app:reset');
                        },

                        function(reject) {

                            var messageOptions = {
                                module: 'Api Error',
                                type: 'error',
                                provider: 'dreamfactory',
                                message: reject
                            };


                            dfNotify.error(messageOptions);
                        }
                    ).finally(
                        function() {

                            // console.log('Delete Apps Finally');
                        }
                    )
                };


                // WATCHERS
                var watchApps = scope.$watchCollection('apps', function (newValue, oldValue) {

                    if (newValue == null) {

                        var _app = [];

                        angular.forEach(dfApplicationData.getApiData('app'), function (app) {

                            if (!app.hasOwnProperty('roles') && (app.hasOwnProperty('import_url') && app.import_url != null)) {
                                app.roles = [];
                            }


                            _app.push(new ManagedApp(app));
                        });

                        scope.apps = _app;

                        return;
                    }
                });

                var watchApiData = scope.$watchCollection(function() {

                    return dfApplicationData.getApiData('app');

                }, function (newValue, oldValue) {

                    var _app = [];

                    angular.forEach(dfApplicationData.getApiData('app'), function (app) {

                        _app.push(new ManagedApp(app));
                    });

                    scope.apps = _app;
                    return;



                });


                // MESSAGES

                scope.$on('toolbar:paginate:app:update', function (e) {

                    var _apps = [];

                    angular.forEach(dfApplicationData.getApiData('app'), function (app) {


                        var _app = new ManagedApp(app);

                        var i = 0;

                        while (i < scope.selectedApps.length) {

                            if (scope.selectedApps[i] === _app.record.id) {

                                _app.__dfUI.selected = true;
                                break;
                            }

                            i++
                        }

                        _apps.push(_app);
                    });

                    scope.apps = _apps;
                });
                
                scope.$on('$destroy', function(e) {

                    // Destroy watchers
                    watchApps();
                    watchApiData();
                });
            }
        }
    }])

    .directive('dfImportApp', ['MOD_APPS_ASSET_PATH', '$http', 'dfApplicationData', 'dfNotify',  function(MOD_APPS_ASSET_PATH, $http, dfApplicationData, dfNotify) {

        return {

            restrict: 'E',
            scope: {},
            templateUrl: MOD_APPS_ASSET_PATH + 'views/df-import-app.html',
            link: function (scope, elem, attrs) {


                scope.services = dfApplicationData.getApiData('service', {type: 'Local File Storage,File Storage'});
                scope.containers = [];

                scope.appPath = null;
                scope.storageService = '';
                scope.storageContainer = '';
                scope.field = angular.element('#upload');
                scope.uploadFile = null;

                scope.sampleApps = [
                    {
                        name: 'Todo List jQuery',
                        descr: 'Learn how to authenticate and make CRUD calls to your DSP using the JavaScript SDK.',
                        url: 'https://raw.github.com/dreamfactorysoftware/app-todo-jquery/master/todojquery.dfpkg'
                    },
                    {
                        name: 'Todo List AngularJS',
                        descr: 'The Todo List app with AngularJS.',
                        url: 'https://raw.github.com/dreamfactorysoftware/app-todo-angular/master/todoangular.dfpkg'
                    },
                    {
                        name: 'Todo List Sencha',
                        descr: 'The Todo List app with Sencha Touch (phone/tablet only).',
                        url: 'https://raw.github.com/dreamfactorysoftware/app-todo-sencha/master/todosencha.dfpkg'
                    },
                    {
                        name: 'Calendar',
                        descr: 'Another sample application showing how to perform CRUD operations on your DSP.',
                        url: 'https://raw.github.com/dreamfactorysoftware/app-calendar/master/calendar.dfpkg'
                    },
                    {
                        name: 'Address Book',
                        descr: 'An address book for mobile and desktop written by Modus Create. Based on Sencha Touch and Ext JS.',
                        url: 'https://raw.github.com/dreamfactorysoftware/app-address-book/master/add_min.dfpkg'
                    }
                ]


                // PUBLIC API
                scope.submitApp = function () {

                    if (!scope.appPath) {
                        return false;
                    }

                    scope._submitApp();
                };

                scope.browseFileSystem = function () {

                    scope._resetImportApp();
                    scope.field.trigger('click');
                };

                scope.loadSampleApp = function (appObj) {

                    scope._loadSampleApp(appObj);
                };




                // PRIVATE API

                scope._isAppPathUrl = function (appPathStr) {

                    return appPathStr.substr(0, 7) === 'http://' || appPathStr.substr(0, 8) === 'https://';
                };

                scope._importAppToServer = function(requestDataObj) {

                    var _options = {
                        params:{},
                        data: requestDataObj
                    };

                    if (scope._isAppPathUrl(scope.appPath)) {
                        _options['headers'] = {
                            "Content-type" : 'application/json'
                        }
                    }
                    else {
                        _options['headers'] = {"Content-type" :  undefined};
                        $http.defaults.transformRequest = angular.identity;
                    }

                    return dfApplicationData.saveApiData('app', _options).$promise;

                };

                scope._isDFPackage = function (appPathStr) {

                    return appPathStr.substr(appPathStr.lastIndexOf('.')) === '.dfpkg'
                };

                scope._resetImportApp = function () {

                    scope.appPath = null;
                    scope.storageService = '';
                    scope.storageContainer = '';
                    scope.uploadFile = null;
                    scope.field.val('');
                }



                // COMPLEX IMPLEMENTATION
                scope._loadSampleApp = function (appObj) {

                    scope.appPath = appObj.url;
                };

                scope._submitApp = function () {

                    var requestDataObj = {};

                    if (scope._isAppPathUrl(scope.appPath)) {

                        requestDataObj = {
                            import_url: scope.appPath,
                            storage_service_id: scope.storageService.id,
                            storage_container: scope.storageContainer
                        }
                    }
                    else {

                        var fd = new FormData();

                        fd.append('files', scope.uploadFile);
                        // fd.append("files", $('input[type=file]')[0].files[0]);
                        // fd.append("text", 'asdfasdsfasdfasdf');
                        requestDataObj = fd
                    }

                    scope._importAppToServer(requestDataObj).then(

                        function(result) {

                            var messageOptions = {
                                module: 'Apps',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'App successfully imported.'
                            }

                            dfNotify.success(messageOptions);

                        },
                        function(reject) {


                            var messageOptions = {
                                module: 'Api Error',
                                type: 'error',
                                provider: 'dreamfactory',
                                message: reject
                            }

                            dfNotify.error(messageOptions);


                        }
                    )
                        .finally(
                        function(success) {

                            scope._resetImportApp();

                            $http.defaults.transformRequest = function (d, headers) {

                                if (angular.isObject(d)) {
                                    return angular.toJson(d);
                                }
                            }
                        }
                    )
                };



                // WATCHERS
                var watchStorageService = scope.$watch('storageService', function(newValue, oldValue) {

                    // No new value....return
                    if (!newValue) return false;

                    // Set som vars
                    var i = 0,
                        found = false;

                    scope.containers = [];

                    // loop through scope.storageServices
                    while (!found && i <= scope.services.length -1) {

                        // If we find one with the same id as the service we've chosen
                        // for our app
                        if (scope.services[i].id === newValue.id) {

                            // set this true to end loop
                            found = true;

                            // loop through options.
                            angular.forEach(scope.services[i].components, function(v, i) {

                                // We don't want '*' or empty string to be available
                                // as options
                                if (v !== '*' && v !== '') {
                                    scope.containers.push(v);
                                }
                            })
                        }

                        // not found.  increment counter
                        i++;
                    }
                });

                var watchUploadFile = scope.$watch('uploadFile', function (n , o) {

                    if (!n) return;

                    scope.appPath = n.name;
                })


                // MESSAGES
                scope.$on('$destroy', function (e) {
                    watchStorageService();

                });

                // HELP


                scope.dfHelp = {
                    applicationName: {
                        title: 'Application Name',
                        text: 'This is some help text that will be displayed in the help window'
                    }
                }


            }
        }
    }])

    .directive('dfAppGroups', ['MOD_APPS_ASSET_PATH', 'dfApplicationData', 'dfNotify', function (MOD_APPS_ASSET_PATH, dfApplicationData, dfNotify) {

        // @TODO: Need to notify of unsaved app groups.  This may require additional functionality in the sidebar menu directive
        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_APPS_ASSET_PATH + 'views/df-app-groups.html',
            link: function (scope, elem, attrs) {

                var App = function (appData) {

                    return {

                        __dfUI: {
                            selected: false
                        },
                        record: appData
                    }
                }

                var AppGroup = function (appGroupData) {

                    function genTempId () {
                        return Math.floor(Math.random() * 100000)
                    }

                    var _new = {
                        id: null,
                        name: 'NEW APP GROUP',
                        apps: []
                    };


                    appGroupData = appGroupData || _new;

                    return {
                        __dfUI: {
                            newAppGroup: appGroupData.id,
                            tempId: genTempId()
                        },
                        record: angular.copy(appGroupData),
                        recordCopy: angular.copy(appGroupData)
                    }
                };


                scope.appGroups = null;
                scope.apps = null;
                scope.selectedAppGroup = null;



                // PUBLIC API
                scope.addAppGroup = function () {

                    scope._addAppGroup();
                };

                scope.deleteAppGroup = function () {

                    scope._deleteAppGroup()
                };

                scope.saveAppGroup = function () {

                    var appGroup = scope.selectedAppGroup;

                    if (appGroup == null) {

                        var messageOptions = {
                            module: 'App Groups',
                            type: 'warn',
                            provider: 'dreamfactory',
                            message: 'No app group selected.'
                        };

                        dfNotify.warn(messageOptions);

                        angular.element('#select-app-group').focus();

                        return;
                    }

                    if (appGroup.record.id === null) {

                        if (appGroup.record.name === 'NEW APP GROUP') {

                            var messageOptions = {
                                module: 'App Groups',
                                type: 'warn',
                                provider: 'dreamfactory',
                                message: 'App Groups should have a unique name.  Please rename your app group to something other than the default \'new\' app group name.'
                            };

                            dfNotify.warn(messageOptions);

                            return;
                        }
                        scope._saveAppGroup(appGroup);
                    }else {

                        scope._updateAppGroup(appGroup);
                    }

                };



                // PRIVATE API
                scope._saveAppGroupToServer = function (requestDataObj) {

                    return dfApplicationData.saveApiData('app_group', requestDataObj).$promise;
                };

                scope._updateAppGroupToServer = function (requestDataObj) {

                    return dfApplicationData.updateApiData('app_group', requestDataObj).$promise;
                };

                scope._deleteAppGroupFromServer = function (requestDataObj) {

                    return dfApplicationData.deleteApiData('app_group', requestDataObj).$promise;
                };

                scope._updateAssignedApps = function (appGroup) {

                    var tempArr = [];


                    angular.forEach(scope.apps, function (managedApp) {

                        if (managedApp.__dfUI.selected) {
                            tempArr.push(managedApp.record);
                        }
                    });

                    appGroup.record.apps = tempArr;
                };

                scope._checkUnsavedAppGroups = function () {

                    var i = 0;

                    while (i < scope.apps.length) {

                        if (scope.apps[i].__dfUI.newAppGroup === null) {
                            return true;
                        }

                        i++
                    }

                    return false;
                }



                // COMPLEX IMPLEMENTATION
                scope._addAppGroup = function () {
                    scope.appGroups.push(new AppGroup());
                    scope.selectedAppGroup = scope.appGroups[scope.appGroups.length - 1];
                };

                scope._deleteAppGroup = function () {


                    // If this is a recently add/new appgroup that hasn't been saved yet.
                    if (scope.selectedAppGroup.__dfUI.newAppGroup === null) {

                        var i = 0;

                        while (i < scope.appGroups.length) {
                            if(scope.appGroups[i].__dfUI.tempId === scope.selectedAppGroup.__dfUI.tempId) {
                                scope.appGroups.splice(i, 1);
                                break;
                            }

                            i++
                        }

                        var messageOptions = {
                            module: 'App Groups',
                            type: 'success',
                            provider: 'dreamfactory',
                            message: 'App Group deleted successfully.'

                        };

                        dfNotify.success(messageOptions);

                        scope.selectedAppGroup = null;

                        return;
                    }



                    var requestDataObj = {
                        params: {
                            fields: '*',
                            related: 'apps'
                        },
                        data: scope.selectedAppGroup.record
                    };


                    scope._deleteAppGroupFromServer(requestDataObj).then(
                        function (result) {

                            var messageOptions = {
                                module: 'App Groups',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'App Group deleted successfully.'
                            };

                            dfNotify.success(messageOptions);

                            // Find where this group is in the array of app groups and
                            // remove
                            var i = 0;

                            while (i < scope.appGroups.length) {

                                if (scope.appGroups[i].record.name === result.name) {

                                    scope.appGroups.splice(i, 1);
                                }

                                i++;
                            }

                            scope.selectedAppGroup = null;

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
                    

                };

                scope._saveAppGroup = function (appGroup) {

                    scope._updateAssignedApps(appGroup);

                    var requestDataObj = {
                        params: {
                            fields: '*',
                            related: 'apps'
                        },
                        data: appGroup.record
                    };

                    scope._saveAppGroupToServer(requestDataObj).then(
                        function (result) {


                            var messageOptions = {
                                module: 'App Groups',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'App Group created successfully.'

                            };

                            dfNotify.success(messageOptions);

                            // Reinsert into the matrix.....HA!
                            // No Seriously
                            // Find where this group is in the array of app groups and
                            // replace with the new record sent back from server.
                            // also replace the selectedTemplate with the new record as well
                            var i = 0;

                            while (i < scope.appGroups.length) {

                                if (scope.appGroups[i].record.name === result.name) {

                                    var _newAppGroup = new AppGroup(result);

                                    scope.appGroups[i] = _newAppGroup;
                                    scope.selectedAppGroup = _newAppGroup;
                                }

                                i++;
                            }
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

                };

                scope._updateAppGroup = function (appGroup) {


                    scope._updateAssignedApps(appGroup);

                    var requestDataObj = {
                        params: {
                            fields: '*',
                            related: 'apps'
                        },
                        data: appGroup.record
                    };


                    scope._updateAppGroupToServer(requestDataObj).then(
                        function (result) {

                            var messageOptions = {
                                module: 'App Groups',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'App Group updated successfully.'
                            };

                            dfNotify.success(messageOptions);

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
                };



                // WATCHERS
                var watchAppGroups = scope.$watch('appGroups', function (newValue, oldValue) {


                    if (newValue === null) {

                        scope.appGroups = [];

                        angular.forEach(dfApplicationData.getApiData('app_group'), function (appGroupData) {

                            scope.appGroups.push(new AppGroup(appGroupData))


                        });
                    }
                });

                var watchApps = scope.$watch('apps', function (newValue, oldValue) {

                    if (newValue === null) {

                        scope.apps = [];

                        angular.forEach(dfApplicationData.getApiData('app'), function (appData) {

                            scope.apps.push(new App(appData));
                        })
                    }
                });

                var watchSelectedAppGroup = scope.$watch('selectedAppGroup', function (newValue, oldValue) {

                    angular.forEach(scope.apps, function (appObj) {
                        appObj.__dfUI.selected = false;
                    });

                    if (!newValue) return;

                    if (newValue.record.hasOwnProperty('apps') && newValue.record.apps.length > 0) {
                        angular.forEach(scope.apps, function(managedApp) {
                            angular.forEach(newValue.record.apps, function (app) {
                                if (managedApp.record.id === app.id) {
                                    managedApp.__dfUI.selected = true;
                                }
                            })
                        })
                    }
                });


                // HANDLE MESSAGES
                scope.$on('$destroy', function (e) {

                    watchAppGroups();
                    watchApps();
                    watchSelectedAppGroup();
                });


                scope.dfLargeHelp = {
                    appGroups: {
                        title: 'Groups Overview',
                        text: 'Applications can optionally be put into groups. The LaunchPad UI will group the available apps accordingly.'
                    }
                }

            }
        }
    }]);