angular.module('BlocksApp').controller('ContractListController', function($stateParams, $rootScope, $scope, $http) {
  $scope.$on('$viewContentLoaded', function() {   
      // initialize core components
      App.initAjax();
  });

  

  $scope.page = 0;
  $scope.getInfoList=function(page) {
    $http({
        method: 'POST',
        url: '/contractListData',
        data: {"ERC": -1, "page":page}
    }).success(function(repData) {
      $scope.page = repData.page;
      var pages = [];
      for(i=0; i<repData.totalPage; i++){
        pages.push(i+1);
      }
      $scope.pages = pages;
      $scope.totalPage = repData.totalPage;
      $scope.contracts = repData.list;
    });
  }

  $scope.getInfoList();
})