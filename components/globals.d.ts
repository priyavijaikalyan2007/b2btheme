/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 7f2b4d16-9c38-4a5e-b0d7-13e8a6c45f29
 * Created: 2026-10-13
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: Globals
 * 📜 PURPOSE: Ambient declarations for the window globals that components
 *             publish to each other. Components in this library do not
 *             import one another, they communicate through `window`, so
 *             every cross-component lookup used to need a `window as any`
 *             cast. Declaring the shape here types those lookups instead.
 * 🔗 RELATES: [[LogUtility]], [[FrontendLogging]]
 * ⚡ FLOW: [Component] -> [window.createLogUtility] -> [LogUtility]
 * ----------------------------------------------------------------------------
 *
 * EVERY MEMBER IS OPTIONAL, and that is the contract rather than caution.
 * Each component ships as its own IIFE bundle and a page loads only the
 * bundles it uses, so a global is present exactly when its bundle was
 * loaded. The `?` is what forces the `typeof x === "function"` guard that
 * every consumer already writes.
 *
 * THE IMPORTS ARE TYPE-ONLY AND ERASED. A `.d.ts` emits nothing, so naming
 * a component here creates no runtime edge between bundles and does not
 * change the rule that components never import one another.
 *
 * ADR-171 D2 chose this over `(window as unknown as Record<string, unknown>)`,
 * which the March 2026 audit prescribed. That form returns `unknown` and so
 * forces a second cast on the value, which buys nothing over `any`.
 */

import type { LogUtility, LogUtilityOptions } from "./logutility/logutility";
import type { BannerBar, createBannerBar, showBanner } from "./bannerbar/bannerbar";
import type { ColorPicker, createColorPicker } from "./colorpicker/colorpicker";
import type { CronPicker, createCronPicker } from "./cronpicker/cronpicker";
import type { DatePicker, createDatePicker } from "./datepicker/datepicker";
import type { DockLayout, createDockLayout } from "./docklayout/docklayout";
import type { DurationPicker, createDurationPicker } from "./durationpicker/durationpicker";
import type { EmptyState, createEmptyState } from "./emptystate/emptystate";
import type { Gauge, createBarGauge, createGauge, createRingGauge, createTileGauge } from "./gauge/gauge";
import type { attachHoverCard, createHoverCard } from "./hovercard/hovercard";
import type { LogConsole, createLogConsole } from "./logconsole/logconsole";
import type { MarketingHero, createMarketingHero } from "./marketinghero/marketinghero";
import type { ProgressModal, showProgressModal, showSteppedProgressModal } from "./progressmodal/progressmodal";
import type
{
    Sidebar,
    SidebarManager,
    createDockedSidebar,
    createFloatingSidebar,
    createSidebar,
} from "./sidebar/sidebar";
import type { SiteFooter, createSiteFooter } from "./sitefooter/sitefooter";
import type { SkeletonLoader, createSkeletonLoader } from "./skeletonloader/skeletonloader";
import type { StatusBar, createStatusBar } from "./statusbar/statusbar";
import type
{
    TabbedPanel,
    TabbedPanelManager,
    createDockedTabbedPanel,
    createFloatingTabbedPanel,
    createTabbedPanel,
} from "./tabbedpanel/tabbedpanel";
import type { Timeline, createTimeline } from "./timeline/timeline";
import type { TimePicker, createTimePicker } from "./timepicker/timepicker";
import type { TimezonePicker, createTimezonePicker } from "./timezonepicker/timezonepicker";
import type
{
    clearAllToasts,
    configureToasts,
    showErrorToast,
    showInfoToast,
    showSuccessToast,
    showToast,
    showWarningToast,
} from "./toast/toast";
import type { Toolbar, createDockedToolbar, createFloatingToolbar, createToolbar } from "./toolbar/toolbar";
import type { TreeView, createTreeView } from "./treeview/treeview";

