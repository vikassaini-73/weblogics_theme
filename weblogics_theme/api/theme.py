# Copyright (c) 2026, Weblogics Theme — License: MIT

import frappe
from frappe import _


# ── helpers ────────────────────────────────────────────────────────────────────

def _doc_to_dict(doc):
    """Flat dict sent to JS wl_apply_theme(). Every field has a safe fallback."""
    return {
        "name":                            doc.theme_name,
        # Brand
        "brand_primary_color":             doc.brand_primary_color             or "#4f46e5",
        "page_background_color":           doc.page_background_color           or "#f8fafc",
        "card_background_color":           doc.card_background_color           or "#ffffff",
        "border_color":                    doc.border_color                    or "#e2e8f0",
        "body_text_color":                 doc.body_text_color                 or "#111827",
        "muted_text_color":                doc.muted_text_color                or "#6b7280",
        # Inputs & Hover — optional, blank means JS will auto-derive
        "input_background_color":          doc.input_background_color          or "",
        "list_row_hover_color":            doc.list_row_hover_color            or "",
        # Navbar
        "navbar_background_color":         doc.navbar_background_color         or "#ffffff",
        "navbar_text_color":               doc.navbar_text_color               or "#111827",
        "breadcrumb_disabled_text_color":  doc.breadcrumb_disabled_text_color  or "#9ca3af",
        # Buttons
        "button_primary_background_color": doc.button_primary_background_color or doc.brand_primary_color or "#4f46e5",
        "button_primary_text_color":       doc.button_primary_text_color       or "#ffffff",
        # Sidebar
        "sidebar_background_color":        doc.sidebar_background_color        or "#ffffff",
        "sidebar_active_accent_color":     doc.sidebar_active_accent_color     or doc.brand_primary_color or "#4f46e5",
        "sidebar_hover_background_color":  doc.sidebar_hover_background_color  or "#f3f4f6",
        "sidebar_text_color":              doc.sidebar_text_color              or "#111827",
        # List
        "list_link_color":                 doc.list_link_color                 or doc.brand_primary_color or "#4f46e5",
        "list_header_background_color":    doc.list_header_background_color    or "#f9fafb",
        # Styles
        "form_layout_style":               doc.form_layout_style               or "",
        "app_font_family":                 doc.app_font_family                 or "",
        "list_layout_style":               doc.list_layout_style               or "",
        "button_visual_style":             doc.button_visual_style             or "",
        # Flags
        "dark_mode_enabled":               bool(doc.dark_mode_enabled),
        "auto_dark_mode":                  bool(doc.auto_dark_mode),
        "enable_language_switcher":        bool(doc.enable_language_switcher),
    }


def _get_user_theme():
    try:
        return frappe.db.get_value("User", frappe.session.user, "wl_desk_theme") or None
    except Exception:
        return None


def _all_themes():
    """All themes, cached in redis (1h). Cleared on theme save/delete,
    so desk boot never pays N+1 get_doc on every request."""
    try:
        cached = frappe.cache.get_value("wl_themes_all")
        if cached is not None:
            return cached
        rows = frappe.get_all("Weblogics Theme", fields=["name"], order_by="theme_name asc")
        result = []
        for r in rows:
            try:
                result.append(_doc_to_dict(frappe.get_doc("Weblogics Theme", r.name)))
            except Exception:
                pass
        frappe.cache.set_value("wl_themes_all", result, expires_in_sec=3600)
        return result
    except Exception:
        return []


def clear_theme_cache():
    """Called on Weblogics Theme save/delete via doc_events hook."""
    try:
        frappe.cache.delete_value("wl_themes_all")
    except Exception:
        pass


# ── boot hook ───────────────────────────────────────────────────────────────────

def extend_bootinfo(bootinfo):
    themes = _all_themes()
    bootinfo["wl_themes"] = themes
    active_name = _get_user_theme()
    if active_name:
        bootinfo["wl_active_theme"] = next(
            (t for t in themes if t["name"] == active_name), None
        )
    else:
        bootinfo["wl_active_theme"] = None


# ── whitelisted API ─────────────────────────────────────────────────────────────

@frappe.whitelist()
def switch_theme(theme_name):
    if frappe.session.user in ("Guest", None):
        frappe.throw(_("Not permitted"), frappe.PermissionError)
    if not theme_name:
        _save("")
        return {"name": "", "reverted": True}
    if not frappe.db.exists("Weblogics Theme", theme_name):
        frappe.throw(f"Theme '{theme_name}' not found.", frappe.DoesNotExistError)
    _save(theme_name)
    return _doc_to_dict(frappe.get_doc("Weblogics Theme", theme_name))


def _save(name):
    """Persist theme choice. Errors propagate so the UI never shows a
    fake success that reverts on reload."""
    frappe.db.set_value(
        "User", frappe.session.user, "wl_desk_theme",
        name, update_modified=False,
    )
    frappe.cache.hdel("bootinfo", frappe.session.user)


@frappe.whitelist()
def get_themes():
    return _all_themes()
