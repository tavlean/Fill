(function () {
    var store = window.Fill.store;

    var controls = document.getElementById("controls");
    var panel = controls.querySelector(".dock-wrap");
    var customForm = document.getElementById("customForm");
    var customToggle = document.getElementById("customToggle");
    var colorDot = document.getElementById("colorDot");
    var input = document.getElementById("colorInput");
    var errorEl = document.getElementById("error");
    var presetButtons = controls.querySelectorAll("[data-color]");
    var helpGhost = document.getElementById("helpGhost");
    var helpCard = document.getElementById("helpCard");
    var pinToggle = document.getElementById("pinToggle");
    var pinLabel = document.getElementById("pinLabel");
    var hintToast = document.getElementById("hintToast");
    var themeColorMeta = document.getElementById("themeColorMeta");
    var brightnessSlider = document.getElementById("brightnessSlider");
    var temperatureRow = document.getElementById("temperatureRow");
    var temperatureSlider = document.getElementById("temperatureSlider");
    var indicator = document.getElementById("indicator");
    var indIcon = indicator.querySelector(".ind-icon");
    var indValue = indicator.querySelector(".ind-value");

    var SUN_SVG =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
        'stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/>' +
        '<path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2' +
        'M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';

    var THERMO_SVG =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
        'stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M14 14.76V5a2 2 0 0 0-4 0v9.76a4 4 0 1 0 4 0z"/></svg>';

    var LOCK_SVG =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
        'stroke-linecap="round" stroke-linejoin="round">' +
        '<rect x="4" y="11" width="16" height="10" rx="2"/>' +
        '<path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';

    var BRIGHTNESS_STEP = 0.05;
    var TEMP_STEP = 0.05;
    var DRAG_THRESHOLD = 8;
    var UNLOCK_HOLD_MS = 1200;

    var panelVisible = false;
    var customVisible = false;
    var helpVisible = false;
    var controlsPinned = false;
    var hideTimer = null;
    var errorTimer = null;
    var hintTimer = null;
    var hintDelayTimer = null;
    var indicatorTimer = null;
    var drag = null;
    var locked = false;
    var wakeLock = null;
    var unlockTimer = null;
    var unlockHold = null;
    var hoverHintsEnabled = !!(
        window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches
    );
    var hintShownFromHover = false;
    var HOVER_HINT_DELAY_MS = 1500;
    var HIDE_DELAY_MS = 5000;

    /* ---- rendering ---------------------------------------------------- */

    function render() {
        var state = store.get();
        var css = store.displayedCss();
        document.body.style.backgroundColor = css;
        colorDot.style.background = css;
        if (themeColorMeta) {
            themeColorMeta.setAttribute("content", css);
        }
        document.body.classList.toggle("ui-light", store.isLight());
        setActiveSwatch(store.activeSwatch());

        var brightnessPct = Math.round(state.brightness * 100);
        if (brightnessSlider.value !== String(brightnessPct)) {
            brightnessSlider.value = brightnessPct;
        }
        brightnessSlider.style.setProperty("--fill", brightnessPct + "%");

        var lightMode = state.temp !== null;
        temperatureRow.hidden = !lightMode;
        if (lightMode) {
            var tempPct = Math.round(state.temp * 100);
            if (temperatureSlider.value !== String(tempPct)) {
                temperatureSlider.value = tempPct;
            }
        }
    }

    /** Warm→cool slider position as an approximate Kelvin label. */
    function tempKelvin() {
        var t = store.get().temp || 0;
        return Math.round((store.TEMP_MIN_K + t * (store.TEMP_MAX_K - store.TEMP_MIN_K)) / 100) * 100;
    }

    function showIndicator(iconSvg, text) {
        indIcon.innerHTML = iconSvg;
        indValue.textContent = text;
        indicator.classList.add("visible");
        clearTimeout(indicatorTimer);
        indicatorTimer = setTimeout(function () {
            indicator.classList.remove("visible");
        }, 900);
    }

    function nudgeBrightness(delta, withHud) {
        var next = store.get().brightness + delta;
        store.setBrightness(next);
        if (withHud) {
            showIndicator(SUN_SVG, Math.round(store.get().brightness * 100) + "%");
        }
    }

    function setActiveSwatch(active) {
        presetButtons.forEach(function (button) {
            var isActive = button.getAttribute("data-color") === active;
            button.classList.toggle("is-active", isActive);
            button.setAttribute("aria-pressed", isActive ? "true" : "false");
        });
        var customActive = active === "custom";
        customToggle.classList.toggle("is-active", customActive);
        customToggle.setAttribute("aria-pressed", customActive ? "true" : "false");
    }

    /** White is the entry to light mode; other presets are plain colors. */
    function selectColor(name) {
        if (name === "white") {
            store.setTemperature(1);
        } else {
            store.setColor(name);
        }
    }

    /* ---- error + hint toasts ----------------------------------------- */

    function clearError() {
        clearTimeout(errorTimer);
        errorEl.classList.remove("visible");
        errorEl.textContent = "";
    }

    function showError(message) {
        clearTimeout(errorTimer);
        errorEl.textContent = message;
        errorEl.classList.add("visible");
        errorTimer = setTimeout(function () {
            errorEl.classList.remove("visible");
            errorEl.textContent = "";
        }, 1300);
    }

    function hideHint() {
        clearTimeout(hintDelayTimer);
        hintDelayTimer = null;
        clearTimeout(hintTimer);
        hintToast.classList.remove("visible");
    }

    function showHint() {
        if (!hoverHintsEnabled) {
            return;
        }
        hintToast.classList.add("visible");
        hintTimer = setTimeout(hideHint, 4800);
    }

    /* ---- panel visibility & auto-hide -------------------------------- */

    function shouldPauseAutoHide() {
        var active = document.activeElement;
        var hasControlFocus = active && controls.contains(active);
        var helpFocused = active && helpCard.contains(active);
        return (
            controlsPinned ||
            panel.matches(":hover") ||
            hasControlFocus ||
            (helpVisible && (helpCard.matches(":hover") || helpFocused))
        );
    }

    function resetHideTimer() {
        clearTimeout(hideTimer);
        if (!panelVisible || controlsPinned) {
            return;
        }
        hideTimer = setTimeout(function () {
            if (shouldPauseAutoHide()) {
                resetHideTimer();
                return;
            }
            hidePanel();
        }, HIDE_DELAY_MS);
    }

    function setCustomVisible(visible, focusInput) {
        customVisible = visible;
        customForm.classList.toggle("open", visible);
        customForm.setAttribute("aria-hidden", String(!visible));
        customToggle.setAttribute("aria-expanded", visible ? "true" : "false");
        if (!visible) {
            input.blur();
            clearError();
            return;
        }
        if (focusInput) {
            input.focus();
            input.select();
        }
    }

    function setHelpVisible(visible) {
        helpVisible = visible;
        helpCard.classList.toggle("open", visible);
        helpCard.setAttribute("aria-hidden", String(!visible));
        helpGhost.classList.toggle("active", visible);
        helpGhost.setAttribute("aria-expanded", visible ? "true" : "false");
        helpGhost.setAttribute("aria-label", visible ? "Hide shortcuts" : "Show shortcuts");
    }

    function updatePinUi() {
        pinToggle.classList.toggle("active", controlsPinned);
        pinToggle.setAttribute("aria-pressed", controlsPinned ? "true" : "false");
        pinLabel.textContent = controlsPinned ? "Pinned controls" : "Pin controls";
    }

    function showPanel(focusInput) {
        hideHint();
        if (!panelVisible) {
            panelVisible = true;
            controls.classList.add("visible");
            controls.setAttribute("aria-hidden", "false");
        }
        if (focusInput) {
            setCustomVisible(true, true);
        }
        resetHideTimer();
    }

    function hidePanel() {
        clearTimeout(hideTimer);
        panelVisible = false;
        if (controlsPinned) {
            controlsPinned = false;
            updatePinUi();
        }
        controls.classList.remove("visible");
        controls.setAttribute("aria-hidden", "true");
        setCustomVisible(false, false);
    }

    function finalizeColorSelection() {
        if (controlsPinned) {
            setCustomVisible(false, false);
            resetHideTimer();
            return;
        }
        hidePanel();
    }

    function tryApplyCustomColor() {
        var value = input.value.trim();
        if (value && store.setColor(value)) {
            finalizeColorSelection();
            return;
        }
        showError("Invalid color");
        setCustomVisible(true, true);
        resetHideTimer();
    }

    function toggleFullscreen() {
        try {
            if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen();
            } else if (document.fullscreenElement && document.exitFullscreen) {
                document.exitFullscreen();
            }
        } catch (_err) {}
    }

    /* ---- lock / wake lock -------------------------------------------- */

    function requestWakeLock() {
        if (!navigator.wakeLock || wakeLock) {
            return;
        }
        navigator.wakeLock
            .request("screen")
            .then(function (sentinel) {
                wakeLock = sentinel;
                sentinel.addEventListener("release", function () {
                    wakeLock = null;
                });
            })
            .catch(function () {});
    }

    function releaseWakeLock() {
        if (wakeLock) {
            wakeLock.release().catch(function () {});
            wakeLock = null;
        }
    }

    function setLocked(on) {
        if (on === locked) {
            return;
        }
        locked = on;
        document.body.classList.toggle("locked", on);
        if (on) {
            hidePanel();
            setHelpVisible(false);
            hideHint();
            requestWakeLock();
            showIndicator(LOCK_SVG, "Hold to unlock");
        } else {
            cancelUnlockHold(true);
            releaseWakeLock();
            showIndicator(LOCK_SVG, "Unlocked");
        }
    }

    function beginUnlockHold(event) {
        unlockHold = { id: event.pointerId, x: event.clientX, y: event.clientY };
        clearTimeout(unlockTimer);
        unlockTimer = setTimeout(function () {
            unlockTimer = null;
            unlockHold = null;
            setLocked(false);
        }, UNLOCK_HOLD_MS);
    }

    function trackUnlockHold(event) {
        if (!unlockHold || event.pointerId !== unlockHold.id) {
            return;
        }
        if (
            Math.abs(event.clientX - unlockHold.x) > DRAG_THRESHOLD ||
            Math.abs(event.clientY - unlockHold.y) > DRAG_THRESHOLD
        ) {
            cancelUnlockHold(true); // moved (e.g. wiping) — don't nag
        }
    }

    function cancelUnlockHold(silent) {
        clearTimeout(unlockTimer);
        unlockTimer = null;
        var wasHolding = !!unlockHold;
        unlockHold = null;
        if (wasHolding && !silent) {
            showIndicator(LOCK_SVG, "Hold to unlock");
        }
    }

    /* ---- shortcut actions -------------------------------------------- */

    function applyPresetShortcut(name) {
        selectColor(name);
        if (panelVisible) {
            finalizeColorSelection();
        }
    }

    function togglePinShortcut() {
        controlsPinned = !controlsPinned;
        updatePinUi();
        if (controlsPinned) {
            showPanel(false);
        } else {
            resetHideTimer();
        }
    }

    function hideShortcut(closeHelpFirst) {
        if (closeHelpFirst && helpVisible) {
            setHelpVisible(false);
            return;
        }
        hidePanel();
    }

    function runShortcutAction(action) {
        if (action === "black" || action === "white" || action === "red") {
            applyPresetShortcut(action);
            return;
        }
        if (action === "custom") {
            showPanel(true);
            return;
        }
        if (action === "fullscreen") {
            toggleFullscreen();
            return;
        }
        if (action === "hide") {
            hideShortcut(true);
            return;
        }
        if (action === "pin") {
            togglePinShortcut();
            return;
        }
        if (action === "lock") {
            setLocked(true);
        }
    }

    /* ---- wiring ------------------------------------------------------- */

    presetButtons.forEach(function (button) {
        button.addEventListener("click", function (event) {
            event.stopPropagation();
            selectColor(button.getAttribute("data-color"));
            finalizeColorSelection();
        });
    });

    customToggle.addEventListener("click", function (event) {
        event.stopPropagation();
        showPanel(false);
        setCustomVisible(!customVisible, !customVisible);
        resetHideTimer();
    });

    customForm.addEventListener("submit", function (event) {
        event.preventDefault();
        tryApplyCustomColor();
    });

    input.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            event.preventDefault();
            hidePanel();
            return;
        }
        resetHideTimer();
    });

    input.addEventListener("input", function () {
        clearError();
        resetHideTimer();
    });

    controls.addEventListener("focusin", function () {
        resetHideTimer();
    });

    brightnessSlider.addEventListener("input", function () {
        store.setBrightness(brightnessSlider.value / 100);
        resetHideTimer();
    });

    temperatureSlider.addEventListener("input", function () {
        store.setTemperature(temperatureSlider.value / 100);
        resetHideTimer();
    });

    panel.addEventListener("pointerdown", function (event) {
        event.stopPropagation();
        resetHideTimer();
    });

    panel.addEventListener("pointermove", function () {
        resetHideTimer();
    });

    panel.addEventListener("pointerleave", function () {
        resetHideTimer();
    });

    helpGhost.addEventListener("pointerdown", function (event) {
        event.stopPropagation();
    });

    helpCard.addEventListener("pointerdown", function (event) {
        event.stopPropagation();
    });

    helpGhost.addEventListener("click", function () {
        hideHint();
        setHelpVisible(!helpVisible);
    });

    helpCard.addEventListener("click", function (event) {
        var actionButton = event.target.closest("[data-shortcut-action]");
        if (!actionButton || !helpCard.contains(actionButton)) {
            return;
        }
        var action = actionButton.getAttribute("data-shortcut-action");
        if (action === "hide") {
            hideShortcut(false);
            return;
        }
        runShortcutAction(action);
    });

    document.addEventListener("pointerdown", function (event) {
        hideHint();
        if (locked) {
            beginUnlockHold(event);
            return;
        }
        if (helpVisible && !helpCard.contains(event.target) && event.target !== helpGhost) {
            setHelpVisible(false);
            return;
        }
        if (helpCard.contains(event.target) || event.target === helpGhost) {
            return;
        }
        if (panel.contains(event.target)) {
            return;
        }
        if (event.pointerType === "mouse" && event.button !== 0) {
            return;
        }
        var state = store.get();
        drag = {
            id: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            startBrightness: state.brightness,
            startTemp: state.temp,
            moved: false,
            axis: null,
        };
    });

    document.addEventListener("pointermove", function (event) {
        if (locked) {
            trackUnlockHold(event);
            return;
        }
        if (!drag || event.pointerId !== drag.id) {
            return;
        }
        var dx = event.clientX - drag.startX;
        var dy = event.clientY - drag.startY;
        if (!drag.moved) {
            if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) {
                return;
            }
            drag.moved = true;
            // Horizontal drag tunes temperature, but only in light mode.
            var canTemp = drag.startTemp !== null;
            drag.axis = canTemp && Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        }
        if (drag.axis === "x") {
            // Dragging right cools (toward white).
            store.setTemperature(drag.startTemp + dx / Math.max(160, window.innerWidth * 0.6));
            showIndicator(THERMO_SVG, tempKelvin() + "K");
        } else {
            // Dragging up brightens.
            store.setBrightness(drag.startBrightness + -dy / Math.max(120, window.innerHeight * 0.6));
            showIndicator(SUN_SVG, Math.round(store.get().brightness * 100) + "%");
        }
    });

    function endDrag(event) {
        if (locked) {
            cancelUnlockHold(false);
            return;
        }
        if (!drag || event.pointerId !== drag.id) {
            return;
        }
        var moved = drag.moved;
        drag = null;
        if (!moved) {
            showPanel(false);
        }
    }

    document.addEventListener("pointerup", endDrag);
    document.addEventListener("pointercancel", function () {
        drag = null;
        cancelUnlockHold(true);
    });

    document.addEventListener("visibilitychange", function () {
        if (locked && document.visibilityState === "visible") {
            requestWakeLock();
        }
    });

    document.addEventListener("pointermove", function (event) {
        if (
            !hoverHintsEnabled ||
            hintShownFromHover ||
            panelVisible ||
            helpVisible ||
            hintDelayTimer
        ) {
            return;
        }
        if (event.pointerType && event.pointerType !== "mouse") {
            return;
        }
        hintDelayTimer = setTimeout(function () {
            hintDelayTimer = null;
            if (panelVisible || helpVisible || hintShownFromHover) {
                return;
            }
            hintShownFromHover = true;
            showHint();
        }, HOVER_HINT_DELAY_MS);
    });

    document.addEventListener("keydown", function (event) {
        var key = event.key;
        var active = document.activeElement;
        var typingInCustom = !!(active && customForm.contains(active));
        hideHint();

        if (locked) {
            if (key === "l" || key === "L" || key === "Escape") {
                event.preventDefault();
                setLocked(false);
            }
            return;
        }

        if (key === "Escape") {
            runShortcutAction("hide");
            return;
        }

        if (typingInCustom) {
            return;
        }

        if (key === "?" || (key === "/" && event.shiftKey)) {
            event.preventDefault();
            setHelpVisible(!helpVisible);
            return;
        }

        if (key === "ArrowUp" || key === "ArrowDown") {
            if (active && active.type === "range") {
                return; // native range handles arrows; its input event applies it
            }
            event.preventDefault();
            nudgeBrightness(key === "ArrowUp" ? BRIGHTNESS_STEP : -BRIGHTNESS_STEP, !panelVisible);
            return;
        }

        if (key === "ArrowLeft" || key === "ArrowRight") {
            if (active && active.type === "range") {
                return;
            }
            if (store.get().temp === null) {
                return; // temperature only applies in light mode
            }
            event.preventDefault();
            store.setTemperature(store.get().temp + (key === "ArrowRight" ? TEMP_STEP : -TEMP_STEP));
            if (!panelVisible) {
                showIndicator(THERMO_SVG, tempKelvin() + "K");
            }
            return;
        }

        if (key === "b" || key === "B") {
            runShortcutAction("black");
            return;
        }
        if (key === "w" || key === "W") {
            runShortcutAction("white");
            return;
        }
        if (key === "r" || key === "R") {
            runShortcutAction("red");
            return;
        }
        if (key === "c" || key === "C") {
            event.preventDefault();
            runShortcutAction("custom");
            return;
        }
        if (key === "f" || key === "F") {
            event.preventDefault();
            runShortcutAction("fullscreen");
            return;
        }
        if (key === "l" || key === "L") {
            event.preventDefault();
            setLocked(true);
            return;
        }
        if (key === "p" || key === "P") {
            event.preventDefault();
            runShortcutAction("pin");
            return;
        }
        if (key === "Enter" || key === "NumpadEnter" || key === "OK" || key === "Select") {
            if (document.activeElement === input) {
                return;
            }
            event.preventDefault();
            showPanel(true);
        }
    });

    /* ---- init --------------------------------------------------------- */

    store.subscribe(render);
    updatePinUi();
    setCustomVisible(false, false);
    setHelpVisible(false);
    store.load();
})();
