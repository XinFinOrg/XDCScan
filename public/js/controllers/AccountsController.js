angular.module('BlocksApp').controller('AccountsController', function($stateParams, $rootScope, $scope, $http, $filter) {
  $scope.settings = $rootScope.setup;

  // fetch accounts
  var getAccounts = function() {
    $("#table_accounts").DataTable({
      processing: true,
      serverSide: true,
      paging: true,
      ajax: function(data, callback, settings) {
        // get totalSupply only once.
        data.totalSupply = $scope.totalSupply || -1;
        data.recordsTotal = $scope.totalAccounts || 0;
        $http.post('/richlist', data).then(function(resp) {
          // set the totalSupply
          if (resp.data.totalSupply) {
            $scope.totalSupply = resp.data.totalSupply;
          }
          // set the number of total accounts
          $scope.totalAccounts = resp.data.recordsTotal;

          // fixup data to show percentages
          var newData = resp.data.data.map(function(item) {
            return [item[0], item[1], item[2], item[3], (item[3] / $scope.totalSupply) * 100, item[4]];
          });
          resp.data.data = newData;
          callback(resp.data);
        });
      },
      lengthMenu: [
        [20, 50, 100, 150, -1],
        [20, 50, 100, 150, "All"] // change per page values here
      ],
      pageLength: 20,
      language: {
        lengthMenu: "_MENU_ Accounts",
        zeroRecords: "No accounts found",
        infoEmpty: "",
        infoFiltered: "(filtered from _MAX_ total accounts)"
      },
      order: [],
      columnDefs: [
        { orderable: false, targets: [0,1,2,3,4] },
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
  };

  getAccounts();
});
