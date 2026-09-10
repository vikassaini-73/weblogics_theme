# Copyright (c) 2026, Weblogics Theme — License: MIT
"""
Patch: rename Weblogics Theme fields to clearer names.
Uses frappe.model.rename_field which handles DB column rename +
updates all existing documents atomically. Idempotent — safe to re-run.
"""

import frappe


RENAMES = [
    # (old_fieldname, new_fieldname)
    ("primary_color",                   "brand_primary_color"),
    ("background_color",                "page_background_color"),
    ("surface_color",                   "card_background_color"),
    # border_color stays the same — skip
    ("text_color",                      "body_text_color"),
    ("text_muted_color",                "muted_text_color"),
    ("header_bg_color",                 "navbar_background_color"),
    ("header_font_color",               "navbar_text_color"),
    ("header_breadcrumb_disabled_color","breadcrumb_disabled_text_color"),
    ("btn_primary_color",               "button_primary_background_color"),
    ("btn_primary_text_color",          "button_primary_text_color"),
    ("sidebar_bg_color",                "sidebar_background_color"),
    ("sidebar_active_color",            "sidebar_active_accent_color"),
    ("sidebar_hover_color",             "sidebar_hover_background_color"),
    # sidebar_text_color stays the same — skip
    ("list_subject_color",              "list_link_color"),
    ("list_head_bg_color",              "list_header_background_color"),
    ("form_style",                      "form_layout_style"),
    ("font_family",                     "app_font_family"),
    ("list_style",                      "list_layout_style"),
    ("button_style",                    "button_visual_style"),
    ("is_dark",                         "dark_mode_enabled"),
    ("is_dark_mode_toggle",             "auto_dark_mode"),
    # enable_language_switcher stays the same — skip
]


def execute():
    doctype = "Weblogics Theme"

    # Reload fresh meta so rename_field can see current columns
    frappe.reload_doc("weblogics_theme", "doctype", "weblogics_theme", force=True)

    for old, new in RENAMES:
        # Skip if old column no longer exists (patch already ran)
        if not frappe.db.has_column(doctype, old):
            continue
        # Skip if new column already exists (rename already done)
        if frappe.db.has_column(doctype, new):
            continue
        try:
            frappe.model.rename_field(doctype, old, new)
        except Exception as e:
            frappe.log_error(f"wl_rename_field {old}→{new}: {e}")

    frappe.db.commit()
