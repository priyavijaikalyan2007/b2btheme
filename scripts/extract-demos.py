#!/usr/bin/env python3
"""
Extract individual component demo pages from the monolithic all-components.html.

Reads the monolithic demo file, identifies each <div class="demo-section"> block,
maps it to its CSS/JS dependencies and initialization script, then generates
standalone demo pages using the shared shell template.

Usage:
    python3 scripts/extract-demos.py
"""

import re
import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MONOLITH = os.path.join(BASE_DIR, "demo", "all-components.html")
OUTPUT_DIR = os.path.join(BASE_DIR, "demo", "components")
INDEX_FILE = os.path.join(BASE_DIR, "demo", "index.html")

# ---------------------------------------------------------------------------
# Component definitions: section_id -> config
# Each entry maps the demo-section id (without "-section") to its metadata.
# ---------------------------------------------------------------------------

# Display names for the header
DISPLAY_NAMES = {
    "activityfeed": "ActivityFeed",
    "actionitems": "ActionItems",
    "alerts": "Alerts",
    "anglepicker": "AnglePicker",
    "applauncher": "AppLauncher",
    "auditlogviewer": "AuditLogViewer",
    "bannerbar": "BannerBar",
    "breadcrumb": "Breadcrumb",
    "buttons": "Buttons",
    "cards": "Cards",
    "codeeditor": "CodeEditor",
    "color-palette": "Color Palette",
    "colorpicker": "ColorPicker",
    "commandpalette": "CommandPalette",
    "commentoverlay": "CommentOverlay",
    "confirmdialog": "ConfirmDialog",
    "conversation": "Conversation",
    "cronpicker": "CronPicker",
    "data-table": "Data Table",
    "datagrid": "DataGrid",
    "datepicker": "DatePicker",
    "diagramengine": "DiagramEngine",
    "docklayout": "DockLayout",
    "docviewer": "DocViewer",
    "durationpicker": "DurationPicker",
    "editablecombobox": "EditableComboBox",
    "emptystate": "EmptyState",
    "errordialog": "ErrorDialog",
    "facetsearch": "FacetSearch",
    "fileexplorer": "FileExplorer",
    "fileupload": "FileUpload",
    "fontdropdown": "FontDropdown",
    "formdialog": "FormDialog",
    "forms": "Forms",
    "gauge": "Gauge",
    "graphcanvas": "GraphCanvas",
    "graphcanvasmx": "GraphCanvasMx",
    "graphtoolbar": "GraphToolbar",
    "guidedtour": "GuidedTour",
    "helpdrawer": "HelpDrawer",
    "hero": "Hero",
    "layout-containers": "Layout Containers",
    "lineendingpicker": "LineEndingPicker",
    "lineshapepicker": "LineShapePicker",
    "linetypepicker": "LineTypePicker",
    "linewidthpicker": "LineWidthPicker",
    "listgroup": "List Group",
    "logconsole": "LogConsole",
    "magnifier": "Magnifier",
    "markdowneditor": "MarkdownEditor",
    "maskedentry": "MaskedEntry",
    "metrics-dashboard": "Metrics Dashboard",
    "modal": "Modal",
    "multiselectcombo": "MultiselectCombo",
    "notificationcenter": "NotificationCenter",
    "pagination": "Pagination",
    "peoplepicker": "PeoplePicker",
    "periodpicker": "PeriodPicker",
    "permissionmatrix": "PermissionMatrix",
    "personchip": "PersonChip",
    "pill": "Pill",
    "presenceindicator": "PresenceIndicator",
    "progressmodal": "ProgressModal",
    "prompttemplatemanager": "PromptTemplateManager",
    "propertyinspector": "PropertyInspector",
    "reasoningaccordion": "ReasoningAccordion",
    "relationshipmanager": "RelationshipManager",
    "ribbon": "Ribbon",
    "ribbonbuilder": "RibbonBuilder",
    "richtextinput": "RichTextInput",
    "ruler": "Ruler",
    "searchbox": "SearchBox",
    "sharedialog": "ShareDialog",
    "shapebuilder": "ShapeBuilder",
    "sidebar": "Sidebar",
    "skeletonloader": "SkeletonLoader",
    "slider": "Slider",
    "smarttextinput": "SmartTextInput",
    "spinemap": "SpineMap",
    "sprintpicker": "SprintPicker",
    "status-badges": "Status Badges",
    "statusbadge": "StatusBadge",
    "statusbar": "StatusBar",
    "stepper": "Stepper",
    "symbolpicker": "SymbolPicker",
    "tabbedpanel": "TabbedPanel",
    "tagger": "Tagger",
    "timeline": "Timeline",
    "timepicker": "TimePicker",
    "timezonepicker": "TimezonePicker",
    "toast": "Toast",
    "toolbar": "Toolbar",
    "toolbar-basic": "Toolbar (Basic)",
    "treegrid": "TreeGrid",
    "treeview": "TreeView",
    "typography": "Typography",
    "typebadge": "TypeBadge",
    "usermenu": "UserMenu",
    "workspaceswitcher": "WorkspaceSwitcher",
}

