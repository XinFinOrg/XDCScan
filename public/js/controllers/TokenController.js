angular
  .module("BlocksApp")
  .controller(
    "TokenController",
    function ($stateParams, $rootScope, $scope, $http, $location, $filter) {
      $scope.$on("$viewContentLoaded", function () {
        // initialize core components
        App.initAjax();
      });
      var activeTab = $location.url().split("#");
      if (activeTab.length > 1) {
        $scope.activeTab = activeTab[1];
      } else {
        $scope.activeTab = "tokenTransfers";
      }
      console.log("activeTab", $scope.activeTab);

      $rootScope.$state.current.data["pageSubTitle"] = $stateParams.hash; //replace with token name
      // $scope.addrHash = isAddress($stateParams.hash) ? $stateParams.hash : undefined;
      $scope.addrHash = $stateParams.hash ? $stateParams.hash : undefined;

      var address = $scope.addrHash;
      $scope.token = { balance: 0 };
      $scope.settings = $rootScope.setup;

      //fetch dao stuff
      $http({
        method: "POST",
        url: "/tokenrelay",
        data: { action: "info", address: address },
      }).then(function (resp) {
        console.log(resp.data);
        $scope.token = resp.data;
        $scope.token.address = address;
        $scope.addr = { bytecode: resp.data.bytecode };
        if (resp.data.name)
          $rootScope.$state.current.data["pageTitle"] = resp.data.name;

        if ($scope.activeTab === "tokenTransfers") {
          $scope.transferTokens();
        } else if ($scope.activeTab === "tokenHolders") {
          $scope.tokenHolders();
        }
      });

      // fetch transactions
      // var fetchTxs = function (after) {
      //   var data = { action: "transaction", address: $scope.addrHash };
      //   if (after && after > 0) {
      //     data.after = after;
      //   }
      //   $http({
      //     method: "POST",
      //     url: "/tokenrelay",
      //     data,
      //   }).then(function (resp) {
      //     $scope.contract_transactions = resp.data.transaction;
      //     console.log('$scope.contract_transactions', $scope.contract_transactions);
      //     $scope.page = {
      //       count: resp.data.count,
      //       after: resp.data.after,
      //       next: resp.data.after + resp.data.count,
      //     };
      //     if (resp.data.after > 0) {
      //       $scope.page.prev = resp.data.after - resp.data.count;
      //     } else {
      //       $scope.page.prev = 0;
      //     }
      //   });
      // };

      // fetchTxs();
      // $scope.fetchTxs = fetchTxs;

      $scope.form = {};
      $scope.errors = {};
      $scope.showTokens = false;
      $scope.getBalance = function (a) {
        var addr = a.toLowerCase();

        $scope.form.addrInput = "";
        $scope.errors = {};

        $scope.form.tokens.$setPristine();
        $scope.form.tokens.$setUntouched();
        if (isAddress(addr)) {
          $http({
            method: "POST",
            url: "/tokenrelay",
            data: { action: "balanceOf", user: addr, address: address },
          }).then(function (resp) {
            $scope.showTokens = true;
            $scope.userTokens = resp.data.tokens;
          });
        } else $scope.errors.address = "Invalid Address";
      };

      let isInitializedTokenTxnsTbl = false;
      $scope.transferTokens = function () {
        console.log("【request】 tokenTransfer");
        if (!!isInitializedTokenTxnsTbl) {
          return;
        }

        isInitializedTokenTxnsTbl = true;

        $("#token-txns").DataTable({
          processing: true,
          serverSide: true,
          paging: true,
          ajax: function (data, callback, settings) {
            data.action = "tokenTransfer";
            data.address = address;
            data.fromAccount = $scope.acc;
            data.page = Math.ceil(data.start / data.length);
            data.pageSize = data.length;

            $http.post("/tokenrelay", data).then(function (resp) {
              const data = resp.data.list.map(function (t) {
                t.amount =
                  t.value / parseFloat(10 ** parseInt($scope.token.decimals));
                return [
                  t.hash,
                  t.timestamp,
                  t.blockNumber,
                  t.from,
                  t.to,
                  t.amount,
                  t.method,
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
          columnDefs: [
            { orderable: false },
            {
              render: function (data, type, row) {
                return `<a href="/tx/${data}?isTransfer=true">${data.substr(
                  0,
                  21
                )}...</a>`;
              },
              targets: [0],
            },
            {
              render: function (data, type, row) {
                return `${$filter("timeDuration")(data)} ago`;
              },
              targets: [1],
            },
            {
              render: function (data, type, row) {
                return `<a href="/block/${data}">${data}</a>`;
              },
              targets: [2],
            },
            {
              render: function (data, type, row) {
                return `<a href="/addr/${data}">${data.substr(0, 21)}...</a>`;
              },
              targets: [3, 4],
            },
            {
              render: function (data, type, row) {
                return `<p style="width:100%; text-align:right">${data}</p>`;
              },
              targets: [5],
            },
            {
              render: function (data, type, row) {
                return `<span class="label label-sm label-info">${data}</span>`;
              },
              targets: [6],
            },
          ],
        });
      };

      let isInitializedTokenHolderTbl = false;
      $scope.tokenHolders = function () {
        console.log("【request】 tokenHolder");
        if (!!isInitializedTokenHolderTbl) {
          return;
        }

        isInitializedTokenHolderTbl = true;

        $("#token-holders").DataTable({
          processing: true,
          serverSide: true,
          paging: true,
          ajax: function (data, callback, settings) {
            data.action = "tokenHolder";
            data.address = address;
            data.page = Math.ceil(data.start / data.length);
            data.pageSize = data.length;

            $http.post("/tokenrelay", data).then(function (resp) {
              let total = 0;
              resp.data.list.map(function (t) {
                t.quantity =
                  Number(t.balance) /
                  parseFloat(10 ** parseInt($scope.token.decimals));
                t.value = t.quantity * parseFloat($scope.token.tokenPrice);

                total += t.quantity;
              });

              resp.data.list.sort(function (a, b) {
                return b.quantity - a.quantity;
              });

              const data = resp.data.list.map(function (t, index) {
                t.percentage = t.quantity / total;

                return [
                  index + 1,
                  t.address,
                  t.quantity,
                  t.percentage,
                  t.value,
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
            lengthMenu: "_MENU_ Holders",
            zeroRecords: "No holders found",
            infoEmpty: "",
            infoFiltered: "(filtered from _MAX_ total holders)",
          },
          columnDefs: [
            { orderable: false },
            {
              render: function (data, type, row) {
                return `<a href="/addr/${data}">${data}</a>`;
              },
              targets: [1],
            },
            {
              render: function (data, type, row) {
                return `${$filter("number")(data)}`;
              },
              targets: [2],
            },
            {
              render: function (data, type, row) {
                return `${$filter("percentage")(data, 6)}`;
              },
              targets: [3],
            },
            {
              render: function (data, type, row) {
                return `${$filter("currency")(data, "$", 2)}`;
              },
              targets: [4],
            },
          ],
        });
      };

      /**
       * end update token_holders
       *
       * **/

      // $scope.internalPage = 0;
      // $scope.internalTransaction = function (internalPage) {
      //   $http({
      //     method: "POST",
      //     url: "/transactionRelay",
      //     data: {
      //       action: "internalTX",
      //       address: address,
      //       internalPage: internalPage,
      //       fromAccount: $scope.acc,
      //     },
      //   }).then(function (resp) {
      //     resp.data.forEach(function (record) {
      //       record.amount =
      //         record.amount / 10 ** parseInt($scope.token.decimals);
      //     });
      //     $scope.internalPage = internalPage;
      //     $scope.internalDatas = resp.data;
      //   });
      // };
      // if ($scope.activeTab === "internalTransactions") {
      //   $scope.internalTransaction(0);
      // }
      $scope.tokenTransfrs = { transfervalue: 0 };
      $http({
        method: "POST",
        url: "/transactionRelay",
        data: { action: "countTX", address: address, fromAccount: $scope.acc },
      }).then(function (resp) {
        $scope.tokenTransfrs = resp.data;
      });

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
          scope.contract = resp.data;
        });
      },
    };
  })
  .directive("transferTokens", function ($http) {
    return {
      restrict: "E",
      templateUrl: "/views/transfer-tokens.html",
      scope: false,
      link: function (scope, elem, attrs) {
        //fetch transfer
        var getTransferTokens = function (after) {
          var data = { action: "tokenTransfer", address: scope.addrHash };
          if (after && after > 0) {
            data.after = after;
          }
          $http({
            method: "POST",
            url: "/tokenrelay",
            data,
          }).then(function (resp) {
            scope.transfer_tokens = resp.data.transfer;
            scope.page = { after: resp.data.after, count: resp.data.count };
            scope.page.next = resp.data.after + resp.data.count;
            if (resp.data.after > 0) {
              scope.page.prev = resp.data.after - resp.data.count;
            } else {
              scope.page.prev = 0;
            }
          });
        };
        scope.getTransferTokens = getTransferTokens;
        getTransferTokens();
      },
    };
  })

  /***
   * Author: Luke.Nguyen
   * Company: sotatek
   * Country: Vietnam
   * PhoneNumber: +84 386743836
   *
   * Patch date: 18/05/2021
   *
   * Newly updated for token_holders pages
   *
   *
   *
   *
   * **/
  .directive("tokenHolders", function ($http) {
    return {
      restrict: "E",
      templateUrl: "/views/token-holders.html",
      scope: false,
      link: function (scope, elem, attrs) {
        //fetch contract stuff
        $http({
          method: "POST",
          url: "/compile",
          data: { addr: scope.addrHash, action: "find" },
        }).then(function (resp) {
          scope.contract = resp.data;
        });
      },
    };
  });
