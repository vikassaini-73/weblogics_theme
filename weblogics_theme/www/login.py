import frappe
from frappe.www.login import get_context as core_get_context

no_cache = 1


def get_context(context):
	"""
	Inherit Frappe's core login logic (CSRF, redirect handling, session, etc.)
	so security/session behaviour stays intact, then inject our custom
	branding/content fetched from the 'Login Page Settings' single DocType.
	"""
	context = core_get_context(context) or context
	context.no_header = 1
	context.no_footer = 1

	# Fetch settings (Single DocType) with safe fallbacks
	try:
		settings = frappe.get_single("Login Page Settings")
	except Exception:
		settings = None

	context.settings = {
		"logo": get_val(settings, "logo", ""),
		"heading_text": get_val(settings, "heading_text", "Login to Weblogics"),
		"subheading_text": get_val(
			settings, "subheading_text", "Enter your credentials to continue"
		),
		"right_panel_image": get_val(settings, "right_panel_image", ""),
		"right_panel_heading": get_val(
			settings,
			"right_panel_heading",
			"Build, Deploy & Manage Enterprise AI Agents",
		),
		"right_panel_subtext": get_val(
			settings,
			"right_panel_subtext",
			"Manage every AI agent, workflow, and business automation from one intelligent platform built for modern enterprises.",
		),
		"feature_row_1": get_val(settings, "feature_row_1", "Workflow automation"),
		"feature_row_2": get_val(settings, "feature_row_2", "Agent deployment"),
	}

	return context


def get_val(doc, fieldname, default):
	if doc is None:
		return default
	value = doc.get(fieldname)
	if value in (None, ""):
		return default
	return value