/* Weblogics Theme — Theme Switcher
 * ─────────────────────────────────────────────────────────────────────────────
 * Spec v2: correct CSS variable mapping, auto-derive helpers, dark-mode split,
 * font injection, button/form/list style body classes, auto_dark_mode support.
 * ─────────────────────────────────────────────────────────────────────────────
 */
(function () {
    "use strict";

    /* ══════════════════════════════════════════════════════════════════
       CONSTANTS & STATE
    ══════════════════════════════════════════════════════════════════ */

    var STYLE_TAG_ID  = "wl-theme-vars";
    var STORAGE_KEY   = "wl_active_theme";
    var FONT_TAG_ID   = "wl-google-font";
    var API_SWITCH    = "weblogics_theme.api.theme.switch_theme";
    var API_GET_ALL   = "weblogics_theme.api.theme.get_themes";

    var _themes       = [];
    var _active_name  = null;
    var _prev_name    = null;
    var _dialog_el    = null;
    var _initialized  = false;
    var _media_query  = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");

    /* ══════════════════════════════════════════════════════════════════
       COLOR HELPERS
    ══════════════════════════════════════════════════════════════════ */

    /** #rrggbb → {r,g,b} — returns null on invalid input */
    function _parse(hex) {
        if (!hex || typeof hex !== "string") return null;
        var h = hex.replace("#", "");
        if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
        if (h.length !== 6) return null;
        var r = parseInt(h.slice(0,2), 16);
        var g = parseInt(h.slice(2,4), 16);
        var b = parseInt(h.slice(4,6), 16);
        if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
        return {r: r, g: g, b: b};
    }

    /** {r,g,b} → #rrggbb */
    function _fmt(c) {
        return "#" + [c.r, c.g, c.b].map(function (x) {
            return ("0" + Math.round(Math.max(0, Math.min(255, x))).toString(16)).slice(-2);
        }).join("");
    }

    /** Mix hex toward white by `amount` (0=unchanged, 1=white). Returns hex. */
    function _lighten(hex, amount) {
        var c = _parse(hex);
        if (!c) return hex || "#f1f5f9";
        return _fmt({
            r: c.r + (255 - c.r) * amount,
            g: c.g + (255 - c.g) * amount,
            b: c.b + (255 - c.b) * amount,
        });
    }

    /** Mix hex toward black by `amount` (0=unchanged, 1=black). Returns hex. */
    function _darken(hex, amount) {
        var c = _parse(hex);
        if (!c) return hex || "#374151";
        return _fmt({r: c.r * (1-amount), g: c.g * (1-amount), b: c.b * (1-amount)});
    }

    /**
     * Mix two hex colours by `t` (0=a, 1=b). Used for deriving heading color.
     */
    function _mix(hexA, hexB, t) {
        var a = _parse(hexA), b = _parse(hexB);
        if (!a || !b) return hexA || hexB || "#111827";
        return _fmt({
            r: a.r + (b.r - a.r) * t,
            g: a.g + (b.g - a.g) * t,
            b: a.b + (b.b - a.b) * t,
        });
    }

    /** #rrggbb + alpha 0–1 → rgba(…) */
    function _rgba(hex, alpha) {
        var c = _parse(hex);
        if (!c) return "transparent";
        return "rgba(" + c.r + "," + c.g + "," + c.b + "," + alpha + ")";
    }

    /**
     * Derive input background so it's always visually distinct from card background.
     * Light: slightly darker. Dark: slightly lighter.
     */
    function _derive_input_bg(card_bg, is_dark) {
        return is_dark ? _lighten(card_bg, 0.09) : _darken(card_bg, 0.04);
    }

    /**
     * Derive list-row hover color from border color — subtle tint halfway to transparent.
     */
    function _derive_list_hover(border_color, is_dark) {
        return is_dark ? _lighten(border_color, 0.12) : _darken(border_color, 0.06);
    }

    /**
     * Derive heading color — body text darkened 15%.
     * spec: mix body_text_color 85% with black 15%.
     */
    function _derive_heading(body_text) {
        return _mix(body_text, "#000000", 0.15);
    }

    /**
     * For dark mode: flip a light-theme neutral (bg/card/border) to dark-appropriate.
     * Keeps the hue of the original color but shifts toward dark.
     */
    function _to_dark_neutral(hex, lightness_target) {
        /* Simple approach: darken significantly so a white (#fff) becomes near-black */
        var c = _parse(hex);
        if (!c) return "#1e293b";
        /* compute HSL lightness roughly */
        var r = c.r/255, g = c.g/255, b = c.b/255;
        var cmax = Math.max(r,g,b), cmin = Math.min(r,g,b);
        var L = (cmax + cmin) / 2;
        /* If already dark (L < 0.3), return as-is */
        if (L < 0.3) return hex;
        /* Flip: map [0.3..1] → [0..0.2] keeping relative position */
        var ratio = (L - 0.3) / 0.7;  /* 0..1 */
        var new_L = lightness_target * (1 - ratio);
        /* Scale all channels toward 0 proportionally */
        var scale = new_L / Math.max(L, 0.001);
        return _fmt({r: c.r * scale, g: c.g * scale, b: c.b * scale});
    }

    /* ══════════════════════════════════════════════════════════════════
       EARLY APPLY — prevent flash before Frappe boots
    ══════════════════════════════════════════════════════════════════ */

    (function early_apply() {
        try {
            var stored = localStorage.getItem(STORAGE_KEY);
            if (stored) wl_apply_theme(JSON.parse(stored));
        } catch (e) { /* ignore */ }
    })();

    /* ══════════════════════════════════════════════════════════════════
       CORE: wl_apply_theme
    ══════════════════════════════════════════════════════════════════ */

    function wl_apply_theme(theme) {
        if (!theme || !theme.name) { wl_remove_theme(); return; }

        /* Determine effective dark mode */
        var is_dark = theme.dark_mode_enabled;
        if (theme.auto_dark_mode && _media_query) {
            is_dark = _media_query.matches;
        }

        if (is_dark) {
            _apply_dark(theme);
        } else {
            _apply_light(theme);
        }

        /* data-theme toggles Frappe's dark.scss token overrides */
        document.documentElement.setAttribute("data-theme", is_dark ? "dark" : "light");
        /* .dark-mode activates frappe-datatable's own dark tokens */
        document.documentElement.classList.toggle("dark-mode", !!is_dark);

        _active_name = theme.name;

        _apply_font(theme.app_font_family);
        _apply_style_classes(theme);

        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(theme)); } catch(e) {}
    }

    /* ── light mode neutral injection ── */
    function _apply_light(theme) {
        var pc    = theme.brand_primary_color             || "#4f46e5";
        var bg    = theme.page_background_color           || "#f8fafc";
        var card  = theme.card_background_color           || "#ffffff";
        var bc    = theme.border_color                    || "#e2e8f0";
        var tc    = theme.body_text_color                 || "#111827";
        var tmc   = theme.muted_text_color                || "#6b7280";
        var hbg   = theme.navbar_background_color         || card;
        var hfc   = theme.navbar_text_color               || tc;
        var hbc   = theme.breadcrumb_disabled_text_color  || tmc;
        var btnbg = theme.button_primary_background_color || pc;
        var btnfn = theme.button_primary_text_color       || "#ffffff";
        var sidbg = theme.sidebar_background_color        || card;
        var sidac = theme.sidebar_active_accent_color     || pc;
        var sidhv = theme.sidebar_hover_background_color  || _lighten(bc, 0.5);
        var sidtc = theme.sidebar_text_color              || tc;
        var lstc  = theme.list_link_color                 || pc;
        var lhbg  = theme.list_header_background_color   || _darken(card, 0.03);

        /* Fixed derived values — NEVER shared between unrelated components */
        var ctrl_bg    = theme.input_background_color     || _derive_input_bg(card, false);
        var row_hover  = theme.list_row_hover_color       || _derive_list_hover(bc, false);
        var heading    = _derive_heading(tc);

        _inject_vars(_build_vars({
            pc, bg, card, bc, tc, tmc, heading,
            hbg, hfc, hbc, btnbg, btnfn,
            sidbg, sidac, sidhv, sidtc,
            lstc, lhbg, ctrl_bg, row_hover,
        }));
    }

    /* ── dark mode neutral injection ── */
    function _apply_dark(theme) {
        /* Brand / accent vars: use as-is (they work in both modes) */
        var pc    = theme.brand_primary_color             || "#818cf8";
        var btnbg = theme.button_primary_background_color || pc;
        var btnfn = theme.button_primary_text_color       || "#0f172a";
        var sidac = theme.sidebar_active_accent_color     || pc;
        var lstc  = theme.list_link_color                 || pc;

        /* Neutral vars: if theme was designed for dark (dark_mode_enabled=true),
           use the stored values directly because the user picked dark colors.
           If auto_dark_mode triggered this but dark_mode_enabled=false, derive
           dark versions from the light-theme colors. */
        var raw_dark = theme.dark_mode_enabled;

        var bg    = raw_dark
            ? (theme.page_background_color  || "#0f172a")
            : _to_dark_neutral(theme.page_background_color  || "#f8fafc", 0.05);
        var card  = raw_dark
            ? (theme.card_background_color  || "#1e293b")
            : _to_dark_neutral(theme.card_background_color  || "#ffffff", 0.10);
        var bc    = raw_dark
            ? (theme.border_color           || "#334155")
            : _to_dark_neutral(theme.border_color           || "#e2e8f0", 0.18);
        var tc    = raw_dark
            ? (theme.body_text_color        || "#f1f5f9")
            : _lighten(theme.body_text_color || "#111827", 0.85);
        var tmc   = raw_dark
            ? (theme.muted_text_color       || "#94a3b8")
            : _lighten(theme.muted_text_color || "#6b7280", 0.45);
        var hbg   = raw_dark
            ? (theme.navbar_background_color || card)
            : _to_dark_neutral(theme.navbar_background_color || "#ffffff", 0.08);
        var hfc   = raw_dark
            ? (theme.navbar_text_color      || tc)
            : _lighten(theme.navbar_text_color || "#111827", 0.85);
        var hbc   = raw_dark
            ? (theme.breadcrumb_disabled_text_color || tmc)
            : _lighten(theme.breadcrumb_disabled_text_color || "#9ca3af", 0.3);
        var sidbg = raw_dark
            ? (theme.sidebar_background_color || card)
            : _to_dark_neutral(theme.sidebar_background_color || "#ffffff", 0.08);
        var sidhv = raw_dark
            ? (theme.sidebar_hover_background_color || _lighten(bc, 0.1))
            : _lighten(bc, 0.15);
        var sidtc = raw_dark
            ? (theme.sidebar_text_color     || tc)
            : _lighten(theme.sidebar_text_color || "#111827", 0.85);
        var lhbg  = raw_dark
            ? (theme.list_header_background_color || _darken(card, 0.05))
            : _darken(bg, 0.05);

        var ctrl_bg   = theme.input_background_color  || _derive_input_bg(card, true);
        var row_hover = theme.list_row_hover_color    || _derive_list_hover(bc, true);
        var heading   = _derive_heading(tc);

        _inject_vars(_build_vars({
            pc, bg, card, bc, tc, tmc, heading,
            hbg, hfc, hbc, btnbg, btnfn,
            sidbg, sidac, sidhv, sidtc,
            lstc, lhbg, ctrl_bg, row_hover,
        }));
    }

    /* ── build the CSS variable array from resolved values ── */
    function _build_vars(v) {
        return [
            /* ── Page & Surface ────────────────────────────── */
            "--bg-color:"               + v.bg,
            "--fg-color:"               + v.card,
            "--card-bg:"                + v.card,
            "--modal-bg:"               + v.card,
            "--toast-bg:"               + v.card,
            "--popover-bg:"             + v.card,

            /* ── Subtle — list head, datatable header ──────── */
            "--subtle-fg:"              + v.lhbg,
            "--subtle-accent:"          + v.lhbg,

            /* ── Navbar ────────────────────────────────────── */
            "--navbar-bg:"              + v.hbg,

            /* ── Body text ─────────────────────────────────── */
            "--text-color:"             + v.tc,
            "--heading-color:"          + v.heading,

            /* ── Muted text ────────────────────────────────── */
            "--text-muted:"             + v.tmc,
            "--text-light:"             + v.tmc,
            "--disabled-text-color:"    + v.tmc,

            /* ── Borders ───────────────────────────────────── */
            "--border-color:"           + v.bc,
            "--dark-border-color:"      + v.bc,
            "--table-border-color:"     + v.bc,
            "--border-primary:"         + v.btnbg,
            "--shadow-inset:"           + "inset 0px -1px 0px " + v.bc,
            "--btn-group-border-color:" + v.bc,

            /* ── Inputs — distinct from surface ────────────── */
            "--control-bg:"             + v.ctrl_bg,
            "--control-bg-on-gray:"     + v.ctrl_bg,
            "--awesomebar-focus-bg:"    + v.card,
            "--awesomplete-hover-bg:"   + v.sidhv,  /* sidebar hover for autocomplete */
            "--input-disabled-bg:"      + _lighten(v.ctrl_bg, 0.04),
            "--disabled-control-bg:"    + _lighten(v.ctrl_bg, 0.04),

            /* ── List row hover — dedicated, not sidebar ───── */
            "--highlight-color:"        + v.row_hover,
            "--fg-hover-color:"         + v.row_hover,

            /* ── Sidebar select — sidebar-specific ─────────── */
            "--sidebar-select-color:"   + v.sidhv,

            /* ── Buttons ───────────────────────────────────── */
            "--btn-primary:"            + v.btnbg,
            "--btn-default-bg:"         + v.ctrl_bg,
            "--btn-default-hover-bg:"   + v.row_hover,

            /* ── Brand / Primary ────────────────────────────── */
            "--primary:"                + v.pc,
            "--brand-color:"            + v.pc,
            "--primary-color:"          + v.pc,

            /* ── Icons ──────────────────────────────────────── */
            "--icon-stroke:"            + v.tc,
            "--icon-fill-bg:"           + v.card,

            /* ── Datatable ──────────────────────────────────── */
            "--dt-cell-bg:"             + v.card,
            "--dt-header-cell-bg:"      + v.lhbg,
            "--dt-border-color:"        + v.bc,
            "--dt-light-bg:"            + v.row_hover,

            /* ── Scrollbar ──────────────────────────────────── */
            "--scrollbar-thumb-color:"  + v.bc,
            "--scrollbar-track-color:"  + v.card,

            /* ── Workspace sidebar ──────────────────────────── */
            "--sidebar-bg:"             + v.sidbg,
            "--sidebar-hover-bg:"       + v.sidhv,
            "--sidebar-active-color:"   + v.sidac,
            "--sidebar-active-bg:"      + _rgba(v.sidac, 0.13),
            "--sidebar-border:"         + v.bc,
            "--sidebar-text:"           + v.sidtc,
            "--sidebar-text-muted:"     + v.tmc,

            /* ── Custom wl vars (consumed by CSS file) ──────── */
            "--wl-btn-primary-bg:"      + v.btnbg,
            "--wl-btn-primary-text:"    + v.btnfn,
            "--wl-navbar-text:"         + v.hfc,
            "--wl-breadcrumb-disabled:" + v.hbc,
            "--wl-list-subject:"        + v.lstc,
            "--wl-list-head-bg:"        + v.lhbg,
            "--wl-focus-ring:"          + _rgba(v.pc, 0.20),
            "--wl-heading:"             + v.heading,
        ];
    }

    function _inject_vars(vars) {
        var css = ":root{" + vars.join(";") + "}";
        var tag = document.getElementById(STYLE_TAG_ID);
        if (!tag) {
            tag = document.createElement("style");
            tag.id = STYLE_TAG_ID;
            document.head.appendChild(tag);
        }
        tag.textContent = css;
    }

    function wl_remove_theme() {
        var tag = document.getElementById(STYLE_TAG_ID);
        if (tag) tag.remove();
        document.documentElement.removeAttribute("data-theme");
        document.documentElement.classList.remove("dark-mode");
        _active_name = null;
        _remove_style_classes();
        try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    }

    /* ══════════════════════════════════════════════════════════════════
       FONT INJECTION (Step 6 — app_font_family)
    ══════════════════════════════════════════════════════════════════ */

    var FONT_STACKS = {
        "Inter":      "'Inter', system-ui, sans-serif",
        "Roboto":     "'Roboto', system-ui, sans-serif",
        "Poppins":    "'Poppins', system-ui, sans-serif",
        "Lato":       "'Lato', system-ui, sans-serif",
        "Open Sans":  "'Open Sans', system-ui, sans-serif",
        "Nunito":     "'Nunito', system-ui, sans-serif",
        "DM Sans":    "'DM Sans', system-ui, sans-serif",
    };

    var GOOGLE_FONTS = {
        "Inter":      "Inter:wght@400;500;600;700",
        "Roboto":     "Roboto:wght@400;500;700",
        "Poppins":    "Poppins:wght@400;500;600;700",
        "Lato":       "Lato:wght@400;700",
        "Open Sans":  "Open+Sans:wght@400;500;600;700",
        "Nunito":     "Nunito:wght@400;600;700",
        "DM Sans":    "DM+Sans:wght@400;500;700",
    };

    function _apply_font(family) {
        /* Remove previous font link if it exists */
        var old = document.getElementById(FONT_TAG_ID);
        if (old) old.remove();

        if (!family || !FONT_STACKS[family]) {
            document.documentElement.style.removeProperty("--wl-font-family");
            return;
        }

        /* Inject Google Fonts link */
        var link = document.createElement("link");
        link.id   = FONT_TAG_ID;
        link.rel  = "stylesheet";
        link.href = "https://fonts.googleapis.com/css2?family=" +
                    GOOGLE_FONTS[family] + "&display=swap";
        document.head.appendChild(link);

        /* Set the CSS variable */
        document.documentElement.style.setProperty(
            "--wl-font-family", FONT_STACKS[family]
        );
    }

    /* ══════════════════════════════════════════════════════════════════
       STYLE CLASS INJECTION (button_visual_style, form_layout_style,
                               list_layout_style)
    ══════════════════════════════════════════════════════════════════ */

    var STYLE_CLASSES = [
        "theme-btn-flat", "theme-btn-outline", "theme-btn-3d",
        "theme-btn-gradient", "theme-btn-pill", "theme-btn-minimal",
        "theme-btn-dashed",
        "theme-form-apple", "theme-form-material", "theme-form-neo",
        "theme-list-material", "theme-list-apple", "theme-list-card",
    ];

    var BTN_CLASS_MAP = {
        "Flat Button":           "theme-btn-flat",
        "Outline Button":        "theme-btn-outline",
        "3D Button":             "theme-btn-3d",
        "Gradient Button":       "theme-btn-gradient",
        "Pill Rounded Button":   "theme-btn-pill",
        "Minimal Border Button": "theme-btn-minimal",
        "Dashed Border Button":  "theme-btn-dashed",
    };

    var FORM_CLASS_MAP = {
        "APPLE CLEAN UI": "theme-form-apple",
        "MATERIAL UI":    "theme-form-material",
        "FRAPPE NEO":     "theme-form-neo",
    };

    var LIST_CLASS_MAP = {
        "Google Material UI look": "theme-list-material",
        "Apple-style UI":          "theme-list-apple",
        "Card Material Theme":     "theme-list-card",
    };

    function _apply_style_classes(theme) {
        _remove_style_classes();
        var b = document.body;
        if (theme.button_visual_style && BTN_CLASS_MAP[theme.button_visual_style]) {
            b.classList.add(BTN_CLASS_MAP[theme.button_visual_style]);
        }
        if (theme.form_layout_style && FORM_CLASS_MAP[theme.form_layout_style]) {
            b.classList.add(FORM_CLASS_MAP[theme.form_layout_style]);
        }
        if (theme.list_layout_style && LIST_CLASS_MAP[theme.list_layout_style]) {
            b.classList.add(LIST_CLASS_MAP[theme.list_layout_style]);
        }
    }

    function _remove_style_classes() {
        STYLE_CLASSES.forEach(function (c) {
            document.body.classList.remove(c);
        });
    }

    /* ══════════════════════════════════════════════════════════════════
       AUTO DARK MODE — OS preference listener
    ══════════════════════════════════════════════════════════════════ */

    function _bind_auto_dark() {
        if (!_media_query || !_media_query.addEventListener) return;
        _media_query.addEventListener("change", function () {
            if (!_active_name) return;
            var t = _themes.find(function (x) { return x.name === _active_name; });
            if (t && t.auto_dark_mode) wl_apply_theme(t);
        });
    }

    /* ══════════════════════════════════════════════════════════════════
       LANGUAGE SWITCHER
    ══════════════════════════════════════════════════════════════════ */

    function _apply_language_switcher(enabled) {
        /* Frappe's language switcher lives in the navbar but is hidden by default.
           Toggle visibility via a body class that CSS can target. */
        document.body.classList.toggle("wl-lang-switcher-enabled", !!enabled);
    }

    /* ══════════════════════════════════════════════════════════════════
       THEME PICKER DIALOG
    ══════════════════════════════════════════════════════════════════ */

    function wl_open_picker() {
        try {
            document.querySelectorAll(".dropdown-menu.show, .dropdown-menu.open").forEach(function (d) {
                d.classList.remove("show", "open");
            });
        } catch (e) {}
        _ensure_themes(function (themes) {
            _themes = themes;
            _build_and_show(themes);
        });
    }

    function _ensure_themes(cb) {
        /* Refresh from the database so edits made in a Theme DocType are
           available immediately instead of remaining in bootinfo memory. */
        frappe.xcall(API_GET_ALL).then(function (r) {
            if (r && r.length) {
                _themes = r;
                cb(r);
                return;
            }
            var bt = window.frappe && frappe.boot && frappe.boot.wl_themes;
            _themes = bt && bt.length ? bt : [];
            cb(_themes);
        }).catch(function () {
            var bt = window.frappe && frappe.boot && frappe.boot.wl_themes;
            _themes = bt && bt.length ? bt : [];
            cb(_themes);
        });
    }

    function _build_and_show(themes) {
        _destroy_dialog();

        var active = _active_name ||
            (frappe.boot && frappe.boot.wl_active_theme && frappe.boot.wl_active_theme.name) || null;

        var backdrop = document.createElement("div");
        backdrop.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9998;";
        backdrop.addEventListener("click", _destroy_dialog);

        var modal = document.createElement("div");
        modal.style.cssText =
            "position:fixed;inset:0;z-index:9999;overflow-y:auto;" +
            "display:flex;align-items:flex-start;justify-content:center;padding:40px 16px;";

        var box = document.createElement("div");
        box.style.cssText =
            "background:var(--fg-color,#fff);width:100%;max-width:780px;" +
            "border-radius:14px;overflow:hidden;" +
            "box-shadow:0 24px 60px rgba(0,0,0,0.22);";
        box.addEventListener("click", function (e) { e.stopPropagation(); });

        /* Header */
        var hdr = document.createElement("div");
        hdr.style.cssText =
            "display:flex;align-items:center;justify-content:space-between;" +
            "padding:18px 24px 14px;border-bottom:1px solid var(--border-color,#e2e8f0);";
        var title = document.createElement("h5");
        title.style.cssText = "margin:0;font-size:17px;font-weight:700;color:var(--text-color,#111827);";
        title.textContent = "Choose Theme";
        var close = document.createElement("button");
        close.type = "button";
        close.style.cssText =
            "background:none;border:none;cursor:pointer;padding:6px;border-radius:6px;" +
            "color:var(--text-muted,#6b7280);display:flex;align-items:center;";
        close.innerHTML =
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"' +
            ' stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
            '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
        close.addEventListener("click", _destroy_dialog);
        hdr.appendChild(title); hdr.appendChild(close);

        /* Body */
        var body = document.createElement("div");
        body.style.cssText = "padding:20px 24px 28px;background:var(--bg-color,#f8fafc);";

        var grid = document.createElement("div");
        grid.style.cssText = "display:grid;grid-template-columns:repeat(3,1fr);gap:14px;";

        if (!themes.length) {
            grid.style.gridTemplateColumns = "1fr";
            grid.innerHTML =
                '<p style="text-align:center;padding:32px 0;color:var(--text-muted,#6b7280);">' +
                'No themes found. <a href="/app/weblogics-theme" style="color:var(--primary,#4f46e5)">Create themes here</a>.' +
                '</p>';
        } else {
            themes.forEach(function (t) {
                grid.appendChild(_build_card(t, t.name === active, grid));
            });
        }

        var revert_wrap = document.createElement("div");
        revert_wrap.style.cssText = "margin-top:18px;text-align:center;";
        var revert_btn = document.createElement("button");
        revert_btn.type = "button";
        revert_btn.style.cssText =
            "background:none;border:1px solid var(--border-color,#e2e8f0);border-radius:6px;" +
            "padding:6px 18px;font-size:12.5px;color:var(--text-muted,#6b7280);cursor:pointer;";
        revert_btn.textContent = "Reset to Frappe Default";
        revert_btn.addEventListener("click", function () { _apply_and_save(null, grid); });
        revert_wrap.appendChild(revert_btn);

        body.appendChild(grid);
        body.appendChild(revert_wrap);
        box.appendChild(hdr); box.appendChild(body);
        modal.appendChild(box);

        var keydown = function (e) { if (e.key === "Escape") _destroy_dialog(); };
        document.addEventListener("keydown", keydown);
        document.body.appendChild(backdrop);
        document.body.appendChild(modal);
        document.body.style.overflow = "hidden";

        _dialog_el = { backdrop: backdrop, modal: modal, grid: grid, keydown: keydown };
    }

    function _build_card(theme, is_active, grid) {
        var pc    = theme.brand_primary_color             || "#4f46e5";
        var bg    = theme.page_background_color           || "#f8fafc";
        var card  = theme.card_background_color           || "#ffffff";
        var bc    = theme.border_color                    || "#e2e8f0";
        var sidbg = theme.sidebar_background_color        || "#ffffff";
        var sidhv = theme.sidebar_hover_background_color  || "#f3f4f6";
        var btnbg = theme.button_primary_background_color || pc;
        var hdrbg = theme.navbar_background_color         || card;
        var sidac = theme.sidebar_active_accent_color     || pc;

        var wrap = document.createElement("div");
        wrap.setAttribute("data-theme-name", theme.name);
        wrap.style.cssText =
            "border:2px solid " + (is_active ? pc : bc) + ";" +
            "border-radius:12px;padding:12px 10px 10px;cursor:pointer;" +
            "background:var(--fg-color,#fff);transition:border-color 0.2s,box-shadow 0.2s,transform 0.15s;" +
            "position:relative;user-select:none;";
        wrap.addEventListener("mouseenter", function () {
            this.style.borderColor = pc;
            this.style.boxShadow = "0 4px 16px rgba(0,0,0,0.10)";
            this.style.transform = "translateY(-2px)";
        });
        wrap.addEventListener("mouseleave", function () {
            if (!this.classList.contains("wl-active")) this.style.borderColor = bc;
            this.style.boxShadow = is_active ? "0 0 0 3px " + _rgba(pc, 0.25) : "none";
            this.style.transform = "none";
        });
        if (is_active) wrap.classList.add("wl-active");
        if (is_active) wrap.style.boxShadow = "0 0 0 3px " + _rgba(pc, 0.25);

        /* Checkmark */
        var chk = document.createElement("div");
        chk.style.cssText =
            "display:" + (is_active ? "flex" : "none") + ";" +
            "position:absolute;top:8px;right:8px;width:20px;height:20px;" +
            "border-radius:50%;background:" + pc + ";align-items:center;justify-content:center;";
        chk.innerHTML =
            '<svg width="11" height="11" viewBox="0 0 12 10" fill="none" stroke="#fff"' +
            ' stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
            '<polyline points="1,5 4,8 11,1"/></svg>';
        wrap.appendChild(chk);

        /* Mini preview */
        var preview = document.createElement("div");
        preview.style.cssText =
            "border-radius:8px;overflow:hidden;border:1px solid rgba(0,0,0,0.08);" +
            "margin-bottom:10px;height:72px;display:flex;flex-direction:column;";

        var nav_strip = document.createElement("div");
        nav_strip.style.cssText = "height:18px;flex-shrink:0;background:" + hdrbg + ";";

        var body_row = document.createElement("div");
        body_row.style.cssText = "flex:1;display:flex;gap:4px;padding:4px;background:" + bg + ";";

        var sidebar_strip = document.createElement("div");
        sidebar_strip.style.cssText =
            "width:16px;border-radius:4px;flex-shrink:0;background:" + sidbg + ";" +
            "border-left:3px solid " + sidac + ";";

        var content_col = document.createElement("div");
        content_col.style.cssText =
            "flex:1;display:flex;flex-direction:column;gap:3px;justify-content:center;";

        var card_strip = document.createElement("div");
        card_strip.style.cssText =
            "background:" + card + ";border-radius:3px;padding:3px;border:1px solid " + bc + ";";
        [pc, "#9ca3af", "#9ca3af"].forEach(function (c, i) {
            var s = document.createElement("span");
            s.style.cssText =
                "display:block;border-radius:2px;height:4px;background:" + c + ";" +
                "opacity:" + (i === 0 ? "1" : "0.35") + ";width:" + (i===0?"65%":(i===1?"90%":"50%")) +
                ";margin-bottom:2px;";
            card_strip.appendChild(s);
        });
        var btn_dot = document.createElement("div");
        btn_dot.style.cssText =
            "width:22px;height:7px;border-radius:3px;background:" + btnbg + ";margin-top:2px;";

        content_col.appendChild(card_strip); content_col.appendChild(btn_dot);
        body_row.appendChild(sidebar_strip); body_row.appendChild(content_col);
        preview.appendChild(nav_strip); preview.appendChild(body_row);
        wrap.appendChild(preview);

        /* Swatches */
        var swatches = document.createElement("div");
        swatches.style.cssText = "display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px;";
        [pc, hdrbg, bg, card, sidac, btnbg].forEach(function (c) {
            var dot = document.createElement("div");
            dot.style.cssText =
                "width:14px;height:14px;border-radius:50%;flex-shrink:0;background:" + c + ";" +
                "border:1.5px solid rgba(255,255,255,0.5);box-shadow:0 0 0 1px rgba(0,0,0,0.12);";
            swatches.appendChild(dot);
        });
        wrap.appendChild(swatches);

        /* Name */
        var name_el = document.createElement("div");
        name_el.style.cssText =
            "font-size:12.5px;font-weight:600;color:var(--text-color,#111827);" +
            "text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
        name_el.textContent = theme.name;
        if (theme.dark_mode_enabled) {
            var badge = document.createElement("span");
            badge.style.cssText =
                "display:inline-block;font-size:10px;font-weight:600;" +
                "color:var(--text-muted,#6b7280);background:var(--control-bg,#f1f5f9);" +
                "border-radius:4px;padding:1px 5px;margin-left:4px;vertical-align:middle;";
            badge.textContent = "Dark";
            name_el.appendChild(badge);
        }
        wrap.appendChild(name_el);

        wrap.addEventListener("click", function () { _apply_and_save(theme, grid); });
        return wrap;
    }

    /* ══════════════════════════════════════════════════════════════════
       APPLY + PERSIST
    ══════════════════════════════════════════════════════════════════ */

    function _apply_and_save(theme, grid) {
        _prev_name = _active_name;
        if (theme) wl_apply_theme(theme); else wl_remove_theme();

        /* Update active highlight in grid */
        if (grid) {
            grid.querySelectorAll("[data-theme-name]").forEach(function (c) {
                var isActive = theme && c.getAttribute("data-theme-name") === theme.name;
                c.classList.toggle("wl-active", isActive);
                var themeObj = _themes.find(function (t) { return t.name === c.getAttribute("data-theme-name"); });
                var thispc = themeObj ? (themeObj.brand_primary_color || "#4f46e5") : "#4f46e5";
                c.style.borderColor  = isActive ? thispc : "var(--border-color,#e2e8f0)";
                c.style.boxShadow    = isActive ? "0 0 0 3px " + _rgba(thispc, 0.25) : "none";
                var chk = c.querySelector("[style*='border-radius:50%']");
                if (chk) chk.style.display = isActive ? "flex" : "none";
            });
        }

        frappe.show_alert({
            message: theme ? ("Theme: " + theme.name) : "Theme reset",
            indicator: "green",
        }, 3);

        frappe.xcall(API_SWITCH, { theme_name: theme ? theme.name : "" })
            .catch(function (err) {
                /* Rollback */
                var prev = _themes.find(function (t) { return t.name === _prev_name; });
                if (prev) wl_apply_theme(prev); else wl_remove_theme();
                frappe.show_alert({ message: "Failed to save theme — reverted.", indicator: "red" }, 4);
                console.error("[wl_theme]", err);
            });
    }

    /* ══════════════════════════════════════════════════════════════════
       DIALOG CLEANUP
    ══════════════════════════════════════════════════════════════════ */

    function _destroy_dialog() {
        if (!_dialog_el) return;
        if (_dialog_el.keydown) document.removeEventListener("keydown", _dialog_el.keydown);
        if (_dialog_el.modal && _dialog_el.modal.parentNode)
            _dialog_el.modal.parentNode.removeChild(_dialog_el.modal);
        if (_dialog_el.backdrop && _dialog_el.backdrop.parentNode)
            _dialog_el.backdrop.parentNode.removeChild(_dialog_el.backdrop);
        _dialog_el = null;
        document.body.style.overflow = "";
    }

    /* ══════════════════════════════════════════════════════════════════
       NAVBAR BUTTON INJECTION
    ══════════════════════════════════════════════════════════════════ */

    function _inject_navbar_button() {
        var attempts = 0;
        function try_inject() {
            attempts++;
            var menu = document.getElementById("toolbar-user");
            if (!menu) {
                if (attempts < 100) setTimeout(try_inject, 100);
                return;
            }
            if (menu.querySelector(".wl-theme-switcher-btn")) return;

            var btn = document.createElement("button");
            btn.className = "btn-reset dropdown-item wl-theme-switcher-btn";
            btn.type = "button";
            btn.style.cssText =
                "display:flex;align-items:center;gap:8px;width:100%;background:none;border:none;" +
                "padding:7px 16px;font-size:13px;color:var(--text-color,#111827);cursor:pointer;text-align:left;";
            btn.innerHTML =
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"' +
                ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                '<circle cx="12" cy="12" r="10"/>' +
                '<path d="M12 2a7 7 0 0 1 7 7c0 4-7 13-7 13S5 13 5 9a7 7 0 0 1 7-7z"/>' +
                '</svg>Theme Switcher';
            btn.addEventListener("mouseenter", function () { this.style.background = "var(--fg-hover-color,#f3f4f6)"; });
            btn.addEventListener("mouseleave", function () { this.style.background = "none"; });
            btn.addEventListener("click", function (e) {
                e.preventDefault(); e.stopPropagation();
                var dd = this.closest(".dropdown-menu");
                var dp = dd && dd.parentElement;
                if (dp) dp.classList.remove("open", "show");
                if (dd) dd.classList.remove("show");
                setTimeout(wl_open_picker, 50);
            });

            var divider = menu.querySelector(".dropdown-divider");
            if (divider) menu.insertBefore(btn, divider);
            else menu.appendChild(btn);
        }
        try_inject();
    }

    /* ══════════════════════════════════════════════════════════════════
       INIT
    ══════════════════════════════════════════════════════════════════ */

    function init() {
        if (_initialized) return;
        _initialized = true;

        var boot_theme = window.frappe && frappe.boot && frappe.boot.wl_active_theme;

        // Populate _themes from boot first so fallback lookup works below
        if (window.frappe && frappe.boot && frappe.boot.wl_themes) {
            _themes = frappe.boot.wl_themes;
        }

        if (boot_theme && boot_theme.name) {
            // Server told us which theme this user has selected — apply it
            wl_apply_theme(boot_theme);
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(boot_theme)); } catch(e) {}
        } else if (window.frappe && frappe.boot) {
            // No user-specific theme set yet (fresh install / new user).
            // Try to fall back to "Default Light" from the available themes list.
            var fallback = _themes.find(function (t) { return t.name === "Default Light"; });
            if (fallback) {
                wl_apply_theme(fallback);
                try { localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback)); } catch(e) {}
                // Persist the choice server-side so bootinfo reflects it on next load
                if (window.frappe && frappe.xcall) {
                    frappe.xcall(API_SWITCH, { theme_name: "Default Light" }).catch(function () {});
                }
            } else {
                // No themes available at all — strip any leftover wl vars cleanly
                wl_remove_theme();
            }
        }

        _inject_navbar_button();
        _bind_auto_dark();

        /* Apply language switcher state */
        if (boot_theme) _apply_language_switcher(!!boot_theme.enable_language_switcher);

        /* Re-apply on route change */
        if (window.frappe && frappe.router && frappe.router.on) {
            frappe.router.on("change", function () {
                if (!_active_name) return;
                var t = _themes.find(function (x) { return x.name === _active_name; });
                if (t) wl_apply_theme(t);
            });
        }

        /* Auto-refresh when Weblogics Theme doctype is saved */
        if (window.$) {
            $(document).on("after_save", function (e, doc) {
                if (doc && doc.doctype === "Weblogics Theme" && doc.theme_name === _active_name) {
                    frappe.xcall(API_GET_ALL).then(function (themes) {
                        if (!themes) return;
                        _themes = themes;
                        var fresh = themes.find(function (t) { return t.name === _active_name; });
                        if (fresh) {
                            wl_apply_theme(fresh);
                            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh)); } catch(e) {}
                            frappe.show_alert({ message: "Theme updated", indicator: "green" }, 2);
                        }
                    }).catch(function () {});
                }
            });
        }

        /* Public API */
        if (window.frappe) {
            frappe.wl_theme = {
                open_picker:  wl_open_picker,
                apply_theme:  wl_apply_theme,
                remove_theme: wl_remove_theme,
                get_active:   function () { return _active_name; },
                get_themes:   function () { return _themes; },
            };
        }
    }

    /* ── Entry — handle all Frappe timing paths ── */
    function _try_init() {
        if (window.frappe && frappe.boot) init();
    }

    if (window.$) $(document).on("toolbar_setup", _try_init);
    document.addEventListener("frappe-ready", _try_init);

    var _pc = 0;
    var _poll = setInterval(function () {
        if (_initialized || ++_pc > 150) { clearInterval(_poll); return; }
        if (window.frappe && frappe.boot) { clearInterval(_poll); _try_init(); }
    }, 200);

})();