# CSS dependencies: section_id -> list of CSS paths (relative to demo/ in monolith)
# Paths here are as they appear in the monolith (../dist/...) — we'll adjust for components/ subdir
COMPONENT_CSS = {
    "activityfeed": ["activityfeed/activityfeed.css"],
    "actionitems": ["actionitems/actionitems.css"],
    "anglepicker": ["anglepicker/anglepicker.css"],
    "applauncher": ["applauncher/applauncher.css"],
    "auditlogviewer": ["auditlogviewer/auditlogviewer.css"],
    "bannerbar": ["bannerbar/bannerbar.css"],
    "breadcrumb": ["breadcrumb/breadcrumb.css"],
    "codeeditor": ["codeeditor/codeeditor.css"],
    "colorpicker": ["colorpicker/colorpicker.css"],
    "commandpalette": ["commandpalette/commandpalette.css"],
    "commentoverlay": ["commentoverlay/commentoverlay.css"],
    "confirmdialog": ["confirmdialog/confirmdialog.css"],
    "conversation": ["conversation/conversation.css"],
    "cronpicker": ["cronpicker/cronpicker.css"],
    "datagrid": ["datagrid/datagrid.css"],
    "datepicker": ["datepicker/datepicker.css"],
    "diagramengine": ["diagramengine/diagramengine.css"],
    "docklayout": ["docklayout/docklayout.css"],
    "docviewer": ["docviewer/docviewer.css"],
    "durationpicker": ["durationpicker/durationpicker.css"],
    "editablecombobox": ["editablecombobox/editablecombobox.css"],
    "emptystate": ["emptystate/emptystate.css"],
    "errordialog": ["errordialog/errordialog.css"],
    "facetsearch": ["facetsearch/facetsearch.css"],
    "fileexplorer": ["fileexplorer/fileexplorer.css"],
    "fileupload": ["fileupload/fileupload.css"],
    "fontdropdown": ["fontdropdown/fontdropdown.css"],
    "formdialog": ["formdialog/formdialog.css"],
    "gauge": ["gauge/gauge.css"],
    "graphcanvas": ["graphcanvas/graphcanvas.css"],
    "graphcanvasmx": ["graphcanvasmx/graphcanvasmx.css"],
    "graphtoolbar": ["graphtoolbar/graphtoolbar.css", "toolbar/toolbar.css"],
    "guidedtour": ["guidedtour/guidedtour.css"],
    "helpdrawer": ["helpdrawer/helpdrawer.css", "helptooltip/helptooltip.css"],
    "layout-containers": [
        "boxlayout/boxlayout.css", "flowlayout/flowlayout.css",
        "gridlayout/gridlayout.css", "borderlayout/borderlayout.css",
        "flexgridlayout/flexgridlayout.css", "cardlayout/cardlayout.css",
        "layerlayout/layerlayout.css", "anchorlayout/anchorlayout.css",
    ],
    "lineendingpicker": ["lineendingpicker/lineendingpicker.css"],
    "lineshapepicker": ["lineshapepicker/lineshapepicker.css"],
    "linetypepicker": ["linetypepicker/linetypepicker.css"],
    "linewidthpicker": ["linewidthpicker/linewidthpicker.css"],
    "logconsole": ["logconsole/logconsole.css"],
    "magnifier": ["magnifier/magnifier.css"],
    "markdowneditor": ["markdowneditor/markdowneditor.css"],
    "maskedentry": ["maskedentry/maskedentry.css"],
    "multiselectcombo": ["multiselectcombo/multiselectcombo.css"],
    "notificationcenter": ["notificationcenter/notificationcenter.css"],
    "peoplepicker": ["peoplepicker/peoplepicker.css", "personchip/personchip.css"],
    "periodpicker": ["periodpicker/periodpicker.css"],
    "permissionmatrix": ["permissionmatrix/permissionmatrix.css"],
    "personchip": ["personchip/personchip.css"],
    "pill": ["pill/pill.css"],
    "presenceindicator": ["presenceindicator/presenceindicator.css"],
    "progressmodal": ["progressmodal/progressmodal.css"],
    "prompttemplatemanager": ["prompttemplatemanager/prompttemplatemanager.css", "splitlayout/splitlayout.css"],
    "propertyinspector": ["propertyinspector/propertyinspector.css"],
    "reasoningaccordion": ["reasoningaccordion/reasoningaccordion.css"],
    "relationshipmanager": ["relationshipmanager/relationshipmanager.css"],
    "ribbon": ["ribbon/ribbon.css"],
    "ribbonbuilder": ["ribbonbuilder/ribbonbuilder.css", "ribbon/ribbon.css",
                       "anglepicker/anglepicker.css", "colorpicker/colorpicker.css",
                       "linewidthpicker/linewidthpicker.css", "linetypepicker/linetypepicker.css",
                       "fontdropdown/fontdropdown.css"],
    "richtextinput": ["richtextinput/richtextinput.css", "pill/pill.css"],
    "ruler": ["ruler/ruler.css"],
    "searchbox": ["searchbox/searchbox.css"],
    "sharedialog": ["sharedialog/sharedialog.css", "personchip/personchip.css", "peoplepicker/peoplepicker.css"],
    "shapebuilder": ["diagramengine/diagramengine.css"],
    "sidebar": ["sidebar/sidebar.css"],
    "skeletonloader": ["skeletonloader/skeletonloader.css"],
    "slider": ["slider/slider.css"],
    "smarttextinput": ["smarttextinput/smarttextinput.css", "pill/pill.css"],
    "spinemap": ["spinemap/spinemap.css"],
    "sprintpicker": ["sprintpicker/sprintpicker.css"],
    "statusbadge": ["statusbadge/statusbadge.css"],
    "statusbar": ["statusbar/statusbar.css"],
    "stepper": ["stepper/stepper.css"],
    "symbolpicker": ["symbolpicker/symbolpicker.css"],
    "tabbedpanel": ["tabbedpanel/tabbedpanel.css"],
    "tagger": ["tagger/tagger.css"],
    "timeline": ["timeline/timeline.css"],
    "timepicker": ["timepicker/timepicker.css"],
    "timezonepicker": ["timezonepicker/timezonepicker.css"],
    "toast": ["toast/toast.css"],
    "toolbar": ["toolbar/toolbar.css"],
    "treegrid": ["treegrid/treegrid.css"],
    "treeview": ["treeview/treeview.css"],
    "typebadge": ["typebadge/typebadge.css"],
    "usermenu": ["usermenu/usermenu.css"],
    "workspaceswitcher": ["workspaceswitcher/workspaceswitcher.css"],
}

