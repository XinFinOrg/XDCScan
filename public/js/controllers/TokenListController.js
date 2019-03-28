angular.module('BlocksApp').controller('TokenListController', function($stateParams, $rootScope, $scope, $http) {
    $scope.$on('$viewContentLoaded', function() {   
        // initialize core components
        App.initAjax();
    });

    $scope.page = 0;
    var totalPage = 0;
    $scope.getInfoList=function(page) {
      $http({
        method: 'POST',
        url: '/tokenListData',
        data: {"ERC": 0, "page":page, "totalPage":totalPage}
      }).success(function(repData) {
        $scope.page = repData.page;
        var pages = [];
        for(i=0; i<repData.totalPage; i++){
          pages.push(i+1);
        }
        $scope.pages = pages;
        totalPage = repData.totalPage;
        $scope.totalPage = repData.totalPage;
        $scope.contracts = repData.list;
      });
    }

    $scope.getInfoList();
    
})