angular.module('BlocksApp').controller('TokenController', function($stateParams, $rootScope, $scope, $http, $location) {
    $scope.$on('$viewContentLoaded', function() {   
        // initialize core components
        App.initAjax();
    });
    var activeTab = $location.url().split('#');
    if (activeTab.length > 1)
      $scope.activeTab = activeTab[1];

    var contractAddress;
    if($stateParams.hash.length==84){//contain two address
      contractAddress = $stateParams.hash.substr(0,42);
      $scope.acc = $stateParams.hash.substr(42,42);
    }else{
      contractAddress = $stateParams.hash;
    }
    $rootScope.$state.current.data["pageSubTitle"] = contractAddress; //replace with token name
    $scope.addrHash = isAddress(contractAddress) ? contractAddress : undefined;
    var address = $scope.addrHash;
    $scope.token = {"balance": 0};

    //fetch token stuff
    // if($location.$$search && $location.$$search.acc){
    //   $scope.acc = $location.$$search.acc;
    // }
    $http({
      method: 'POST',
      url: '/tokenrelay',
      data: {"action": "info", "address": address, 'fromAccount':$scope.acc}
    }).success(function(data) {
      console.log(data)
      $scope.token = data;
      $scope.token.address = address;
      $scope.addr = {"bytecode": data.bytecode};
      if (data.name)
        $rootScope.$state.current.data["pageTitle"] = data.name;

      //excute default tab function
      $scope.transferTokens(0);
    });

    
    $scope.form = {};
    $scope.errors = {};
    $scope.showTokens = false;
    $scope.getBalance = function(a) {
        var addr = a.toLowerCase();

        $scope.form.addrInput="";
        $scope.errors = {};

        $scope.form.tokens.$setPristine();
        $scope.form.tokens.$setUntouched();
        if (isAddress(addr)) {
          $http({
            method: 'POST',
            url: '/tokenrelay',
            data: {"action": "balanceOf", "user": addr, "address": address, 'fromAccount':$scope.acc}
          }).success(function(data) {
            console.log(data)
            $scope.showTokens = true;
            $scope.userTokens = data.tokens;
          });
        } else 
            $scope.errors.address = "Invalid Address";
    }

    $scope.transferPage = 0;
    $scope.transferTokens=function(transferPage) {
      console.log("【request】 tokenTransfer");
      $http({
        method: 'POST',
        url: '/tokenrelay',
        data: {"action": "tokenTransfer", "address": address, "transferPage":transferPage, 'fromAccount':$scope.acc}
      }).success(function(repData) {
        console.log("transfer_tokens:", repData);
        repData.forEach(function(record){
          record.amount = record.amount/10**parseInt($scope.token.decimals);
        })
        $scope.transfer_tokens = repData;
      });
    }

    $scope.internalPage = 0;
    $scope.internalTransaction=function(internalPage) {
      $http({
        method: 'POST',
        url: '/transactionRelay',
        data: {"action": "internalTX", "address": address, "internalPage":internalPage, 'fromAccount':$scope.acc}
      }).success(function(repData) {
        repData.forEach(function(record){
          record.amount = record.amount/10**parseInt($scope.token.decimals);
        })
        $scope.internalDatas = repData;
      });
    }
    
    // $scope.transactionPage = 0;
    // $scope.contractTransaction=function(transactionPage) {
    //   $http({
    //     method: 'POST',
    //     url: '/transactionRelay',
    //     data: {"action": "allTX", "address": address, 'fromAccount':$scope.acc, "transactionPage":transactionPage}
    //   }).success(function(repData) {
    //     $scope.contractTxList = repData;
    //   });
    // }
    //fetch all transactions
    

    
})
.directive('contractSource', function($http) {
  return {
    restrict: 'E',
    templateUrl: '/views/contract-source.html',
    scope: false,
    link: function(scope, elem, attrs){
        //fetch contract stuff
        $http({
          method: 'POST',
          url: '/compile',
          data: {"addr": scope.addrHash, "action": "find"}
        }).success(function(data) {
          scope.contract = data;
        });
      }
  }
})
