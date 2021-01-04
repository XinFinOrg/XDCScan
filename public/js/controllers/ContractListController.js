angular.module('BlocksApp').controller('ContractListController', function($stateParams, $rootScope, $scope, $http) {
  $scope.$on('$viewContentLoaded', function() {   
      // initialize core components
      App.initAjax();
  });

  $scope.searchTokenInput = $stateParams.token ? $stateParams.token : undefined;
  

  $scope.page = 0;
  $scope.getInfoList=function(page) {
    $http({
        method: 'POST',
        url: '/contractListData',
        data: {"ERC": -1, "page":page,searchStr:$scope.searchTokenInput}
    }).then(function(repData) {
      $scope.page = repData.data.page;
      var pages = [];
      for(i=0; i<repData.data.totalPage; i++){
        pages.push(i+1);
      }
      $scope.pages = pages;
      $scope.totalPage = repData.data.totalPage;
      $scope.contracts = repData.data.list;
    });
  }

  $scope.getInfoList();
})