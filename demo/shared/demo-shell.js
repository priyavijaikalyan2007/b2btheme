/**
 * Copyright 2026 pvk2007. All rights reserved.
 *
 * @fileoverview Shared shell logic for the multi-page demo site.
 *               Handles theme toggle initialisation and search filtering.
 *
 * COMPONENT: DemoShell
 * PURPOSE: Theme persistence (sessionStorage) and card grid search/filter.
 * RELATES: [[EnterpriseTheme]], [[ThemeToggle]], [[ThemeDemo]]
 */

/* global createThemeToggle */

(function ()
{
    "use strict";

    var LOG_PREFIX = "[DemoShell]";

    // ====================================================================
    // Theme toggle — initialise if container is present
    // ====================================================================

    function initThemeToggle()
    {
        var container = document.getElementById("demo-theme-toggle");

        if (!container)
        {
            return;
        }

        if (typeof createThemeToggle !== "function")
        {
            console.warn(LOG_PREFIX, "createThemeToggle not available");
            return;
        }

        var saved = sessionStorage.getItem("theme-mode") || "auto";

        createThemeToggle({
            container: container,
            defaultTheme: saved,
            onChange: function (theme, mode)
            {
                sessionStorage.setItem("theme-mode", mode);
                console.log(LOG_PREFIX, "Theme:", theme, "Mode:", mode);
            }
        });

        console.log(LOG_PREFIX, "Theme toggle initialised");
    }

    // ====================================================================
    // Search / filter for the index card grid
    // ====================================================================

    function initSearchFilter()
    {
        var searchInput = document.getElementById("demo-search-input");

        if (!searchInput)
        {
            return;
        }

        var cards = document.querySelectorAll(".demo-card");
        var categories = document.querySelectorAll(".demo-category-section");
        var countEl = document.getElementById("demo-visible-count");

        searchInput.addEventListener("input", function ()
        {
            var query = searchInput.value.trim().toLowerCase();

            var visibleCount = 0;

            for (var i = 0; i < cards.length; i++)
            {
                var card = cards[i];
                var name = (card.getAttribute("data-name") || "").toLowerCase();
                var desc = (card.getAttribute("data-desc") || "").toLowerCase();
                var match = !query || name.indexOf(query) !== -1 || desc.indexOf(query) !== -1;

                if (match)
                {
                    card.classList.remove("demo-hidden");
                    visibleCount++;
                }
                else
                {
                    card.classList.add("demo-hidden");
                }
            }

            // Hide category sections that have no visible cards
            for (var c = 0; c < categories.length; c++)
            {
                var section = categories[c];
                var visibleCards = section.querySelectorAll(".demo-card:not(.demo-hidden)");

                if (visibleCards.length === 0)
                {
                    section.classList.add("demo-hidden");
                }
                else
                {
                    section.classList.remove("demo-hidden");
                }
            }

            if (countEl)
            {
                countEl.textContent = visibleCount;
            }
        });

        console.log(LOG_PREFIX, "Search filter initialised,", cards.length, "cards");
    }

    // ====================================================================
    // Init on DOMContentLoaded
    // ====================================================================

    if (document.readyState === "loading")
    {
        document.addEventListener("DOMContentLoaded", function ()
        {
            initThemeToggle();
            initSearchFilter();
        });
    }
    else
    {
        initThemeToggle();
        initSearchFilter();
    }
})();
