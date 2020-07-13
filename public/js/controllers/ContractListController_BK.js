angular.module('BlocksApp').controller('ContractListController', function($stateParams, $rootScope, $scope, $http) {
  $scope.$on('$viewContentLoaded', function() {   
      // initialize core components
      App.initAjax();
  });

  

  $scope.page = 0;
  $scope.getInfoList=function(page) {
    $("#address-transaction").DataTable({
      processing: true,
      serverSide: true,
      paging: true,
      ajax: function(data, callback, settings) {
        // get totalSupply only once.
    $http({
        method: 'POST',
        url: '/contractListData',
        data: {"ERC": -1, "page":page}
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
  },
  lengthMenu: [
    [20, 50, 100, 150, -1],
    [20, 50, 100, 150, "All"] // change per page values here
  ],
  pageLength: 20,
  order: [
    [3, "desc"]
  ],
  language: {
    lengthMenu: "_MENU_ accounts",
    zeroRecords: "No accounts found",
    infoEmpty: "",
    infoFiltered: "(filtered from _MAX_ total accounts)"
  },
  columnDefs: [
    { orderable: false, "targets": [0,1,2,4] },
    {
      render:
        function(data, type, row) {
          return '<a href="/addr/' + data +'">' + data + '</a>'
        },
      targets: [1]
    },
    {
      render:
        function(data, type, row) {
          return $filter('number')(data, 8);
        },
      targets: [3]
    },
    {
      render:
        function(data, type, row) {
          return $filter('number')(data, 4) + ' %';
        },
      targets: [4]
    }
  ]
});


  }
  $scope.getInfoList();
})