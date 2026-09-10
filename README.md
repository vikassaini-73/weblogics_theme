# Weblogics Theme

A complete theming solution for Frappe/ERPNext — custom desk themes, split-screen login page, and a custom workspace sidebar.

## Features

### Desk Themes
- 8 built-in themes: Default Light, Dark Night, Crimson Red, Ocean Teal, Royal Purple, Sunset Orange, Forest Green, Midnight Blue
- Per-user theme preference — each user picks their own theme
- **Auto-installs Default Light** on fresh site install — no manual setup needed
- Theme picker dialog accessible from the navbar
- Full CSS variable injection: colors, fonts, button styles, form layouts, list styles
- Auto dark mode support (follows OS `prefers-color-scheme`)
- Flash-free early apply via `localStorage` before Frappe boots

### Custom Login Page
- Split-screen layout (50/50) — left: login form, right: branding panel
- **Fully admin-editable** via "Login Page Settings" Single DocType — no code changes needed
- Supports custom logo, headings, background image, and feature highlights
- Responsive: right panel hides on mobile (< 900px)

### Custom Workspace Sidebar
- Fixed-position sidebar with collapsible sub-menus
- Drag-and-drop reorder in edit mode
- Active route highlighting
- Fully themed via CSS variables

## Built-in Themes

| Theme | Mode | Accent |
|---|---|---|
| Default Light | Light | Indigo `#4f46e5` |
| Dark Night | Dark | Slate `#818cf8` |
| Crimson Red | Light | Red `#dc2626` |
| Ocean Teal | Light | Teal `#0d9488` |
| Royal Purple | Light | Purple `#7c3aed` |
| Sunset Orange | Light | Orange `#ea580c` |
| Forest Green | Light | Green `#16a34a` |
| Midnight Blue | Dark | Blue `#3b82f6` |

## Prerequisites

- Python 3.10+
- Node.js 18+
- [Bench CLI](https://github.com/frappe/bench) installed
- Frappe/ERPNext v15+ site running

## Installation

### Step 1: Get the app

```bash
cd ~/frappe-bench
bench get-app https://github.com/vikassaini-73/weblogics_theme.git
```

### Step 2: Install on your site

```bash
bench --site YOUR-SITE.local install-app weblogics_theme
```

On install, the app automatically:
1. Seeds all 8 built-in themes into the database
2. Sets **Default Light** as the active theme for every enabled user

### Step 3: Build assets

```bash
bench build --app weblogics_theme
```

### Step 4: Restart bench

```bash
bench restart
```

Visit `http://YOUR-SITE.local` — the theme is applied immediately.

## Switching Themes

Click the **palette icon** in the navbar to open the theme picker. Select any theme — it applies instantly and is saved per user.

To reset to Frappe default, click **"Reset to Frappe Default"** in the picker.

## Admin Settings

### Login Page Settings
Go to **`/app/login-page-settings`** to configure:

| Field | Description |
|---|---|
| Logo | Logo above the login form (80×80px recommended) |
| Heading Text | e.g., "Login to Weblogics" |
| Subheading Text | e.g., "Enter your credentials to continue" |
| Right Panel Background Image | Leave empty for default gradient |
| Right Panel Heading | Main heading on the right panel |
| Right Panel Subtext | Description text |
| Feature Row 1 / 2 | Feature highlight lines |

## File Structure

```
weblogics_theme/
├── README.md
├── setup.py
├── pyproject.toml
└── weblogics_theme/
    ├── hooks.py               # App hooks — after_install, after_migrate, CSS/JS includes
    ├── install.py             # Theme seeding + default theme assignment
    ├── patches.txt
    ├── api/
    │   └── theme.py           # Whitelisted API: switch_theme, get_themes, extend_bootinfo
    ├── patches/
    │   ├── add_wl_desk_theme_to_user.py   # Adds wl_desk_theme field to User DocType
    │   └── rename_theme_fields_v2.py      # Field rename migration
    ├── public/
    │   ├── css/
    │   │   ├── theme_switcher.css         # Theme picker dialog styles
    │   │   ├── workspace_sidebar.css      # Sidebar layout styles
    │   │   └── custom_login.css           # Login page styles
    │   └── js/
    │       ├── theme_switcher.js          # Core theme engine + picker UI
    │       └── workspace_sidebar.js       # Custom sidebar widget
    └── weblogics_theme/
        └── doctype/
            ├── weblogics_theme/           # Theme DocType (50+ color/style fields)
            ├── login_page_settings/       # Single DocType for login branding
            └── weblogics_theme_menu_icon/ # Child table for sidebar icons
```

## How It Works

**Theme engine flow:**
1. `after_install` seeds 8 themes into DB and sets Default Light for all users
2. On every desk load, `extend_bootinfo` injects `wl_themes` and `wl_active_theme` into `frappe.boot`
3. `theme_switcher.js` reads boot data and injects CSS variables into `:root`
4. If no theme is set for a user, Default Light is applied automatically as fallback
5. When user switches theme, `switch_theme` API saves preference to `User.wl_desk_theme`

**Login page override:**
- `www/login.html` + `www/login.py` override Frappe's default `/login` route
- Settings fetched from "Login Page Settings" Single DocType with safe fallbacks

## Troubleshooting

**Theme not applying after install?**
```bash
bench --site YOUR-SITE.local migrate
bench build --app weblogics_theme
bench restart
```

**CSS not loading / old version showing?**
```bash
bench build --app weblogics_theme
bench restart
```
Then hard-refresh browser (`Ctrl+Shift+R`).

**Default login page still showing?**
```bash
bench --site YOUR-SITE.local install-app weblogics_theme
bench restart
```

## License

MIT
