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
    speed: 8500,
    complete: function () {
    }
});

$("#list2").Morphist({
    animateIn: "fadeInDown",
    animateOut: "fadeOutDown",
    speed: 6500,
    complete: function () {
    }
});


$("#list3").Morphist({
    animateIn: "fadeInDown",
    animateOut: "fadeOutDown",
    speed: 7800,
    complete: function () {
    }
});
$("#list4").Morphist({
    animateIn: "fadeInDown",
    animateOut: "fadeOutDown",
    speed: 9200,
    complete: function () {
    }
});

var root = document.documentElement;
var footer = document.querySelector("footer");
var lists = [
    document.getElementById("list1"),
    document.getElementById("list2"),
    document.getElementById("list3"),
    document.getElementById("list4")
];
var freezeNodes = [];
var container = document.querySelector(".container");

var targetProgress = 0;
var currentProgress = 0;
var transitionActive = false;
var touchStartY = null;
var playDialupFromDownScroll = null;
var currentHeadlineScale = 1;
var lastScaleCheckTs = 0;

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function smoothStep(edge0, edge1, x) {
    var t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
}

function ensureFreezeNodes() {
    lists.forEach(function(list, index) {
        if (!list || !list.parentElement) {
            return;
        }

        var node = list.parentElement.querySelector(".freeze-text-node");
        if (!node) {
            node = document.createElement("span");
            node.className = "freeze-text-node";
            list.parentElement.appendChild(node);
        }
        freezeNodes[index] = node;
    });
}

function getVisibleWordElement(list, index) {
    if (!list) {
        return null;
    }

    if (transitionActive && freezeNodes[index] && freezeNodes[index].offsetParent !== null) {
        return freezeNodes[index];
    }

    var animated = list.querySelector(".animated");
    if (animated && animated.offsetParent !== null) {
        return animated;
    }

    var fallback = list.querySelector("li");
    if (fallback && fallback.offsetParent !== null) {
        return fallback;
    }

    return null;
}

function hasHeadlineOverlap() {
    var nodes = lists.map(function(list, idx) {
        return getVisibleWordElement(list, idx);
    }).filter(Boolean);

    if (nodes.length < 2) {
        return false;
    }

    for (var i = 0; i < nodes.length - 1; i++) {
        var a = nodes[i].getBoundingClientRect();
        var b = nodes[i + 1].getBoundingClientRect();

        if (a.right > b.left - 8) {
            return true;
        }
    }

    var containerRect = container ? container.getBoundingClientRect() : null;
    if (containerRect) {
        for (var j = 0; j < nodes.length; j++) {
            var r = nodes[j].getBoundingClientRect();
            if (r.left < containerRect.left + 4 || r.right > containerRect.right - 4) {
                return true;
            }
        }
    }

    return false;
}

function applyHeadlineScale(scale) {
    if (!container) {
        return;
    }
    currentHeadlineScale = scale;
    container.style.setProperty("--headline-font-scale", String(scale));
}

function updateHeadlineScale() {
    if (!container || window.innerWidth < 930) {
        if (currentHeadlineScale !== 1) {
            applyHeadlineScale(1);
        }
        return;
    }

    var target = 1;
    if (hasHeadlineOverlap()) {
        target = currentHeadlineScale;
        while (target > 0.62 && hasHeadlineOverlap()) {
            target = Math.max(0.62, target - 0.04);
            applyHeadlineScale(target);
        }
        return;
    }

    if (currentHeadlineScale < 1) {
        target = Math.min(1, currentHeadlineScale + 0.02);
        applyHeadlineScale(target);
        if (hasHeadlineOverlap()) {
            applyHeadlineScale(Math.max(0.62, target - 0.03));
        }
    }
}

