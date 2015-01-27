# admin2
AngularJS administration application for the DSP

Administer your DSP from anywhere with Admin App 2.  Customize with themes from Bootswatch or roll your own with SCSS/SASS.  Concat, minify, and uglify component modules with Node.js, Grunt, and the included grunt script for a deployment ready application.

## Installing Admin App 2
Clone the repo.  Navigate to the top level directory of where you cloned the repo and type `bower install`.  **NOTE: you must have Node, Grunt, and GruntCLI installed.**  


## Building the app with Node and Grunt
Admin App 2 comes prepackaged with a grunt file that concats, minifies, uglifies, compresses and reorgs the source files into a more "transit" friendly manner.  It decreases load time and automatically busts client side caches so your changes will be seen the next time a client uses it without any pesky manual cache clearing.  This process will create a folder named `dist` that will contain the app after processing.  From here on out the phrase 'build the app' is refering to this process.  To run the build process simply type `grunt build` on the command line whilst in the top level directory of the app. **NOTE: you must have Node, Grunt, and GruntCLI installed.**  


## Administer your DSP from anywhere.
The Admin App 2 can be configured to manage your DSP from another remote server.  Simply open the `app.js` file contained in `app\scripts` directory and add your DSP Host name to the `DSP_URL` constant at the top.  You can now optionally build the app and deploy the `dist` directory.  You must enable CORS in the DSP for the server you will be deploying the app to.


## Theme Admin App 2
The Admin App 2 was built using Sass/Scss and compiled with Compass.  This requires [Ruby](https://www.ruby-lang.org/en/downloads/) and Compass.  Follow this [guide](http://compass-style.org/install/) to set it all up.  In `app/styles/sass/partials` you can find the stylesheets for all the custom parts of the admin app as well as a few bootswatch templates (these are named variables(1-8).scss).  All of these are added in a specific order in `styles.scss`.  To change to a different bootswatch theme simply find the '@import variables(1-8).scss' line and change the number.  Or download a different bootswatch theme and replace the current variables.scss with the new themes' variables.scss.  Dont forget to run compass to compile the stylesheets and then optionally build the app and deploy the dist directory.

## Admin App 2 Architecture
The Admin App 2 was designed to have plugable modules.  Every module contains it's own routes, events, and logic so as to remove one would not stop the app from working.  In order to faciliate speed when using Admin App 2 a module was designed as a central repository for data that is used frequently in the app.  Many other modules rely on this module for data to do their job but with a small bit of refactoring it can be removed to produce truly untethered modules.  The diagram below is a high level overview of the Application architecture.

**INSERT IMAGE OF APP ARCHITECTURE**


### Main Application
The main application files are located in two directories.  `scripts` and `views` located under the `app` directory.  The `scripts` directory contains your app.js file and a sub directory called `controllers` contains `main.js`.  Corresponding views for controllers defined in `main.js` can be found in the aforementioned `views` directory.  The `app.js` file contains a few constants.  The ones of note are the `DSP_URL`, `DSP_API_KEY`, and `ICON_SET`.  The `DSP_URL` allows a host to be set which the application and it's modules will refer to for api calls.  The `DSP_API_KEY` is the app name and is used in a config option defined below the constants that sets the api key for all calls made from the app.  The `ICON_SET` is used by the `dfIconService` to denote which icon set to use for the app (fontawesome, bootstrap, or user defined).  `app.js` also defines standard routes for login, logout, registering.  These routes have corresponding controllers defined in `main.js`.  

`main.js` defines app specific controllers.  The MainCtrl acts as a top level scope which other modules can query for app wide data. For example, our top level navigation and component navigation links are stored here in arrays which are passed to directives that render the links and control active link highlighting.  Whenever a module is added/removed it's link will need to be handled here.  But you shouldn't encounter this very often (or at all).

Authentication controllers provide attachment points for authentication/register events.  They implement sparse logic in dealing with auth/register events produced by the user management module.  This provides a decoupling between app specific logic for auth/register and the business logic of actually authenticating/registering a user.  See `main.js` comments for more info.

### Data repository and Utility modules

A data repository module called `dfApplicationData` facilitates the loading and management of frequently used application data.  It creates an object called `dfApplicationObj` in the browser session storage.  It contains generic methods to access, modify, and delete data in the application and on the server.  It also provides accessor methods to retrieve and save the actual dfApplicationObj.  While not recommened to interact with this object directly it is sometimes a neccesary evil.  The module also contains init code to check whether it is neccesary to build a new app object or to refresh the screen with local data as well as what apis to load.  

The utility module provides services, factories, directives, and filters related to the operation of modules.  Things like our icon service, navs, table filtering/pagination, etc are stored here.  Basically, things that multiple modules may need access to and/or have no other place to go.  

## Module Design

A module is defined in the usual AngularJS fashion.  `angular.module(MODULE_NAME, [DEPENDENCIES])`.  Below that line we define a few constants and config for the module.  Because modules are generally small SPA's we have included only one main route.  A sub section of the `dfApps` module is shown below to illustrate this point.  

```javascript
// Module definition
angular.module('dfApps', ['ngRoute', 'dfUtility', 'dfApplication', 'dfHelp', 'dfTable'])

    // Path constants are defined to facilitate ease of reorganization
    .constant('MOD_APPS_ROUTER_PATH', '/apps')

    .constant('MOD_APPS_ASSET_PATH', 'admin_components/adf-apps/')

    // A Route for the module is configured and a bit of access logic is included
    .config(['$routeProvider', 'MOD_APPS_ROUTER_PATH', 'MOD_APPS_ASSET_PATH',
        function ($routeProvider, MOD_APPS_ROUTER_PATH, MOD_APPS_ASSET_PATH) {
            $routeProvider
                .when(MOD_APPS_ROUTER_PATH, {
                    templateUrl: MOD_APPS_ASSET_PATH + 'views/main.html',
                    controller: 'AppsCtrl',
                    resolve: {
                        checkAppObj:['dfApplicationData', function (dfApplicationData) {
                            // is the app in init
                            if (dfApplicationData.initInProgress) {
                            
                                // don't load controller until it is finished
                                return dfApplicationData.initDeferred.promise;
                            }
                        }],

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
    
    // More module code



```

Every component module is designed in this way.  Modules will usually have a controller where module navigation(sidebar links) will be stored along with a module title.
```javascript

// Module config/routes/constants

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
        // additional logic if there are no apps present
        $scope.emptySectionOptions = {
            title: 'You have no Apps!',
            text: 'Click the button below to get started building your first application.  You can always create new applications by clicking the tab located in the section menu to the left.',
            buttonText: 'Create An App!',
            viewLink: $scope.links[1]
        };


        $scope.$on('$destroy', function (e) {

        });
    }])

```

Each module has a `main.html`.  In `main.html` there wil be directives that pertain to module funcitonality.  There is a sidebar navigation directive that takes the `links` array and generates navigation.  A few ng-if statements render the properly selected view.  Here is the `dfApps` module's `main.html` file.

```html
<div>
    <div class="col-md-2 df-sidebar-nav">
        <df-sidebar-nav></df-sidebar-nav>
    </div>
    <div class="col-md-10 df-section" df-fs-height >
        <df-manage-apps data-ng-if="activeView.path === 'manage-apps'"></df-manage-apps>
        <df-app-details data-ng-if="activeView.path === 'create-app'" data-new-app="true"></df-app-details>
        <df-import-app data-ng-if="activeView.path === 'import-app'"></df-import-app>
        <df-app-groups data-ng-if="activeView.path === 'app-groups'"></df-app-groups>
    </div>
</div>

```





