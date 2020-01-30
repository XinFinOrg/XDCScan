! function(i) {
    "use strict";
    var t = function() {};
    t.prototype.initNavbar = function() {
        i(".navbar-toggle").on("click", function(t) {
            i(this).toggleClass("open"), i("#navigation").slideToggle(400)
        }), i(".navigation-menu>li").slice(-1).addClass("last-elements"), i('.navigation-menu li.has-submenu a[href="#"]').on("click", function(t) {
            i(window).width() < 992 && (t.preventDefault(), i(this).parent("li").toggleClass("open").find(".submenu:first").toggleClass("open"))
        })
    }, t.prototype.initLoader = function() {
        i(window).load(function() {
            i("#status").fadeOut(), i("#preloader").delay(350).fadeOut("slow"), i("body").delay(350).css({
                overflow: "visible"
            })
        })
    }, t.prototype.initComponents = function() {
        //i('[data-toggle="tooltip"]').tooltip(), i('[data-toggle="popover"]').popover()
		i('[data-toggle="tooltip"]').tooltip({trigger:'hover'}); i('[data-toggle="popover"]').popover({trigger:'hover'});
    }, t.prototype.initToggleSearch = function() {
        i(".toggle-search").on("click", function() {
            var t = i(this).data("target");
            t && i(t).toggleClass("open")
        })
    }, t.prototype.init = function() {
        this.initNavbar(), this.initLoader(), this.initComponents()
    }, i.MainApp = new t, i.MainApp.Constructor = t
}(window.jQuery),
function(t) {
    "use strict";
    window.jQuery.MainApp.init()
}();


        