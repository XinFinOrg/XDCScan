angular.module('BlocksApp').controller('AddressController', function($stateParams, $rootScope, $scope, $http, $location) {
  $scope.$on('$viewContentLoaded', function() {   
      // initialize core components
      App.initAjax();
  });
  var activeTab = $location.url().split('#');
  if (activeTab.length > 1)
    $scope.activeTab = activeTab[1];

  $rootScope.$state.current.data["pageSubTitle"] = $stateParams.hash;
  $scope.addrHash = $stateParams.hash;
  $scope.addr = {"balance": 0, "count": 0};
  
  //get address balance
  $http({
    method: 'POST',
    url: '/web3relay',
    //data: {"addr": $scope.addrHash, "options": ["balance", "count", "bytecode"]}
    data: {"addr": $scope.addrHash, "options": ["balance"]}
  }).then(function(resp) {
    $scope.addrBalance = resp.data.balance;
    $scope.balanceUSD = resp.data.balanceUSD;
    $scope.quoteUSD = resp.data.quoteUSD;
    $scope.balanceEUR = resp.data.balanceEUR;
    $scope.quoteEUR = resp.data.quoteEUR;
    $scope.balanceINR = resp.data.balanceINR;
    $scope.quoteINR = resp.data.quoteINR;
    $scope.hackedTag = resp.data.hackedTag;

  });

  //transacton counts
  $http({
    method: 'POST',
    url: '/addrTXcounts',
    //data: {"addr": $scope.addrHash, "options": ["balance", "count", "bytecode"]}
    data: {"address": $scope.addrHash}
  }).then(function(resp) {
    $scope.count = resp.data.count;
    fetchTxs(resp.data.count);
  });

  //try to get contract info
  $http({
    method: 'POST',
    url: '/tokenrelay',
    data: {"action": "info", "address": $scope.addrHash}
  }).then(function(resp) {
    // fetchInternalTxs();
    if(resp.data){
      $rootScope.$state.current.data["pageTitle"] = "Contract Address";
      if(resp.data.creator)
        $scope.isContract = true;
      $scope.token = resp.data;
    }
  });

  // fetch ethf balance 
  // $http({
  //   method: 'POST',
  //   url: '/fiat',
  //   data: {"addr": $scope.addrHash}
  // }).then(function(data) {
  //   $scope.addr.ethfiat = data.balance;
  // });

  //fetch all transactions
  var fetchTxs = function(count) {
    $("#address-transaction").DataTable({
      processing: true,
      serverSide: true,
      autoWidth: true,
      paging: true,
      ajax: {
        url: '/addr',
        type: 'POST',
        data: { "addr": $scope.addrHash, "count": count, "totalTX":$scope.count}
      },
      lengthMenu: [
        [20, 50, 100, 150, -1],
        [20, 50, 100, 150, "All"] // change per page values here
      ],
      pageLength: 20,
      order: [
        [6, "desc"]
      ],
      language: {
        lengthMenu: "_MENU_ accounts",
        zeroRecords: "No accounts found",
        infoEmpty: "",
        infoFiltered: "(filtered from _MAX_ total accounts)"
      },
      columnDefs: [
        { orderable: false, "targets": [0,2,3] },
        {type: "date", "targets": 6},

        {
          render:
            function(data, type, row) {
              // return '<a href="/addr/' + data +'">' + data + '</a>'
              if (data != $scope.addrHash)
                return '<a href="/addr/'+data+'">'+data +   '</a>'
              else
                return data
            },
          targets: [2,3]
        },
        {
          render:
            function(data, type, row) {
              return '<a href="/block/'+data+'">'+data+'</a>'
            },
          targets: [1]
        },
        {
          render:
            function(data, type, row) {
              if(row[7]==0)
              return '<span ng-show="false"  alt="transaction fail"><image src="img/FAIL.png"/></span>'+'<a href="/tx/'+data+'">'+data.substr(0,21)+'...</a>'
            else
              return '<a href="/tx/'+data+'">'+data.substr(0,21)+'...</a>'
            },
          targets: [0]
        },
        {
          render:
            function(data, type, row) {
              return getDuration(data).toString();

            },
          targets: [6]
        }
      ]
    });
  }
  

  $scope.internalPage = 0;
  $scope.internalTransaction=function(internalPage) {
    $http({
      method: 'POST',
      url: '/transactionRelay',
      data: {"action": "internalTX", "address": $scope.addrHash, "internalPage":internalPage, 'fromAccount':$scope.acc}
    }).then(function(repData) {
      repData.data.forEach(function(record){
        var decimals = parseInt($scope.token.decimals);
        if(isNAN(decimals))
          record.amount = record.amount;
        else
          record.amount = record.amount/(10**decimals);
      })
      $scope.internalDatas = repData.data;
    });
  }

  
 
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
      }).then(function(resp) {
        // console.log(data);
        scope.contract = resp.data;
      });
    }
}
})
