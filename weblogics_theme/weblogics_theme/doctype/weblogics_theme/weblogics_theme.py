# Copyright (c) 2026, Weblogics Theme — License: MIT

import frappe
from frappe.model.document import Document


class WeblogicsTheme(Document):

    COLOR_FIELDS = [
        "brand_primary_color",
        "page_background_color",
        "card_background_color",
        "border_color",
        "body_text_color",
        "muted_text_color",
        "input_background_color",
        "list_row_hover_color",
        "navbar_background_color",
        "navbar_text_color",
        "breadcrumb_disabled_text_color",
        "button_primary_background_color",
        "button_primary_text_color",
        "sidebar_background_color",
        "sidebar_active_accent_color",
        "sidebar_hover_background_color",
        "sidebar_text_color",
        "list_link_color",
        "list_header_background_color",
    ]

    def validate(self):
        for f in self.COLOR_FIELDS:
            val = self.get(f)
            if val and not val.startswith("#"):
                self.set(f, "#" + val)

        # muted_text_color must stay neutral — warn if it looks like a saturated accent
        muted = self.muted_text_color or ""
        if muted and _is_highly_saturated(muted):
            frappe.msgprint(
                "Muted / Secondary Text Color looks like a saturated accent color. "
                "Labels and timestamps will be colored. Use a neutral gray (e.g. #6b7280) "
                "for best readability.",
                indicator="orange",
                alert=True,
            )

    def on_update(self):
        """Clear boot cache for every user who has this theme active."""
        try:
            users = frappe.db.get_all(
                "User",
                filters={"wl_desk_theme": self.theme_name},
                pluck="name",
            )
            for user in users:
                frappe.cache.hdel("bootinfo", user)
            frappe.cache.hdel("bootinfo", frappe.session.user)
        except Exception as e:
            frappe.log_error(f"wl_theme on_update cache clear: {e}")


def _is_highly_saturated(hex_color):
    """Return True if the color has saturation > 60% (likely an accent, not a gray)."""
    try:
        h = hex_color.lstrip("#")
        if len(h) == 3:
            h = h[0]*2 + h[1]*2 + h[2]*2
        r, g, b = int(h[0:2], 16) / 255, int(h[2:4], 16) / 255, int(h[4:6], 16) / 255
        cmax, cmin = max(r, g, b), min(r, g, b)
        delta = cmax - cmin
        if cmax == 0:
            return False
        saturation = delta / cmax  # HSV saturation
        return saturation > 0.4
    except Exception:
        return False
