/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * Studio Storage — shared localStorage helpers for studio apps.
 * Provides namespaced CRUD, auto-save debounce, and export/import.
 */
(function()
{
    "use strict";

    var LOG = "[StudioStorage]";

    // ========================================================================
    // NAMESPACE HELPERS
    // ========================================================================

    /**
     * Builds the localStorage key for a given namespace and key.
     *
     * @param {string} ns - Namespace (e.g. "ribbon-studio").
     * @param {string} key - Storage key within the namespace.
     * @returns {string} Combined localStorage key.
     */
    function nsKey(ns, key)
    {
        return ns + ":" + key;
    }

    // ========================================================================
    // CRUD OPERATIONS
    // ========================================================================

    /**
     * Saves data to localStorage under a namespaced key.
     *
     * @param {string} ns - Namespace.
     * @param {string} key - Key within namespace.
     * @param {*} data - Data to serialize and store.
     */
    function save(ns, key, data)
    {
        try
        {
            localStorage.setItem(nsKey(ns, key), JSON.stringify(data));
        }
        catch (err)
        {
            console.error(LOG, "Save failed:", ns, key, err);
        }
    }

    /**
     * Loads data from localStorage by namespaced key.
     *
     * @param {string} ns - Namespace.
     * @param {string} key - Key within namespace.
     * @returns {*} Parsed data, or null if not found.
     */
    function load(ns, key)
    {
        try
        {
            var raw = localStorage.getItem(nsKey(ns, key));

            return raw ? JSON.parse(raw) : null;
        }
        catch (err)
        {
            console.error(LOG, "Load failed:", ns, key, err);
            return null;
        }
    }

    /**
     * Deletes a namespaced key from localStorage.
     *
     * @param {string} ns - Namespace.
     * @param {string} key - Key within namespace.
     */
    function remove(ns, key)
    {
        localStorage.removeItem(nsKey(ns, key));
    }

    /**
     * Lists all keys within a namespace.
     *
     * @param {string} ns - Namespace prefix.
     * @returns {string[]} Array of keys (without namespace prefix).
     */
    function list(ns)
    {
        var prefix = ns + ":";
        var keys = [];

        for (var i = 0; i < localStorage.length; i++)
        {
            var k = localStorage.key(i);

            if (k && k.indexOf(prefix) === 0)
            {
                keys.push(k.substring(prefix.length));
            }
        }

        return keys;
    }

    // ========================================================================
    // EXPORT / IMPORT
    // ========================================================================

    /**
     * Exports all data in a namespace as a JSON string.
     *
     * @param {string} ns - Namespace.
     * @returns {string} JSON string of all namespaced data.
     */
    function exportAll(ns)
    {
        var prefix = ns + ":";
        var result = {};

        for (var i = 0; i < localStorage.length; i++)
        {
            var k = localStorage.key(i);

            if (k && k.indexOf(prefix) === 0)
            {
                var shortKey = k.substring(prefix.length);

                try
                {
                    result[shortKey] = JSON.parse(localStorage.getItem(k));
                }
                catch (_)
                {
                    result[shortKey] = localStorage.getItem(k);
                }
            }
        }

        return JSON.stringify(result, null, 2);
    }

    /**
     * Imports data from a JSON string into a namespace.
     *
     * @param {string} ns - Namespace.
     * @param {string} json - JSON string to import.
     */
    function importAll(ns, json)
    {
        try
        {
            var data = JSON.parse(json);

            for (var key in data)
            {
                if (data.hasOwnProperty(key))
                {
                    save(ns, key, data[key]);
                }
            }

            console.log(LOG, "Imported", Object.keys(data).length, "keys into", ns);
        }
        catch (err)
        {
            console.error(LOG, "Import failed:", err);
        }
    }

    // ========================================================================
    // AUTO-SAVE DEBOUNCE
    // ========================================================================

    /**
     * Creates a debounced auto-save function.
     *
     * @param {string} ns - Namespace.
     * @param {string} key - Key within namespace.
     * @param {number} delayMs - Debounce delay in milliseconds.
     * @returns {function(data: *): void} Debounced save function.
     */
    function createAutoSave(ns, key, delayMs)
    {
        var timer = null;

        return function(data)
        {
            if (timer)
            {
                clearTimeout(timer);
            }

            timer = setTimeout(function()
            {
                save(ns, key, data);
                timer = null;
            }, delayMs || 2000);
        };
    }

    // ========================================================================
    // FILE DOWNLOAD HELPER
    // ========================================================================

    /**
     * Triggers a file download from a string.
     *
     * @param {string} content - File content.
     * @param {string} filename - Download filename.
     * @param {string} mimeType - MIME type (default: application/json).
     */
    function downloadFile(content, filename, mimeType)
    {
        var blob = new Blob([content], { type: mimeType || "application/json;charset=utf-8" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");

        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Shows a file picker and reads the selected file as text.
     *
     * @param {string} accept - File type filter (e.g. ".json").
     * @param {function(string): void} callback - Called with file content.
     */
    function pickFile(accept, callback)
    {
        var input = document.createElement("input");

        input.type = "file";
        input.accept = accept || ".json";

        input.addEventListener("change", function()
        {
            if (!input.files || !input.files[0])
            {
                return;
            }

            var reader = new FileReader();

            reader.onload = function()
            {
                callback(reader.result);
            };

            reader.readAsText(input.files[0]);
        });

        input.click();
    }

    // ========================================================================
    // TIMESTAMP HELPER
    // ========================================================================

    /**
     * Returns the current ISO 8601 timestamp.
     *
     * @returns {string} ISO timestamp string.
     */
    function now()
    {
        return new Date().toISOString();
    }

    /**
     * Formats an ISO timestamp for display.
     *
     * @param {string} iso - ISO 8601 timestamp.
     * @returns {string} Human-readable date/time string.
     */
    function formatDate(iso)
    {
        if (!iso)
        {
            return "—";
        }

        var d = new Date(iso);

        return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    // ========================================================================
    // PUBLIC API
    // ========================================================================

    window.StudioStorage = {
        save: save,
        load: load,
        remove: remove,
        list: list,
        exportAll: exportAll,
        importAll: importAll,
        createAutoSave: createAutoSave,
        downloadFile: downloadFile,
        pickFile: pickFile,
        now: now,
        formatDate: formatDate
    };
})();
