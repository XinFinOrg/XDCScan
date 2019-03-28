angular.module('BlocksApp').controller('BlockController', function($stateParams, $rootScope, $scope, $http, $location) {
    $scope.$on('$viewContentLoaded', function() {   
        // initialize core components
        App.initAjax();
        //TableAjax.init();
    });

    $rootScope.$state.current.data["pageSubTitle"] = $stateParams.number;
    $scope.blockNum = $stateParams.number;

    //fetch transactions
    $http({
      method: 'POST',
      url: '/block',
      data: {"block": $scope.blockNum}
    }).success(function(data) {
      if (data.error)
        $location.path("/err404/block/" + $scope.blockNum);
      else {
        // if(data.extraData && data.extraData.length>5){
        //   data.extraData = data.extraData.charCodeAt(3)+"."+data.extraData.charCodeAt(4)+"."+data.extraData.charCodeAt(5);
        // }
        $scope.block = data;
        $scope.block.datetime = new Date(data.timestamp*1000); 
      }
    });


})