# JS dependencies: section_id -> list of JS src paths
# format: either component name (-> ../../dist/components/X/X.js) or full URL
COMPONENT_JS = {
    "activityfeed": ["activityfeed/activityfeed.js"],
    "actionitems": ["actionitems/actionitems.js"],
    "anglepicker": ["anglepicker/anglepicker.js"],
    "applauncher": ["applauncher/applauncher.js"],
    "auditlogviewer": ["auditlogviewer/auditlogviewer.js"],
    "bannerbar": ["bannerbar/bannerbar.js"],
    "breadcrumb": ["breadcrumb/breadcrumb.js"],
    "codeeditor": ["__codemirror_module__", "codeeditor/codeeditor.js"],
    "colorpicker": ["colorpicker/colorpicker.js"],
    "commandpalette": ["commandpalette/commandpalette.js"],
    "commentoverlay": ["commentoverlay/commentoverlay.js"],
    "confirmdialog": ["confirmdialog/confirmdialog.js"],
    "conversation": [
        "https://unpkg.com/vditor@3.11.2/dist/index.min.js",
        "https://unpkg.com/dompurify@3.2.4/dist/purify.min.js",
        "conversation/conversation.js",
    ],
    "cronpicker": ["cronpicker/cronpicker.js"],
    "datagrid": ["datagrid/datagrid.js"],
    "datepicker": ["datepicker/datepicker.js"],
    "diagramengine": ["diagramengine/diagramengine.js"],
    "docklayout": ["docklayout/docklayout.js"],
    "docviewer": ["docviewer/docviewer.js"],
    "durationpicker": ["durationpicker/durationpicker.js"],
    "editablecombobox": ["editablecombobox/editablecombobox.js"],
    "emptystate": ["emptystate/emptystate.js"],
    "errordialog": ["errordialog/errordialog.js"],
    "facetsearch": ["facetsearch/facetsearch.js"],
    "fileexplorer": ["fileexplorer/fileexplorer.js"],
    "fileupload": ["fileupload/fileupload.js"],
    "fontdropdown": ["fontdropdown/fontdropdown.js"],
    "formdialog": ["formdialog/formdialog.js"],
    "gauge": ["gauge/gauge.js"],
    "graphcanvas": ["graphcanvas/graphcanvas.js"],
    "graphcanvasmx": ["__maxgraph_module__", "graphcanvasmx/graphcanvasmx.js"],
    "graphtoolbar": ["toolbar/toolbar.js", "graphtoolbar/graphtoolbar.js"],
    "guidedtour": [
        "__defer__https://cdn.jsdelivr.net/npm/driver.js@1.4.0/dist/driver.js.iife.js",
        "__defer__guidedtour/guidedtour.js",
    ],
    "helpdrawer": ["helpdrawer/helpdrawer.js", "helptooltip/helptooltip.js"],
    "layout-containers": [
        "boxlayout/boxlayout.js", "flowlayout/flowlayout.js",
        "gridlayout/gridlayout.js", "borderlayout/borderlayout.js",
        "flexgridlayout/flexgridlayout.js", "cardlayout/cardlayout.js",
        "layerlayout/layerlayout.js", "anchorlayout/anchorlayout.js",
    ],
    "lineendingpicker": ["lineendingpicker/lineendingpicker.js"],
    "lineshapepicker": ["lineshapepicker/lineshapepicker.js"],
    "linetypepicker": ["linetypepicker/linetypepicker.js"],
    "linewidthpicker": ["linewidthpicker/linewidthpicker.js"],
    "logconsole": ["logconsole/logconsole.js"],
    "magnifier": ["magnifier/magnifier.js"],
    "markdowneditor": [
        "https://unpkg.com/vditor@3.11.2/dist/index.min.js",
        "https://unpkg.com/dompurify@3.2.4/dist/purify.min.js",
        "markdowneditor/markdowneditor.js",
    ],
    "maskedentry": ["maskedentry/maskedentry.js"],
    "multiselectcombo": ["multiselectcombo/multiselectcombo.js"],
    "notificationcenter": ["notificationcenter/notificationcenter.js"],
    "peoplepicker": ["personchip/personchip.js", "peoplepicker/peoplepicker.js"],
    "periodpicker": ["periodpicker/periodpicker.js"],
    "permissionmatrix": ["permissionmatrix/permissionmatrix.js"],
    "personchip": ["personchip/personchip.js"],
    "pill": ["pill/pill.js"],
    "presenceindicator": ["presenceindicator/presenceindicator.js"],
    "progressmodal": ["progressmodal/progressmodal.js"],
    "prompttemplatemanager": ["prompttemplatemanager/prompttemplatemanager.js"],
    "propertyinspector": ["propertyinspector/propertyinspector.js"],
    "reasoningaccordion": ["reasoningaccordion/reasoningaccordion.js"],
    "relationshipmanager": ["relationshipmanager/relationshipmanager.js"],
    "ribbon": ["ribbon/ribbon.js"],
    "ribbonbuilder": [
        "ribbon/ribbon.js", "anglepicker/anglepicker.js",
        "colorpicker/colorpicker.js", "linewidthpicker/linewidthpicker.js",
        "linetypepicker/linetypepicker.js", "fontdropdown/fontdropdown.js",
        "ribbonbuilder/ribbonbuilder.js",
    ],
    "richtextinput": ["pill/pill.js", "richtextinput/richtextinput.js"],
    "ruler": ["ruler/ruler.js"],
    "searchbox": ["searchbox/searchbox.js"],
    "sharedialog": ["personchip/personchip.js", "peoplepicker/peoplepicker.js", "sharedialog/sharedialog.js"],
    "shapebuilder": ["diagramengine/diagramengine.js"],
    "sidebar": ["sidebar/sidebar.js"],
    "skeletonloader": ["skeletonloader/skeletonloader.js"],
    "slider": ["slider/slider.js"],
    "smarttextinput": ["pill/pill.js", "smarttextinput/smarttextinput.js"],
    "spinemap": ["spinemap/spinemap.js"],
    "sprintpicker": ["sprintpicker/sprintpicker.js"],
    "statusbadge": ["statusbadge/statusbadge.js"],
    "statusbar": ["statusbar/statusbar.js"],
    "stepper": ["stepper/stepper.js"],
    "symbolpicker": ["symbolpicker/symbolpicker.js"],
    "tabbedpanel": ["tabbedpanel/tabbedpanel.js"],
    "tagger": ["tagger/tagger.js"],
    "timeline": ["timeline/timeline.js"],
    "timepicker": ["timepicker/timepicker.js"],
    "timezonepicker": ["timezonepicker/timezonepicker.js"],
    "toast": ["toast/toast.js"],
    "toolbar": ["toolbar/toolbar.js"],
    "treegrid": ["treegrid/treegrid.js"],
    "treeview": ["treeview/treeview.js"],
    "typebadge": ["typebadge/typebadge.js"],
    "usermenu": ["usermenu/usermenu.js"],
    "workspaceswitcher": ["workspaceswitcher/workspaceswitcher.js"],
}