function setupGermanCaseDetector() {
    var connectorList = document.getElementById("list2");
    var adjectiveList = document.getElementById("list3");
    if (!connectorList || !adjectiveList) {
        return;
    }

    var connectorCaseMap = {
        "fuer": "akk",
        "für": "akk",
        "betreffend": "akk",
        "zwecks": "gen",
        "hinsichtlich": "gen",
        "im dienste von": "gen"
    };

    function normalize(text) {
        return text.trim().toLowerCase();
    }

    function inflectFromAkk(akkForm, caseKey) {
        var clean = akkForm.trim();
        if (caseKey === "akk") {
            return clean;
        }

        var stem = clean.endsWith("e") ? clean.slice(0, -1) : clean;
        if (caseKey === "gen") {
            return stem + "er";
        }
        if (caseKey === "dat") {
            return stem + "en";
        }
        return clean;
    }

    var adjectiveItems = Array.prototype.slice.call(adjectiveList.querySelectorAll("li"));
    adjectiveItems.forEach(function(item) {
        item.setAttribute("data-akk", item.textContent.trim());
    });

    var lastCase = null;

    function getActiveConnectorText() {
        var active = connectorList.querySelector(".animated");
        if (active && active.textContent) {
            return active.textContent;
        }

        var fallback = connectorList.querySelector("li");
        return fallback ? fallback.textContent : "";
    }

    function applyCase(caseKey) {
        adjectiveItems.forEach(function(item) {
            var akk = item.getAttribute("data-akk") || item.textContent.trim();
            item.textContent = inflectFromAkk(akk, caseKey);
        });
    }

    function refreshCase() {
        var connectorText = normalize(getActiveConnectorText());
        var caseKey = connectorCaseMap[connectorText] || "akk";
        if (caseKey === lastCase) {
            return;
        }

        lastCase = caseKey;
        applyCase(caseKey);
    }

    // Keep forms in sync with the currently visible connector.
    window.setInterval(refreshCase, 120);
    refreshCase();
}

