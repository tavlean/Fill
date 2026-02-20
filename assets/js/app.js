(function () {
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

    var PRESETS = ["black", "white", "red"];
    var currentColor = "black";
    var panelVisible = false;
    var customVisible = false;
    var helpVisible = false;
    var controlsPinned = false;
    var hideTimer = null;
    var errorTimer = null;
    var hintTimer = null;
    var hintDelayTimer = null;
    var hoverHintsEnabled = !!(
        window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches
    );
    var hintShownFromHover = false;
    var HOVER_HINT_DELAY_MS = 1500;
    var HIDE_DELAY_MS = 5000;

    function parseRgb(text) {
        var parts = text && text.match(/[\d.]+/g);
        if (!parts || parts.length < 3) {
            return null;
        }
        return {
            r: Math.max(0, Math.min(255, parseFloat(parts[0]))),
            g: Math.max(0, Math.min(255, parseFloat(parts[1]))),
            b: Math.max(0, Math.min(255, parseFloat(parts[2]))),
        };
    }

    function updateUiTone() {
        var temp = document.createElement("div");
        temp.style.color = currentColor;
        temp.style.position = "absolute";
        temp.style.visibility = "hidden";
        document.body.appendChild(temp);
        var computedColor = getComputedStyle(temp).color;
        document.body.removeChild(temp);

        var rgb = parseRgb(computedColor);
        if (!rgb) {
            return;
        }
        var luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
        var lightBg = luminance > 0.62;
        document.body.classList.toggle("ui-light", lightBg);
    }

    function updateThemeColorMeta(color) {
        if (!themeColorMeta) {
            return;
        }
        themeColorMeta.setAttribute("content", color);
    }

    function setActiveSwatch(source) {
        presetButtons.forEach(function (button) {
            var isActive = button.getAttribute("data-color") === source;
            button.classList.toggle("is-active", isActive);
            button.setAttribute("aria-pressed", isActive ? "true" : "false");
        });
        var customActive = source === "custom";
        customToggle.classList.toggle("is-active", customActive);
        customToggle.setAttribute("aria-pressed", customActive ? "true" : "false");
    }

    function setColor(color, source) {
        currentColor = color;
        document.body.style.backgroundColor = color;
        colorDot.style.background = color;
        updateThemeColorMeta(color);
        updateUiTone();

        if (source === "custom") {
            setActiveSwatch("custom");
            return;
        }

        if (PRESETS.indexOf(source) !== -1) {
            setActiveSwatch(source);
            return;
        }

        setActiveSwatch("custom");
    }

    function clearError() {
        clearTimeout(errorTimer);
        errorEl.classList.remove("visible");
        errorEl.textContent = "";
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

    function showError(message) {
        clearTimeout(errorTimer);
        errorEl.textContent = message;
        errorEl.classList.add("visible");
        errorTimer = setTimeout(function () {
            errorEl.classList.remove("visible");
            errorEl.textContent = "";
        }, 1300);
    }

    function tryApplyCustomColor() {
        var value = input.value.trim();
        if (!value) {
            showError("Invalid color");
            setCustomVisible(true, true);
            resetHideTimer();
            return;
        }

        if (window.CSS && CSS.supports && CSS.supports("color", value)) {
            setColor(value, "custom");
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

    function applyPresetShortcut(color) {
        setColor(color, color);
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
        }
    }

    presetButtons.forEach(function (button) {
        button.addEventListener("click", function (event) {
            event.stopPropagation();
            setColor(button.getAttribute("data-color"), button.getAttribute("data-color"));
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
        showPanel(false);
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

    updatePinUi();
    setColor(currentColor, "black");
    setCustomVisible(false, false);
    setHelpVisible(false);
})();