declare global
{
    interface Window
    {
        /**
         * Factory published by the LogUtility component. Absent when the
         * host page does not load `logutility.js`, which is why every
         * component checks for it before use. See FRONTEND_LOGGING.md.
         */
        createLogUtility?: (options?: LogUtilityOptions) => LogUtility;

        /** Resets the LogUtility singleton. Published for tests. */
        resetLogUtility?: () => void;

        /**
         * The LogUtility implementation class. Published for tests. Typed by
         * its construct signature rather than by `typeof LogUtilityImpl`,
         * because that class is module-private and exporting it to describe
         * a global would widen the component's published surface.
         */
        LogUtility?: new (options?: LogUtilityOptions) => LogUtility;

        /**
         * Published by a vendor script, not by this library. The page loads
         * `dompurify` itself, so the global is absent on a page that does
         * not. Typed structurally rather than imported from the package,
         * because the global is the script's own object and this library
         * never imports the module.
         */
        DOMPurify?: { sanitize(html: string, config?: Record<string, unknown>): string };

        /** Published by the BannerBar component. */
        BannerBar?: typeof BannerBar;
        createBannerBar?: typeof createBannerBar;
        showBanner?: typeof showBanner;

        /** Published by the ColorPicker component. */
        ColorPicker?: typeof ColorPicker;
        createColorPicker?: typeof createColorPicker;

        /** Published by the CronPicker component. */
        CronPicker?: typeof CronPicker;
        createCronPicker?: typeof createCronPicker;

        /** Published by the DatePicker component. */
        DatePicker?: typeof DatePicker;
        createDatePicker?: typeof createDatePicker;

        /** Published by the DockLayout component. */
        DockLayout?: typeof DockLayout;
        createDockLayout?: typeof createDockLayout;

        /** Published by the DurationPicker component. */
        DurationPicker?: typeof DurationPicker;
        createDurationPicker?: typeof createDurationPicker;

        /** Published by the EmptyState component. */
        EmptyState?: typeof EmptyState;
        createEmptyState?: typeof createEmptyState;

        /** Published by the Gauge component. */
        Gauge?: typeof Gauge;
        createBarGauge?: typeof createBarGauge;
        createGauge?: typeof createGauge;
        createRingGauge?: typeof createRingGauge;
        createTileGauge?: typeof createTileGauge;

        /** Published by the HoverCard component. */
        attachHoverCard?: typeof attachHoverCard;
        createHoverCard?: typeof createHoverCard;

        /** Published by the LogConsole component. */
        LogConsole?: typeof LogConsole;
        createLogConsole?: typeof createLogConsole;

        /** Published by the MarketingHero component. */
        MarketingHero?: typeof MarketingHero;
        createMarketingHero?: typeof createMarketingHero;

        /** Published by the ProgressModal component. */
        ProgressModal?: typeof ProgressModal;
        showProgressModal?: typeof showProgressModal;
        showSteppedProgressModal?: typeof showSteppedProgressModal;

        /** Published by the Sidebar component. */
        Sidebar?: typeof Sidebar;
        SidebarManager?: typeof SidebarManager;
        createDockedSidebar?: typeof createDockedSidebar;
        createFloatingSidebar?: typeof createFloatingSidebar;
        createSidebar?: typeof createSidebar;

        /**
         * The SidebarManager singleton, written here by its own
         * `getInstance()` for debugging and for tests. Internal: it is not
         * part of the published API and no component reads it. It is
         * declared because it is already public at run time, and a
         * declaration describes what is there rather than widening it.
         */
        __sidebarManager?: SidebarManager;

        /** Published by the SiteFooter component. */
        SiteFooter?: typeof SiteFooter;
        createSiteFooter?: typeof createSiteFooter;

        /** Published by the SkeletonLoader component. */
        SkeletonLoader?: typeof SkeletonLoader;
        createSkeletonLoader?: typeof createSkeletonLoader;

        /** Published by the StatusBar component. */
        StatusBar?: typeof StatusBar;
        createStatusBar?: typeof createStatusBar;

        /** Published by the TabbedPanel component. */
        TabbedPanel?: typeof TabbedPanel;
        TabbedPanelManager?: typeof TabbedPanelManager;
        createDockedTabbedPanel?: typeof createDockedTabbedPanel;
        createFloatingTabbedPanel?: typeof createFloatingTabbedPanel;
        createTabbedPanel?: typeof createTabbedPanel;

        /**
         * The TabbedPanelManager singleton, written here by its own
         * `getInstance()` for debugging and for tests. Internal: it is not
         * part of the published API and no component reads it. It is
         * declared because it is already public at run time, and a
         * declaration describes what is there rather than widening it.
         */
        __tabbedPanelManager?: TabbedPanelManager;

        /** Published by the Timeline component. */
        Timeline?: typeof Timeline;
        createTimeline?: typeof createTimeline;

        /** Published by the TimePicker component. */
        TimePicker?: typeof TimePicker;
        createTimePicker?: typeof createTimePicker;

        /** Published by the TimezonePicker component. */
        TimezonePicker?: typeof TimezonePicker;
        createTimezonePicker?: typeof createTimezonePicker;

        /** Published by the Toast component. */
        clearAllToasts?: typeof clearAllToasts;
        configureToasts?: typeof configureToasts;
        showErrorToast?: typeof showErrorToast;
        showInfoToast?: typeof showInfoToast;
        showSuccessToast?: typeof showSuccessToast;
        showToast?: typeof showToast;
        showWarningToast?: typeof showWarningToast;

        /** Published by the Toolbar component. */
        Toolbar?: typeof Toolbar;
        createDockedToolbar?: typeof createDockedToolbar;
        createFloatingToolbar?: typeof createFloatingToolbar;
        createToolbar?: typeof createToolbar;

        /** Published by the TreeView component. */
        TreeView?: typeof TreeView;
        createTreeView?: typeof createTreeView;
    }
}