# Extra CDN CSS needed
EXTRA_CDN_CSS = {
    "markdowneditor": ["https://unpkg.com/vditor@3.11.2/dist/index.css"],
    "conversation": ["https://unpkg.com/vditor@3.11.2/dist/index.css"],
    "guidedtour": ["https://cdn.jsdelivr.net/npm/driver.js@1.4.0/dist/driver.css"],
}

# Extra preconnect hints per component
EXTRA_PRECONNECT = {
    "codeeditor": ["https://esm.sh"],
    "conversation": ["https://unpkg.com"],
    "markdowneditor": ["https://unpkg.com"],
    "graphcanvasmx": ["https://esm.sh"],
    "guidedtour": ["https://cdn.jsdelivr.net"],
}

# The CodeMirror module script (for codeeditor)
CODEMIRROR_MODULE_SCRIPT = '''    <script type="module">
        // Load CodeMirror 6 from CDN and expose as window globals for CodeEditor.
        try {
            const [view, state, commands, language, srch, autocomplete, lint,
                   langJs, langJson, langHtml, langCss, langSql, langPy, langMd] = await Promise.all([
                import("https://esm.sh/@codemirror/view@6"),
                import("https://esm.sh/@codemirror/state@6"),
                import("https://esm.sh/@codemirror/commands@6"),
                import("https://esm.sh/@codemirror/language@6"),
                import("https://esm.sh/@codemirror/search@6"),
                import("https://esm.sh/@codemirror/autocomplete@6"),
                import("https://esm.sh/@codemirror/lint@6"),
                import("https://esm.sh/@codemirror/lang-javascript@6"),
                import("https://esm.sh/@codemirror/lang-json@6"),
                import("https://esm.sh/@codemirror/lang-html@6"),
                import("https://esm.sh/@codemirror/lang-css@6"),
                import("https://esm.sh/@codemirror/lang-sql@6"),
                import("https://esm.sh/@codemirror/lang-python@6"),
                import("https://esm.sh/@codemirror/lang-markdown@6")
            ]);
            var w = window;
            w.EditorView = view.EditorView;
            w.EditorState = state.EditorState;
            w.keymap = view.keymap;
            w.lineNumbers = view.lineNumbers;
            w.drawSelection = view.drawSelection;
            w.dropCursor = view.dropCursor;
            w.highlightActiveLine = view.highlightActiveLine;
            w.highlightSelectionMatches = srch.highlightSelectionMatches;
            w.cmHistory = commands.history;
            w.historyKeymap = commands.historyKeymap;
            w.defaultKeymap = commands.defaultKeymap;
            w.undo = commands.undo;
            w.redo = commands.redo;
            w.indentSelection = commands.indentSelection;
            w.syntaxHighlighting = language.syntaxHighlighting;
            w.defaultHighlightStyle = language.defaultHighlightStyle;
            w.indentOnInput = language.indentOnInput;
            w.bracketMatching = language.bracketMatching;
            w.cmSearch = srch.search;
            w.searchKeymap = srch.searchKeymap;
            w.closeBrackets = autocomplete.closeBrackets;
            w.closeBracketsKeymap = autocomplete.closeBracketsKeymap;
            w.setDiagnostics = lint.setDiagnostics;
            w.javascript = langJs.javascript;
            w.json = langJson.json;
            w.html = langHtml.html;
            w.css = langCss.css;
            w.sql = langSql.sql;
            w.python = langPy.python;
            w.markdown = langMd.markdown;
            console.log("[Demo] CodeMirror 6 loaded from CDN");
            w.dispatchEvent(new Event("codemirror-ready"));
        } catch (e) {
            console.warn("[Demo] Could not load CodeMirror 6 from CDN:", e);
        }
    </script>'''

# maxGraph module script (for graphcanvasmx)
MAXGRAPH_MODULE_SCRIPT = '''    <script type="module">
        // Load maxGraph from CDN and expose as window.maxgraph for GraphCanvasMx
        try {
            const mx = await import("https://esm.sh/@maxgraph/core@0.22.0");
            window.maxgraph = mx;
            console.log("[Demo] maxGraph loaded from CDN");
            window.dispatchEvent(new Event("maxgraph-ready"));
        } catch (e) {
            console.warn("[Demo] Could not load maxGraph from CDN:", e);
        }
    </script>'''

# Sections that are purely Bootstrap overrides (no custom component) — skip JS/CSS mapping
BOOTSTRAP_ONLY_SECTIONS = {
    "hero", "metrics-dashboard", "color-palette", "buttons",
    "status-badges", "forms", "toolbar-basic", "data-table",
    "cards", "alerts", "pagination", "typography", "modal", "listgroup",
}