function setupDialupNoiseOnScroll() {
    var AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
        return function() {};
    }

    var hasPlayed = false;
    var ctx = null;
    var pendingScrollTrigger = false;
    var unlockBound = false;

    function hasActiveUserGesture() {
        if (!navigator.userActivation) {
            return true;
        }
        return navigator.userActivation.isActive;
    }

    function clearUnlockListeners(handler) {
        if (!unlockBound) {
            return;
        }
        unlockBound = false;
        window.removeEventListener("pointerdown", handler);
        window.removeEventListener("keydown", handler);
        window.removeEventListener("touchstart", handler);
    }

    function armUnlockListeners(handler) {
        if (unlockBound || hasPlayed) {
            return;
        }
        unlockBound = true;
        window.addEventListener("pointerdown", handler, { passive: true });
        window.addEventListener("keydown", handler, { passive: true });
        window.addEventListener("touchstart", handler, { passive: true });
    }

    function playSequence(audioCtx) {
        if (hasPlayed) {
            return;
        }
        hasPlayed = true;

        var now = audioCtx.currentTime;
        var master = audioCtx.createGain();
        master.gain.value = 0.035;
        master.connect(audioCtx.destination);

        function addTone(freq, startOffset, duration, type, gainValue) {
            var osc = audioCtx.createOscillator();
            var gain = audioCtx.createGain();
            osc.type = type || "sine";
            osc.frequency.setValueAtTime(freq, now + startOffset);
            gain.gain.setValueAtTime(0.0001, now + startOffset);
            gain.gain.exponentialRampToValueAtTime(gainValue || 0.2, now + startOffset + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + startOffset + duration);
            osc.connect(gain);
            gain.connect(master);
            osc.start(now + startOffset);
            osc.stop(now + startOffset + duration);
        }

        function addNoise(startOffset, duration, gainValue) {
            var sampleRate = audioCtx.sampleRate;
            var length = Math.floor(sampleRate * duration);
            var buffer = audioCtx.createBuffer(1, length, sampleRate);
            var data = buffer.getChannelData(0);
            for (var i = 0; i < length; i++) {
                data[i] = (Math.random() * 2 - 1) * (0.4 + Math.random() * 0.6);
            }

            var source = audioCtx.createBufferSource();
            var band = audioCtx.createBiquadFilter();
            var gain = audioCtx.createGain();

            source.buffer = buffer;
            band.type = "bandpass";
            band.frequency.setValueAtTime(1800, now + startOffset);
            band.Q.setValueAtTime(0.75, now + startOffset);

            gain.gain.setValueAtTime(0.0001, now + startOffset);
            gain.gain.linearRampToValueAtTime(gainValue || 0.24, now + startOffset + 0.04);
            gain.gain.linearRampToValueAtTime(0.0001, now + startOffset + duration);

            source.connect(band);
            band.connect(gain);
            gain.connect(master);
            source.start(now + startOffset);
            source.stop(now + startOffset + duration);
        }

        // Handshake beeps
        addTone(1200, 0.00, 0.22, "square", 0.22);
        addTone(2100, 0.24, 0.22, "square", 0.2);
        addTone(980, 0.52, 0.28, "sine", 0.18);
        addTone(1650, 0.74, 0.16, "square", 0.17);
        addTone(1320, 0.92, 0.14, "triangle", 0.14);
        addTone(2380, 1.08, 0.13, "square", 0.16);
        addTone(860, 1.24, 0.18, "sine", 0.13);
        addTone(1960, 1.44, 0.16, "square", 0.15);
        addTone(1040, 1.62, 0.10, "square", 0.14);
        addTone(2240, 1.74, 0.10, "square", 0.15);
        addTone(1180, 1.86, 0.12, "triangle", 0.12);
        addTone(1740, 2.00, 0.11, "square", 0.14);
        addTone(920, 2.13, 0.14, "sine", 0.11);
        addTone(2460, 2.29, 0.10, "square", 0.14);
        addTone(1380, 2.41, 0.10, "triangle", 0.11);
        addTone(1880, 2.53, 0.12, "square", 0.13);
        addTone(1120, 2.67, 0.10, "sine", 0.1);
        addTone(2020, 2.79, 0.11, "square", 0.12);

        // Scrambled negotiation noise
        addNoise(0.85, 1.10, 0.28);
        addTone(1460, 1.02, 0.45, "triangle", 0.08);
        addTone(1760, 1.22, 0.40, "triangle", 0.08);

        // Final carrier-like tone
        addTone(1320, 2.05, 0.70, "sine", 0.12);

        // Close context after effect ends
        window.setTimeout(function() {
            audioCtx.close();
        }, 3200);
    }

    function ensureContextAndPlay() {
        if (hasPlayed) {
            return;
        }

        if (!hasActiveUserGesture()) {
            return;
        }

        if (!ctx) {
            try {
                ctx = new AudioCtx();
            } catch (e) {
                return;
            }
        }

        if (ctx.state === "running") {
            playSequence(ctx);
            return;
        }

        ctx.resume().then(function() {
            playSequence(ctx);
        }).catch(function() {
            // Ignore resume failures.
        });
    }

    var onUnlock = function() {
        if (!pendingScrollTrigger || hasPlayed) {
            return;
        }
        ensureContextAndPlay();
        if (hasPlayed) {
            pendingScrollTrigger = false;
            clearUnlockListeners(onUnlock);
        }
    };

    return function maybePlayOnDownScroll(deltaY) {
        if (hasPlayed || !(deltaY > 0)) {
            return;
        }

        pendingScrollTrigger = true;
        ensureContextAndPlay();

        if (!hasPlayed) {
            armUnlockListeners(onUnlock);
        } else {
            pendingScrollTrigger = false;
            clearUnlockListeners(onUnlock);
        }
    };
}

function captureFreezeText() {
    lists.forEach(function(list) {
        if (!list) {
            return;
        }

        var idx = lists.indexOf(list);
        var freezeNode = freezeNodes[idx];
        if (!freezeNode) {
            return;
        }

        var current = list.querySelector(".animated");
        var fallback = list.querySelector("li");
        var text = "";

        if (current && current.textContent) {
            text = current.textContent.trim();
        } else if (fallback && fallback.textContent) {
            text = fallback.textContent.trim();
        }

        freezeNode.textContent = text;
    });

    if (freezeNodes[1]) {
        freezeNodes[1].textContent = "(｡◕‿◕｡)";
    }
    if (freezeNodes[2]) {
        freezeNodes[2].textContent = "'neigeschaut";
    }
}

