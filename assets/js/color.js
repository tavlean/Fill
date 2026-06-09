/**
 * color.js — pure color utilities. No DOM mutation, no app state.
 * Exposed on window.Fill.color for the classic (no-build) script setup.
 */
(function (global) {
    "use strict";

    var parseCanvas = null;
    var parseCtx = null;

    function getCtx() {
        if (!parseCtx) {
            parseCanvas = document.createElement("canvas");
            parseCanvas.width = parseCanvas.height = 1;
            parseCtx = parseCanvas.getContext("2d");
        }
        return parseCtx;
    }

    /**
     * Parse any CSS color string to { r, g, b } (0–255), or null if invalid.
     * Uses a canvas 2d context, double-checked against two seeds so that an
     * ignored (invalid) fillStyle assignment can't masquerade as a real color.
     */
    function parse(value) {
        if (typeof value !== "string" || !value.trim()) {
            return null;
        }
        var ctx = getCtx();
        if (!ctx) {
            return null;
        }

        ctx.fillStyle = "#000";
        ctx.fillStyle = value;
        var first = ctx.fillStyle;

        ctx.fillStyle = "#fff";
        ctx.fillStyle = value;
        var second = ctx.fillStyle;

        if (first !== second) {
            return null;
        }
        return readSwatch(ctx);
    }

    function readSwatch(ctx) {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillRect(0, 0, 1, 1);
        var data = ctx.getImageData(0, 0, 1, 1).data;
        return { r: data[0], g: data[1], b: data[2] };
    }

    function isValid(value) {
        return parse(value) !== null;
    }

    function clamp8(n) {
        return Math.max(0, Math.min(255, Math.round(n)));
    }

    /** Scale an rgb toward black by factor (0–1). factor=1 keeps the color. */
    function scale(rgb, factor) {
        var f = Math.max(0, Math.min(1, factor));
        return { r: clamp8(rgb.r * f), g: clamp8(rgb.g * f), b: clamp8(rgb.b * f) };
    }

    function toCss(rgb) {
        return "rgb(" + clamp8(rgb.r) + ", " + clamp8(rgb.g) + ", " + clamp8(rgb.b) + ")";
    }

    function toHex(rgb) {
        return (
            "#" +
            [rgb.r, rgb.g, rgb.b]
                .map(function (n) {
                    return clamp8(n).toString(16).padStart(2, "0");
                })
                .join("")
        );
    }

    /** Relative luminance (0–1) using Rec. 709 coefficients. */
    function luminance(rgb) {
        return (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
    }

    /**
     * Approximate sRGB for a blackbody color temperature in Kelvin.
     * Tanner Helland's widely-used approximation, clamped to 1000–40000K.
     */
    function kelvinToRgb(kelvin) {
        var t = Math.max(1000, Math.min(40000, kelvin)) / 100;
        var r, g, b;

        if (t <= 66) {
            r = 255;
            g = 99.4708025861 * Math.log(t) - 161.1195681661;
        } else {
            r = 329.698727446 * Math.pow(t - 60, -0.1332047592);
            g = 288.1221695283 * Math.pow(t - 60, -0.0755148492);
        }

        if (t >= 66) {
            b = 255;
        } else if (t <= 19) {
            b = 0;
        } else {
            b = 138.5177312231 * Math.log(t - 10) - 305.0447927307;
        }

        return { r: clamp8(r), g: clamp8(g), b: clamp8(b) };
    }

    global.Fill = global.Fill || {};
    global.Fill.color = {
        parse: parse,
        isValid: isValid,
        scale: scale,
        toCss: toCss,
        toHex: toHex,
        luminance: luminance,
        kelvinToRgb: kelvinToRgb,
    };
})(window);