# Init script comment headers mapped to section IDs
# This maps the textual header in the <script> block to the section it initializes
INIT_SCRIPT_HEADERS = {
    "Theme Toggle": "__skip__",  # Handled in demo-shell.js
    "Editable Combo Box Demos": "editablecombobox",
    "Error Dialog Demo Buttons": "errordialog",
    "Date Picker Demos": "datepicker",
    "Time Picker Demos": "timepicker",
    "Duration Picker Demos": "durationpicker",
    "Progress Modal Demos": "progressmodal",
    "Timezone Picker Demos": "timezonepicker",
    "CRON Picker Demos": "cronpicker",
    "Markdown Editor Demos": "markdowneditor",
    "Status Bar Demo": "statusbar",
    "Sidebar Panel Demos": "sidebar",
    "Toolbar Demos": "toolbar",
    "Gauge Demos": "gauge",
    "Conversation Demos": "conversation",
    "Timeline Demo": "timeline",
    "Banner Bar Demos": "bannerbar",
    "Breadcrumb Demo": "breadcrumb",
    "Notification Center Demo": "notificationcenter",
    "Stepper Demos": "stepper",
    "Property Inspector": "propertyinspector",
    "TabbedPanel Demos": "tabbedpanel",
    "TreeView Demos": "treeview",
    "TreeGrid Demos": "treegrid",
    "DockLayout Demos": "docklayout",
    "MaskedEntry Demos": "maskedentry",
    "SplitLayout Demos": "splitlayout",
    "Layout Container Demos": "layout-containers",
    "Toast Demos": "toast",
    "MultiselectCombo Demos": "multiselectcombo",
    "DataGrid Demos": "datagrid",
    "CodeEditor Demos": "codeeditor",
    "Tagger Demos": "tagger",
    "FacetSearch Demos": "facetsearch",
    "FileExplorer Demos": "fileexplorer",
    "CommentOverlay Demos": "commentoverlay",
    "SkeletonLoader Demos": "skeletonloader",
    "EmptyState Demos": "emptystate",
    "ColorPicker Demos": "colorpicker",
    "ReasoningAccordion Demos": "reasoningaccordion",
    "CommandPalette Demos": "commandpalette",
    "PromptTemplateManager Demos": "prompttemplatemanager",
    "WorkspaceSwitcher Demos": "workspaceswitcher",
    "AuditLogViewer Demos": "auditlogviewer",
    "PermissionMatrix Demos": "permissionmatrix",
    "ActivityFeed Demos": "activityfeed",
    "GraphToolbar Demos": "graphtoolbar",
    "LogConsole Demos": "logconsole",
    "StatusBadge Demos": "statusbadge",
    "ConfirmDialog Demos": "confirmdialog",
    "SearchBox Demos": "searchbox",
    "UserMenu Demos": "usermenu",
    "FileUpload Demos": "fileupload",
    "AnglePicker Demos": "anglepicker",
    "AppLauncher Demos": "applauncher",
    "FormDialog Demos": "formdialog",
    "FontDropdown Demos": "fontdropdown",
    "LineWidthPicker Demos": "linewidthpicker",
    "LineTypePicker Demos": "linetypepicker",
    "LineShapePicker Demos": "lineshapepicker",
    "LineEndingPicker Demos": "lineendingpicker",
    "Ruler Demos": "ruler",
    "Slider Demos": "slider",
    "Magnifier Demos": "magnifier",
    "SymbolPicker Demos": "symbolpicker",
    "Ribbon Demos": "ribbon",
    "Pill Demos": "pill",
    "RichTextInput Demos": "richtextinput",
    "SmartTextInput Demos": "smarttextinput",
    "PersonChip Demos": "personchip",
    "PeoplePicker Demos": "peoplepicker",
    "PresenceIndicator Demos": "presenceindicator",
    "ShareDialog Demos": "sharedialog",
    "SpineMap Demos": "spinemap",
    "RibbonBuilder Demos": "ribbonbuilder",
    "ActionItems Demos": "actionitems",
    "DiagramEngine Demos": "diagramengine",
    "Shape Builder Demo": "shapebuilder",
    "GraphCanvas Demos": "graphcanvas",
    "GraphCanvasMx Demos": "graphcanvasmx",
    "HelpDrawer Demos": "helpdrawer",
    "DocViewer Demos": "docviewer",
    "GuidedTour Demos": "guidedtour",
    "PeriodPicker Demos": "periodpicker",
    "SprintPicker Demos": "sprintpicker",
    "TypeBadge Demos": "typebadge",
    "RelationshipManager Demos": "relationshipmanager",
    "ThemeToggle Demos": "themetoggle",
}


def read_monolith():
    """Read the monolithic file and return its lines."""
    with open(MONOLITH, "r", encoding="utf-8") as f:
        return f.readlines()


def extract_demo_sections(lines):
    """Extract each demo-section div with its contents.
    Returns dict: section_id -> html_content (string).
    """
    sections = {}
    section_pattern = re.compile(r'<div class="demo-section" id="([^"]+)"')
    i = 0
    while i < len(lines):
        m = section_pattern.search(lines[i])
        if m:
            section_id = m.group(1).replace("-section", "")
            # Collect lines until we find the closing at the same indent level
            # We need to track div nesting
            start_line = i
            depth = 0
            section_lines = []
            while i < len(lines):
                line = lines[i]
                # Count opening and closing divs
                depth += line.count("<div")
                depth -= line.count("</div>")
                section_lines.append(line)
                if depth <= 0:
                    break
                i += 1
            # Strip the common leading whitespace
            content = "".join(section_lines)
            # Remove leading whitespace that's common (typically 12+ spaces from monolith nesting)
            dedented = re.sub(r"^            ", "        ", content, flags=re.MULTILINE)
            sections[section_id] = dedented
        i += 1
    return sections


def _normalize_header(text):
    """Strip decoration chars and normalize a comment header for matching."""
    # Remove ── decorators, =, *, /, whitespace padding
    text = re.sub(r'[─═\*\/=\s]+', ' ', text).strip()
    # Remove trailing "Demo", "Demos", "(Custom SVG)", etc.
    text = re.sub(r'\s*\(.*?\)\s*$', '', text)
    text = re.sub(r'\s+Demos?\s*$', '', text, flags=re.IGNORECASE)
    return text.lower()


# Build a lookup from normalized header -> section_id
_HEADER_LOOKUP = {}
for _h, _sid in INIT_SCRIPT_HEADERS.items():
    _HEADER_LOOKUP[_normalize_header(_h)] = _sid

