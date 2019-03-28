angular.module('BlocksApp').controller('PublicAPIController', function($stateParams, $rootScope, $scope, $http) {
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