function setTransitionMode(active) {
    if (active === transitionActive) {
        return;
    }

    transitionActive = active;

    if (active) {
        captureFreezeText();
        root.classList.add("scroll-transition-active");
    } else {
        root.classList.remove("scroll-transition-active");
    }
}

function render(progress) {
    var invertAmount = smoothStep(0.12, 0.92, progress);
    root.style.setProperty("--invert-amount", String(invertAmount));

    var shouldBeActive = progress >= 0.18;
    setTransitionMode(shouldBeActive);

    if (!shouldBeActive) {
        lists.forEach(function(list) {
            if (!list || !list.parentElement) {
                return;
            }
            list.parentElement.style.opacity = "1";
            list.parentElement.style.transform = "translateY(0px)";
        });
        if (footer) {
            footer.style.opacity = "0";
            footer.style.pointerEvents = "none";
        }
        return;
    }

    var firstOut = smoothStep(0.20, 0.40, progress);
    var secondIn = smoothStep(0.33, 0.55, progress);
    var thirdIn = smoothStep(0.50, 0.72, progress);
    var fourthOut = smoothStep(0.70, 0.90, progress);
    var footerIn = smoothStep(0.78, 1.00, progress);

    if (lists[0] && lists[0].parentElement) {
        lists[0].parentElement.style.opacity = String(1 - firstOut);
        lists[0].parentElement.style.transform = "translateY(" + (-10 * firstOut) + "px)";
    }

    if (lists[1] && lists[1].parentElement) {
        lists[1].parentElement.style.opacity = String(secondIn);
        lists[1].parentElement.style.transform = "translateY(" + (8 * (1 - secondIn)) + "px)";
    }

    if (lists[2] && lists[2].parentElement) {
        lists[2].parentElement.style.opacity = String(thirdIn);
        lists[2].parentElement.style.transform = "translateY(" + (8 * (1 - thirdIn)) + "px)";
    }

    if (lists[3] && lists[3].parentElement) {
        lists[3].parentElement.style.opacity = String(1 - fourthOut);
        lists[3].parentElement.style.transform = "translateY(" + (-10 * fourthOut) + "px)";
    }

    if (footer) {
        footer.style.opacity = String(footerIn);
        footer.style.pointerEvents = footerIn > 0.98 ? "auto" : "none";
    }
}

function stepProgress(delta) {
    targetProgress = clamp(targetProgress + delta, 0, 1);
}

window.addEventListener("wheel", function(event) {
    event.preventDefault();
    stepProgress(event.deltaY * 0.0016);
    if (playDialupFromDownScroll) {
        playDialupFromDownScroll(event.deltaY);
    }
}, { passive: false });

window.addEventListener("touchstart", function(event) {
    if (event.touches && event.touches.length > 0) {
        touchStartY = event.touches[0].clientY;
    }
}, { passive: true });

window.addEventListener("touchmove", function(event) {
    if (!(event.touches && event.touches.length > 0) || touchStartY === null) {
        return;
    }
    var currentY = event.touches[0].clientY;
    var delta = touchStartY - currentY;
    touchStartY = currentY;
    event.preventDefault();
    stepProgress(delta * 0.0022);
    if (playDialupFromDownScroll) {
        playDialupFromDownScroll(delta);
    }
}, { passive: false });

window.addEventListener("keydown", function(event) {
    if (event.key === "ArrowDown" || event.key === "PageDown" || event.key === " ") {
        event.preventDefault();
        stepProgress(0.08);
    }
    if (event.key === "ArrowUp" || event.key === "PageUp") {
        event.preventDefault();
        stepProgress(-0.08);
    }
});

function animate() {
    var now = performance.now();
    if (now - lastScaleCheckTs > 120) {
        updateHeadlineScale();
        lastScaleCheckTs = now;
    }

    currentProgress += (targetProgress - currentProgress) * 0.18;
    if (Math.abs(targetProgress - currentProgress) < 0.0005) {
        currentProgress = targetProgress;
    }
    render(currentProgress);
    window.requestAnimationFrame(animate);
}

render(0);
ensureFreezeNodes();
animate();
playDialupFromDownScroll = setupDialupNoiseOnScroll();
setupGermanCaseDetector();


});
