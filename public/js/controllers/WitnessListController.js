angular.module('BlocksApp').controller('WitnessListController', function($stateParams, $rootScope, $scope, $http) {
    $scope.$on('$viewContentLoaded', function() {   
        // initialize core components
        App.initAjax();
    });

    $scope.page = 0;
    var totalPage = 0;
    $scope.getInfoList=function(page) {
      $http({
        method: 'POST',
        url: '/witnessListData',
        data: {"page":page, "totalPage":totalPage}
      }).success(function(repData) {
        $scope.page = repData.page;
        var pages = [];
        for(i=0; i<repData.totalPage; i++){
          pages.push(i+1);
        }
        $scope.pages = pages;
        totalPage = repData.totalPage;
        $scope.totalPage = repData.totalPage;
        $scope.listData = repData.list;
      });
    }

    $scope.getInfoList();
    
})