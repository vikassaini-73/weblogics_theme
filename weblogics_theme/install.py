# Copyright (c) 2026, Weblogics Theme — License: MIT

import frappe

# ---------------------------------------------------------------------------
# Seed themes — every key must match the NEW fieldnames after the rename patch.
# input_background_color and list_row_hover_color are intentionally left blank
# so JS auto-derives them (they are optional fields).
# ---------------------------------------------------------------------------

SEED_THEMES = [
    {
        "theme_name":                      "Default Light",
        "dark_mode_enabled":               0,
        "brand_primary_color":             "#4f46e5",
        "page_background_color":           "#f8fafc",
        "card_background_color":           "#ffffff",
        "border_color":                    "#e2e8f0",
        "body_text_color":                 "#111827",
        "muted_text_color":                "#6b7280",
        "input_background_color":          "",
        "list_row_hover_color":            "",
        "navbar_background_color":         "#ffffff",
        "navbar_text_color":               "#111827",
        "breadcrumb_disabled_text_color":  "#9ca3af",
        "button_primary_background_color": "#4f46e5",
        "button_primary_text_color":       "#ffffff",
        "sidebar_background_color":        "#ffffff",
        "sidebar_active_accent_color":     "#4f46e5",
        "sidebar_hover_background_color":  "#eef2ff",
        "sidebar_text_color":              "#111827",
        "list_link_color":                 "#4f46e5",
        "list_header_background_color":    "#f1f5f9",
        "app_font_family":                 "Inter",
        "form_layout_style":               "APPLE CLEAN UI",
        "list_layout_style":               "Apple-style UI",
        "button_visual_style":             "Flat Button",
        "auto_dark_mode":                  0,
        "enable_language_switcher":        0,
    },
    {
        "theme_name":                      "Dark Night",
        "dark_mode_enabled":               1,
        "brand_primary_color":             "#818cf8",
        "page_background_color":           "#0f172a",
        "card_background_color":           "#1e293b",
        "border_color":                    "#334155",
        "body_text_color":                 "#f1f5f9",
        "muted_text_color":                "#94a3b8",
        "input_background_color":          "",
        "list_row_hover_color":            "",
        "navbar_background_color":         "#1e293b",
        "navbar_text_color":               "#f1f5f9",
        "breadcrumb_disabled_text_color":  "#64748b",
        "button_primary_background_color": "#818cf8",
        "button_primary_text_color":       "#0f172a",
        "sidebar_background_color":        "#1e293b",
        "sidebar_active_accent_color":     "#818cf8",
        "sidebar_hover_background_color":  "#334155",
        "sidebar_text_color":              "#e2e8f0",
        "list_link_color":                 "#818cf8",
        "list_header_background_color":    "#0f172a",
        "app_font_family":                 "Inter",
        "form_layout_style":               "APPLE CLEAN UI",
        "list_layout_style":               "Apple-style UI",
        "button_visual_style":             "Flat Button",
        "auto_dark_mode":                  0,
        "enable_language_switcher":        0,
    },
    {
        "theme_name":                      "Crimson Red",
        "dark_mode_enabled":               0,
        "brand_primary_color":             "#dc2626",
        "page_background_color":           "#fff5f5",
        "card_background_color":           "#ffffff",
        "border_color":                    "#fecaca",
        "body_text_color":                 "#111827",
        "muted_text_color":                "#6b7280",
        "input_background_color":          "",
        "list_row_hover_color":            "",
        "navbar_background_color":         "#dc2626",
        "navbar_text_color":               "#ffffff",
        "breadcrumb_disabled_text_color":  "#fca5a5",
        "button_primary_background_color": "#dc2626",
        "button_primary_text_color":       "#ffffff",
        "sidebar_background_color":        "#ffffff",
        "sidebar_active_accent_color":     "#dc2626",
        "sidebar_hover_background_color":  "#fef2f2",
        "sidebar_text_color":              "#111827",
        "list_link_color":                 "#dc2626",
        "list_header_background_color":    "#fff0f0",
        "app_font_family":                 "Inter",
        "form_layout_style":               "APPLE CLEAN UI",
        "list_layout_style":               "Apple-style UI",
        "button_visual_style":             "Flat Button",
        "auto_dark_mode":                  0,
        "enable_language_switcher":        0,
    },
    {
        "theme_name":                      "Ocean Teal",
        "dark_mode_enabled":               0,
        "brand_primary_color":             "#0d9488",
        "page_background_color":           "#f0fdfa",
        "card_background_color":           "#ffffff",
        "border_color":                    "#99f6e4",
        "body_text_color":                 "#111827",
        "muted_text_color":                "#6b7280",
        "input_background_color":          "",
        "list_row_hover_color":            "",
        "navbar_background_color":         "#0d9488",
        "navbar_text_color":               "#ffffff",
        "breadcrumb_disabled_text_color":  "#5eead4",
        "button_primary_background_color": "#0d9488",
        "button_primary_text_color":       "#ffffff",
        "sidebar_background_color":        "#ffffff",
        "sidebar_active_accent_color":     "#0d9488",
        "sidebar_hover_background_color":  "#ccfbf1",
        "sidebar_text_color":              "#111827",
        "list_link_color":                 "#0d9488",
        "list_header_background_color":    "#e6fffc",
        "app_font_family":                 "Inter",
        "form_layout_style":               "APPLE CLEAN UI",
        "list_layout_style":               "Apple-style UI",
        "button_visual_style":             "Flat Button",
        "auto_dark_mode":                  0,
        "enable_language_switcher":        0,
    },
    {
        "theme_name":                      "Royal Purple",
        "dark_mode_enabled":               0,
        "brand_primary_color":             "#7c3aed",
        "page_background_color":           "#faf5ff",
        "card_background_color":           "#ffffff",
        "border_color":                    "#ddd6fe",
        "body_text_color":                 "#111827",
        "muted_text_color":                "#6b7280",
        "input_background_color":          "",
        "list_row_hover_color":            "",
        "navbar_background_color":         "#7c3aed",
        "navbar_text_color":               "#ffffff",
        "breadcrumb_disabled_text_color":  "#c4b5fd",
        "button_primary_background_color": "#7c3aed",
        "button_primary_text_color":       "#ffffff",
        "sidebar_background_color":        "#ffffff",
        "sidebar_active_accent_color":     "#7c3aed",
        "sidebar_hover_background_color":  "#f3e8ff",
        "sidebar_text_color":              "#111827",
        "list_link_color":                 "#7c3aed",
        "list_header_background_color":    "#f5f0ff",
        "app_font_family":                 "Inter",
        "form_layout_style":               "APPLE CLEAN UI",
        "list_layout_style":               "Apple-style UI",
        "button_visual_style":             "Flat Button",
        "auto_dark_mode":                  0,
        "enable_language_switcher":        0,
    },
    {
        "theme_name":                      "Sunset Orange",
        "dark_mode_enabled":               0,
        "brand_primary_color":             "#ea580c",
        "page_background_color":           "#fff7ed",
        "card_background_color":           "#ffffff",
        "border_color":                    "#fed7aa",
        "body_text_color":                 "#111827",
        "muted_text_color":                "#6b7280",
        "input_background_color":          "",
        "list_row_hover_color":            "",
        "navbar_background_color":         "#ea580c",
        "navbar_text_color":               "#ffffff",
        "breadcrumb_disabled_text_color":  "#fdba74",
        "button_primary_background_color": "#ea580c",
        "button_primary_text_color":       "#ffffff",
        "sidebar_background_color":        "#ffffff",
        "sidebar_active_accent_color":     "#ea580c",
        "sidebar_hover_background_color":  "#ffedd5",
        "sidebar_text_color":              "#111827",
        "list_link_color":                 "#ea580c",
        "list_header_background_color":    "#fff3e6",
        "app_font_family":                 "Inter",
        "form_layout_style":               "APPLE CLEAN UI",
        "list_layout_style":               "Apple-style UI",
        "button_visual_style":             "Flat Button",
        "auto_dark_mode":                  0,
        "enable_language_switcher":        0,
    },
    {
        "theme_name":                      "Forest Green",
        "dark_mode_enabled":               0,
        "brand_primary_color":             "#16a34a",
        "page_background_color":           "#f0fdf4",
        "card_background_color":           "#ffffff",
        "border_color":                    "#bbf7d0",
        "body_text_color":                 "#111827",
        "muted_text_color":                "#6b7280",
        "input_background_color":          "",
        "list_row_hover_color":            "",
        "navbar_background_color":         "#166534",
        "navbar_text_color":               "#ffffff",
        "breadcrumb_disabled_text_color":  "#86efac",
        "button_primary_background_color": "#16a34a",
        "button_primary_text_color":       "#ffffff",
        "sidebar_background_color":        "#ffffff",
        "sidebar_active_accent_color":     "#16a34a",
        "sidebar_hover_background_color":  "#dcfce7",
        "sidebar_text_color":              "#111827",
        "list_link_color":                 "#16a34a",
        "list_header_background_color":    "#e8faf0",
        "app_font_family":                 "Inter",
        "form_layout_style":               "APPLE CLEAN UI",
        "list_layout_style":               "Apple-style UI",
        "button_visual_style":             "Flat Button",
        "auto_dark_mode":                  0,
        "enable_language_switcher":        0,
    },
    {
        "theme_name":                      "Midnight Blue",
        "dark_mode_enabled":               1,
        "brand_primary_color":             "#3b82f6",
        "page_background_color":           "#020617",
        "card_background_color":           "#0f172a",
        "border_color":                    "#1e3a5f",
        "body_text_color":                 "#e2e8f0",
        "muted_text_color":                "#94a3b8",
        "input_background_color":          "",
        "list_row_hover_color":            "",
        "navbar_background_color":         "#0f172a",
        "navbar_text_color":               "#e2e8f0",
        "breadcrumb_disabled_text_color":  "#475569",
        "button_primary_background_color": "#3b82f6",
        "button_primary_text_color":       "#ffffff",
        "sidebar_background_color":        "#0f172a",
        "sidebar_active_accent_color":     "#3b82f6",
        "sidebar_hover_background_color":  "#1e3a5f",
        "sidebar_text_color":              "#e2e8f0",
        "list_link_color":                 "#3b82f6",
        "list_header_background_color":    "#0a1628",
        "app_font_family":                 "Inter",
        "form_layout_style":               "APPLE CLEAN UI",
        "list_layout_style":               "Apple-style UI",
        "button_visual_style":             "Flat Button",
        "auto_dark_mode":                  0,
        "enable_language_switcher":        0,
    },
]


