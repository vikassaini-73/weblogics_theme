# Copyright (c) 2026, Weblogics Theme
# License: MIT
"""
Patch: add wl_desk_theme custom field to User doctype.
Idempotent — safe to run multiple times.
"""

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


def execute():
    create_custom_fields(
        {
            "User": [
                {
                    "fieldname": "wl_desk_theme",
                    "fieldtype": "Data",
                    "label": "Weblogics Desk Theme",
                    "insert_after": "desk_theme",
                    "hidden": 1,
                    "no_copy": 1,
                    "read_only": 0,
                }
            ]
        },
        ignore_validate=True,
    )
    frappe.db.commit()
