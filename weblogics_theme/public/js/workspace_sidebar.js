/* Workspace sidebar — Weblogics Theme
 * Ported from Infintrix Theme sidebar implementation.
 * Powered by Frappe Workspace APIs.
 */
(function () {
	"use strict";

	if (!window.frappe || !frappe.boot || !frappe.session) return;

	/* ---------------- state ---------------- */

	var pages = null;
	var has_access = false;
	var sortable_instances = [];
	var is_edit_mode = false;
	var route_listener_bound = false;
	var global_listeners_bound = false;
	var edit_mode_observer = null;
	var native_sidebar_listener_bound = false;

	/* ---------------- helpers ---------------- */

	function storage_get(key, fallback) {
		try {
			var value = localStorage.getItem("workspace_sidebar_" + key);
			return value === null ? fallback : value;
		} catch (e) {
			return fallback;
		}
	}

	function storage_set(key, value) {
		try {
			localStorage.setItem("workspace_sidebar_" + key, value);
		} catch (e) {
			/* ignore storage errors */
		}
	}

	function native_sidebar_key() {
		return "native_filter_sidebar:" + window.location.pathname;
	}

	function active_native_sidebar() {
		var sidebars = Array.prototype.slice.call(document.querySelectorAll(".layout-side-section"));
		return sidebars.find(function (sidebar) {
			return sidebar.offsetParent !== null || sidebar.getBoundingClientRect().width > 0;
		}) || sidebars[0] || null;
	}

	function sync_native_sidebar() {
		if (document.body.classList.contains("workspace-page")) return;

		var sidebar = active_native_sidebar();
		if (!sidebar) return;

		var saved = storage_get(native_sidebar_key(), "closed");
		if (saved === "open") {
			sidebar.style.removeProperty("display");
		} else {
			sidebar.style.setProperty("display", "none");
		}
	}

	function bind_native_sidebar() {
		if (native_sidebar_listener_bound) return;
		native_sidebar_listener_bound = true;

		document.addEventListener("click", function (event) {
			var toggle = event.target.closest(".sidebar-toggle-btn");
			if (!toggle) return;

			window.setTimeout(function () {
				var sidebar = active_native_sidebar();
				if (!sidebar) return;

				var is_open = sidebar.offsetParent !== null && sidebar.getBoundingClientRect().width > 0;
				storage_set(native_sidebar_key(), is_open ? "open" : "closed");
			}, 0);
		});
	}

	function escape_html(value) {
		return value == null
			? ""
			: String(value)
				.replace(/&/g, "&amp;")
				.replace(/</g, "&lt;")
				.replace(/>/g, "&gt;")
				.replace(/"/g, "&quot;");
	}

	function slug(title) {
		try {
			return frappe.router.slug(title);
		} catch (e) {
			return String(title || "")
				.trim()
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/(^-|-$)/g, "");
		}
	}

	function item_icon(name, size) {
		try {
			return (
				'<span class="sidebar-item-icon">' +
				frappe.utils.icon(name || "folder-normal", size || "md") +
				"</span>"
			);
		} catch (e) {
			return '<span class="sidebar-item-icon"></span>';
		}
	}

	function display_name() {
		if (frappe.boot && frappe.boot.sysdefaults && frappe.boot.sysdefaults.company_name)
			return frappe.boot.sysdefaults.company_name;
		if (frappe.boot && frappe.boot.app_name) return frappe.boot.app_name;
		return frappe.user ? frappe.user.name : "Desk";
	}

	function app_logo_url() {
		var boot = frappe.boot || {};
		var desk_theme = (boot.desk_theme || "").toLowerCase();
		if (desk_theme === "dark")
			return boot.dark_logo || boot.app_logo_url || "/assets/frappe/images/frappe-logo.png";
		return boot.light_logo || boot.app_logo_url || "/assets/frappe/images/frappe-logo.png";
	}

	function workspace_href(page) {
		return page.public
			? "/app/" + slug(page.title)
			: "/app/private/" + slug(page.title);
	}

	function initials(name) {
		var parts = String(name || "").trim().split(/\s+/).filter(Boolean);
		if (!parts.length) return "U";
		if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
		return parts[0].slice(0, 2).toUpperCase();
	}

	/* ---------------- rendering ---------------- */

	function top_level_item_html(page, children) {
		var href = workspace_href(page);
		var data = [
			'data-title="' + escape_html(page.title) + '"',
			'data-name="' + escape_html(page.name) + '"',
			'data-public="' + (page.public ? "true" : "false") + '"',
			'data-module="' + escape_html(page.module || "") + '"',
			'data-icon="' + escape_html(page.icon || "") + '"',
			'data-parent="' + escape_html(page.parent_page || "") + '"',
		].join(" ");

		if (children.length) {
			return (
				'<li class="has-children" data-href="' + href + '" ' + data + ">" +
				'<div class="nav-toggle">' +
				'<a href="' + href + '" class="sidebar-anchor">' + item_icon(page.icon, "md") +
				'<span class="sidebar-label">' + escape_html(page.title) + "</span></a>" +
				'<i class="fa-solid fa-chevron-down nav-arrow" data-toggle-menu></i>' +
				"</div>" +
				'<ul class="sub-menu">' +
				'<li class="sub-parent" data-href="' + href + '">' +
				'<a href="' + href + '" class="sidebar-anchor">' + escape_html(page.title) + "</a></li>" +
				children.map(submenu_item).join("") +
				"</ul>" +
				"</li>"
			);
		}
		return (
			'<li data-href="' + href + '" ' + data + ">" +
			'<a href="' + href + '" class="sidebar-anchor">' + item_icon(page.icon, "md") +
			'<span class="sidebar-label">' + escape_html(page.title) + "</span></a>" +
			'<ul class="sub-menu blank">' +
			'<li><a class="sidebar-label" href="' + href + '">' + escape_html(page.title) + "</a></li>" +
			"</ul>" +
			"</li>"
		);
	}

	function submenu_item(child) {
		var href = workspace_href(child);
		return (
			'<li data-href="' + href + '" ' +
			'data-title="' + escape_html(child.title) + '" ' +
			'data-name="' + escape_html(child.name) + '" ' +
			'data-public="' + (child.public ? "true" : "false") + '" ' +
			'data-module="' + escape_html(child.module || "") + '" ' +
			'data-icon="' + escape_html(child.icon || "") + '" ' +
			'data-parent="' + escape_html(child.parent_page || "") + '">' +
			'<div class="sidebar-item-wrap">' +
			item_icon(child.icon || "arrow-right", "sm") +
			'<a href="' + href + '" class="sidebar-anchor">' + escape_html(child.title) + "</a>" +
			"</div>" +
			"</li>"
		);
	}

	function user_profile_html() {
		var full_name =
			(frappe.boot && frappe.boot.user && frappe.boot.user.full_name) ||
			(frappe.user && frappe.user.name) ||
			"User";
		var role =
			(frappe.boot && frappe.boot.user && frappe.boot.user.roles && frappe.boot.user.roles[0]) || "";

		var avatar = "";
		try {
			avatar = frappe.avatar(frappe.user.name, "avatar-medium");
		} catch (e) {
			avatar =
				'<div class="sidebar-profile-avatar">' + escape_html(initials(full_name)) + "</div>";
		}

		return (
			'<div class="sidebar-profile" title="' + escape_html(full_name) + '">' +
			avatar +
			'<div class="sidebar-profile-info">' +
			'<div class="sidebar-profile-name">' + escape_html(full_name) + "</div>" +
			'<div class="sidebar-profile-role">' + escape_html(role) + "</div>" +
			"</div>" +
			"</div>"
		);
	}

	function render(next_pages, allowed) {
		var root = document.getElementById("workspace-sidebar");
		if (!root) return;

		has_access = !!allowed;

		/* Group children by their parent title + visibility (public/private). */
		var top = [];
		var children_by_key = {};
		next_pages.forEach(function (page) {
			var parent = (page.parent_page || "").trim();
			var key = parent + "|" + (page.public ? "pub" : "priv");
			if (parent) {
				(children_by_key[key] = children_by_key[key] || []).push(page);
			} else {
				top.push(page);
			}
		});
		function children_of(page) {
			return children_by_key[page.title + "|" + (page.public ? "pub" : "priv")] || [];
		}

		var logo = app_logo_url();
		var html =
			'<div class="sidebar-logo" id="workspace-logo-toggle" title="Toggle Sidebar">' +
			'<img class="sidebar-logo-img" src="' + escape_html(logo) + '" alt="Logo" ' +
			'onerror="this.style.display=\'none\'">' +
			'<span class="sidebar-title">' + escape_html(display_name()) + "</span>" +
			"</div>";

		html += '<div class="sidebar-scroll"><ul class="nav-links">';
		top.forEach(function (page) {
			html += top_level_item_html(page, children_of(page));
		});
		html += "</ul></div>";

		html += user_profile_html();

		root.innerHTML = html;
		wire_events(root);
		update_active(root);
		update_workspace_class();
		setup_edit_mode_watcher();
	}

	function is_collapsed() {
		return document.body.classList.contains("workspace-sidebar-closed");
	}

	/* ---------------- interactions ---------------- */

	function wire_events(root) {
		/* Logo click toggles collapsed mode. */
		var logo_toggle = root.querySelector("#workspace-logo-toggle");
		if (logo_toggle) {
			logo_toggle.addEventListener("click", function () {
				var closed = !is_collapsed();
				document.body.classList.toggle("workspace-sidebar-closed", closed);
				storage_set("state", closed ? "closed" : "open");
			});
		}

		/* Collapse / expand a module's sub-menu. Navigation itself is handled
		   by Frappe's delegated click handler, so none is added here. */
		root.querySelectorAll(".nav-arrow").forEach(function (arrow) {
			arrow.addEventListener("click", function (e) {
				e.stopPropagation();
				arrow.closest("li").classList.toggle("show-menu");
			});
		});

		/* Position the fly-out sub-menu while collapsed. */
		root.querySelectorAll(".sub-menu").forEach(function (sub) {
			sub.parentElement.addEventListener("mouseenter", function () {
				if (is_collapsed()) {
					var rect = sub.parentElement.getBoundingClientRect();
					sub.style.left = "84px";
					sub.style.top = rect.top + "px";
				}
			});
		});

		/* Highlight the active route and refresh the workspace scope. */
		if (!route_listener_bound && frappe.router && frappe.router.on) {
			route_listener_bound = true;
			frappe.router.on("change", function () {
				update_active(root);
				update_workspace_class();
				window.setTimeout(sync_native_sidebar, 0);
				window.setTimeout(sync_native_sidebar, 180);
			});
		}

		if (!global_listeners_bound) {
			global_listeners_bound = true;
			window.addEventListener("popstate", function () {
				update_active(root);
				update_workspace_class();
			});

			document.addEventListener("click", function (e) {
				if (!e.target.closest(".sidebar-item-menu")) close_all_item_menus();
			});
		}
	}

	function update_active(root) {
		if (!root) return;
		var path = window.location.pathname.replace(/\/+$/, "");

		root.querySelectorAll("li[data-href]").forEach(function (li) {
			li.classList.remove("active");
		});
		root.querySelectorAll("li[data-href]").forEach(function (li) {
			var href = (li.getAttribute("data-href") || "").replace(/\/+$/, "");
			if (href === path || path.indexOf(href + "/") === 0) {
				li.classList.add("active");
				var sub = li.closest(".sub-menu");
				if (sub && sub.closest("li")) {
					sub.closest("li").classList.add("active", "show-menu");
				}
			}
		});
	}

	/* ---------------- route scope ---------------- */

	function update_workspace_class() {
		/* Only the workspace page hides the default sidebar. Frappe keeps every
		   page container in the DOM and shows/hides them, so the currently
		   visible one has a non-null offsetParent. */
		var active = null;
		document.querySelectorAll(".content.page-container").forEach(function (page) {
			if (page.offsetParent !== null) active = page;
		});
		document.body.classList.toggle(
			"workspace-page",
			!!active && active.id === "page-Workspaces"
		);
	}

	/* ---------------- edit mode ---------------- */

	function setup_edit_mode_watcher() {
		/* Frappe adds "edit-mode" to .layout-main-section while a workspace is
		   being edited; mirror it with our own affordances. */
		var body = document.getElementById("body");
		if (!body) return;

		if (edit_mode_observer) return;

		edit_mode_observer = new MutationObserver(function () {
			var editing = !!document.querySelector(".layout-main-section.edit-mode");
			if (editing !== is_edit_mode) {
				is_edit_mode = editing;
				toggle_edit_mode(editing);
			}
		});
		edit_mode_observer.observe(body, {
			subtree: true,
			attributes: true,
			attributeFilter: ["class"],
		});
	}

	function toggle_edit_mode(on) {
		var root = document.getElementById("workspace-sidebar");
		if (!root) return;

		root.classList.toggle("workspace-editing", on);

		if (on) {
			root.querySelectorAll(".nav-links > li[data-title]").forEach(prepare_editable_li);
			root.querySelectorAll(".sub-menu > li[data-title]").forEach(prepare_editable_li);
			make_sortable();
		} else {
			destroy_sortable();
			root.querySelectorAll(".sidebar-item-actions").forEach(function (el) {
				el.remove();
			});
			close_all_item_menus();
		}
	}

	function prepare_editable_li(li) {
		if (li.querySelector(".sidebar-item-actions")) return;

		var page = {
			title: li.getAttribute("data-title"),
			name: li.getAttribute("data-name"),
			public: li.getAttribute("data-public") === "true",
			module: li.getAttribute("data-module"),
			icon: li.getAttribute("data-icon"),
			parent: li.getAttribute("data-parent") || "",
		};

		/* Same rule as the default sidebar: editable unless it is a public
		   page the user cannot access. */
		var editable = !page.public || has_access;
		li.classList.toggle("is-editable", editable);

		var actions = document.createElement("div");
		actions.className = "sidebar-item-actions";

		if (editable) {
			var handle = document.createElement("span");
			handle.className = "sidebar-item-drag";
			handle.title = "Drag to reorder";
			handle.innerHTML =
				'<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">' +
				'<circle cx="8" cy="6" r="2"/><circle cx="16" cy="6" r="2"/>' +
				'<circle cx="8" cy="12" r="2"/><circle cx="16" cy="12" r="2"/>' +
				'<circle cx="8" cy="18" r="2"/><circle cx="16" cy="18" r="2"/></svg>';
			actions.appendChild(handle);
		}

		/* Menu trigger. */
		var menu_btn = document.createElement("span");
		menu_btn.className = "sidebar-item-menu-btn";
		menu_btn.title = "Actions";
		menu_btn.innerHTML =
			'<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">' +
			'<circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>';
		menu_btn.addEventListener("click", function (e) {
			e.stopPropagation();
			e.preventDefault();
			toggle_item_menu(menu_btn, li);
		});
		actions.appendChild(menu_btn);

		/* Dropdown items. */
		var menu = document.createElement("div");
		menu.className = "sidebar-item-menu hidden";

		var items = editable ? [["edit", "Edit"], ["duplicate", "Duplicate"], ["hide", "Hide"]] : [["duplicate", "Duplicate"]];
		if (editable) {
			/* Always offer Delete — server still guards permissions
			   (public workspaces need Workspace Manager; private need owner). */
			items.push(["delete", "Delete"]);
		}

		items.forEach(function (pair) {
			var item = document.createElement("div");
			item.className =
				"sidebar-item-menu-item" + (pair[0] === "delete" ? " sidebar-danger" : "");
			item.textContent = pair[1];
			item.setAttribute("data-action", pair[0]);
			item.addEventListener("click", function (e) {
				e.stopPropagation();
				close_all_item_menus();
				handle_item_action(pair[0], page);
			});
			menu.appendChild(item);
		});

		actions.appendChild(menu);

		/* Insert actions after the row (as a sibling of the anchor / nav-toggle). */
		var nav_toggle = li.querySelector(":scope > .nav-toggle");
		var anchor = li.querySelector(":scope > a");
		var target = nav_toggle || anchor;
		if (target && target.nextSibling) {
			target.parentNode.insertBefore(actions, target.nextSibling);
		} else {
			li.appendChild(actions);
		}
	}

	function toggle_item_menu(btn, li) {
		var menu = li.querySelector(".sidebar-item-menu");
		if (!menu) return;
		var was_hidden = menu.classList.contains("hidden");
		close_all_item_menus();
		if (was_hidden) menu.classList.remove("hidden");
	}

	function close_all_item_menus() {
		document
			.querySelectorAll("#workspace-sidebar .sidebar-item-menu:not(.hidden)")
			.forEach(function (menu) {
				menu.classList.add("hidden");
			});
	}

	/* ---------------- item actions ---------------- */

	function handle_item_action(action, page) {
		switch (action) {
			case "edit":
				edit_workspace_page(page);
				break;
			case "duplicate":
				duplicate_workspace_page(page);
				break;
			case "hide":
				hide_workspace_page(page);
				break;
			case "delete":
				delete_workspace_page(page);
				break;
		}
	}

	function edit_workspace_page(page) {
		/* Match the default sidebar's "Update Details" dialog: Title, Parent
		   (reparenting), Public — with Icon/Indicator-color swapping based on
		   the Public toggle. Parent options come from the loaded sidebar pages. */
		var top_pages = (pages || [])
			.filter(function (p) {
				return !(p.parent_page || "").trim() && p.title !== page.title;
			})
			.map(function (p) { return { title: p.title, public: !!p.public }; });
		function parent_options(is_public) {
			return [""].concat(
				top_pages
					.filter(function (p) { return p.public === is_public; })
					.map(function (p) { return p.title; })
			);
		}

		var dialog = new frappe.ui.Dialog({
			title: "Edit " + page.title,
			fields: [
				{ fieldname: "title", label: "Title", fieldtype: "Data", reqd: 1, default: page.title },
				{
					fieldname: "parent",
					label: "Parent Workspace",
					fieldtype: "Select",
					options: parent_options(!!page.public),
					default: page.parent || "",
				},
				{
					fieldname: "is_public",
					label: "Public",
					fieldtype: "Check",
					default: page.public ? 1 : 0,
					onchange: function () {
						var is_pub = !!this.get_value();
						dialog.set_df_property("parent", "options", parent_options(is_pub));
						dialog.set_df_property("icon", "hidden", is_pub ? 0 : 1);
						dialog.set_df_property("indicator_color", "hidden", is_pub ? 1 : 0);
					},
				},
				{
					fieldname: "icon",
					label: "Icon",
					fieldtype: "Icon",
					default: page.icon || "",
					hidden: page.public ? 0 : 1,
				},
				{
					fieldname: "indicator_color",
					label: "Indicator Color",
					fieldtype: "Select",
					options: [
						"", "green", "cyan", "blue", "orange", "yellow", "gray", "grey",
						"red", "pink", "darkgrey", "purple", "light-blue",
					],
					default: page.indicator_color || "",
					hidden: page.public ? 1 : 0,
				},
			],
			primary_action_label: "Save",
			primary_action: function () {
				var values = dialog.get_values();
				frappe.call({
					method: "frappe.desk.doctype.workspace.workspace.update_page",
					args: {
						name: page.name,
						title: values.title,
						icon: values.icon || "",
						indicator_color: values.indicator_color || "",
						parent: values.parent || "",
						public: values.is_public ? 1 : 0,
					},
					callback: function () {
						dialog.hide();
						frappe.show_alert({ message: "Page updated", indicator: "green" });
						reload();
					},
				});
			},
		});
		dialog.show();
	}

	function duplicate_workspace_page(page) {
		var dialog = new frappe.ui.Dialog({
			title: "Duplicate " + page.title,
			fields: [
				{
					fieldname: "title",
					label: "New Page Title",
					fieldtype: "Data",
					reqd: 1,
					default: page.title + " (Copy)",
				},
				{
					fieldname: "is_public",
					label: "Public",
					fieldtype: "Check",
					default: page.public ? 1 : 0,
				},
			],
			primary_action_label: "Duplicate",
			primary_action: function () {
				var values = dialog.get_values();
				frappe.call({
					method: "frappe.desk.doctype.workspace.workspace.duplicate_page",
					args: {
						page_name: page.name,
						new_page: JSON.stringify({
							title: values.title,
							parent: page.parent || "",
							is_public: values.is_public ? 1 : 0,
							icon: page.icon || "",
							indicator_color: page.indicator_color || "",
						}),
					},
					callback: function () {
						dialog.hide();
						frappe.show_alert({ message: "Page duplicated", indicator: "green" });
						reload();
					},
				});
			},
		});
		dialog.show();
	}

	function hide_workspace_page(page) {
		frappe.confirm(
			"Hide <b>" + escape_html(page.title) + "</b>? You can unhide it later from the workspace edit mode.",
			function () {
				frappe.call({
					method: "frappe.desk.doctype.workspace.workspace.hide_page",
					args: { page_name: page.name },
					callback: function () {
						frappe.show_alert({ message: "Page hidden", indicator: "green" });
						reload();
					},
				});
			}
		);
	}

	function delete_workspace_page(page) {
		frappe.confirm(
			"Delete <b>" + escape_html(page.title) + "</b>? This cannot be undone.",
			function () {
				frappe.call({
					method: "frappe.desk.doctype.workspace.workspace.delete_page",
					args: {
						page: JSON.stringify({
							name: page.name,
							public: page.public ? 1 : 0,
							title: page.title,
						}),
					},
					callback: function () {
						frappe.show_alert({ message: "Page deleted", indicator: "green" });
						reload();
					},
				});
			}
		);
	}

	/* ---------------- sort / drag-drop ---------------- */

	function make_sortable() {
		destroy_sortable();

		var opts = {
			group: "workspace-sidebar",
			draggable: "li.is-editable",
			handle: ".sidebar-item-drag",
			animation: 150,
			fallbackOnBody: true,
			swapThreshold: 0.65,
			ghostClass: "is-sort-ghost",
			chosenClass: "is-sort-chosen",
			onEnd: function (evt) {
				var is_public = evt.item.getAttribute("data-public") === "true";
				save_sort_order(is_public);
			},
		};

		document.querySelectorAll("#workspace-sidebar .nav-links").forEach(function (list) {
			sortable_instances.push(new Sortable(list, opts));
		});
		document.querySelectorAll("#workspace-sidebar .sub-menu").forEach(function (sub) {
			sortable_instances.push(new Sortable(sub, opts));
		});
	}

	function destroy_sortable() {
		sortable_instances.forEach(function (instance) {
			instance.destroy();
		});
		sortable_instances = [];
	}

	function collect_items(root, is_public) {
		var items = [];
		root.querySelectorAll(".sidebar-scroll .nav-links > li[data-title]").forEach(function (li) {
			var pub = li.getAttribute("data-public") === "true";
			if (pub !== is_public) return;
			var title = li.getAttribute("data-title");
			items.push({ title: title, parent_page: "", public: pub ? 1 : 0 });
			li.querySelectorAll(":scope > .sub-menu > li[data-title]").forEach(function (child_li) {
				var child_pub = child_li.getAttribute("data-public") === "true";
				if (child_pub !== is_public) return;
				items.push({
					title: child_li.getAttribute("data-title"),
					parent_page: title,
					public: child_pub ? 1 : 0,
				});
			});
		});
		return items;
	}

	function save_sort_order(is_public) {
		var root = document.getElementById("workspace-sidebar");
		if (!root) return;

		var items = collect_items(root, is_public);
		if (!items.length) return;

		var args = is_public
			? { sb_public_items: JSON.stringify(items), sb_private_items: "[]" }
			: { sb_public_items: "[]", sb_private_items: JSON.stringify(items) };

		frappe.call({
			method: "frappe.desk.doctype.workspace.workspace.sort_pages",
			args: args,
			callback: function () {
				frappe.show_alert({ message: "Sidebar order saved", indicator: "green" });
			},
		});
	}

	/* ---------------- reload ---------------- */

	function reload() {
		load_pages().then(function (result) {
			if (result && result.pages) {
				pages = result.pages;
				render(result.pages, !!result.has_access);
			}
		});
	}

	/* ---------------- boot ---------------- */

	function load_pages() {
		return frappe.xcall("frappe.desk.desktop.get_workspace_sidebar_items");
	}

	function init() {
		var state = storage_get("state", "open");
		document.body.classList.add("workspace-sidebar");
		document.body.classList.toggle("workspace-sidebar-closed", state === "closed");
		bind_native_sidebar();
		window.setTimeout(sync_native_sidebar, 0);
		window.setTimeout(sync_native_sidebar, 180);

		var aside = document.createElement("aside");
		aside.id = "workspace-sidebar";
		aside.className = "sidebar theme_sidebar";
		document.body.appendChild(aside);

		load_pages()
			.then(function (result) {
				if (result && result.pages) render(result.pages, !!result.has_access);
			})
			.catch(function () {
				var retries = 0;
				var timer = setInterval(function () {
					retries++;
					if (retries > 5) return clearInterval(timer);
					load_pages()
						.then(function (result) {
							if (result && result.pages) {
								render(result.pages, !!result.has_access);
								clearInterval(timer);
							}
						})
						.catch(function () {});
				}, 1200);
			});
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init);
	} else {
		init();
	}
})();
