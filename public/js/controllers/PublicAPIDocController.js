angular.module('BlocksApp').controller('PublicAPIDocController', function($stateParams, $rootScope, $scope, $http,$location,$window) {
    $scope.$on('$viewContentLoaded', function() {   
        // initialize core components
        App.initAjax();
        $scope.baseUrl = new $window.URL($location.absUrl()).origin;
        // $scope.baseUrl = $browser.baseHref();
        // $scope.currentUrl ='ff';
    });
    // $scope.$on('$viewContentLoaded', function() {   
    //     // initialize core components
    //     App.initAjax();
    // });

    // var executeAPI = function(params){
    //   $http({
    //     method: 'POST',
    //     url: '/publicAPIData',
    //     data: {"params": params}
    //   }).success(function(data) {
    //     if (data.error)
    //       $location.path("/err404/publicAPI/" + params);
    //     else {
    //       $scope.data = data;
    //     }
    //   });
    // }

    // executeAPI($stateParams.params);
})