def _seed_themes():
    """Insert or update every theme in SEED_THEMES. Returns True if any change was made."""
    changed = False
    for data in SEED_THEMES:
        name = data["theme_name"]
        if frappe.db.exists("Weblogics Theme", name):
            try:
                doc = frappe.get_doc("Weblogics Theme", name)
                for k, v in data.items():
                    if k != "theme_name":
                        if hasattr(doc, k):
                            doc.set(k, v)
                doc.flags.ignore_validate = False
                doc.save(ignore_permissions=True)
                changed = True
            except Exception as e:
                frappe.log_error(f"wl_update_theme {name}: {e}")
        else:
            try:
                doc = frappe.get_doc({"doctype": "Weblogics Theme", **data})
                doc.insert(ignore_permissions=True)
                changed = True
            except Exception as e:
                frappe.log_error(f"wl_seed_theme {name}: {e}")
    return changed


def _set_default_theme_for_all_users(theme_name="Default Light"):
    """
    Set wl_desk_theme = theme_name for every real user who has no theme yet.
    Skips Guest. Only sets for users where wl_desk_theme is blank/null.
    """
    try:
        users = frappe.get_all(
            "User",
            filters={
                "name": ("not in", ["Guest"]),
                "enabled": 1,
            },
            fields=["name", "wl_desk_theme"],
        )
        for u in users:
            if not u.get("wl_desk_theme"):
                frappe.db.set_value(
                    "User", u["name"], "wl_desk_theme",
                    theme_name, update_modified=False,
                )
        frappe.db.commit()
    except Exception as e:
        frappe.log_error(f"wl_set_default_theme: {e}")


def after_install():
    """
    Runs once when the app is installed on a new site via:
        bench --site <site> install-app weblogics_theme

    1. Seeds all built-in themes into the DB.
    2. Sets 'Default Light' as the active theme for every existing user
       (typically just the Administrator at this point) so the theme is
       applied immediately without any manual action.
    """
    _seed_themes()
    frappe.db.commit()

    # Only set default theme if the theme record was actually created
    if frappe.db.exists("Weblogics Theme", "Default Light"):
        _set_default_theme_for_all_users("Default Light")


def after_migrate():
    """Seed / update default themes after every migrate."""
    _seed_themes()
    frappe.db.commit()
