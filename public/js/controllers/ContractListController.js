angular.module('BlocksApp').controller('ContractListController', function($stateParams, $rootScope, $scope, $http) {
  $scope.$on('$viewContentLoaded', function() {   
      // initialize core components
      App.initAjax();
  });

  // $scope.searchTokenInput = $stateParams.token ? $stateParams.token : undefined;
  
  const getContracts = function() {
    $('#contracts-address').DataTable({
      processing: true,
      serverSide: true,
      autoWidth: true,
      paging: true,
      ajax: function(data, callback, settings) {
        data.ERC = -1;
        data.page = Math.ceil(data.start / data.length);
        data.pageSize = data.length;
        data.searchStr = data.search.value;
        $http.post('/contractListData', data).then(function(resp) {
          const data = resp.data.list.map(function(t) {
            return [t.address, t.tokenName || '', t.contractName || '', t.ERC ];
          });
          delete resp.data['list'];
          resp.data.data = data;
          callback(resp.data);
        });
      },
      lengthMenu: [
        [10, 20, 50, 100, -1],
        [10, 20, 50, 100, "All"] // change per page values here
      ],
      pageLength: 10,
      language: {
        lengthMenu: "_MENU_ Contracts",
        zeroRecords: "No contracts found",
        infoEmpty: "",
        infoFiltered: "(filtered from _MAX_ total contracts)"
      },
      order: [],
      columnDefs: [
        { orderable: false, targets: [0,1,2,3] },
        {
          render:
            function(data, type, row) {
              return `<a href="/${!!row[3] ? 'token' : 'addr'}/${data}">${data}</a>`;
            },
          targets: [0]
        },
        {
          render:
            function(data, type, row) {
              return !!data ? 'Yes' : 'No';
            },
          targets: [3]
        },
      ],
    });
  }

  getContracts();

  // $scope.page = 0;
  // $scope.getInfoList=function(page) {
  //   $http({
  //       method: 'POST',
  //       url: '/contractListData',
  //       data: {"ERC": -1, "page":page,searchStr:$scope.searchTokenInput}
  //   }).then(function(repData) {
  //     $scope.page = repData.data.page;
  //     var pages = [];
  //     for(i=0; i<repData.data.totalPage; i++){
  //       pages.push(i+1);
  //     }
  //     $scope.pages = pages;
  //     $scope.totalPage = repData.data.totalPage;
  //     $scope.contracts = repData.data.list;
  //   });
  // }

  // $scope.getInfoList();
})