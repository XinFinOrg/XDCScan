angular.module('BlocksApp').controller('AddressListController', function($stateParams, $rootScope, $scope, $http) {
    $scope.$on('$viewContentLoaded', function() {   
        // initialize core components
        App.initAjax();
    });

    var addressType = $stateParams.type;
    if(!addressType){
      addressType = -1;
    }else{
      addressType = addressType.trim();
      if(addressType=="normal"){
        addressType = 0;
      }else if(addressType=="contract"){
        addressType=1;
      }else if(addressType=="masternode"){
        addressType=2;
      }else{
        addressType = -1;
      }
    }
    
    $scope.page = 0;
    totalPage = 0;
    $scope.getInfoList=function(page) {
      $http({
        method: 'POST',
        url: '/addressListData',
        data: {"page":page, "totalPage":totalPage, "addressType":addressType}
      }).success(function(repData) {
        $scope.page = repData.page;
        var pages = [];
        for(i=0; i<repData.totalPage; i++){
          pages.push(i+1);
        }
        $scope.pages = pages;
        totalPage = repData.totalPage;
        $scope.totalPage = repData.totalPage;
        for(var i=0; i<repData.list.length; i++){
          repData.list[i].balance = repData.list[i].balance/(10**18);
        }
        $scope.list = repData.list;
      });
    }

    $scope.getInfoList();
    
})