# Additional mappings for headers that use different wording
_EXTRA_HEADER_MAP = {
    "gauge": "gauge",
    "layout containers": "layout-containers",
    "prompttemplatemanager": "prompttemplatemanager",
    "activityfeed": "activityfeed",
    "actionitems": "actionitems",
    "workspaceswitcher": "workspaceswitcher",
    "permissionmatrix": "permissionmatrix",
    "graphtoolbar": "graphtoolbar",
    "statusbadge": "statusbadge",
    "confirmdialog": "confirmdialog",
    "searchbox": "searchbox",
    "usermenu": "usermenu",
    "fileupload": "fileupload",
    "anglepicker": "anglepicker",
    "applauncher": "applauncher",
    "formdialog": "formdialog",
    "fontdropdown": "fontdropdown",
    "linewidthpicker": "linewidthpicker",
    "linetypepicker": "linetypepicker",
    "lineshapepicker": "lineshapepicker",
    "lineendingpicker": "lineendingpicker",
    "ruler": "ruler",
    "slider": "slider",
    "magnifier": "magnifier",
    "symbolpicker": "symbolpicker",
    "ribbon": "ribbon",
    "pill": "pill",
    "richtextinput": "richtextinput",
    "smart text input engine": "smarttextinput",
    "personchip": "personchip",
    "peoplepicker": "peoplepicker",
    "presenceindicator": "presenceindicator",
    "sharedialog": "sharedialog",
    "breadcrumb navigation": "breadcrumb",
    "multi-stage stepper": "stepper",
    "property inspector": "propertyinspector",
    "graph demo data": "__skip__",  # Shared data block
    "graphcanvas": "graphcanvas",
    "graphcanvasmx": "graphcanvasmx",
    "relationshipmanager": "relationshipmanager",
    "helpdrawer & helptooltip": "helpdrawer",
    "helpdrawer helptooltip": "helpdrawer",
    "docviewer": "docviewer",
    "guidedtour": "guidedtour",
    "ribbon builder": "ribbonbuilder",
    "notification center": "notificationcenter",
}
_HEADER_LOOKUP.update(_EXTRA_HEADER_MAP)


def _identify_script(script_content):
    """Try to identify which component(s) a script block initializes.
    Returns a list of section_ids (usually 1, sometimes 0).
    """
    results = []

    # First pass: look for comment headers (// ==== Title ==== or // ── Title ──)
    header_pattern = re.compile(
        r'//\s*[═=─\s]*([A-Za-z][A-Za-z0-9 &\-\(\)]+?)\s*[═=─\s]*$',
        re.MULTILINE
    )
    for m in header_pattern.finditer(script_content):
        raw = m.group(1).strip()
        normalized = _normalize_header(raw)
        if normalized in _HEADER_LOOKUP:
            sid = _HEADER_LOOKUP[normalized]
            if sid != "__skip__":
                results.append(sid)

    if results:
        return results

    # Second pass: look for create* function calls
    func_matches = re.findall(r'create(\w+)\(', script_content)
    for fn in func_matches:
        name = fn.lower()
        # Map common create function names to section IDs
        name_map = {
            "editablecombobox": "editablecombobox",
            "datepicker": "datepicker",
            "timepicker": "timepicker",
            "durationpicker": "durationpicker",
            "timezonepicker": "timezonepicker",
            "cronpicker": "cronpicker",
            "markdowneditor": "markdowneditor",
            "statusbar": "statusbar",
            "dockedsidebar": "sidebar",
            "floatingsidebar": "sidebar",
            "toolbar": "toolbar",
            "floatingtoolbar": "toolbar",
            "gauge": "gauge",
            "conversation": "conversation",
            "timeline": "timeline",
            "bannerbar": "bannerbar",
            "breadcrumb": "breadcrumb",
            "notificationcenter": "notificationcenter",
            "stepper": "stepper",
            "propertyinspector": "propertyinspector",
            "tabbedpanel": "tabbedpanel",
            "treeview": "treeview",
            "treegrid": "treegrid",
            "docklayout": "docklayout",
            "maskedentry": "maskedentry",
            "splitlayout": "splitlayout",
            "toast": "toast",
            "multiselectcombo": "multiselectcombo",
            "datagrid": "datagrid",
            "codeeditor": "codeeditor",
            "tagger": "tagger",
            "facetsearch": "facetsearch",
            "fileexplorer": "fileexplorer",
            "commentoverlay": "commentoverlay",
            "skeletonloader": "skeletonloader",
            "emptystate": "emptystate",
            "colorpicker": "colorpicker",
            "reasoningaccordion": "reasoningaccordion",
            "commandpalette": "commandpalette",
            "prompttemplatemanager": "prompttemplatemanager",
            "workspaceswitcher": "workspaceswitcher",
            "auditlogviewer": "auditlogviewer",
            "permissionmatrix": "permissionmatrix",
            "activityfeed": "activityfeed",
            "graphtoolbar": "graphtoolbar",
            "logconsole": "logconsole",
            "statusbadge": "statusbadge",
            "confirmdialog": "confirmdialog",
            "searchbox": "searchbox",
            "usermenu": "usermenu",
            "fileupload": "fileupload",
            "anglepicker": "anglepicker",
            "applauncher": "applauncher",
            "formdialog": "formdialog",
            "fontdropdown": "fontdropdown",
            "linewidthpicker": "linewidthpicker",
            "linetypepicker": "linetypepicker",
            "lineshapepicker": "lineshapepicker",
            "lineendingpicker": "lineendingpicker",
            "ruler": "ruler",
            "slider": "slider",
            "magnifier": "magnifier",
            "symbolpicker": "symbolpicker",
            "ribbon": "ribbon",
            "ribbonbuilder": "ribbonbuilder",
            "pill": "pill",
            "richtextinput": "richtextinput",
            "smarttextinput": "smarttextinput",
            "personchip": "personchip",
            "peoplepicker": "peoplepicker",
            "presenceindicator": "presenceindicator",
            "sharedialog": "sharedialog",
            "spinemap": "spinemap",
            "graphcanvas": "graphcanvas",
            "graphcanvasmx": "graphcanvasmx",
            "relationshipmanager": "relationshipmanager",
            "helpdrawer": "helpdrawer",
            "helptooltip": "helpdrawer",
            "docviewer": "docviewer",
            "guidedtour": "guidedtour",
            "periodpicker": "periodpicker",
            "sprintpicker": "sprintpicker",
            "typebadge": "typebadge",
            "diagramengine": "diagramengine",
            "actionitems": "actionitems",
            "themetoggle": "__skip__",
        }
        if name in name_map:
            sid = name_map[name]
            if sid != "__skip__" and sid not in results:
                results.append(sid)

    # Third pass: look for showErrorDialog, showProgressModal, etc.
    if "showErrorDialog" in script_content and "errordialog" not in results:
        results.append("errordialog")
    if "showProgressModal" in script_content and "progressmodal" not in results:
        results.append("progressmodal")
    if "showSteppedProgressModal" in script_content and "progressmodal" not in results:
        results.append("progressmodal")
    if "showMarkdownEditorModal" in script_content and "markdowneditor" not in results:
        results.append("markdowneditor")
    if "showConfirmDialog" in script_content and "confirmdialog" not in results:
        results.append("confirmdialog")

    return results


