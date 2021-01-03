angular.module('BlocksApp').controller('HomeController', function($rootScope, $scope, $http, $timeout) {
  $scope.$on('$viewContentLoaded', function() {
      // initialize core components
      App.initAjax();
  });
  let regisnMNCount = 5;

  $scope.$on("$destroy", function() {
      clearInterval($scope.autoReloadBlocks);
  });

  var URL = '/data';

  $rootScope.isHome = true;

  $scope.reloadBlocks = function() {
    $scope.blockLoading = true;
    $http({
      method: 'POST',
      url: URL,
      data: {"action": "latest_blocks"}
    }).then(function(resp) {
      $scope.latest_blocks = resp.data.blocks;
      $scope.blockLoading = false;
      $scope.latest_blocks = resp.data.blocks;

      //get latest data.
      // console.log(resp.data.percent_change_24h,"22222")
      $scope.blockHeight = resp.data.blockHeight;
      $scope.epoch = (resp.data.blockHeight / 900).toFixed()
      $scope.blockTime = resp.data.blockTime;
      $scope.TPS = resp.data.TPS;
      $scope.quoteUSD = resp.data.quoteUSD;
      $scope.quoteINR = resp.data.quoteINR;
      $scope.quoteEUR = resp.data.quoteEUR;
      $scope.todayDailyRewards = resp.data.todayRewards;
      $scope.totalXDC = resp.data.totalXDCSupply;
      $scope.totalNodes = resp.data.totalMNCount;
      $scope.XDCCirculatingSupply = resp.data.XDCCirculatingSupply;
      $scope.totalXDCinUSD = (resp.data.totalXDCSupply * parseFloat($scope.quoteUSD)).toFixed();
      $scope.totalXDCinINR = (resp.data.totalXDCSupply * parseFloat($scope.quoteINR)).toFixed();
      $scope.totalXDCinEUR = (resp.data.totalXDCSupply * parseFloat($scope.quoteEUR)).toFixed();
      $scope.totalXDCXDCCirculatingSupplyinUSD = (resp.data.XDCCirculatingSupply * parseFloat($scope.quoteUSD)).toFixed();
      $scope.totalXDCXDCCirculatingSupplyinINR = (resp.data.XDCCirculatingSupply * parseFloat($scope.quoteINR)).toFixed();
      $scope.totalXDCXDCCirculatingSupplyinEUR = (resp.data.XDCCirculatingSupply * parseFloat($scope.quoteEUR)).toFixed();
      $scope.accountsCount = resp.data.accountsCount;
      $scope.transactionCount = resp.data.transactionCount;
      $scope.totalBurntValue = resp.data.totalXDCBurntValue.toFixed();
      $scope.totalStakedValue = resp.data.totalXDCStakedValue;
      $scope.CMCPrice_change24h = (resp.data.percent_change_24h).toFixed(2);
      $scope.activeAddresses = resp.data.activeAddresses;


    });

    // todayRewards();
    // totalNodes();
    // totalStakedValue();
    // totalBurntValue();
    // totalXDC()
    // FetchUSDPrice().then(() => totalXDC()).catch(e => {
    //   console.log("[*] exception at HomeController.FetchUSDPrice / totalXDC: ", e)
    // });
    // getTotalRewards();
  }

  function todayRewards(){
    $http({
      method: 'POST',
      url: '/todayRewards',
      data: {}
    }).then(function(resp) {
      $scope.todayRewards = resp.data;
    });
  }
  function totalStakedValue(){
    $http({
      method: 'POST',
      url: '/totalStakedValue',
      data: {}
    }).then(function(res) {
      $scope.totalStakedValue = res.data;
    });
  }
  function totalBurntValue(){
    $http({
      method: 'POST',
      url: '/totalBurntValue',
      data: {}
    }).then(function(res) {
      $scope.totalBurntValue = res.data;
    });
  }
  
  function totalNodes(){
    $http({
      method: 'POST',
      url: '/totalMasterNodes',
      data: {}
    }).then(function(resp) {
      $scope.totalNodes = resp.data;
    });
  }
  // function FetchUSDPrice(){
  //   return new Promise((resolve, reject) => {
  //     $http({
  //       method:"post",        
  //       url: '/getCmcDataUsd',  
  //     }).then(function(data) {
  //       // console.log(data)
  //       // $scope.CMCPrice_USD = (data.data.data.price).toFixed(5);
  //       // $scope.CMCPrice_change24h = (data.data.data.percent_change_24h).toFixed(2);
  //       resolve();
  //     }).catch(e => {
  //       console.log("EXCEPTION: ", e);
  //     });
  //   })
    
  // }
  function totalXDC(){
    $http({
      method: 'GET',
      url: '/totalXDCSupply',
      data: {}
    }).then(function(resp) {
      // console.log(resp)
      $scope.totalXDC = resp.data;
      $scope.totalXDCinUSD = (resp.data * parseFloat($scope.quoteUSD)).toFixed();
    });
  }
  function getTotalRewards(){
    $http({
      method: 'POST',
      url: '/todayRewards',
      data: {}
    }).then(function(resp) {
      $scope.todayDailyRewards = resp.data;
    });
  }
  $('td').each(function() {
    var val = $(this).text(), n = +val;
    if (!isNaN(n) && /^\s*[+-]/.test(val)) {
      $(this).addClass(val >= 0 ? 'pos' : 'neg')
    }
  })
  $scope.reloadTransactions = function() {
    $scope.txLoading = true;
    $http({
      method: 'POST',
      url: URL,
      data: {"action": "latest_txs"}
    }).then(function(resp) {
      $scope.latest_txs = resp.data.txs;
      $scope.txLoading = false;
    });
  }
  $scope.reloadBlocks();
  $scope.reloadTransactions();
  $scope.txLoading = false;
  $scope.blockLoading = false;
  $scope.settings = $rootScope.setup;
  $scope.autoReloadInfo = setInterval(() => {
    $scope.reloadBlocks();
    $scope.reloadTransactions();
  }, 20000)
})
.directive('simpleSummaryStats', function($http) {
return {
  restrict: 'E',
  templateUrl: '/views/simple-summary-stats.html',
  scope: true,
  link: function(scope, elem, attrs){
    scope.stats = {};
    var statsURL = "/web3relay";
    $http.post(statsURL, {"action": "hashrate"})
     .then(function(res){
        scope.stats.hashrate = res.data.hashrate;
        scope.stats.difficulty = res.data.difficulty;
        scope.stats.blockHeight = res.data.blockHeight;
        scope.stats.blockTime = res.data.blockTime;
        scope.stats.activeAddresses = res.data.activeAddresses;
        scope.stats.cloTransferredAmount = res.data.cloTransferredAmount;
        scope.stats.quoteUSD = res.data.quoteUSD;
        scope.stats.quoteINR = res.data.quoteINR;
        scope.stats.quoteEUR = res.data.quoteEUR;
        //console.log(res);
});
    }
}
})
.directive('siteNotes', function() {
return {
  restrict: 'E',
  templateUrl: '/views/site-notes.html'
}
})
//OLD CODE DONT USE
.directive('summaryStats', function($http) {
return {
  restrict: 'E',
  templateUrl: '/views/summary-stats.html',
  scope: true,
  link: function(scope, elem, attrs){
    scope.stats = {};

    var etcEthURL = "/stats";
    var etcPriceURL = "https://api.coinmarketcap.com/v1/ticker/ethereum-classic/";
    var ethPriceURL = "https://api.coinmarketcap.com/v1/ticker/ethereum/"
    scope.stats.ethDiff = 1;
    scope.stats.ethHashrate = 1;
    scope.stats.usdEth = 1;
    $http.post(etcEthURL, {"action": "etceth"})
     .then(function(res){
        scope.stats.etcHashrate = res.data.etcHashrate;
        scope.stats.ethHashrate = res.data.ethHashrate;
        scope.stats.etcEthHash = res.data.etcEthHash;
        scope.stats.ethDiff = res.data.ethDiff;
        scope.stats.etcDiff = res.data.etcDiff;
        scope.stats.etcEthDiff = res.data.etcEthDiff;
      });
    $http.get(etcPriceURL)
     .then(function(res){
        scope.stats.usdEtc = parseFloat(res.data[0]["price_usd"]);
        scope.stats.usdEtcEth = parseInt(100*scope.stats.usdEtc/scope.stats.usdEth);
      });
    $http.get(ethPriceURL)
     .then(function(res){
        scope.stats.usdEth = parseFloat(res.data[0]["price_usd"]);
        scope.stats.usdEtcEth = parseInt(100*scope.stats.usdEtc/scope.stats.usdEth);
        scope.stats.ethChange = parseFloat(res.data.change);
      });

    }
}
});
