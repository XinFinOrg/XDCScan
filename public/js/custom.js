$(document).ready(function(){
    $('[data-toggle="tooltip"]').tooltip();
	
	$('.collapse').on('shown.bs.collapse', function () {
		$('#collapsedLink').attr('title', 'Click to see less');
    	//console.log('show');
    });

    $('.collapse').on('hidden.bs.collapse', function () {               
		$('#collapsedLink').attr('title', 'Click to see more');
    });
});
