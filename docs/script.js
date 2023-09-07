$(document).ready(function() {
        function loop() {
        var i, n, s = '';

        for (i = 0; i < 10; i++) {
            n = Math.floor(Math.sin((Date.now()/200) + (i/2)) * 4) + 4;

            s += String.fromCharCode(0x2581 + n);
        }

        window.location.hash = s;

        setTimeout(loop, 50);
    }

    loop();

$("#list1").Morphist({
    animateIn: "fadeInDown",
    animateOut: "fadeOutDown",
    speed: 8000,
    complete: function () {
    }
});

$("#list2").Morphist({
    animateIn: "fadeInDown",
    animateOut: "fadeOutDown",
    speed: 2000,
    complete: function () {
    }
});


$("#list3").Morphist({
    animateIn: "fadeInDown",
    animateOut: "fadeOutDown",
    speed: 4000,
    complete: function () {
    }
});
$("#list4").Morphist({
    animateIn: "fadeInDown",
    animateOut: "fadeOutDown",
    speed: 6000,
    complete: function () {
    }
});


});
