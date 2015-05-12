'use strict';


angular.module('dfServices', ['ngRoute', 'dfUtility', 'dfServiceTemplates', 'dfSwaggerEditor'])
    .constant('MOD_SERVICES_ROUTER_PATH', '/services')
    .constant('MOD_SERVICES_ASSET_PATH', 'admin_components/adf-services/')
    .config(['$routeProvider', 'MOD_SERVICES_ROUTER_PATH', 'MOD_SERVICES_ASSET_PATH',
        function ($routeProvider, MOD_SERVICES_ROUTER_PATH, MOD_SERVICES_ASSET_PATH) {
            $routeProvider
                .when(MOD_SERVICES_ROUTER_PATH, {
                    templateUrl: MOD_SERVICES_ASSET_PATH + 'views/main.html',
                    controller: 'ServicesCtrl',
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

                                throw {
                                    routing: true
                                }
                            }

                            // There is a currentUser but they are not an admin
                            else if (currentUser && !currentUser.is_sys_admin) {

                                $location.url('/launchpad');

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
    .controller('ServicesCtrl', ['$scope', function($scope) {

        $scope.$parent.title = 'Services';

        // Set module links
        $scope.links = [
            {
                name: 'manage-services',
                label: 'Manage',
                path: 'manage-services'
            },
            {
                name: 'create-service',
                label: 'Create',
                path: 'create-service'
            }
        ];

        // Set empty section options
        $scope.emptySectionOptions = {
            title: 'You have no Services!',
            text: 'Click the button below to get started building your first Service.  You can always create new services by clicking the "Create" tab located in the section menu to the left.',
            buttonText: 'Create An App!',
            viewLink: $scope.links[1]
        };

    }])
    .directive('dfServiceDetails', ['MOD_SERVICES_ASSET_PATH', '$q', 'dfApplicationData', 'dfNotify', 'dfObjectService', 'dfApplicationPrefs', 'dfServiceValues', function(MOD_SERVICES_ASSET_PATH, $q, dfApplicationData, dfNotify, dfObjectService, dfApplicationPrefs, dfServiceValues) {

        return {

            restrict: 'E',
            scope: {
                serviceData: '=?',
                newService: '=?'
            },
            templateUrl: MOD_SERVICES_ASSET_PATH + 'views/df-service-details.html',
            link: function(scope, elem, attrs) {

                var Service = function(serviceData) {

                    var newService = {
                        "id": null,
                        "name": '',
                        "api_name": '',
                        "description": '',
                        "is_active": true,
                        "type": "Remote Web Service",
                        "type_id": null,
                        "is_system": false,
                        "storage_type": null,
                        "storage_type_id": null,
                        "credentials": {},
                        "native_format": null,
                        "native_format_id": null,
                        "dsn": null,
                        "base_url": null,
                        "parameters": [],
                        "headers": [],
                        "docs": [
                            {
                                content: {
                                    "resourcePath": "/{api_name}",
                                        "produces": [
                                        "application/json",
                                        "application/xml"
                                    ],
                                        "consumes": [
                                        "application/json",
                                        "application/xml"
                                    ],
                                        "apis": [],
                                        "models": {}
                                },
                                format: 0
                            }
                        ]
                    };

                    serviceData = serviceData || newService;

                    return {
                        __dfUI: {
                            selected: false
                        },
                        record: angular.copy(serviceData),
                        recordCopy: angular.copy(serviceData)
                    }
                };

                scope.service = null;

                // Is this going to be a new Service
                if (scope.newService) {
                    scope.service = new Service();
                }



                // Other Data


                // PUBLIC API
                scope.saveService = function() {

                    if (scope.newService) {

                        scope._saveService();
                    }
                    else {

                        scope._updateService();
                    }
                };

                scope.deleteService = function () {

                    scope._deleteService();
                };

                scope.closeService = function() {

                    scope._closeService();
                };


                // PRIVATE API
                scope._saveServiceToServer = function (requestDataObj) {

                    return dfApplicationData.saveApiData('service', requestDataObj).$promise;
                };

                scope._updateServiceToServer = function (requestDataObj) {

                    return dfApplicationData.updateApiData('service', requestDataObj).$promise;
                };

                scope._deleteServiceFromServer = function (requestDataObj) {

                    return dfApplicationData.deleteApiData('service', requestDataObj).$promise;
                };

                scope._prepareServiceData = function () {

                    scope._prepareServiceInfoData();
                    scope._prepareServiceParamsData();
                    scope._prepareServiceHeadersData();

                    if (scope.service.record.type === 'Remote File Storage' || scope.service.record.type === 'Local File Storage') {

                        scope._prepareServicePrivateData();
                    }

                    if (scope.service.record.type !== 'Remote Web Service') {

                        delete scope.service.record.docs;
                        delete scope.service.recordCopy.docs;

                    }
                    else {
                        scope._prepareServiceDefinitionData();
                    }

                    if (scope.service.record.type === 'NoSQL DB') {
                        scope._prepareServiceNoSQLData();
                    }
                };

                scope._trimRequestDataObj = function (requestObj) {
                    if (requestObj.data.credentials.hasOwnProperty('options_ctrl'))
                        delete requestObj.data.credentials.options_ctrl;

                    return requestObj;
                }

                scope._restoreRequestDataObj = function (requestObj) {
                    if (!requestObj.credentials.hasOwnProperty('options'))
                        return requestObj;

                    if (requestObj.credentials.options.hasOwnProperty('ssl'))
                        requestObj.credentials.options_ctrl = true;
                    else
                        requestObj.credentials.options_ctrl = false;

                    scope._storageType = requestObj.credentials;

                    return requestObj;
                }

                scope._resetServiceDetails = function () {


                    if (scope.newService) {

                        scope.service = new Service();
                    }
                    else {

                        scope.serviceData = null;
                    }



                    // reset tabs
                    angular.element('#info-tab').trigger('click');

                };


                // COMPLEX IMPLEMENTATION
                scope._saveService = function () {

                    scope._prepareServiceData();


                    var requestDataObj = {
                        params:{
                            fields: '*',
                            related: 'docs'
                        },
                        data: scope.service.record
                    };

                    requestDataObj = scope._trimRequestDataObj(requestDataObj);

                    scope._saveServiceToServer(requestDataObj).then(
                        function(result) {

                            var messageOptions = {
                                module: 'Services',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'Service saved successfully.'

                            };

                            scope.service = new Service(result);
                            dfNotify.success(messageOptions);


                            // clean form
                            scope._resetServiceDetails();
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

                            // console.log('Save Services finally')
                        }
                    );
                };

                scope._updateService = function () {

                    scope._prepareServiceData();


                    var requestDataObj = {
                        params:{
                            fields: '*',
                            related: 'docs'
                        },
                        data: scope.service.record
                    };

                    requestDataObj = scope._trimRequestDataObj(requestDataObj);

                    scope._updateServiceToServer(requestDataObj).then(
                        function(result) {


                            var messageOptions = {
                                module: 'Services',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'Service updated successfully.'

                            };

                            result = scope._restoreRequestDataObj(result);

                            dfNotify.success(messageOptions);
                            scope.service = new Service(result);

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

                            // console.log('Update Service finally')
                        }
                    );


                    if (dfApplicationPrefs.getPrefs().sections.service.autoClose) {
                        scope._resetServiceDetails();
                    }
                };

                scope._deleteService = function () {

                    var requestDataObj = {
                        params: {},
                        data: scope.service.record
                    };


                    scope._deleteServiceFromServer(requestDataObj).then(
                        function(result) {

                            // notify success
                            var messageOptions = {
                                module: 'Services',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'Service successfully deleted.'
                            };

                            dfNotify.success(messageOptions);

                            scope.service = null;

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

                            // console.log('Delete Service Finally')
                        }
                    )

                };

                scope._closeService = function () {

                    scope._prepareServiceData();

                    if (!dfObjectService.compareObjectsAsJson(scope.service.record, scope.service.recordCopy)) {

                        if (!dfNotify.confirmNoSave()) {

                            return false;
                        }
                    }


                    scope._resetServiceDetails();
                };


                // WATCHERS
                var watchData = scope.$watch('serviceData', function(newValue, oldValue) {

                    // No data.  Return
                    if (!newValue) return false;

                    // We're creating a service.  The default is a Remote Web Service
                    // The Service obj is already set to create one of these so Return
                    if (scope.newService) return false;

                    // We have passed in data from an existing service.  Let's create
                    // a new Service obj from that data.
                    scope.service = new Service(newValue);

                });


                // MESSAGES
                scope.$on('$destroy', function(e) {
                    watchData();
                });


                // HELP
                scope.dfHelp = {
                    createService: {
                        title: 'Create Service Information',
                        text: 'Create Service information help text'
                    }
                };


                scope.dfLargeHelp = {

                    basic: {
                        title: 'Services Overview',
                        text: 'Services are where you set up REST API connections to databases, file storage, email, and remote web services.'
                    },
                    parameters: {
                        title: 'Parameters Overview',
                        text: 'Specify any required parameters below.'
                    },
                    headers: {
                        title: 'Headers Overview',
                        text: 'Specify any required headers below.'
                    },
                    privates: {
                        title: 'Private Files and Folders Overview',
                        text: 'Manage private folders and files below.'
                    },
                    serviceDef: {
                        title: 'Service Definition Overview',
                        text: 'Specify the definition of the service below. Refer to the <a target="_blank" href="https://github.com/swagger-api/swagger-spec/blob/master/versions/1.2.md" title="Link to Swagger">Swagger docs</a> for examples.'
                    }
                }
            }
        }
    }])
    .directive('dfServiceInfo', ['MOD_SERVICES_ASSET_PATH', 'dfServiceValues', 'dfObjectService', 'dfStorageTypeFactory', '$compile', '$templateCache', function(MOD_SERVICES_ASSET_PATH, dfServiceValues, dfObjectService, dfStorageTypeFactory, $compile, $templateCache) {


        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_SERVICES_ASSET_PATH + 'views/df-service-info.html',
            link: function(scope, elem, attrs) {


                // @TODO: Refactor to factory
                var ServiceInfo = function (serviceInfoData) {

                    var _new = {
                        "name": null,
                        "api_name": null,
                        "description": null,
                        "is_active": true,
                        "type": "Remote Web Service",
                        "type_id": null,
                        "is_system": false,
                        "storage_type": null,
                        "storage_type_id": null,
                        "credentials": {},
                        "native_format": null,
                        "native_format_id": null,
                        "dsn": null,
                        "base_url": null
                    };

                    var data = angular.copy(serviceInfoData) || _new;


                    // Delete props we don't need here
                    delete data['parameters'];
                    delete data['headers'];
                    delete data['components'];

                    return {
                        __dfUI: {},
                        record: data,
                        recordCopy: angular.copy(data)
                    }
                };

                scope.hcv = new dfServiceValues();

                if (scope.newService) {
                    scope.hcv.serviceTypes = scope.hcv.serviceTypes
                        .filter(function (el) {
                            return el.name !== "local_sql_db";
                        });
                }

                scope._script = {};
                scope.serviceInfo = {};
                scope._storageType = {};
                scope.tabs = {
                    parameters: true,
                    headers: true,
                    privates: true,
                    serviceDef: true
                };



                scope.sql_server_host_identifier = null;
                scope.sql_server_db_identifier = null;


                scope._buildFieldSet = function(fieldSetArray, append) {

                    var addFields = null;

                    if (!append) {
                        elem.html('');
                    }
                    else {

                        addFields = angular.element('#additionalFields');

                        if (addFields.length) {

                            addFields.html('');
                        } else {

                            elem.append('<div id="additionalFields"></div>');
                            addFields = angular.element('#additionalFields');
                        }
                    }

                    if (!fieldSetArray) {
                        return;
                    }

                    angular.forEach(fieldSetArray, function(fieldName) {

                        if (!append) {

                            elem.append($compile($templateCache.get('_service-' + fieldName + '.html'))(scope));
                        }
                        else {

                            addFields.append($compile($templateCache.get('_service-' + fieldName + '.html'))(scope));
                        }
                    });
                };


                scope._prepareServiceNoSQLData = function () {

                    if ( scope.service.record.storage_type === 'mongodb') {
                        if ( scope.service.record.credentials.options_ctrl === true) {
                            scope.service.record.credentials.options = {ssl:true};
                        }
                        else {
                            scope.service.record.credentials.options = {};
                        }
                    }
                }

                scope._prepareServiceInfoData = function () {

                    var data = null;

                    switch(scope.serviceInfo.record.type) {

                        case 'Email Service':
                            data = scope._prepareEmailData();
                            break;

                        case 'Remote File Storage':
                            data = scope._prepareRFS();
                            break;

                        case 'Salesforce':
                            data = scope._prepareSF();
                            break;

                        case 'NoSQL DB':
                            data = scope._prepareNoSQL();
                            break;

                        case 'Local File Storage':
                            data = scope._prepareLFS();
                            break;

                        case 'Remote SQL DB':
                            data = scope._prepareRSQLDB();
                            break;

                        case 'Local SQL DB':
                            data = scope._prepareLSQLDB();
                            break;

                        case 'Remote Web Service':
                            data = scope._prepareRWS();
                            break;

                        case 'Push Service':
                            data = scope._preparePS();
                            break;
                    }

                    scope.serviceInfo.record.credentials = data;//dfObjectService.mergeObjects(scope.serviceInfo.record.credentials, data);
                    scope.service.record = dfObjectService.mergeObjects(scope.serviceInfo.record, scope.service.record);
                };
                
                scope._prepareRWS = function() {
                    
                    return scope._storageType;
                };
                
                scope._prepareEmailData = function () {

                    scope._storageType['user'] = scope.serviceInfo.record.credentials.user;
                    scope._storageType['password'] = scope.serviceInfo.record.credentials.password;

                    return scope._storageType;
                };

                scope._prepareRFS = function () {

                    switch ( scope.serviceInfo.record.storage_type ) {
                        case "aws s3":
                            // nothing to do
                            break;
                        case "azure blob":
                            delete scope._storageType.PartitionKey
                            break;
                        case "rackspace cloudfiles":
                        case "openstack object storage":
                            // nothing to do
                            break;
                    }
                    return scope._storageType;
                };

                scope._prepareSF = function () {

                    return scope._storageType;
                }

                scope._prepareNoSQL = function () {

                    switch ( scope.serviceInfo.record.storage_type ) {
                        case "aws dynamodb":
                        case "aws simpledb":
                        case "azure tables":
                            var temp = angular.copy(scope._storageType);
                            if (temp.hasOwnProperty('private_paths')) {
                                delete temp.private_paths
                            }
                            return temp;
                        case "couchdb":
                        case "mongodb":
                            return scope._storageType;
                    }
                }

                scope._prepareRSQLDB = function () {

                    return {
                        dsn: scope._storageType.dsn,
                        user: scope._storageType.user,
                        pwd: scope._storageType.pwd
                    };
                };

                scope._prepareLFS = function () {

                    return scope._storageType;
                }

                scope._prepareLSQLDB = function () {

                    // @TODO: Ask lee about returning creds for local sql db
                    // return scope._storageType;
                    return null;
                };

                scope._preparePS = function () {

                    return scope._storageType;
                }

                scope._dsnToFields = function (dsn) {


                    function nth_ocurrence(str, needle, nth) {

                        for (var i=0;i<str.length;i++) {
                            if (str.charAt(i) == needle) {
                                if (!--nth) {
                                    return i;
                                }
                            }
                        }
                        return false;
                    }


                    dsn = dsn || scope._storageType.dsn;

                    if (!dsn) return;

                    scope._storageType['prefix'] = dsn.slice(0, dsn.indexOf(":"));

                    switch(scope._storageType.prefix) {

                        case 'oci':
                            scope.sql_server_host_identifier = "host";
                            scope.sql_server_db_identifier = "sid";


                            scope._storageType['host'] = dsn.slice(dsn.lastIndexOf(scope.sql_server_host_identifier), nth_ocurrence(dsn, ')', 2)).split("=")[1];
                            scope._storageType['dbname'] = dsn.slice(dsn.lastIndexOf(scope.sql_server_db_identifier), nth_ocurrence(dsn, ')', 6)).split("=")[1];
                            break;


                        case 'ibm':
                            scope.sql_server_host_identifier = "HOSTNAME";
                            scope.sql_server_db_identifier = "DATABASE";

                            scope._storageType['host'] = dsn.slice(dsn.lastIndexOf(scope.sql_server_host_identifier), nth_ocurrence(dsn, ';', 3)).split("=")[1];
                            scope._storageType['dbname'] = dsn.slice(dsn.lastIndexOf(scope.sql_server_db_identifier), nth_ocurrence(dsn, ';', 2)).split("=")[1];
                            break;

                        case 'sqlsrv':

                            // set the host/db identifiers
                            scope.sql_server_host_identifier = "Server";
                            scope.sql_server_db_identifier = "Database";


                        default:

                            scope.sql_server_host_identifier = "host";
                            scope.sql_server_db_identifier = "dbname";

                            scope._storageType['host'] = dsn.slice(dsn.lastIndexOf(scope.sql_server_host_identifier), dsn.indexOf(";")).split("=")[1];


                            if (dsn.indexOf('port=') > dsn.indexOf(scope.sql_server_db_identifier)) {
                                scope._storageType['dbname'] = dsn.slice(dsn.lastIndexOf(scope.sql_server_db_identifier), nth_ocurrence(dsn, ';', 2)).split("=")[1];

                            }
                            else if (dsn.indexOf('port=') > dsn.indexOf(scope.sql_server_db_identifier)){
                                scope._storageType['dbname'] = dsn.slice(dsn.lastIndexOf(scope.sql_server_db_identifier), dsn.length).split("=")[1];
                            }

                    }
                };

                scope._updateDsn = function () {

                    var string = '';
                        

                    switch (scope._storageType.prefix) {

                        case 'sqlsrv':

                            // set the host/db identifiers
                            scope.sql_server_host_identifier = "Server";
                            scope.sql_server_db_identifier = "Database";

                            if (scope._storageType.prefix) string += scope._storageType.prefix + ':';

                            string += scope.sql_server_host_identifier + '=' + scope._storageType.host + ';';
                            string += scope.sql_server_db_identifier + '=' + scope._storageType.dbname;

                            break;

                        case 'oci':
                            scope.sql_server_host_identifier = "host";
                            scope.sql_server_db_identifier = "sid";

                            if (scope._storageType.prefix) string += scope._storageType.prefix + ':';

                            string += "dbname=(DESCRIPTION = (ADDRESS_LIST = (ADDRESS = (PROTOCOL = TCP)(" + scope.sql_server_host_identifier + '=' + scope._storageType.host + ")(PORT = 1521))) (CONNECT_DATA = (" + scope.sql_server_db_identifier + "=" + scope._storageType.dbname + ")))"

                            break;

                        case 'ibm':
                            scope.sql_server_host_identifier = "HOSTNAME";
                            scope.sql_server_db_identifier = "DATABASE";

                            if (scope._storageType.prefix) string += scope._storageType.prefix + ':';

                            string += "DRIVER={IBM DB2 ODBC DRIVER};" + scope.sql_server_db_identifier + "=" + scope._storageType.dbname + ";" + scope.sql_server_host_identifier + "=" + scope._storageType.host + ";PORT=50000;PROTOCOL=TCPIP;";

                            break;

                        default:
                            scope.sql_server_host_identifier = "host";
                            scope.sql_server_db_identifier = "dbname";

                            if (scope._storageType.prefix) string += scope._storageType.prefix + ':';

                            string += scope.sql_server_host_identifier + '=' + scope._storageType.host + ';';
                            string += scope.sql_server_db_identifier + '=' + scope._storageType.dbname;
                    }


                    scope._storageType.dsn = string;
                };

                scope._fieldsToDsn = function () {

                    return scope._storageType.prefix + ':' + scope.sql_server_host_identifier + '=' + scope._storageType.host + ';' + scope.sql_server_db_identifier + '=' + scope._storageType.dbname
                };



                scope._setTabs = function (parameters, headers, privates, serviceDef) {

                    scope.tabs = {
                        parameters: parameters,
                        headers: headers,
                        privates: privates,
                        serviceDef: serviceDef
                    }
                };

                scope._renderAdditionalEmailFields = function () {

                    switch (scope._storageType.transport_type) {
                        case 'command':
                            scope._buildFieldSet(
                                [
                                    'email-command'
                                ], true);
                            break;
                        case 'smtp':
                            scope._buildFieldSet(
                                [
                                    'email-host',
                                    'email-port',
                                    'email-security',
                                    'user-name',
                                    'password'
                                ], true);
                            break;
                    }
                };

                scope._renderAdditionalFields = function (storageType) {

                    var creds = {};

                    if (storageType === scope.serviceInfo.recordCopy.storage_type) {
                        creds = scope.serviceInfo.record.credentials;
                    }

                    switch(storageType) {

                        case 'aws dynamodb':
                        case 'aws simpledb':

                            scope._storageType = new dfStorageTypeFactory('aws', creds);
                            scope._buildFieldSet(
                                [
                                    'aws-access-key',
                                    'aws-secret-key',
                                    'aws-region'
                                ], true);
                            break;

                        case 'azure tables':

                            scope._storageType = new dfStorageTypeFactory('azure', creds);
                            scope._buildFieldSet(
                                [
                                    'azure-acct-name',
                                    'azure-acct-key',
                                    'azure-partition-key'
                                ], true);
                            break;

                        case 'couchdb':

                            scope._storageType = new dfStorageTypeFactory('couchdb', creds);
                            scope._buildFieldSet(
                                [
                                    'couch-dsn',
                                    'couch-user-name',
                                    'couch-password'
                                ], true);
                            break;

                        case 'mongodb':

                            scope._storageType = new dfStorageTypeFactory('mongodb', creds);
                            scope._buildFieldSet(
                                [
                                    'mongo-dsn',
                                    'mongo-database',
                                    'mongo-user-name',
                                    'mongo-password',
                                    'mongo-options-ssl'
                                ], true);
                            break;

                        case 'aws s3':

                            scope._storageType = new dfStorageTypeFactory('aws', creds);
                            scope._buildFieldSet(
                                [
                                    'aws-access-key',
                                    'aws-secret-key',
                                    'aws-region'
                                ], true);
                            break;

                        case 'azure blob':

                            scope._storageType = new dfStorageTypeFactory('azure', creds);
                            scope._buildFieldSet(
                                [
                                    'azure-acct-name',
                                    'azure-acct-key'
                                ], true);
                            break;

                        case 'rackspace cloudfiles':

                            scope._storageType = new dfStorageTypeFactory('rackspace', creds);
                            scope._buildFieldSet(
                                [
                                    'rs-user-name',
                                    'rs-api-key',
                                    'rs-tenet-name',
                                    'rs-region',
                                    'rs-endpoint'
                                ], true);
                            break;

                        case 'openstack object storage':

                            scope._storageType = new dfStorageTypeFactory('openstack', creds);
                            scope._buildFieldSet(
                                [
                                    'os-user-name',
                                    'os-password',
                                    'os-tenet-name',
                                    'os-region',
                                    'os-endpoint'
                                ], true);
                            break;

                        case 'aws sns':

                            scope._storageType = new dfStorageTypeFactory('aws', creds);
                            scope._buildFieldSet(
                                [
                                    'aws-access-key',
                                    'aws-secret-key',
                                    'aws-region'
                                ], true);
                            break;


                        default:
                            scope._buildFieldSet(
                                null, true);
                            break;
                    }

                };

                scope._renderServiceFields = function (serviceType) {

                    switch(serviceType) {

                        case 'Remote Web Service':
                            scope._setTabs(true, true, false, true);
                            scope._storageType = new dfStorageTypeFactory('remote web service', scope.serviceInfo.record.credentials);
                            scope._buildFieldSet(
                                [
                                    'type',
                                    'api-name',
                                    'name',
                                    'description',
                                    'base-url',
                                    'is-active',
                                    'remote-web-service-cache'
                                ]);

                            scope.serviceInfo.record.storage_type = null;

                            break;

                        case 'Email Service':

                            scope._setTabs(true, false, false, true);
                            scope._storageType = new dfStorageTypeFactory('email', scope.serviceInfo.record.credentials);
                            scope._buildFieldSet(
                                [
                                    'type',
                                    'api-name',
                                    'name',
                                    'description',
                                    'is-active',
                                    'email-transport-type'
                                ]);

                            scope._renderAdditionalEmailFields();
                            break;

                        case 'Remote SQL DB':

                            scope._setTabs(false, false, false, true);
                            scope._storageType = new dfStorageTypeFactory('sql', scope.serviceInfo.record.credentials);
                            scope._dsnToFields(scope._storageType.dsn);

                            scope._buildFieldSet(
                                [
                                    'type',
                                    'api-name',
                                    'name',
                                    'description',
                                    'is-active',
                                    'sql-user-name',
                                    'sql-password',
                                    'sql-vendor',
                                    'sql-host',
                                    'sql-database-name',
                                    'sql-dsn'
                                ]);

                            break;

                        case 'Local SQL DB':

                            scope._setTabs(false, false, false, true);
                            scope._storageType = new dfStorageTypeFactory('local sql db', scope.serviceInfo.record.credentials);
                            scope._buildFieldSet(
                                [
                                    'type',
                                    'api-name',
                                    'name',
                                    'description',
                                    'is-active'
                                ]);
                            break;

                        case 'Salesforce':

                            scope._setTabs(false, false, false, true);
                            scope._storageType = new dfStorageTypeFactory('salesforce', scope.serviceInfo.record.credentials);
                            scope._buildFieldSet(
                                [
                                    'type',
                                    'api-name',
                                    'name',
                                    'description',
                                    'is-active',
                                    'sf-user-name',
                                    'sf-password',
                                    'sf-security-token',
                                    'sf-api-version'
                                ]);
                            break;

                        case 'NoSQL DB':
                            scope._setTabs(false, false, false, true);
                            scope._buildFieldSet(
                                [
                                    'type',
                                    'api-name',
                                    'name',
                                    'description',
                                    'is-active',
                                    'nosql-type'
                                ]);

                            scope._renderAdditionalFields(scope.serviceInfo.record.storage_type);
                            break;

                        case 'Remote File Storage':

                            scope._setTabs(false, false, true, true);
                            scope._buildFieldSet(
                                [
                                    'type',
                                    'api-name',
                                    'name',
                                    'description',
                                    'is-active',
                                    'storage-type'
                                ]);

                            scope._renderAdditionalFields(scope.serviceInfo.record.storage_type);

                            break;

                        case 'Local File Storage':

                            scope._setTabs(false, false, true, true);
                            scope._storageType = new dfStorageTypeFactory('local file storage', scope.serviceInfo.record.credentials);
                            scope._buildFieldSet(
                                [
                                    'type',
                                    'api-name',
                                    'name',
                                    'description',
                                    'is-active'
                                ]);
                            break;

                        case 'Push Service':
                            scope._setTabs(false, false, false, true);
                            scope._storageType = new dfStorageTypeFactory('push service', scope.serviceInfo.record.credentials);
                            scope._buildFieldSet(
                                [
                                    'type',
                                    'api-name',
                                    'name',
                                    'description',
                                    'is-active',
                                    'push-type'
                                ]);
                            scope._renderAdditionalFields(scope.serviceInfo.record.storage_type);
                            break;

                        default:

                    }
                };

                scope._renderRegionUrl = function (region, regions) {

                    var regionObj = regions.find(function ( element, index, array ) {
                        if (element.value === region){
                            return element;
                        }
                    });

                    this._storageType.url = regionObj.url;
                }

                var watchEmailProvider = scope.$watch('_storageType.transport_type', function (newValue, oldValue) {

                    if (!newValue) return false;
                    scope._renderAdditionalEmailFields();

                });

                // Watch the service for changes.
                var watchService = scope.$watch('service', function (newValue, oldValue) {

                    // We don't have a service.  Don't do anything.
                    if (!newValue) return false;

                    // Create a ServiceInfo object
                    scope.serviceInfo = new ServiceInfo(newValue.record);

                    // We set this to null and then during the _renderServiceFields function
                    // a storage type will be assigned
                    scope._storageType = null;

                    // Sets fields, tabs, and _storageType (this is confusing,  we should change this so that
                    // we just render the proper type of object based on the selected service type.  This is overly
                    // complicated and verbose. Originally, we didn't want to repeat certain sections of code but...
                    // it may make sense to do so in this case.)
                    scope._renderServiceFields (scope.serviceInfo.record.type);

                });

                scope.$on('$destroy', function (e) {

                    watchService();
                    watchEmailProvider();
                });

                // HELP
                scope.dfSimpleHelp = {

                    serviceType: {
                        title: 'Service Type ',
                        text: 'Select the type of service you\'re adding.'
                    },
                    apiName: {
                        title: 'Api Name ',
                        text: 'Select a name for making API requests, such as \'db\' in /api/v1/db.'
                    },
                    name: {
                        title: 'Name ',
                        text: 'The display name or label for the service.'
                    },
                    description: {
                        title: 'Description ',
                        text: 'Write a brief description of the API (optional).'
                    },
                    baseUrl: {
                        title: 'Base Url ',
                        text: 'Specify the base URL for the remote web service. For example, if you named the API \'mydb\'' +
                            ' and the base URL is http://api.myservice.com/v1/api/, then a REST call to /api/v1/mydb/mytable' +
                            ' would tell DreamFactory to call http://api.myservice.com/v1/api/mydb/mytable.'
                    },
                    userName: {
                        title: 'Username ',
                        text: 'Specify the username for the service you\'re connecting to.'
                    },
                    password: {
                        title: 'Password ',
                        text: 'Specify the password for the service you\'re connecting to.'
                    },
                    connectionString: {
                        title: 'Connection String ',
                        text: 'Specify the connection string for the database you\'re connecting to. '
                    },
                    sqlVendor: {
                        title: 'SQL Vendor ',
                        text: 'Specify the type of database you\'re connecting to.'
                    },
                    sqlHost: {
                        title: 'SQL Host ',
                        text: 'Specify the database host for the database you\'re connecting to.'
                    },
                    sqlDatabaseName: {
                        title: 'SQL Database Name ',
                        text: 'Specify the name of the database you\'re connecting to.'
                    },

                    sfSecurityToken: {
                        title: 'SalesForce Security Token ',
                        text: 'Specify the security token for the Salesforce Org you\'re connecting to.'
                    },
                    sfApiVersion: {
                        title: 'SalesForce APi Version ',
                        text: 'Specify the version of the Salesforce API you\'re using'
                    },
                    noSqlType: {
                        title: 'NoSQL Service Type ',
                        text: 'Specify the type of database you\'re connecting to.'
                    },
                    databaseName: {
                        title: 'Database Name',
                        text: 'Specify the name of the database you\'re connecting to.'
                    },
                    awsAccessKey: {
                        title: 'AWS Access Key ',
                        text: 'Specify the AWS Access Key for the database you\'re connecting to.'
                    },
                    awsSecretKey: {
                        title: 'AWS Secret Key ',
                        text: 'Specify the AWS Secret Key for the database you\'re connecting to.'
                    },
                    awsRegion: {
                        title: 'AWS Region ',
                        text: 'Select the AWS Region for the database you\'re connecting to.'
                    },
                    azureAcctName: {
                        title: 'Azure Account Name ',
                        text: 'Specify the Azure Account Name for the database you\'re connecting to.'
                    },
                    azureAcctKey: {
                        title: 'Azure Account Key ',
                        text: 'Specify the Azure Account Key for the database you\'re connecting to.'
                    },
                    azureDefaultPartitionKey: {
                        title: 'Azure Partition Key ',
                        text: 'Specify the Azure Default Partition Key for the database you\'re connecting to.'
                    },
                    storageType: {
                        title: 'Storage Type ',
                        text: 'Specify the type of storage you\'re connecting to.'
                    },
                    rsApiKey: {
                        title: 'RackSpace Api Key ',
                        text: 'Specify the API Key for the storage you\'re connecting to.'
                    },
                    rsTenantName: {
                        title: 'RackSpace Tenant Name ',
                        text: 'Specify the Tenant Name for the storage you\'re connecting to.'
                    },
                    rsTenantRegion: {
                        title: 'RackSpace Tenant Region ',
                        text: 'Specify the Region for the storage you\'re connecting to.'
                    },
                    rsEndpoint: {
                        title: 'RackSpace Endpoint/URL ',
                        text: 'Specify the URL Endpoint for the storage you\'re connecting to.'
                    },
                    osApiKey: {
                        title: 'OpenStack Api Key ',
                        text: 'Specify the API Key for the storage you\'re connecting to.'
                    },
                    osTenantName: {
                        title: 'OpenStack Tenant Name ',
                        text: 'Specify the Tenant Name for the storage you\'re connecting to.'
                    },
                    osRegion: {
                        title: 'OpenStack Region ',
                        text: 'Specify the Region for the storage you\'re connecting to.'
                    },
                    osEndpoint: {
                        title: 'OpenStack Endpoint/URL ',
                        text: 'Specify the URL Endpoint for the storage you\'re connecting to.'
                    },

                    emailTransportType: {
                        title: 'Email Provider',
                        text: 'Specify the type of provider.'
                    },
                    emailHost: {
                        title: 'Email Host ',
                        text: 'Specify the email host.'
                    },
                    emailPort: {
                        title: 'Email Port ',
                        text: 'Specify the port number.'
                    },
                    emailSecurity: {
                        title: 'Email Security ',
                        text: 'Specify the type of security (e.g. TLS).'
                    },
                    emailCommand: {
                        title: 'Email Command ',
                        text: 'Specify the command path for email.'
                    },
                    pushServiceVendor: {
                        title: 'Push Notification Service Vendor',
                        text: 'Select a Push Notfication Service Provider'
                    }
                }
            }
        }
    }])
    .directive('dfServiceParams', ['MOD_SERVICES_ASSET_PATH', 'dfObjectService', function (MOD_SERVICES_ASSET_PATH, dfObjectService) {


        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_SERVICES_ASSET_PATH + 'views/df-service-params.html',
            link: function(scope, elem, attrs) {


                // @TODO: refactor to factory
                var ServiceParam = function(params) {

                    var _new = {
                        name: null,
                        value: null,
                        outbound: true,
                        cache_key: true
                    };

                    params = angular.copy(params) || _new;

                    // Merge old params object with new params object to aquire any
                    // new properties we may add
                    params = dfObjectService.mergeObjects(params, _new);

                    return params;
                };

                // @TODO: refactor to factory
                var ExcludeParam = function (params) {


                    var _new = {
                        name: null,
                        outbound: true,
                        cache_key: true
                    }

                    return angular.copy(params || _new);

                };

                scope.params = [];
                scope.excludeParams = [];


                // PUBLIC API
                scope.addParameter = function () {

                    scope._addParameter();
                };

                scope.deleteParameter = function (paramIdx) {

                    scope._deleteParameter(paramIdx);
                };


                scope.addClientParameter = function () {

                    scope._addClientParameter();
                };

                scope.deleteClientParameter = function (index) {

                    scope._deleteClientParameter(index);
                };



                // PRIVATE API
                scope._prepareServiceParamsData = function () {

                    scope.service.record.parameters = scope.params;

                    if (scope.service.record.credentials !== null && scope.service.record.credentials !== undefined && scope.service.record.credentials.hasOwnProperty('client_exclusions')) {
                        scope.service.record.credentials.client_exclusions.parameters = scope.excludeParams;
                    }
                    else {
                        var _new = {
                            client_exclusions: {
                                parameters: scope.excludeParams
                            }
                        };

                        scope.service.record.credentials = dfObjectService.mergeObjects(scope.service.record.credentials, _new);
                    }
                };

                scope._addParameter = function () {

                    scope.params.push(new ServiceParam())
                };

                scope._deleteParameter = function (paramIdx) {

                    scope.params.splice(paramIdx, 1);
                };


                scope._addClientParameter = function () {

                    scope.excludeParams.push(new ExcludeParam());
                };

                scope._deleteClientParameter = function (index) {

                    scope.excludeParams.splice(index, 1);
                }


                // WATCHERS
                var watchService = scope.$watch('service', function(newValue, oldValue) {

                    if (!newValue) return false;

                    if (!newValue.record.hasOwnProperty('credentials') || newValue.record.credentials === null) return;

                    scope.params = [];
                    if (newValue.record.hasOwnProperty('parameters') && newValue.record.parameters.length > 0) {

                        angular.forEach(newValue.record.parameters, function (param) {

                            scope.params.push(new ServiceParam(param));
                        })
                    }



                    scope.excludeParams = [];
                    if (newValue.record.hasOwnProperty('credentials') &&
                        newValue.record.credentials.hasOwnProperty('client_exclusions') &&
                        newValue.record.credentials.client_exclusions.hasOwnProperty('parameters') &&
                        newValue.record.credentials.client_exclusions.parameters.length > 0 ) {

                        angular.forEach(newValue.record.credentials.client_exclusions.parameters, function (param) {

                            scope.excludeParams.push(new ExcludeParam(param));
                        })
                    }
                });



                // MESSAGES
                scope.$on('$destroy', function (e) {

                    watchService();
                })
            }
        }
    }])
    .directive('dfServiceHeaders', ['MOD_SERVICES_ASSET_PATH', function(MOD_SERVICES_ASSET_PATH) {


        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_SERVICES_ASSET_PATH + 'views/df-service-headers.html',
            link: function(scope, elem, attrs) {

                var ServiceHeader = function (headerData) {

                    var _new = {
                        name: null,
                        value: null,
                        pass_from_client: false
                    };

                    headerData = angular.copy(headerData) || _new;

                    return headerData;
                };

                scope.headers = [];


                // PUBLIC API
                scope.addHeader = function () {

                    scope._addHeader();
                };

                scope.deleteHeader = function (headerIdx) {

                    scope._deleteHeader(headerIdx);
                };


                // PRIVATE API
                scope._prepareServiceHeadersData = function () {

                    scope.service.record.headers = scope.headers;
                };

                scope._addHeader = function () {

                    scope.headers.push(new ServiceHeader())
                };

                scope._deleteHeader = function (headerIdx) {

                    scope.headers.splice(headerIdx, 1);
                };


                // WATCHERS
                var watchService = scope.$watch('service', function(newValue, oldValue) {


                    if (!newValue) return false;

                    scope.headers = [];
                    if (newValue.record.hasOwnProperty('headers') && newValue.record.headers.length > 0) {

                        angular.forEach(newValue.record.headers, function (header) {

                            scope.headers.push(new ServiceHeader(header));
                        })
                    }
                });


                // MESSAGES
                scope.$on('$destroy', function (e) {

                    watchService();
                });
            }
        }
    }])
    .directive('dfServicePrivates', ['MOD_SERVICES_ASSET_PATH', function(MOD_SERVICES_ASSET_PATH) {

        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_SERVICES_ASSET_PATH + 'views/df-service-privates.html',
            link: function(scope, elem, attrs) {


                var ServicePrivates = function (privateData) {

                    var _new = {
                        value: null
                    };

                    if (privateData) {
                        _new.value = angular.copy(privateData);
                    }

                    return _new;
                };


                scope.privates = [];


                // PUBLIC API
                scope.addPath = function () {

                    scope._addPath();
                };

                scope.deletePath = function (pathIdx) {

                    scope._deletePath(pathIdx);
                };


                // PRIVATE API

                scope._prepareServicePrivateData = function () {

                    if (!scope.privates.length) {
                        scope.service.record.credentials.private_paths = [];
                        return;
                    }

                    scope.service.record.credentials.private_paths = [];
                    angular.forEach(scope.privates, function (path) {
                        scope.service.record.credentials.private_paths.push(path.value);
                    });
                };


                // COMPLEX IMPLEMENTATION
                scope._addPath = function () {

                    scope.privates.push(new ServicePrivates());
                };

                scope._deletePath = function (pathIdx) {

                    scope.privates.splice(pathIdx, 1);
                };

                // WATCHERS
                var watchPrivates = scope.$watch('service', function (newValue, oldValue) {

                    if (!newValue) return false;

                    if (!newValue.record.hasOwnProperty('credentials') || newValue.record.credentials === null) return;

                    scope.privates = [];

                    if (newValue.record.credentials.hasOwnProperty('private_paths') && newValue.record.credentials.private_paths.length > 0) {


                        angular.forEach(newValue.record.credentials.private_paths, function (path) {

                            scope.privates.push(new ServicePrivates(path))
                        })
                    }
                });

                // MESSAGES
                scope.$on('$destroy', function (e) {

                    watchPrivates();
                })
            }
        }
    }])
    .directive('dfManageServices', ['MOD_SERVICES_ASSET_PATH', 'dfApplicationData', 'dfApplicationPrefs', 'dfNotify', function(MOD_SERVICES_ASSET_PATH, dfApplicationData, dfApplicationPrefs, dfNotify) {


        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_SERVICES_ASSET_PATH + 'views/df-manage-services.html',
            link: function(scope, elem, attrs) {


                var ManagedService = function (serviceData) {

                    return {
                        __dfUI: {
                            selected: false
                        },
                        record: serviceData
                    }
                };


                scope.currentViewMode = dfApplicationPrefs.getPrefs().sections.service.manageViewMode;

                scope.services = null;

                scope.currentEditService = null;

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
                    },
                    {
                        name: 'is_active',
                        label: 'Active',
                        active: true
                    },
                    {
                        name: 'is_system',
                        label: 'System',
                        active: true
                    }
                    /*{
                        name: 'native_format',
                        label: 'Native Format',
                        active: true
                    },*/
                ];

                scope.order = {
                    orderBy: 'id',
                    orderByReverse: false
                };

                scope.selectedServices = [];

                scope.allSelected = false;



                // PUBLIC API
                scope.toggleViewMode = function(mode) {

                    scope._toggleViewMode(mode);
                };

                scope.editService = function (service) {

                    scope._editService(service);
                };

                scope.deleteService = function (service) {

                    if (dfNotify.confirm("Delete " + service.record.name + "?")) {
                        scope._deleteService(service);
                    }
                };

                scope.deleteSelectedServices = function () {

                    if (dfNotify.confirm("Delete selected services?")) {
                        scope._deleteSelectedServices();
                    }
                };

                scope.orderOnSelect = function (fieldObj) {

                    scope._orderOnSelect(fieldObj);
                };

                scope.setSelected = function (service) {

                    scope._setSelected(service);
                };



                // PRIVATE API
                scope._deleteFromServer = function (requestDataObj) {

                    return dfApplicationData.deleteApiData('service', requestDataObj).$promise;
                };

                scope._filterServices = function (dataArr) {


                    var filtered = ['All', 'Schema', 'Local Portal Service'];

                    angular.forEach(dataArr, function (data, i) {
                        angular.forEach(filtered, function (value, index) {

                            if (data.name === value) {
                                dataArr.splice(i, 1);
                            }
                        })
                    })

                    return dataArr;
                };



                // COMPLEX IMPLEMENTATION

                scope._editService = function (service) {

                    scope.currentEditService = service;
                };

                scope._deleteService = function(service) {

                    var requestDataObj = {
                        params: {
                            id: service.record.id
                        }
                    };


                    scope._deleteFromServer(requestDataObj).then(
                        function(result) {

                            // notify success
                            var messageOptions = {
                                module: 'Services',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'Service successfully deleted.'
                            };

                            dfNotify.success(messageOptions);

                            // Was this service previously selected before
                            // we decided to remove them individually
                            if (service.__dfUI.selected) {

                                // This will remove the service from the selected
                                // service array
                                scope.setSelected(service);

                            }

                            scope.$broadcast('toolbar:paginate:service:delete');
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

                            // console.log('Delete Service Finally')
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

                scope._setSelected = function (service) {


                    var i = 0;

                    while (i < scope.selectedServices.length) {

                        if (service.record.id === scope.selectedServices[i]) {

                            service.__dfUI.selected = false;
                            scope.selectedServices.splice(i, 1);
                            return;
                        }

                        i++
                    }

                    service.__dfUI.selected = true;
                    scope.selectedServices.push(service.record.id);

                };

                scope._deleteSelectedServices = function () {

                    var requestDataObj = {
                        params: {
                            ids: scope.selectedServices.join(','),
                            rollback: true
                        }
                    };


                    scope._deleteFromServer(requestDataObj).then(

                        function(result) {

                            var messageOptions = {
                                module: 'Services',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'Services deleted successfully.'
                            };

                            dfNotify.success(messageOptions);

                            scope.selectedServices = [];

                            scope.$broadcast('toolbar:paginate:service:reset');
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

                            // console.log('Delete Services Finally');
                        }
                    )
                };


                // WATCHERS

                var watchServices = scope.$watchCollection('services', function (newValue, oldValue) {

                    if (newValue == null) {

                        var _services = [];

                        angular.forEach(scope._filterServices(dfApplicationData.getApiData('service')), function (service) {

                            _services.push(new ManagedService(service));
                        });

                        scope.services = _services;
                        return;
                    }
                });

                var watchApiData = scope.$watchCollection(function() {

                    return dfApplicationData.getApiData('service');

                }, function (newValue, oldValue) {

                    var _services = [];

                    angular.forEach(scope._filterServices(dfApplicationData.getApiData('service')), function (service) {

                        _services.push(new ManagedService(service));
                    });

                    scope.services = _services;
                    return;
                });


                // MESSAGES

                scope.$on('toolbar:paginate:service:update', function (e) {

                    var _services = [];

                    angular.forEach(scope._filterServices(dfApplicationData.getApiData('service')), function (service) {


                        var _service = new ManagedService(service);

                        var i = 0;

                        while (i < scope.selectedServices.length) {

                            if (scope.selectedServices[i] === _service.record.id) {

                                _service.__dfUI.selected = true;
                                break;
                            }

                            i++
                        }

                        _services.push(_service);
                    });

                    scope.services = _services;
                });

                scope.$on('$destroy', function(e) {
                    watchServices();
                    scope.$broadcast('toolbar:paginate:service:reset');
                })


            }
        }
    }])
    .directive('dfServiceDefinition', ['MOD_SERVICES_ASSET_PATH', function(MOD_SERVICES_ASSET_PATH) {

        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_SERVICES_ASSET_PATH + 'views/df-service-definition.html',
            link: function (scope, elem, attrs) {


                scope.isEditorClean = true;
                scope.isEditable = true;
                scope.currentEditor = null;
                scope.currentFile = null;



                scope._prepareServiceDefinitionData = function () {

                    scope.service.record.docs[0].content = scope.currentEditor.session.getValue().split('/n').join('');
                }


                scope.$watch('service', function (newValue, oldValue) {

                    if (!newValue) return;

                    if (newValue.record.hasOwnProperty('docs') && newValue.record.docs.length) {

                        scope.currentFile = newValue.record.docs[0].content;
                    }

                    switch(newValue.record.type) {

                        case 'Remote Web Service':
                            scope.isEditable = true;
                            break;

                        default:
                            scope.isEditable = false;
                    }

                })


                // Hack way to update text in editor;
                $('#service-definition-tab').on('click', function () {
                    scope.currentEditor.renderer.updateText();
                    scope.currentEditor.focus();
                    $(window).trigger('resize');
                })


                $(window).on('resize', function () {

                    var h = $(window).height();

                    $('div[id^="ide_"]').css({
                        height: h - 400 + 'px'
                    })
                })


            }
        }
    }])
    .factory('dfStorageTypeFactory', ['dfObjectService', function(dfObjectService) {


        return function(storageType, data) {

            // Is this object stringified
            if (Object.prototype.toString.call('data') === '[object String]') {
                data = angular.fromJson(data);
            }

            // check if we actually passed any data
            if (!data || !Object.keys(data).length > 0) {
                data = null;
            }


            var AWS = function(data) {

                var _new = {
                    private_paths: [],
                    access_key: null,
                    secret_key: null,
                    region: null
                };

                if (data) {
                    return dfObjectService.mergeObjects(data, _new);
                }
                else {
                    return _new;
                }
            };

            var Azure = function(data) {

                var _new = {
                    private_paths: [],
                    account_name: null,
                    account_key: null,
                    PartitionKey: null
                }

                if (data) {
                    return dfObjectService.mergeObjects(data, _new);
                }
                else {
                    return _new;
                }
            };

            var Rackspace = function (data) {

                var _new = {
                    private_paths: [],
                    url: null,
                    api_key: null,
                    username: null,
                    tenant_name: null,
                    region: null
                }

                if (data) {
                    return dfObjectService.mergeObjects(data, _new);
                }
                else {
                    return _new;
                }

            }

            var Openstack = function(data) {

                var _new = {
                    private_paths : [],
                    url: null,
                    password: null,
                    username: null,
                    tenant_name: null,
                    region: null
                }

                if (data) {
                    return dfObjectService.mergeObjects(data, _new);
                }
                else {
                    return _new;
                }
            };

            var MongoDB = function (data) {

                var _new = {
                    dsn: null,
                    user: null,
                    pwd: null,
                    db: null,
                    options: {},
                    options_ctrl: null

                }

                if (data) {
                    if (data.options.hasOwnProperty('ssl'))
                        data.options_ctrl = true;
                    else
                        data.options_ctrl = false;

                    return dfObjectService.mergeObjects(data, _new);
                }
                else {
                    return _new;
                }
            }

            var CouchDB = function(data) {

                var _new = {
                    dsn: null,
                    user: null,
                    pwd: null
                }

                if (data) {
                    return dfObjectService.mergeObjects(data, _new);
                }
                else {
                    return _new;
                }
            }

            var Salesforce = function (data) {

                var _new = {
                    username: null,
                    password: null,
                    security_token: null,
                    version: null
                }

                if (data) {
                    return dfObjectService.mergeObjects(data, _new);
                }
                else {
                    return _new;
                }
            }

            var Email = function (data) {

                var _new = {
                    transport_type: 'default',
                    host: null,
                    port: null,
                    security: 'SSL',
                    command: null
                };

                if (data) {
                    return dfObjectService.mergeObjects(data, _new);
                }
                else {
                    return _new;
                }
            }

            var SQLServer = function (data) {

                /*prefix: null,
                    host: null,
                    dbname: null,*/

                var _new = {

                    dsn: null,
                    user: null,
                    pwd: null
                }

                if (data) {
                    return dfObjectService.mergeObjects(data, _new);
                }
                else {
                    return _new;
                }
            }

            var LocalFileStorage = function (data) {

                var _new = {
                    private_paths: []
                }

                if (data) {
                    return dfObjectService.mergeObjects(data, _new);
                }
                else {
                    return _new;
                }
            }

            var LocalSQLDB = function (data) {

                return [];
            };

            var RemoteWebService = function (data) {
                var _new = {
                    cache_config: {
                        enabled: false,
                        ttl: null
                    },
                    client_exclusions: {
                        parameters: []
                    }
                };

                if (data) {
                    return dfObjectService.mergeObjects(data, _new);
                }
                else {
                    return _new;
                }
            };


            switch(storageType) {

                case 'aws':
                    return new AWS(data);
                case 'azure':
                    return new Azure(data);
                case 'rackspace':
                    return new Rackspace(data);
                case 'openstack':
                    return new Openstack(data);
                case 'mongodb':
                    return new MongoDB(data);
                case 'couchdb':
                    return new CouchDB(data);
                case 'salesforce':
                    return new Salesforce(data);
                case 'email':
                    return new Email(data);
                case 'sql':
                    return new SQLServer(data);
                case 'local file storage':
                    return new LocalFileStorage(data);
                case 'local sql db':
                    return new LocalSQLDB(data);
                case 'remote web service':
                    return new RemoteWebService(data);
            }
        }
    }])
    .factory('dfServiceValues', ['SystemConfigDataService', function(SystemConfigDataService) {


        return function () {

            // Set prefixes for db drivers
            var sql_placeholder="mysql:Server=my_server;Database=my_database";
            var microsoft_sql_server_prefix = "sqlsrv";

            if(SystemConfigDataService.getSystemConfig().server_os.indexOf("win") !== -1 && SystemConfigDataService.getSystemConfig().server_os.indexOf("darwin") === -1){

                sql_placeholder="mysql:Server=my_server;Database=my_database";
                microsoft_sql_server_prefix = "sqlsrv"
            }else{

                microsoft_sql_server_prefix = "dblib"
            }

            var values = {

                serviceTypes: [
                    {
                        name: 'remote_web_service',
                        label: 'Remote Web Service',
                        value: 'Remote Web Service'
                    },
                    {
                        name: 'local_sql_db',
                        label: 'Local SQL DB',
                        value: 'Local SQL DB'
                    },
                    {
                        name: 'remote_sql_db',
                        label: 'Remote SQL DB',
                        value: 'Remote SQL DB'
                    },
                    {
                        name: 'nosql_db',
                        label: 'NoSQL DB',
                        value: 'NoSQL DB'
                    },
                    {
                        name: 'salesforce',
                        label: 'Salesforce',
                        value: 'Salesforce'
                    },
                    {
                        name: 'local_file_storage',
                        label: 'Local File Storage',
                        value: 'Local File Storage'
                    },
                    {
                        name: 'remote_file_storage',
                        label: 'Remote File Storage',
                        value: 'Remote File Storage'
                    },
                    {
                        name: 'email_service',
                        label: 'Email Service',
                        value: 'Email Service'
                    },
                    {
                        name: 'push_service',
                        label: 'Push Service',
                        value: 'Push Service'
                    }
                ],


                emailOptions: [
                    {name: "Server Default", value: 'default'},
                    {name: "Server Command", value: "command"},
                    {name: "SMTP", value:"smtp"}
                ],

                securityOptions: [
                    {name: "SSL", value: "SSL"},
                    {name: "TLS", value: "TLS"}
                ],
                sqlVendors: [
                    {name:"MySQL", prefix:"mysql"},
                    {name:"Microsoft SQL Server", prefix: microsoft_sql_server_prefix},
                    {name:"PostgreSQL", prefix:"pgsql"},
                    {name:"Oracle", prefix:"oci"},
                    {name:"IBM DB2", prefix:"ibm"}

                ],
                NoSQLOptions: [
                    {name: "Amazon DynamoDB", value: "aws dynamodb"},
                    {name: "Amazon SimpleDB", value: "aws simpledb"},
                    {name: "Windows Azure Tables", value: "azure tables"},
                    {name: "CouchDB", value: "couchdb"},
                    {name: "MongoDB", value: "mongodb"}

                ],
                awsRegions: [
                    {name: "US EAST (N Virgina)", value: "us-east-1"},
                    {name: "US WEST (N California)", value: "us-west-1"},
                    {name: "US WEST (Oregon)", value: "us-west-2"},
                    {name: "EU WEST (Ireland)", value: "eu-west-1"},
                    {name: "Asia Pacific (Singapore)", value: "ap-southeast-1"},
                    {name: "Asia Pacific (Sydney)", value: "ap-southeast-2"},
                    {name: "Asia Pacific (Tokyo)", value: "ap-northeast-1"},
                    {name: "South America (Sao Paulo)", value: "sa-east-1"}
                ],
                rackspaceRegions: [
                    {name: "London", value: "LON", url: "https://lon.identity.api.rackspacecloud.com"},
                    {name: "Chicago", value: "ORD", url: "https://identity.api.rackspacecloud.com"},
                    {name: "Dallas / Fort Worth", value: "DFW", url: "https://identity.api.rackspacecloud.com"}
                ],
                remoteOptions: [
                    {name: "Amazon S3", value: "aws s3"},
                    {name: "Windows Azure Storage", value: "azure blob"},
                    {name: "RackSpace CloudFiles", value: "rackspace cloudfiles"},
                    {name: "OpenStack Object Storage", value: "openstack object storage"}
                ],
                pushOptions: [
                    {name: "Amazon SNS", value: "aws sns"}
                ]
            }

            return values;
        }


    }])


