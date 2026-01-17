$(document).ready(function () {
  $("nav .nav-link").click(function () {
    const ul = $(this).siblings();
    const caret = $(this).find(".fa-caret-right");
    ul.toggle("1000", () => {
      if (ul.css("display") != "none") {
        caret.css({
          transform: "rotate(90deg)",
        });
      } else {
        caret.css({
          transform: "rotate(0deg)",
        });
      }
    });
  });

  $(".alert").fadeOut(10000);

  //==================SIDE BAR===============================
  $("#menu").click(function () {
    console.log($(".navPanel"));
    $(".navPanel").toggleClass("smallSidebar");

    $(window).resize(() => {
      $(".navPanel").removeClass("smallSidebar");
    });
  });
  //====================END SIDE BAR=========================
});
