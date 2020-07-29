$(document).ready(function(){
    $('[data-toggle="tooltip"]').tooltip();   
});
// custom scrollbar
(function ($) {
    $(window).on("load", function () {
 
       $("#latest-blocks").mCustomScrollbar({
          theme: "minimal-dark"
       });
 
       $("#transactions").mCustomScrollbar({
          theme: "minimal-dark"
       });
 
    });
 })(jQuery);