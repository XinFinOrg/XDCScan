angular.module('BlocksApp').controller('TxController', function($stateParams, $rootScope, $scope, $http, $location) {
    $scope.$on('$viewContentLoaded', function() {   
        // initialize core components
        App.initAjax();
    });

    $rootScope.$state.current.data["pageSubTitle"] = $stateParams.hash;
    $scope.hash = $stateParams.hash;
    $scope.tx = {"hash": $scope.hash};

    //fetch web3 stuff
    var isTransfer = false;
    if($location.$$search && $location.$$search.isTransfer)
      isTransfer = true;
    $http({
      method: 'POST',
      url: '/transactionRelay',
      data: {"tx": $scope.hash, "isTransfer": isTransfer}
    }).success(function(data) {
      $scope.tx = data;
      $scope.isTransfer = data.isTransfer;
      if (data.timestamp)
        $scope.tx.datetime = new Date(data.timestamp*1000); 
      if (data.isTrace) // Get internal txs
        //fetchInternalTxs();
        $scope.logs=[];
        $scope.getLogs();
    });

    // var fetchInternalTxs = function() {
    //   $http({
    //     method: 'POST',
    //     url: '/web3relay',
    //     data: {"tx_trace": $scope.hash}
    //   }).success(function(data) {
    //     $scope.internal_transactions = data;
    //   });      
    // }

    $scope.getLogs = function() {
      if($scope.logs){
        return;
      }
      $http({
        method: 'POST',
        url: '/eventLog',
        data: {"txHash": $scope.hash}
      }).success(function(data) {
        $scope.logs = data;
        // for(var i=0; i<$scope.logs.length; i++){
        //   $scope.logs[i].params = splitParam($scope.logs[i].to);
        // }
        
      });      
    }

    // var splitParam = function(paramsStr){
    //   var params = [];
    //   var step = 0;
    //   var addNum;
    //   for(var i=0; i<paramsStr.length; i=i+addNum){
    //     if(i==0){
    //       params.push(paramsStr.substr(0, 10));
    //       addNum=10;
    //     }
    //     else{
    //       params.push(paramsStr.substr(10+(step-1)*64, 64));
    //       addNum=64;
    //     }
    //     step++;
    //   }
    //   return params;
    // }
})
