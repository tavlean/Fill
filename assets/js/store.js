/**
 * store.js — single source of truth for what fills the screen.
 *
 * State:
 *   color      base CSS color string (used when temp === null)
 *   brightness 0–1 dimmer applied on top of the base color
 *   temp       0–1 warm→cool position when in "light" mode, else null
 *
 * The displayed color is derived: scale(baseColor, brightness). Light mode
 * (temp !== null) derives its base from a warm→cool white ramp instead of
 * `color`. State is persisted to localStorage and mirrored into the URL hash
 * so links are shareable. Load precedence: URL hash > localStorage > default.
 */
(function (global) {
    "use strict";

    var color = global.Fill.color;

    var STORAGE_KEY = "fill:v1";
    var TEMP_MIN_K = 2000;
    var TEMP_MAX_K = 6500;
    var URL_DEBOUNCE_MS = 250;

    var state = { color: "black", brightness: 1, temp: null };
    var listeners = [];
    var urlTimer = null;

    function clamp01(n) {
        n = parseFloat(n);
        if (isNaN(n)) {
            return 0;
        }
        return Math.max(0, Math.min(1, n));
    }

    function pctToUnit(v) {
        return clamp01(parseFloat(v) / 100);
    }

    function unitToPct(n) {
        return Math.round(clamp01(n) * 100);
    }

    /** Warm→cool white for a 0–1 slider position; 1 is exactly pure white. */
    function tempToRgb(t) {
        t = clamp01(t);
        if (t >= 1) {
            return { r: 255, g: 255, b: 255 };
        }
        return color.kelvinToRgb(TEMP_MIN_K + t * (TEMP_MAX_K - TEMP_MIN_K));
    }

    function baseRgb(s) {
        if (s.temp !== null) {
            return tempToRgb(s.temp);
        }
        return color.parse(s.color) || { r: 0, g: 0, b: 0 };
    }

    function displayedRgb(s) {
        return color.scale(baseRgb(s), s.brightness);
    }

    function snapshot() {
        return { color: state.color, brightness: state.brightness, temp: state.temp };
    }

    function subscribe(fn) {
        listeners.push(fn);
        return function () {
            var i = listeners.indexOf(fn);
            if (i >= 0) {
                listeners.splice(i, 1);
            }
        };
    }

    function notify() {
        var snap = snapshot();
        for (var i = 0; i < listeners.length; i++) {
            listeners[i](snap);
        }
        persist();
    }

    /* ---- persistence -------------------------------------------------- */

    function persist() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot()));
        } catch (_err) {}
        clearTimeout(urlTimer);
        urlTimer = setTimeout(syncUrl, URL_DEBOUNCE_MS);
    }

    function readStorage() {
        var raw;
        try {
            raw = localStorage.getItem(STORAGE_KEY);
        } catch (_err) {
            return null;
        }
        if (!raw) {
            return null;
        }
        try {
            return normalize(JSON.parse(raw));
        } catch (_err) {
            return null;
        }
    }

    /* ---- URL hash ----------------------------------------------------- */

    function encode(s) {
        var b = unitToPct(s.brightness);
        if (s.temp !== null) {
            return "t=" + unitToPct(s.temp) + "&b=" + b;
        }
        var rgb = color.parse(s.color) || { r: 0, g: 0, b: 0 };
        var token = color.toHex(rgb).slice(1);
        if (token === "000000" && b >= 100) {
            return ""; // default state — keep the URL clean
        }
        return b >= 100 ? token : "c=" + token + "&b=" + b;
    }

    function decode(hash) {
        if (!hash) {
            return null;
        }
        hash = hash.replace(/^#/, "");
        if (!hash) {
            return null;
        }

        if (hash.indexOf("=") === -1) {
            var bare = asColor(hash);
            return bare ? { color: bare, brightness: 1, temp: null } : null;
        }

        var params = {};
        hash.split("&").forEach(function (pair) {
            var i = pair.indexOf("=");
            if (i > 0) {
                params[pair.slice(0, i)] = decodeURIComponent(pair.slice(i + 1));
            }
        });

        var b = params.b != null ? pctToUnit(params.b) : 1;
        if (params.t != null) {
            return { color: state.color, brightness: b, temp: pctToUnit(params.t) };
        }
        if (params.c != null) {
            var c = asColor(params.c);
            return c ? { color: c, brightness: b, temp: null } : null;
        }
        return null;
    }

    /** Accept a color with or without a leading "#"; return it or null. */
    function asColor(value) {
        if (color.isValid(value)) {
            return value;
        }
        if (color.isValid("#" + value)) {
            return "#" + value;
        }
        return null;
    }

    function syncUrl() {
        var encoded = encode(state);
        var url = encoded ? "#" + encoded : location.pathname + location.search;
        try {
            history.replaceState(null, "", url);
        } catch (_err) {
            location.hash = encoded;
        }
    }

    /* ---- normalization & actions -------------------------------------- */

    function normalize(obj) {
        if (!obj || typeof obj !== "object") {
            return null;
        }
        var next = { color: "black", brightness: 1, temp: null };
        if (obj.temp !== null && obj.temp !== undefined) {
            next.temp = clamp01(obj.temp);
        } else if (typeof obj.color === "string" && color.isValid(obj.color)) {
            next.color = obj.color;
        } else {
            return null;
        }
        if (obj.brightness !== undefined) {
            next.brightness = clamp01(obj.brightness);
        }
        return next;
    }

    function apply(next) {
        state.color = next.color;
        state.brightness = next.brightness;
        state.temp = next.temp;
    }

    function load() {
        var fromUrl = decode(location.hash);
        if (fromUrl) {
            apply(normalize(fromUrl) || state);
            notify();
            return;
        }
        var stored = readStorage();
        if (stored) {
            apply(stored);
        }
        notify();
    }

    function setColor(value) {
        if (!color.isValid(value)) {
            return false;
        }
        state.color = value;
        state.temp = null;
        notify();
        return true;
    }

    function setTemperature(t) {
        state.temp = clamp01(t);
        notify();
    }

    function setBrightness(b) {
        state.brightness = clamp01(b);
        notify();
    }

    /* ---- derived selectors -------------------------------------------- */

    function activeSwatch() {
        if (state.temp !== null) {
            return "white";
        }
        var hex = color.toHex(baseRgb(state));
        if (hex === "#000000") {
            return "black";
        }
        if (hex === color.toHex(color.parse("red"))) {
            return "red";
        }
        return "custom";
    }

    global.Fill = global.Fill || {};
    global.Fill.store = {
        get: snapshot,
        subscribe: subscribe,
        load: load,
        setColor: setColor,
        setTemperature: setTemperature,
        setBrightness: setBrightness,
        displayedCss: function () {
            return color.toCss(displayedRgb(state));
        },
        baseRgb: function () {
            return baseRgb(state);
        },
        isLight: function () {
            return color.luminance(displayedRgb(state)) > 0.62;
        },
        activeSwatch: activeSwatch,
        tempToRgb: tempToRgb,
        TEMP_MIN_K: TEMP_MIN_K,
        TEMP_MAX_K: TEMP_MAX_K,
    };

    global.addEventListener("hashchange", function () {
        var fromUrl = decode(location.hash);
        if (fromUrl) {
            apply(normalize(fromUrl) || state);
            notify();
        }
    });
})(window);
