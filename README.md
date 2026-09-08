# Weblogics Theme

Custom admin-editable login page for Frappe/ERPNext with split-screen layout — left side login form, right side branding panel.

## Features

- Split-screen login page (50/50 layout)
- Left panel: Frappe-style login form with input icons, show/hide password, loading state
- Right panel: Branded gradient or custom background image with heading, subtext & feature highlights
- **Fully admin-editable** via Single DocType "Login Page Settings" — no code changes needed
- Responsive: right panel hides on mobile (< 900px)
- Works with Frappe v15+ / ERPNext v15+

## Screenshot

```
┌─────────────────────┬─────────────────────────────┐
│                     │                             │
│    ┌──────┐         │    Build, Deploy &          │
│    │ LOGO │         │    Manage Enterprise        │
│    └──────┘         │    AI Agents                │
│                     │                             │
│  Login to Weblogics │  ○ Workflow automation      │
│  Enter your creds   │  ○ Agent deployment         │
│                     │                             │
│  ✉ jane@example.com│                             │
│  🔒 ••••••    Show  │                             │
│       Forgot Pass?  │                             │
│  [     Login     ]  │                             │
│       ─ or ─        │                             │
│  [Login with Email] │                             │
│                     │                             │
└─────────────────────┴─────────────────────────────┘
```

## Prerequisites

- Python 3.10+
- Node.js 18+ (recommended: v24)
- [Bench CLI](https://github.com/frappe/bench) installed
- Frappe/ERPNext site running (v15+)

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

Example:

```bash
bench --site weblogics.local install-app weblogics_theme
```

### Step 3: Build assets

```bash
bench build --app weblogics_theme
```

### Step 4: Restart bench

```bash
bench restart
```

Now visit `http://YOUR-SITE.local/login` — the custom login page should appear.

## Admin Settings (DocType)

Go to **`/app/login-page-settings`** in your Frappe desk to configure:

| Field | Description |
|---|---|
| Logo | Logo shown above the login form (80×80px recommended) |
| Heading Text | e.g., "Login to Weblogics" |
| Subheading Text | e.g., "Enter your credentials to continue" |
| Right Panel Background Image | Background for right panel (1200×1600px). Leave empty for blue gradient |
| Right Panel Heading | e.g., "Build, Deploy & Manage Enterprise AI Agents" |
| Right Panel Subtext | Description text for right panel |
| Feature Row 1 | Feature highlight line 1 |
| Feature Row 2 | Feature highlight line 2 |

All fields have sensible defaults — the page works out of the box without any configuration.

## File Structure

```
weblogics_theme/
├── README.md
├── setup.py
├── pyproject.toml
├── license.txt
├── requirements.txt
└── weblogics_theme/
    ├── __init__.py
    ├── modules.txt
    ├── patches.txt
    ├── weblogics_theme/
    │   ├── __init__.py
    │   ├── doctype/
    │   │   └── login_page_settings/
    │   │       ├── __init__.py
    │   │       ├── login_page_settings.py
    │   │       └── login_page_settings.json
    │   └── www/
    │       ├── __init__.py
    │       ├── login.html
    │       └── login.py
    └── public/
        └── css/
            └── custom_login.css
```

## How It Works

- `www/login.html` + `www/login.py` override Frappe's default login route
- Inherits core `frappe.www.login.get_context` for CSRF/session/security
- Settings fetched from "Login Page Settings" Single DocType with safe fallbacks
- CSS loaded via `/assets/weblogics_theme/css/custom_login.css`

## Troubleshooting

**Default login page still showing?**
Make sure the app is installed on the site:

```bash
bench --site YOUR-SITE.local install-app weblogics_theme
bench restart
```

**CSS not loading / old version showing?**
Rebuild assets and hard-refresh browser (`Ctrl+Shift+R`):

```bash
bench build --app weblogics_theme
bench restart
```

**Icons not visible in input fields?**
Hard-refresh the browser (`Ctrl+Shift+R`) to clear cached CSS.

## License

MIT
