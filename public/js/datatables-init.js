// Dependency File(s):
// assets/vendor/datatables.net/js/jquery.dataTables.js
// assets/vendor/datatables.net-bs4/js/dataTables.bootstrap4.js
// assets/vendor/datatables.net-bs4/css/dataTables.bootstrap4.css
// -----------------------------------------------------------------------------

(function (window, document, $, undefined) {
	"use strict";
	$(function () {
		$('#address-transaction').dataTable({
			/* No ordering applied by DataTables during initialisation */
			"order": []
		});
		
		$('#internal-transaction').dataTable({
			/* No ordering applied by DataTables during initialisation */
			"order": []
		});
    });

})(window, document, window.jQuery);