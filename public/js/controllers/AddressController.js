angular
  .module("BlocksApp")
  .controller(
    "AddressController",
    function ($stateParams, $rootScope, $scope, $http, $location, $filter) {
      $scope.$on("$viewContentLoaded", function () {
        // initialize core components
        App.initAjax();
      });
      var activeTab = $location.url().split("#");
      if (activeTab.length > 1) $scope.activeTab = activeTab[1];

      $rootScope.$state.current.data["pageSubTitle"] = $stateParams.hash;
      $scope.addrHash = $stateParams.hash;
      $scope.addr = { balance: 0, count: 0 };

      //get address balance
      $http({
        method: "POST",
        url: "/web3relay",
        //data: {"addr": $scope.addrHash, "options": ["balance", "count", "bytecode"]}
        data: { addr: $scope.addrHash, options: ["balance"] },
      }).then(function (resp) {
        $scope.addrBalance = resp.data.balance;
        $scope.balanceUSD = resp.data.balanceUSD;
        $scope.quoteUSD = resp.data.quoteUSD;
        $scope.balanceEUR = resp.data.balanceEUR;
        $scope.quoteEUR = resp.data.quoteEUR;
        $scope.balanceINR = resp.data.balanceINR;
        $scope.quoteINR = resp.data.quoteINR;
        $scope.hackedTag = resp.data.hackedTag;
      });

      var activeTab = $location.url().split("#");
      if (activeTab.length > 1) {
        $scope.activeTab = activeTab[1];
      } else {
        $scope.activeTab = "allTransactions";
      }

      //try to get contract info
      $http({
        method: "POST",
        url: "/tokenrelay",
        data: { action: "info", address: $scope.addrHash },
      }).then(function (resp) {
        // fetchInternalTxs();
        if (resp.data) {
          $rootScope.$state.current.data["pageTitle"] = "Contract Address";
          if (resp.data.creator) $scope.isContract = true;
          $scope.token = resp.data;
        }
      });

      //transacton counts
      $http({
        method: "POST",
        url: "/addrTXcounts",
        //data: {"addr": $scope.addrHash, "options": ["balance", "count", "bytecode"]}
        data: { address: $scope.addrHash },
      }).then(function (resp) {
        $scope.count = resp.data.count;
        if ($scope.activeTab === "allTransactions") {
          $scope.fetchTxs();
        } else if ($scope.activeTab === "internalTransactions") {
          $scope.internalTransaction();
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
      let isInitializedAllTxnsTbl = false;
      $scope.fetchTxs = function () {
        if (!!isInitializedAllTxnsTbl) {
          return;
        }

        isInitializedAllTxnsTbl = true;

        $("#address-transaction").DataTable({
          processing: true,
          serverSide: true,
          paging: true,
          ajax: {
            url: "/addr",
            type: "POST",
            data: {
              addr: $scope.addrHash,
              count: $scope.count,
              totalTX: $scope.count,
            },
          },
          lengthMenu: [
            [20, 50, 100, 150, -1],
            [20, 50, 100, 150, "All"], // change per page values here
          ],
          pageLength: 20,
          language: {
            lengthMenu: "_MENU_ Transactions",
            zeroRecords: "No transactions found",
            infoEmpty: "",
            infoFiltered: "(filtered from _MAX_ total transactions)",
          },
          order: [],
          columnDefs: [
            { orderable: false, targets: [0, 1, 2, 3, 4, 5, 6] },
            { type: "date", targets: 6 },
            {
              render: function (data, type, row) {
                // return '<a href="/addr/' + data +'">' + data + '</a>'
                if (data != $scope.addrHash)
                  return (
                    '<a href="/addr/' +
                    data +
                    '">' +
                    data.substr(0, 21) +
                    "...</a>"
                  );
                else return `${data.substr(0, 21)}...`;
              },
              targets: [2, 3],
            },
            {
              render: function (data, type, row) {
                return '<a href="/block/' + data + '">' + data + "</a>";
              },
              targets: [1],
            },
            {
              render: function (data, type, row) {
                if (row[7] == 0)
                  return (
                    '<span ng-show="false"  alt="transaction fail"><image src="img/FAIL.png"/></span>' +
                    '<a href="/tx/' +
                    data +
                    '">' +
                    data.substr(0, 21) +
                    "...</a>"
                  );
                else
                  return (
                    '<a href="/tx/' +
                    data +
                    '">' +
                    data.substr(0, 21) +
                    "...</a>"
                  );
              },
              targets: [0],
            },
            {
              render: function (data, type, row) {
                return `${$filter("timeDuration")(data)} ago`;
              },
              targets: [6],
            },
          ],
        });
      };

      let isInitializedInternalTxnsTbl = false;
      $scope.internalTransaction = function () {
        if (!!isInitializedInternalTxnsTbl) {
          return;
        }

        isInitializedInternalTxnsTbl = true;

        $("#address-internal-txns").DataTable({
          processing: true,
          serverSide: true,
          paging: true,
          ajax: function (data, callback, settings) {
            data.action = "internalTX";
            data.address = $scope.addrHash;
            data.fromAccount = $scope.acc;
            data.page = Math.ceil(data.start / data.length);
            data.pageSize = data.length;

            $http.post("/transactionRelay", data).then(function (resp) {
              const decimals = $scope.token
                ? parseInt($scope.token.decimals)
                : NaN;

              const data = resp.data.list.map(function (t, index) {
                if (!isNaN(decimals)) {
                  t.amount = t.amount / 10 ** decimals;
                }
                return [
                  t.hash,
                  t.blockNumber,
                  t.from,
                  t.to,
                  t.value,
                  t.timestamp,
                ];
              });

              delete resp.data["list"];
              resp.data.data = data;
              callback(resp.data);
            });
          },
          lengthMenu: [
            [20, 50, 100],
            [20, 50, 100], // change per page values here
          ],
          pageLength: 20,
          language: {
            lengthMenu: "_MENU_ Transactions",
            zeroRecords: "No transactions found",
            infoEmpty: "",
            infoFiltered: "(filtered from _MAX_ total transactions)",
          },
          order: [],
          columnDefs: [
            { orderable: false, targets: [0, 1, 2, 3, 4, 5] },
            {
              render: function (data, type, row) {
                return `<a class="hash-tag text-truncate" href="/tx/${data}?isTransfer=true">${data.substr(
                  0,
                  21
                )}...</a>`;
              },
              targets: [0],
            },
            {
              render: function (data, type, row) {
                return `<a href="/block/${data}">${data}</a>`;
              },
              targets: [1],
            },
            {
              render: function (data, type, row) {
                // return '<a href="/addr/' + data +'">' + data + '</a>'
                if (data != $scope.addrHash)
                  return (
                    '<a href="/addr/' +
                    data +
                    '">' +
                    data.substr(0, 21) +
                    "...</a>"
                  );
                else return `${data.substr(0, 21)}...`;
              },
              targets: [2, 3],
            },
            {
              render: function (data, type, row) {
                return `<p style="width:100%; text-align:right">${data}</p>`;
              },
              targets: [4],
            },
            {
              render: function (data, type, row) {
                return `${$filter("timeDuration")(data)} ago`;
              },
              targets: [5],
            },
          ],
        });
      };
    }
  )

  .directive("contractSource", function ($http) {
    return {
      restrict: "E",
      templateUrl: "/views/contract-source.html",
      scope: false,
      link: function (scope, elem, attrs) {
        //fetch contract stuff
        $http({
          method: "POST",
          url: "/compile",
          data: { addr: scope.addrHash, action: "find" },
        }).then(function (resp) {
          // console.log(data);
          scope.contract = resp.data;
        });
      },
    };
  });
