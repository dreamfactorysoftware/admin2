angular.module('dfFileManager', ['ngRoute', 'dfUtility'])
    .constant('MOD_FILE_MANAGER_ROUTER_PATH', '/file-manager')
    .constant('MOD_FILE_MANAGER_ASSET_PATH', 'admin_components/adf-file-manager/')
    .config(['$routeProvider', 'MOD_FILE_MANAGER_ROUTER_PATH', 'MOD_FILE_MANAGER_ASSET_PATH',
        function ($routeProvider, MOD_FILE_MANAGER_ROUTER_PATH, MOD_FILE_MANAGER_ASSET_PATH) {
            $routeProvider
                .when(MOD_FILE_MANAGER_ROUTER_PATH, {
                    templateUrl: MOD_FILE_MANAGER_ASSET_PATH + 'views/main.html',
                    controller: 'FileCtrl',
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
    .run(['DSP_URL', '$templateCache', function (DSP_URL, $templateCache) {


    }])
    .controller('FileCtrl', ['$scope', 'DSP_URL', 'dfApplicationData', function($scope, DSP_URL, dfApplicationData) {



        $scope.$parent.title = 'Files';

        // Set module links
        $scope.links = [

            {
                name: 'manage-files',
                label: 'Manage',
                path: 'manage-files'
            }
        ];
    }])

    .directive('dfFileManager', ['MOD_FILE_MANAGER_ASSET_PATH', 'DSP_URL', function(MOD_FILE_MANAGER_ASSET_PATH, DSP_URL) {


        return {

            restrict: 'E',
            scope: false,
            templateUrl: MOD_FILE_MANAGER_ASSET_PATH + 'views/df-file-manager.html',
            link: function (scope, elem, attrs) {

                $( "#root-file-manager iframe" ).attr( "src", DSP_URL + '/filemanager/?path=/&allowroot=true').show();

                scope.$broadcast('filemanager:loaded');


            }
        }
    }]);
