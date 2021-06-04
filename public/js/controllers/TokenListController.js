angular.module('BlocksApp').controller('TokenListController', function($stateParams, $rootScope, $scope, $http) {
    $scope.$on('$viewContentLoaded', function() {   
        // initialize core components
        App.initAjax();
    });
    $scope.settings = $rootScope.setup;
    $scope.searchTokenInput = $stateParams.token ? $stateParams.token : undefined;

    var tokenList = '/' + ($scope.settings.tokenList || 'tokens.json');
    $http.get(tokenList)
      .then(function(res){
        var contentType = res.headers('Content-Type');
        if (contentType.indexOf('/json') > 0) {
          $scope.contracts = res.data;
        } else {
          $scope.contracts = [];
        }
      })
      $scope.page = 0;
      var totalPage = 0;
      $scope.getInfoList=function(page) {
        $http({
          method: 'POST',
          url: '/tokenListData',
          data: {"ERC": 0, "page":page, "totalPage":totalPage,searchStr:$scope.searchTokenInput}
        }).then(function(resp) {
          $scope.page = resp.data.page;
          var pages = [];
          for(i=0; i<resp.data.totalPage; i++){
            pages.push(i+1);
          }
          $scope.pages = pages;
          totalPage = resp.data.totalPage;
          $scope.totalPage = resp.data.totalPage;
          $scope.contracts = resp.data.list;
        });
      }
      $scope.getInfoList();


})