def extract_init_scripts(lines):
    """Extract initialization scripts from the bottom of the file.
    Returns dict: section_id -> script_content (the inner JS code).
    """
    scripts = {}
    i = 0
    while i < len(lines):
        line = lines[i]
        # Look for <script> tags (not src= ones, not type="module")
        if re.match(r'\s*<script>\s*$', line):
            # Collect all lines until </script>
            script_lines = []
            i += 1
            while i < len(lines) and '</script>' not in lines[i]:
                script_lines.append(lines[i])
                i += 1
            script_content = "".join(script_lines)

            # Skip theme toggle init
            if "Theme Toggle" in script_content and "createThemeToggle" in script_content:
                i += 1
                continue

            # Identify which component(s) this script belongs to
            section_ids = _identify_script(script_content)

            for section_id in section_ids:
                if section_id not in scripts:
                    scripts[section_id] = script_content
                else:
                    scripts[section_id] += "\n" + script_content
        i += 1
    return scripts


def format_js_tag(js_path):
    """Convert a JS path spec to a <script> tag."""
    if js_path == "__codemirror_module__":
        return CODEMIRROR_MODULE_SCRIPT
    if js_path == "__maxgraph_module__":
        return MAXGRAPH_MODULE_SCRIPT
    if js_path.startswith("__defer__"):
        actual = js_path[len("__defer__"):]
        if actual.startswith("http"):
            return f'    <script defer src="{actual}"></script>'
        return f'    <script defer src="../../dist/components/{actual}"></script>'
    if js_path.startswith("http"):
        return f'    <script src="{js_path}"></script>'
    return f'    <script src="../../dist/components/{js_path}"></script>'


def format_css_tag(css_path):
    """Convert a CSS path spec to a <link> tag."""
    if css_path.startswith("http"):
        return f'    <link rel="stylesheet" href="{css_path}">'
    return f'    <link rel="stylesheet" href="../../dist/components/{css_path}">'


def dedent_script(script_content):
    """Remove the outermost indent level from script content."""
    lines = script_content.split("\n")
    # Find minimum non-empty indent
    min_indent = 999
    for line in lines:
        stripped = line.lstrip()
        if stripped:
            indent = len(line) - len(stripped)
            min_indent = min(min_indent, indent)
    if min_indent == 999:
        min_indent = 0
    # Remove that indent, but keep at least 4 spaces for the <script> block context
    result = []
    for line in lines:
        if line.strip():
            result.append("    " + line[min_indent:])
        else:
            result.append("")
    return "\n".join(result)


def generate_page(section_id, display_name, demo_html, init_script,
                   css_deps, js_deps, cdn_css, preconnects):
    """Generate the full HTML page for a component demo."""

    # Build preconnect links
    preconnect_html = ""
    all_preconnects = set()
    if preconnects:
        all_preconnects.update(preconnects)
    # Auto-detect from URLs
    for url in cdn_css + [j for j in js_deps if isinstance(j, str) and j.startswith("http")]:
        if "unpkg.com" in url:
            all_preconnects.add("https://unpkg.com")
        if "esm.sh" in url:
            all_preconnects.add("https://esm.sh")
        if "cdn.jsdelivr.net" in url:
            all_preconnects.add("https://cdn.jsdelivr.net")

    for pc in sorted(all_preconnects):
        preconnect_html += f'    <link rel="preconnect" href="{pc}">\n'

    # Build CSS tags
    css_html = ""
    for url in cdn_css:
        css_html += f'    <link rel="stylesheet" href="{url}">\n'
    for css in css_deps:
        css_html += format_css_tag(css) + "\n"

    # Build JS tags
    js_html = ""
    for js in js_deps:
        js_html += format_js_tag(js) + "\n"

    # Format init script
    if init_script:
        init_formatted = dedent_script(init_script)
    else:
        init_formatted = "    // No initialization script extracted"

    # Extra HTML outside the section (e.g. error dialog container)
    extra_html = ""
    if section_id == "errordialog":
        extra_html = '\n    <!-- Error Dialog Container -->\n    <div id="error-dialog-container"></div>\n'
    if section_id == "markdowneditor":
        # Modal editor needs an external trigger
        pass

    page = f'''<!--
  COMPONENT: DemoPage-{display_name}
  PURPOSE: Standalone demo page for the {display_name} component.
  RELATES: [[{display_name}]], [[DemoShell]]
-->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{display_name} - Enterprise Theme Demo</title>

    <!-- FOUC prevention -->
    <script>
    (function()
    {{
        var mode = sessionStorage.getItem("theme-mode") || "auto";
        var dark = mode === "dark" ||
                   (mode === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
        if (dark) {{ document.documentElement.setAttribute("data-bs-theme", "dark"); }}
    }})();
    </script>

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
{preconnect_html}    <link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">

    <link rel="stylesheet" href="../../dist/css/custom.css">
    <link rel="stylesheet" href="../../dist/icons/bootstrap-icons.css">
    <link rel="stylesheet" href="../../dist/components/themetoggle/themetoggle.css">
{css_html}    <link rel="stylesheet" href="../shared/demo-shell.css">
</head>
<body class="demo-shell-body">

    <header class="demo-header">
        <h1 class="demo-header-title">
            <a href="../index.html"><i class="bi bi-arrow-left"></i></a>
            {display_name}
        </h1>
        <div class="demo-header-actions">
            <a href="../index.html" class="demo-back-link">
                <i class="bi bi-grid-3x3-gap"></i> All Components
            </a>
            <div id="demo-theme-toggle"></div>
        </div>
    </header>

    <main class="demo-main">

{demo_html}
    </main>
{extra_html}
    <script src="../../dist/js/bootstrap.bundle.min.js"></script>
    <script src="../../dist/components/themetoggle/themetoggle.js"></script>
    <script src="../shared/demo-shell.js"></script>
{js_html}
    <script>
{init_formatted}
    </script>
</body>
</html>
'''
    return page


