/* Weblogics Theme — Theme Switcher v2 */
(function () {
    "use strict";

    var STYLE_TAG_ID = "wl-theme-vars";
    var STORAGE_KEY  = "wl_active_theme";
    var FONT_TAG_ID  = "wl-google-font";
    var API_SWITCH   = "weblogics_theme.api.theme.switch_theme";
    var API_GET_ALL  = "weblogics_theme.api.theme.get_themes";

    var _themes      = [];
    var _active_name = null;
    var _prev_name   = null;
    var _dialog_el   = null;
    var _initialized = false;
    var _media_query = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");

    /* ── Color helpers ── */
    function _parse(hex) {
        if (!hex || typeof hex !== "string") return null;
        var h = hex.replace("#", "");
        if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
        if (h.length !== 6) return null;
        var r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
        if (isNaN(r)||isNaN(g)||isNaN(b)) return null;
        return {r:r, g:g, b:b};
    }
    function _fmt(c) {
        return "#"+[c.r,c.g,c.b].map(function(x){return("0"+Math.round(Math.max(0,Math.min(255,x))).toString(16)).slice(-2);}).join("");
    }
    function _lighten(hex, amt) {
        var c=_parse(hex); if(!c) return hex||"#f1f5f9";
        return _fmt({r:c.r+(255-c.r)*amt, g:c.g+(255-c.g)*amt, b:c.b+(255-c.b)*amt});
    }
    function _darken(hex, amt) {
        var c=_parse(hex); if(!c) return hex||"#374151";
        return _fmt({r:c.r*(1-amt), g:c.g*(1-amt), b:c.b*(1-amt)});
    }
    function _mix(hexA, hexB, t) {
        var a=_parse(hexA), b=_parse(hexB);
        if(!a||!b) return hexA||hexB||"#111827";
        return _fmt({r:a.r+(b.r-a.r)*t, g:a.g+(b.g-a.g)*t, b:a.b+(b.b-a.b)*t});
    }
    function _rgba(hex, alpha) {
        var c=_parse(hex); if(!c) return "transparent";
        return "rgba("+c.r+","+c.g+","+c.b+","+alpha+")";
    }
    function _derive_input_bg(card, is_dark)  { return is_dark ? _lighten(card,0.09) : _darken(card,0.04); }
    function _derive_list_hover(bc, is_dark)  { return is_dark ? _lighten(bc,0.12)   : _darken(bc,0.06);  }
    function _derive_heading(tc)              { return _mix(tc,"#000000",0.15); }
    function _to_dark_neutral(hex, lt) {
        var c=_parse(hex); if(!c) return "#1e293b";
        var r=c.r/255,g=c.g/255,b=c.b/255;
        var L=((Math.max(r,g,b)+Math.min(r,g,b))/2);
        if(L<0.3) return hex;
        var scale=(lt*(1-(L-0.3)/0.7))/Math.max(L,0.001);
        return _fmt({r:c.r*scale,g:c.g*scale,b:c.b*scale});
    }

    /* ── Early apply (anti-flash) ── */
    (function(){
        try { var s=localStorage.getItem(STORAGE_KEY); if(s) wl_apply_theme(JSON.parse(s)); } catch(e){}
    })();

    /* ── Core: wl_apply_theme ── */
    function wl_apply_theme(theme) {
        if (!theme||!theme.name) { wl_remove_theme(); return; }

        /* dark_mode_enabled = static dark flag
           auto_dark_mode    = follow OS — overrides dark_mode_enabled */
        var is_dark = !!theme.dark_mode_enabled;
        if (theme.auto_dark_mode && _media_query) is_dark = _media_query.matches;

        if (is_dark) _apply_dark(theme); else _apply_light(theme);

        document.documentElement.setAttribute("data-theme", is_dark ? "dark" : "light");
        document.documentElement.classList.toggle("dark-mode", !!is_dark);

        _active_name = theme.name;
        _apply_font(theme.app_font_family);
        _apply_style_classes(theme);
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(theme)); } catch(e){}
    }

    function _apply_light(t) {
        var pc=t.brand_primary_color||"#4f46e5", bg=t.page_background_color||"#f8fafc",
            card=t.card_background_color||"#ffffff", bc=t.border_color||"#e2e8f0",
            tc=t.body_text_color||"#111827", tmc=t.muted_text_color||"#6b7280",
            hbg=t.navbar_background_color||card, hfc=t.navbar_text_color||tc,
            hbc=t.breadcrumb_disabled_text_color||tmc,
            btnbg=t.button_primary_background_color||pc, btnfn=t.button_primary_text_color||"#ffffff",
            sidbg=t.sidebar_background_color||card, sidac=t.sidebar_active_accent_color||pc,
            sidhv=t.sidebar_hover_background_color||_lighten(bc,0.5), sidtc=t.sidebar_text_color||tc,
            lstc=t.list_link_color||pc, lhbg=t.list_header_background_color||_darken(card,0.03),
            ctrl_bg=t.input_background_color||_derive_input_bg(card,false),
            row_hover=t.list_row_hover_color||_derive_list_hover(bc,false),
            heading=_derive_heading(tc);
        _inject_vars(_build_vars({pc,bg,card,bc,tc,tmc,heading,hbg,hfc,hbc,btnbg,btnfn,sidbg,sidac,sidhv,sidtc,lstc,lhbg,ctrl_bg,row_hover}));
    }

    function _apply_dark(t) {
        var pc=t.brand_primary_color||"#818cf8", rd=t.dark_mode_enabled,
            btnbg=t.button_primary_background_color||pc, btnfn=t.button_primary_text_color||"#0f172a",
            sidac=t.sidebar_active_accent_color||pc, lstc=t.list_link_color||pc,
            bg   =rd?(t.page_background_color||"#0f172a")  :_to_dark_neutral(t.page_background_color||"#f8fafc",0.05),
            card =rd?(t.card_background_color||"#1e293b")  :_to_dark_neutral(t.card_background_color||"#ffffff",0.10),
            bc   =rd?(t.border_color||"#334155")           :_to_dark_neutral(t.border_color||"#e2e8f0",0.18),
            tc   =rd?(t.body_text_color||"#f1f5f9")        :_lighten(t.body_text_color||"#111827",0.85),
            tmc  =rd?(t.muted_text_color||"#94a3b8")       :_lighten(t.muted_text_color||"#6b7280",0.45),
            hbg  =rd?(t.navbar_background_color||card)     :_to_dark_neutral(t.navbar_background_color||"#ffffff",0.08),
            hfc  =rd?(t.navbar_text_color||tc)             :_lighten(t.navbar_text_color||"#111827",0.85),
            hbc  =rd?(t.breadcrumb_disabled_text_color||tmc):_lighten(t.breadcrumb_disabled_text_color||"#9ca3af",0.3),
            sidbg=rd?(t.sidebar_background_color||card)    :_to_dark_neutral(t.sidebar_background_color||"#ffffff",0.08),
            sidhv=rd?(t.sidebar_hover_background_color||bc):_to_dark_neutral(t.sidebar_hover_background_color||"#f3f4f6",0.15),
            sidtc=rd?(t.sidebar_text_color||tc)            :_lighten(t.sidebar_text_color||"#111827",0.85),
            lhbg =rd?(t.list_header_background_color||bg)  :_to_dark_neutral(t.list_header_background_color||"#f9fafb",0.06),
            ctrl_bg=t.input_background_color||_derive_input_bg(card,true),
            row_hover=t.list_row_hover_color||_derive_list_hover(bc,true),
            heading=_derive_heading(tc);
        _inject_vars(_build_vars({pc,bg,card,bc,tc,tmc,heading,hbg,hfc,hbc,btnbg,btnfn,sidbg,sidac,sidhv,sidtc,lstc,lhbg,ctrl_bg,row_hover}));
    }

    function _build_vars(v) {
        var prgb=_parse(v.pc), pstr=prgb?prgb.r+","+prgb.g+","+prgb.b:"79,70,229";
        return [
            "--bg-color:"+v.bg, "--fg-color:"+v.card, "--card-bg:"+v.card,
            "--subtle-fg:"+v.bc, "--border-color:"+v.bc,
            "--text-color:"+v.tc, "--text-muted:"+v.tmc, "--heading-color:"+v.heading,
            "--control-bg:"+v.ctrl_bg, "--control-bg-on-gray:"+v.ctrl_bg, "--disabled-bg:"+v.ctrl_bg,
            "--navbar-bg:"+v.hbg, "--navbar-text:"+v.hfc, "--navbar-dark-bg:"+v.hbg,
            "--primary:"+v.pc, "--primary-color:"+v.pc,
            "--btn-primary-bg:"+v.btnbg, "--btn-primary-color:"+v.btnfn, "--primary-rgb:"+pstr,
            "--sidebar-bg:"+v.sidbg, "--sidebar-hover-bg:"+v.sidhv,
            "--sidebar-active-color:"+v.sidac, "--sidebar-text:"+v.sidtc,
            "--list-row-hover:"+v.row_hover, "--list-bg:"+v.bg,
            "--wl-bg:"+v.bg, "--wl-card:"+v.card, "--wl-border:"+v.bc,
            "--wl-text:"+v.tc, "--wl-muted:"+v.tmc, "--wl-primary:"+v.pc,
            "--wl-navbar-bg:"+v.hbg, "--wl-navbar-text:"+v.hfc,
            "--wl-btn-bg:"+v.btnbg, "--wl-btn-text:"+v.btnfn,
            "--wl-sidebar-bg:"+v.sidbg, "--wl-sidebar-hover:"+v.sidhv,
            "--wl-sidebar-active:"+v.sidac, "--wl-sidebar-text:"+v.sidtc,
            "--wl-list-link:"+v.lstc, "--wl-list-header-bg:"+v.lhbg,
            "--wl-input-bg:"+v.ctrl_bg, "--wl-row-hover:"+v.row_hover,
        ].join(";");
    }

    function _inject_vars(vars) {
        var tag=document.getElementById(STYLE_TAG_ID);
        if (!tag) { tag=document.createElement("style"); tag.id=STYLE_TAG_ID; document.head.appendChild(tag); }
        tag.textContent=":root{"+vars+"}";
    }

    /* ── Remove theme ── */
    function wl_remove_theme() {
        var tag=document.getElementById(STYLE_TAG_ID); if(tag) tag.remove();
        var font=document.getElementById(FONT_TAG_ID); if(font) font.remove();
        document.documentElement.removeAttribute("data-theme");
        document.documentElement.classList.remove("dark-mode");
        _active_name=null;
        document.body.className=document.body.className
            .replace(/\btheme-btn-\S+/g,"").replace(/\btheme-form-\S+/g,"").replace(/\btheme-list-\S+/g,"").trim();
        try { localStorage.removeItem(STORAGE_KEY); } catch(e){}
    }

    /* ── Font injection ── */
    var GOOGLE_FONTS = {
        "Inter":"Inter:wght@400;500;600;700", "Roboto":"Roboto:wght@400;500;700",
        "Poppins":"Poppins:wght@400;500;600;700", "Lato":"Lato:wght@400;700",
        "Open Sans":"Open+Sans:wght@400;500;600;700", "Nunito":"Nunito:wght@400;500;600;700",
        "DM Sans":"DM+Sans:wght@400;500;700",
    };
    function _apply_font(family) {
        if (!family) return;
        var slug=GOOGLE_FONTS[family];
        if (slug) {
            var tag=document.getElementById(FONT_TAG_ID);
            if (!tag) { tag=document.createElement("link"); tag.id=FONT_TAG_ID; tag.rel="stylesheet"; document.head.appendChild(tag); }
            tag.href="https://fonts.googleapis.com/css2?family="+slug+"&display=swap";
        }
        var root=document.getElementById(STYLE_TAG_ID);
        if (root) {
            root.textContent=root.textContent.replace(/--wl-font-family:[^;}]*/g,"");
            root.textContent=root.textContent.replace(/}$/,"--wl-font-family:"+family+";--font-stack:"+family+",sans-serif}");
        }
    }

    /* ── Style classes ── */
    var BTN_MAP  = {"Flat Button":"theme-btn-flat","Outline Button":"theme-btn-outline","3D Button":"theme-btn-3d","Gradient Button":"theme-btn-gradient","Pill Rounded Button":"theme-btn-pill","Minimal Border Button":"theme-btn-minimal","Dashed Border Button":"theme-btn-dashed"};
    var FORM_MAP = {"APPLE CLEAN UI":"theme-form-apple","MATERIAL UI":"theme-form-material","FRAPPE NEO":"theme-form-neo"};
    var LIST_MAP = {"Google Material UI look":"theme-list-material","Apple-style UI":"theme-list-apple","Card Material Theme":"theme-list-card"};

    function _apply_style_classes(t) {
        document.body.className=document.body.className
            .replace(/\btheme-btn-\S+/g,"").replace(/\btheme-form-\S+/g,"").replace(/\btheme-list-\S+/g,"").trim();
        var cls=[];
        if (t.button_visual_style && BTN_MAP[t.button_visual_style])  cls.push(BTN_MAP[t.button_visual_style]);
        if (t.form_layout_style   && FORM_MAP[t.form_layout_style])   cls.push(FORM_MAP[t.form_layout_style]);
        if (t.list_layout_style   && LIST_MAP[t.list_layout_style])   cls.push(LIST_MAP[t.list_layout_style]);
        if (cls.length) document.body.classList.add.apply(document.body.classList, cls);
    }

    /* ── Language switcher ── */
    function _apply_language_switcher(enabled) {
        [".language-switcher","#language-switcher","[data-label='Language']"].forEach(function(sel){
            document.querySelectorAll(sel).forEach(function(el){ el.style.display=enabled?"":"none"; });
        });
    }

    /* ── Theme picker ── */
    function _load_themes(cb) {
        if (_themes.length) { cb(_themes); return; }
        frappe.xcall(API_GET_ALL).then(function(themes){
            var bt=window.frappe&&frappe.boot&&frappe.boot.wl_themes;
            _themes=(themes&&themes.length)?themes:(bt&&bt.length?bt:[]);
            cb(_themes);
        }).catch(function(){
            var bt=window.frappe&&frappe.boot&&frappe.boot.wl_themes;
            _themes=bt&&bt.length?bt:[];
            cb(_themes);
        });
    }

    function wl_open_picker() {
        _load_themes(function(themes){
            var active=_active_name||(frappe.boot&&frappe.boot.wl_active_theme&&frappe.boot.wl_active_theme.name)||null;

            var backdrop=document.createElement("div");
            backdrop.id="wl-picker-backdrop";
            backdrop.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:9998;display:flex;align-items:center;justify-content:center";

            var dialog=document.createElement("div");
            dialog.style.cssText="background:var(--fg-color,#fff);border-radius:12px;padding:24px;min-width:540px;max-width:700px;width:90vw;max-height:80vh;overflow-y:auto;z-index:9999;box-shadow:0 20px 60px rgba(0,0,0,0.3)";

            var header=document.createElement("div");
            header.style.cssText="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px";
            header.innerHTML='<h3 style="margin:0;font-size:16px;font-weight:600;color:var(--text-color,#111)">Choose Theme</h3><button id="wl-picker-close" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--text-muted,#6b7280)">&times;</button>';

            var grid=document.createElement("div");
            grid.style.cssText="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin-bottom:16px";

            themes.forEach(function(t){
                var isActive=t.name===active;
                var card=document.createElement("div");
                card.style.cssText="border-radius:8px;border:2px solid "+(isActive?(t.brand_primary_color||"#4f46e5"):"var(--border-color,#e2e8f0)")+";padding:12px;cursor:pointer;transition:border-color 0.15s;background:"+(t.page_background_color||"#f8fafc");
                card.innerHTML='<div style="display:flex;gap:6px;margin-bottom:8px">'+
                    ["brand_primary_color","navbar_background_color","sidebar_background_color","card_background_color"].map(function(f){
                        return '<div style="width:16px;height:16px;border-radius:50%;background:'+(t[f]||"#ccc")+';border:1px solid rgba(0,0,0,0.1)"></div>';
                    }).join("")+
                    '</div><div style="font-size:12px;font-weight:600;color:'+(t.body_text_color||"#111")+'">'+t.name+'</div>'+
                    '<div style="font-size:10px;color:'+(t.muted_text_color||"#6b7280")+';margin-top:2px">'+(t.dark_mode_enabled?"Dark":"Light")+'</div>';
                card.addEventListener("mouseenter",function(){ if(t.name!==active) card.style.borderColor=t.brand_primary_color||"#4f46e5"; });
                card.addEventListener("mouseleave",function(){ if(t.name!==active) card.style.borderColor="var(--border-color,#e2e8f0)"; });
                card.addEventListener("click",function(){ _apply_and_save(t,grid); });
                grid.appendChild(card);
            });

            var footer=document.createElement("div");
            footer.style.cssText="border-top:1px solid var(--border-color,#e2e8f0);padding-top:12px;text-align:right";
            var resetBtn=document.createElement("button");
            resetBtn.textContent="Reset to Frappe Default";
            resetBtn.style.cssText="background:none;border:1px solid var(--border-color,#e2e8f0);padding:6px 14px;border-radius:6px;cursor:pointer;font-size:12px;color:var(--text-muted,#6b7280)";
            resetBtn.addEventListener("click",function(){ _apply_and_save(null,grid); });
            footer.appendChild(resetBtn);

            dialog.appendChild(header); dialog.appendChild(grid); dialog.appendChild(footer);
            backdrop.appendChild(dialog);
            document.body.appendChild(backdrop);
            _dialog_el=backdrop;

            document.getElementById("wl-picker-close").addEventListener("click",_close_picker);
            backdrop.addEventListener("click",function(e){ if(e.target===backdrop) _close_picker(); });
        });
    }

    function _close_picker() { if(_dialog_el){ _dialog_el.remove(); _dialog_el=null; } }

    function _apply_and_save(theme, grid) {
        _prev_name=_active_name;
        if(theme) wl_apply_theme(theme); else wl_remove_theme();

        if(grid) {
            Array.from(grid.children).forEach(function(card,i){
                var t=_themes[i], isActive=theme&&t&&t.name===theme.name;
                card.style.borderColor=isActive?(t.brand_primary_color||"#4f46e5"):"var(--border-color,#e2e8f0)";
            });
        }

        frappe.xcall(API_SWITCH,{theme_name:theme?theme.name:""}).then(function(){
            _close_picker();
            frappe.show_alert({message:theme?"Theme applied: "+theme.name:"Theme reset",indicator:"green"},2);
        }).catch(function(err){
            var prev=_themes.find(function(t){ return t.name===_prev_name; });
            if(prev) wl_apply_theme(prev); else wl_remove_theme();
            frappe.show_alert({message:"Failed to save theme — reverted.",indicator:"red"},4);
            console.error("[wl_theme]",err);
        });
    }

    /* ── Navbar button ── */
    function _inject_navbar_button() {
        var attempts=0;
        function try_inject(){
            attempts++;
            var navbar=document.querySelector(".navbar-right, .nav.navbar-nav");
            if (!navbar) { if(attempts<30) setTimeout(try_inject,300); return; }
            if (document.getElementById("wl-theme-btn")) return;
            var li=document.createElement("li"); li.className="nav-item";
            var btn=document.createElement("a");
            btn.id="wl-theme-btn"; btn.className="nav-link"; btn.title="Switch Theme";
            btn.style.cssText="cursor:pointer;padding:8px 10px;display:flex;align-items:center";
            btn.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 0 20"/><path d="M12 2v20M2 12h20"/></svg>';
            btn.addEventListener("click",wl_open_picker);
            li.appendChild(btn); navbar.insertBefore(li,navbar.firstChild);
        }
        try_inject();
    }

    /* ── Auto dark mode OS listener ── */
    function _bind_auto_dark() {
        if (!_media_query||!_media_query.addEventListener) return;
        _media_query.addEventListener("change",function(){
            if (!_active_name) return;
            var t=_themes.find(function(x){ return x.name===_active_name; });
            if (t&&t.auto_dark_mode) wl_apply_theme(t);
        });
    }

    /* ── Init ── */
    function init() {
        if (_initialized) return;
        _initialized=true;

        var boot_theme=window.frappe&&frappe.boot&&frappe.boot.wl_active_theme;

        if (window.frappe&&frappe.boot&&frappe.boot.wl_themes) _themes=frappe.boot.wl_themes;

        if (boot_theme&&boot_theme.name) {
            wl_apply_theme(boot_theme);
            try { localStorage.setItem(STORAGE_KEY,JSON.stringify(boot_theme)); } catch(e){}
        } else if (window.frappe&&frappe.boot) {
            var fallback=_themes.find(function(t){ return t.name==="Default Light"; });
            if (fallback) {
                wl_apply_theme(fallback);
                try { localStorage.setItem(STORAGE_KEY,JSON.stringify(fallback)); } catch(e){}
                if (window.frappe&&frappe.xcall) frappe.xcall(API_SWITCH,{theme_name:"Default Light"}).catch(function(){});
            } else {
                wl_remove_theme();
            }
        }

        _inject_navbar_button();
        _bind_auto_dark();

        if (boot_theme) _apply_language_switcher(!!boot_theme.enable_language_switcher);

        if (window.frappe&&frappe.router&&frappe.router.on) {
            frappe.router.on("change",function(){
                if (!_active_name) return;
                var t=_themes.find(function(x){ return x.name===_active_name; });
                if (t) wl_apply_theme(t);
            });
        }

        if (window.$) {
            $(document).on("after_save",function(e,doc){
                if (doc&&doc.doctype==="Weblogics Theme"&&doc.theme_name===_active_name) {
                    frappe.xcall(API_GET_ALL).then(function(themes){
                        if (!themes) return;
                        _themes=themes;
                        var fresh=themes.find(function(t){ return t.name===_active_name; });
                        if (fresh) {
                            wl_apply_theme(fresh);
                            try { localStorage.setItem(STORAGE_KEY,JSON.stringify(fresh)); } catch(e){}
                            frappe.show_alert({message:"Theme updated",indicator:"green"},2);
                        }
                    }).catch(function(){});
                }
            });
        }

        if (window.frappe) {
            frappe.wl_theme = {
                open_picker:  wl_open_picker,
                apply_theme:  wl_apply_theme,
                remove_theme: wl_remove_theme,
                get_active:   function(){ return _active_name; },
                get_themes:   function(){ return _themes; },
            };
        }
    }

    function _try_init() { if(window.frappe&&frappe.boot) init(); }

    if (window.$) $(document).on("toolbar_setup",_try_init);
    document.addEventListener("frappe-ready",_try_init);

    var _pc=0;
    var _poll=setInterval(function(){
        if (_initialized||++_pc>150) { clearInterval(_poll); return; }
        if (window.frappe&&frappe.boot) { clearInterval(_poll); _try_init(); }
    },200);

})();