angular.module('dfServiceTemplates', [])
    .run(['$templateCache', function ($templateCache) {


        $templateCache.put('_service-type.html',
            '<div class="form-group">' +
                '<label>Service Type</label><df-simple-help data-options="dfSimpleHelp.serviceType"></df-simple-help>' +
                '<select class="form-control" data-ng-disabled="!newService" data-ng-change="_renderServiceFields(serviceInfo.record.type)" data-ng-model="serviceInfo.record.type" data-ng-options="option.value as option.label for option in hcv.serviceTypes"></select>' +
            '</div>'

        );

        $templateCache.put('_service-api-name.html',
            '<div class="form-group">' +
                '<label>API Name</label><df-simple-help data-options="dfSimpleHelp.apiName"></df-simple-help>' +
                '<input class="form-control" data-ng-disabled="!newService" data-ng-disabled="serviceInfo.record.is_system" data-ng-model="serviceInfo.record.api_name" type="text" required/>' +
            '</div>'
        );

        $templateCache.put('_service-name.html',
            '<div class="form-group">' +
            '<label>Name</label><df-simple-help data-options="dfSimpleHelp.name"></df-simple-help>' +
            '<input class="form-control" data-ng-model="serviceInfo.record.name" type="text" required/>' +
                '</div>'
        );

        $templateCache.put('_service-description.html',
            '<div class="form-group">' +
            '<label>Description</label><df-simple-help data-options="dfSimpleHelp.description"></df-simple-help>' +
            '<input class="form-control" data-ng-model="serviceInfo.record.description" type="text"/>' +
                '</div>'
        );

        $templateCache.put('_service-base-url.html',
            '<div class="form-group">' +
            '<label>Base URL</label>' +
                '<df-simple-help data-ng-if="!_storageType.transport_type" data-options="dfSimpleHelp.baseUrl"></df-simple-help>' +
            '<input class="form-control" data-ng-model="serviceInfo.record.base_url" type="text"/>' +
                '</div>'
        );

        $templateCache.put('_service-user-name.html',
            '<div class="form-group">' +
            '<label>Username</label><df-simple-help data-options="dfSimpleHelp.userName"></df-simple-help>' +
                '<input class="form-control" id="serviceInfo-record-user" name="serviceInfo-record-user" data-ng-model="serviceInfo.record.credentials.user" type="text"/>' +
                '</div>'
        );

        $templateCache.put('_service-password.html',
            '<div class="form-group">' +
            '<label>Password</label><df-simple-help data-options="dfSimpleHelp.password"></df-simple-help>' +
                '<input class="form-control" id="serviceInfo-record-password" name="serviceInfo-record-password" data-ng-model="serviceInfo.record.credentials.password" type="password"/>' +
                '</div>'
        );

        $templateCache.put('_service-is-active.html',
            '<div class="form-group">' +
            '<div class="checkbox">' +
                '<label>' +
                    '<input data-ng-model="serviceInfo.record.is_active" type="checkbox" /> Active' +
                '</label>' +
            '</div>'+
            '</div>'
        );




        // Remote Web Service
        $templateCache.put('_service-remote-web-service-cache.html',
            '<div class="row"><div class="col-xs-12"><hr /></div></div>'+
            '<h3>Caching</h3>' +
            '<div class="form-group">' +
                '<div class="input-group">' +
                    '<span class="input-group-addon">' +
                    '<input data-ng-model="_storageType.cache_config.enabled" type="checkbox"/>' +
                    '</span>' +
                    '<input class="form-control" data-ng-model="_storageType.cache_config.ttl" type="text" placeholder="Enter cache time to live (seconds)" data-ng-disabled="!_storageType.cache_config.enabled"/>' +
                '</div>' +
            '</div>'
        );


        // Email Templates

        $templateCache.put('_service-email-transport-type.html',
            '<div class="form-group">' +
            '<label>Provider</label><df-simple-help data-options="dfSimpleHelp.emailTransportType"></df-simple-help>' +
            '<select class="form-control" data-ng-model="_storageType.transport_type" data-ng-options="option.value as option.name for option in hcv.emailOptions"></select>' +
                '</div>'
        );

        $templateCache.put('_service-email-host.html',
            '<div class="form-group">' +
            '<label>Host</label><df-simple-help data-options="dfSimpleHelp.emailHost"></df-simple-help>' +
            '<input class="form-control" data-ng-model="_storageType.host" type="text" placeholder="e.g. SMTP.gmail.com"/>' +
                '</div>'
        );

        $templateCache.put('_service-email-port.html',
            '<div class="form-group">' +
            '<label>Port</label><df-simple-help data-options="dfSimpleHelp.emailPort"></df-simple-help>' +
            '<input class="form-control" data-ng-model="_storageType.port" type="text" placeholder="e.g. 465"/>' +
                '</div>'
        );

        $templateCache.put('_service-email-security.html',
            '<div class="form-group">' +
            '<label>Security</label><df-simple-help data-options="dfSimpleHelp.emailSecurity"></df-simple-help>' +
                '<select class="form-control" data-ng-options="option.value as option.name for option in hcv.securityOptions" data-ng-model="_storageType.security">' +
            '</select>' +
                '</div>'
        );

        $templateCache.put('_service-email-command.html',
            '<div class="form-group">' +
            '<label>Command</label><df-simple-help data-options="dfSimpleHelp.emailCommand"></df-simple-help>' +
            '<input class="form-control" data-ng-value="" type="text" data-ng-model="_storageType.command" placeholder="e.g. /usr/sbin/sendmail -bs"/>' +
            '</div>'
        );



        // SQL Templates

        $templateCache.put('_service-sql-user-name.html',
            '<div class="form-group">' +
            '<label>Username</label><df-simple-help data-options="dfSimpleHelp.userName"></df-simple-help>' +
                '<input class="form-control" data-ng-model="_storageType.user" type="text"/>' +
            '</div>'
        );

        $templateCache.put('_service-sql-password.html',
            '<div class="form-group">' +
            '<label>Password</label><df-simple-help data-options="dfSimpleHelp.password"></df-simple-help>' +
                '<input class="form-control" data-ng-model="_storageType.pwd" type="password"/>' +
                '</div>'
        );

        $templateCache.put('_service-sql-vendor.html',
            '<div data-ng-hide="!newService" class="form-group">' +
            '<label>SQL Vendor</label><df-simple-help data-options="dfSimpleHelp.sqlVendor"></df-simple-help>' +
            '<select class="form-control" data-ng-model="_storageType.prefix" data-ng-change="_updateDsn()"  data-ng-options="server.prefix as server.name for server in hcv.sqlVendors">' +
                '<option value="">-- Select Vendor --</option>' +
                '</select>' +
            '</div>'
        );

        $templateCache.put('_service-sql-host.html',
            '<div data-ng-hide="!newService" class="form-group">' +
            '<label>Host</label><df-simple-help data-options="dfSimpleHelp.sqlHost"></df-simple-help>' +
            '<input data-ng-disabled="!_storageType.prefix" class="form-control" data-ng-keyup="_updateDsn()" data-ng-model="_storageType.host"/>' +
                '</div>'
        );

        $templateCache.put('_service-sql-database-name.html',
            '<div data-ng-hide="!newService" class="form-group">' +
            '<label>Database Name</label><df-simple-help data-options="dfSimpleHelp.sqlDatabaseName"></df-simple-help>' +
            '<input data-ng-disabled="!_storageType.host" class="form-control" data-ng-keyup="_updateDsn()" data-ng-model="_storageType.dbname"/>' +
            '</div>'
        );

        // Use this to update fields from dsn
        // needs more work
        // data-ng-keyup="_dsnToFields()"
        $templateCache.put('_service-sql-dsn.html',
            '<div class="form-group">' +
            '<label>Connection String</label><df-simple-help data-options="dfSimpleHelp.connectionString"></df-simple-help>' +
            '<input class="form-control" data-ng-model="_storageType.dsn" type="text" placeholder="{{sql_placeholder}}"/>' +
                '</div>'
        );


        // SalesForce

        $templateCache.put('_service-sf-user-name.html',
            '<div class="form-group">' +
            '<label>Username</label><df-simple-help data-options="dfSimpleHelp.userName"></df-simple-help>' +
            '<input class="form-control" data-ng-model="_storageType.username" type="text"/>' +
                '</div>'
        );

        $templateCache.put('_service-sf-password.html',
            '<div class="form-group">' +
            '<label>Password</label><df-simple-help data-options="dfSimpleHelp.password"></df-simple-help>' +
            '<input class="form-control" data-ng-model="_storageType.password" type="password"/>' +
                '</div>'
        );

        $templateCache.put('_service-sf-security-token.html',
            '<div class="form-group">' +
            '<label>Security Token</label><df-simple-help data-options="dfSimpleHelp.sfSecurityToken"></df-simple-help>' +
            '<input class="form-control" data-ng-model="_storageType.security_token" type="text"/>' +
                '</div>'
        );

        $templateCache.put('_service-sf-api-version.html',
            '<div class="form-group">' +
            '<label>API Version</label><df-simple-help data-options="dfSimpleHelp.sfApiVersion"></df-simple-help>' +
            '<input class="form-control" data-ng-model="_storageType.version" placeholder="v28.0" type="text"/>' +
                '</div>'
        );



        // NoSQL DB

        $templateCache.put('_service-nosql-type.html',
            '<div class="form-group">' +
            '<label>NoSQL Vendor</label><df-simple-help data-options="dfSimpleHelp.noSqlType"></df-simple-help>' +
            '<select class="form-control" data-ng-change="_renderAdditionalFields(serviceInfo.record.storage_type)" data-ng-options="option.value as option.name for option in hcv.NoSQLOptions" data-ng-model="serviceInfo.record.storage_type" data-ng-required="true">' +
                '<option value="">-- Select Vendor --</option>' +
                '</select>' +
                '</div>'
        );


        // AWS

        $templateCache.put('_service-aws-access-key.html',
            '<div class="form-group">' +
            '<label>Access Key</label><df-simple-help data-options="dfSimpleHelp.awsAccessKey"></df-simple-help>' +
            '<input class="form-control" type="text" data-ng-model="_storageType.access_key"/>' +
                '</div>'
        );


        $templateCache.put('_service-aws-secret-key.html',
            '<div class="form-group">' +
            '<label>Secret Key</label><df-simple-help data-options="dfSimpleHelp.awsSecretKey"></df-simple-help>' +
            '<input class="form-control" type="text" data-ng-model="_storageType.secret_key"/>' +
                '</div>'
        );

        $templateCache.put('_service-aws-region.html',
            '<div class="form-group">' +
            '<label>Region</label><df-simple-help data-options="dfSimpleHelp.awsRegion"></df-simple-help>' +
            '<select class="form-control" data-ng-options="region.value as region.name for region in hcv.awsRegions" data-ng-model="_storageType.region"></select>' +
                '</div>'
        );


        // Azure

        $templateCache.put('_service-azure-acct-name.html',
            '<div class="form-group">' +
            '<label>Account Name</label><df-simple-help data-options="dfSimpleHelp.azureAcctName"></df-simple-help>' +
            '<input class="form-control" type="text" data-ng-model="_storageType.account_name"/>' +
                '</div>'
        );

        $templateCache.put('_service-azure-acct-key.html',
            '<div class="form-group">' +
            '<label>Account Key</label><df-simple-help data-options="dfSimpleHelp.azureAcctKey"></df-simple-help>' +
            '<input class="form-control" type="text" data-ng-model="_storageType.account_key"/>' +
                '</div>'
        );

        // Need to do something about the partition key here.
        // Camelcase here but nowhere else for one prop?
        $templateCache.put('_service-azure-partition-key.html',
            '<div class="form-group">' +
            '<label>Default Partition Key</label><df-simple-help data-options="dfSimpleHelp.azureDefaultPartitionKey"></df-simple-help>' +
            '<input class="form-control" type="text" data-ng-model="_storageType.PartitionKey"/>' +
                '</div>'
        );


        // Couch DB

        $templateCache.put('_service-couch-dsn.html',
            '<div class="form-group">' +
            '<label>Connection String</label><df-simple-help data-options="dfSimpleHelp.connectionString"></df-simple-help>' +
            '<input data-ng-model="_storageType.dsn" type="text" class="form-control"/>' +
            '</div>'
        );

        $templateCache.put('_service-couch-user-name.html',
            '<div class="form-group">' +
            '<label>Username</label><df-simple-help data-options="dfSimpleHelp.userName"></df-simple-help>' +
            '<input class="form-control" data-ng-model="_storageType.user" type="text"/>' +
                '</div>'
        );

        $templateCache.put('_service-couch-password.html',
            '<div class="form-group">' +
            '<label>Password</label><df-simple-help data-options="dfSimpleHelp.password"></df-simple-help>' +
            '<input class="form-control" data-ng-model="_storageType.pwd" type="password"/>' +
                '</div>'
        );


        // Mongo DB

        $templateCache.put('_service-mongo-dsn.html',
            '<div class="form-group">' +
            '<label>Connection String</label><df-simple-help data-options="dfSimpleHelp.connectionString"></df-simple-help>' +
            '<input class="form-control" data-ng-model="_storageType.dsn" type="text"/>' +
                '</div>'
        );

        $templateCache.put('_service-mongo-database.html',
            '<div class="form-group">' +
            '<label>Database Name</label><df-simple-help data-options="dfSimpleHelp.databaseName"></df-simple-help>' +
            '<input class="form-control" data-ng-model="_storageType.db" type="text"/>' +
                '</div>'
        );

        $templateCache.put('_service-mongo-user-name.html',
            '<div class="form-group">' +
            '<label>Username</label><df-simple-help data-options="dfSimpleHelp.userName"></df-simple-help>' +
            '<input class="form-control" data-ng-model="_storageType.user" type="text"/>' +
                '</div>'
        );

        $templateCache.put('_service-mongo-password.html',
            '<div class="form-group">' +
            '<label>Password</label><df-simple-help data-options="dfSimpleHelp.password"></df-simple-help>' +
            '<input class="form-control" data-ng-model="_storageType.pwd" type="password"/>' +
                '</div>'
        );


        $templateCache.put('_service-mongo-options-ssl.html',

            '<div class="form-group">' +
            '<div class="checkbox">' +
            '<label>' +
            '<input data-ng-model="_storageType.options_ctrl" type="checkbox"/>' +
            'Connect with SSL (PHP driver and MongoDB server must support SSL)' +
            '</label>' +
            '</div>' +
            '</div>'
        );




        // Storage Services

        $templateCache.put('_service-storage-type.html',
            '<div class="form-group">' +
            '<label>Storage Type</label><df-simple-help data-options="dfSimpleHelp.storageType"></df-simple-help>' +
            '<select class="form-control" data-ng-change="_renderAdditionalFields(serviceInfo.record.storage_type)" data-ng-options="option.value as option.name for option in hcv.remoteOptions" data-ng-model="serviceInfo.record.storage_type" type="text">' +
                '<option value="">-- Select Storage Type --</option>' +
                '</select>' +

                '</div>'
        );


        // Rackspace
        $templateCache.put('_service-rs-user-name.html',
            '<div class="form-group">' +
            '<label>Username</label><df-simple-help data-options="dfSimpleHelp.userName"></df-simple-help>' +
                '<input class="form-control" type="text" data-ng-model="_storageType.username"/>' +
                '</div>'
        );

        $templateCache.put('_service-rs-api-key.html',
            '<div class="form-group">' +
            '<label>API Key</label><df-simple-help data-options="dfSimpleHelp.rsApiKey"></df-simple-help>' +
            '<input class="form-control" type="text" data-ng-model="_storageType.api_key"/>' +
                '</div>'
        );

        $templateCache.put('_service-rs-tenet-name.html',
            '<div class="form-group">' +
            '<label>Tenant Name</label><df-simple-help data-options="dfSimpleHelp.rsTenantName"></df-simple-help>' +
            '<input class="form-control" type="text" data-ng-model="_storageType.tenant_name"/>' +
                '</div>'
        );

        $templateCache.put('_service-rs-region.html',
            '<div class="form-group">' +
            '<label>Region</label><df-simple-help data-options="dfSimpleHelp.rsTenantRegion"></df-simple-help>' +
            '<select class="form-control" data-ng-change="_renderRegionUrl(_storageType.region, hcv.rackspaceRegions)" data-ng-options="option.value as option.name for option in hcv.rackspaceRegions" data-ng-model="_storageType.region"></select>' +
            '</div>'
        );

        $templateCache.put('_service-rs-endpoint.html',
            '<div class="form-group">' +
            '<label>URL/Endpoint</label><df-simple-help data-options="dfSimpleHelp.rsEndpoint"></df-simple-help>' +
                '<input class="form-control" data-ng-disabled="!_storageType.region" type="text" data-ng-model="_storageType.url"/>' +
                '</div>'
        );


        // Openstack

        $templateCache.put('_service-os-user-name.html',
            '<div class="form-group">' +
            '<label>Username</label><df-simple-help data-options="dfSimpleHelp.userName"></df-simple-help>' +
                '<input class="form-control" type="text" data-ng-model="_storageType.username"/>' +
                '</div>'
        );

        $templateCache.put('_service-os-password.html',
            '<div class="form-group">' +
            '<label>Password</label><df-simple-help data-options="dfSimpleHelp.osApiKey"></df-simple-help>' +
            '<input class="form-control" type="text" data-ng-model="_storageType.password"/>' +
            '</div>'
        );

        $templateCache.put('_service-os-tenet-name.html',
            '<div class="form-group">' +
            '<label>Tenant Name</label><df-simple-help data-options="dfSimpleHelp.osTenantName"></df-simple-help>' +
                '<input class="form-control" type="text" data-ng-model="_storageType.tenant_name"/>' +
                '</div>'
        );

        $templateCache.put('_service-os-region.html',
            '<div class="form-group">' +
                '<label>Region</label><df-simple-help data-options="dfSimpleHelp.osRegion"></df-simple-help>' +
                '<input class="form-control" type="text" ng-model="_storageType.region"/>' +
            '</div>'
        );

        $templateCache.put('_service-os-endpoint.html',
            '<div class="form-group">' +
            '<label>URL/Endpoint</label><df-simple-help data-options="dfSimpleHelp.osEndpoint"></df-simple-help>' +
                '<input class="form-control" data-ng-disabled="!_storageType.region" type="text" data-ng-model="_storageType.url"/>' +
            '</div>'
        );


        // Push Service
        $templateCache.put('_service-push-type.html',
            '<div class="form-group">' +
                '<label>Push Notification Service Vendor</label><df-simple-help data-options="dfSimpleHelp.pushServiceVendor"></df-simple-help>' +
                '<select class="form-control" data-ng-change="_renderAdditionalFields(serviceInfo.record.storage_type)" data-ng-options="option.value as option.name for option in hcv.pushOptions" data-ng-model="serviceInfo.record.storage_type" type="text">' +
                '<option value="">-- Select Storage Type --</option>' +
                '</select>' +

                '</div>'
        );

    }]);