def update_index_page(created_ids):
    """Update demo/index.html to remove demo-card-nolink from created pages
    and add the Demo badge."""
    with open(INDEX_FILE, "r", encoding="utf-8") as f:
        content = f.read()

    # Layout sub-components that map to layout-containers.html
    LAYOUT_REDIRECTS = {
        "boxlayout", "flowlayout", "gridlayout", "borderlayout",
        "flexgridlayout", "cardlayout", "layerlayout", "anchorlayout",
    }

    # First, fix layout component hrefs to point to layout-containers.html
    for layout_name in LAYOUT_REDIRECTS:
        content = content.replace(
            f'href="components/{layout_name}.html"',
            f'href="components/layout-containers.html"'
        )

    # Collect all data-names that have a corresponding demo file
    all_demo_names = set(created_ids)
    # Add layout sub-component names since they redirect to layout-containers
    all_demo_names.update(LAYOUT_REDIRECTS)

    # Process line-by-line for reliable matching
    lines = content.split("\n")
    updated_lines = []
    for line in lines:
        # Check if this line has a demo card with nolink for any of our demo pages
        for section_id in all_demo_names:
            if f'data-name="{section_id}"' in line and "demo-card-nolink" in line:
                line = line.replace(" demo-card-nolink", "")
                break

        # Add Demo badge if this line has a card name div without one
        for section_id in all_demo_names:
            if f'data-name="{section_id}"' in line:
                # This is the card link line; next line has the card-name div
                # We'll handle badge addition on the card-name line
                pass

        updated_lines.append(line)

    # Second pass: add Demo badges to card-name divs
    content = "\n".join(updated_lines)
    for section_id in all_demo_names:
        badge_pattern = re.compile(
            r'(data-name="' + re.escape(section_id) + r'"[^>]*>[\s\S]*?'
            r'<div class="demo-card-name">)(.*?)(</div>)'
        )
        def add_badge(m, sid=section_id):
            if "demo-card-badge" in m.group(2):
                return m.group(0)
            name_content = m.group(2).rstrip()
            return m.group(1) + name_content + ' <span class="demo-card-badge">Demo</span>' + m.group(3)

        content = badge_pattern.sub(add_badge, content)

    with open(INDEX_FILE, "w", encoding="utf-8") as f:
        f.write(content)


def main():
    print(f"Reading monolith: {MONOLITH}")
    lines = read_monolith()
    print(f"  {len(lines)} lines")

    print("Extracting demo sections...")
    sections = extract_demo_sections(lines)
    print(f"  Found {len(sections)} sections: {', '.join(sorted(sections.keys()))}")

    print("Extracting init scripts...")
    init_scripts = extract_init_scripts(lines)
    print(f"  Found {len(init_scripts)} init scripts: {', '.join(sorted(init_scripts.keys()))}")

    # Determine which sections to generate
    # Skip sections that already have manually-crafted demo pages
    existing_pages = set()
    for f in os.listdir(OUTPUT_DIR):
        if f.endswith(".html") and f != "_template.html":
            existing_pages.add(f.replace(".html", ""))

    print(f"Existing pages (will skip): {', '.join(sorted(existing_pages))}")

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    created = []
    skipped = []

    for section_id in sorted(sections.keys()):
        # Compute filename (remove hyphens for lookup but keep for file)
        filename = section_id

        # Skip existing hand-crafted pages
        if filename in existing_pages:
            skipped.append(section_id)
            continue

        display_name = DISPLAY_NAMES.get(section_id, section_id.title())
        demo_html = sections[section_id]
        init_script = init_scripts.get(section_id, "")

        # Get dependencies
        css_deps = COMPONENT_CSS.get(section_id, [])
        js_deps = COMPONENT_JS.get(section_id, [])
        cdn_css = EXTRA_CDN_CSS.get(section_id, [])
        preconnects = EXTRA_PRECONNECT.get(section_id, [])

        # Generate the page
        page_content = generate_page(
            section_id, display_name, demo_html, init_script,
            css_deps, js_deps, cdn_css, preconnects
        )

        output_path = os.path.join(OUTPUT_DIR, f"{filename}.html")
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(page_content)

        created.append(section_id)
        print(f"  Created: {filename}.html")

    print(f"\nGenerated {len(created)} pages, skipped {len(skipped)} existing")

    # Update index page — include ALL pages with demo files (created + existing)
    all_demo_pages = created + skipped
    print(f"Updating index page for {len(all_demo_pages)} pages...")
    update_index_page(all_demo_pages)
    print("Done!")

    return 0


if __name__ == "__main__":
    sys.exit(main())
