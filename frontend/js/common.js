/*
 * Personal Growth Tracker - shared helpers and API client.
 * Every page loads this file before its own script.
 */

(function () {
    const API_BASE = window.PGT_API_BASE || "http://127.0.0.1:8000";
    const TOKEN_KEY = "pgt_token";
    const USER_KEY = "pgt_user";
    const DARK_MODE_KEY = "pgt_dark_mode";
    const PUBLIC_PAGES = ["index.html", "register.html", "forgot-password.html"];

    // ----- Page and session helpers -------------------------------------------

    function currentPage() {
        return window.location.pathname.split("/").pop() || "index.html";
    }

    function isPublicPage() {
        return PUBLIC_PAGES.includes(currentPage());
    }

    function getToken() {
        return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
    }

    function getCurrentUser() {
        const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
        try {
            return raw ? JSON.parse(raw) : null;
        } catch (error) {
            return null;
        }
    }

    function clearSession() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(USER_KEY);
    }

    // "Remember me" keeps the session across browser restarts (localStorage).
    // Otherwise the session lasts only for this browser tab (sessionStorage).
    function saveSession(token, user, remember) {
        clearSession();
        const store = remember ? localStorage : sessionStorage;
        store.setItem(TOKEN_KEY, token);
        store.setItem(USER_KEY, JSON.stringify(user));
    }

    function setCurrentUser(user) {
        const store = localStorage.getItem(TOKEN_KEY) ? localStorage : sessionStorage;
        store.setItem(USER_KEY, JSON.stringify(user));
    }

    function logout(event) {
        if (event) {
            event.preventDefault();
        }
        clearSession();
        window.location.href = "index.html";
    }

    // Pages other than the public ones require a session token.
    function requireLogin() {
        if (!isPublicPage() && !getToken()) {
            window.location.replace("index.html");
            return false;
        }
        return true;
    }

    // ----- Theme ----------------------------------------------------------------

    function setDarkMode(enabled) {
        localStorage.setItem(DARK_MODE_KEY, enabled ? "true" : "false");
        document.body.classList.toggle("dark-mode", Boolean(enabled));
    }

    function applySavedTheme() {
        document.body.classList.toggle("dark-mode", localStorage.getItem(DARK_MODE_KEY) === "true");
    }

    // ----- API client -----------------------------------------------------------

    function formatErrorDetail(detail, fallback) {
        if (typeof detail === "string") {
            return detail;
        }
        if (Array.isArray(detail)) {
            return detail
                .map(item => (item && item.msg ? item.msg.replace(/^Value error, /, "") : ""))
                .filter(Boolean)
                .join(" ") || fallback;
        }
        return fallback;
    }

    async function request(path, options = {}) {
        const { method = "GET", body, form, blob = false, auth = true } = options;
        const headers = {};
        let payload;

        if (form) {
            payload = form; // FormData or URLSearchParams: the browser sets Content-Type
        } else if (body !== undefined) {
            headers["Content-Type"] = "application/json";
            payload = JSON.stringify(body);
        }

        if (auth) {
            const token = getToken();
            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
            }
        }

        let response;
        try {
            response = await fetch(API_BASE + path, { method, headers, body: payload });
        } catch (error) {
            throw new Error("Cannot reach the server. Check that the backend is running.");
        }

        if (response.status === 401 && auth) {
            clearSession();
            if (!isPublicPage()) {
                window.location.replace("index.html");
            }
            throw new Error("Your session has ended. Please log in again.");
        }

        if (!response.ok) {
            let message = "Something went wrong. Please try again.";
            try {
                const data = await response.json();
                message = formatErrorDetail(data.detail, message);
            } catch (error) {
                // The response was not JSON; keep the generic message.
            }
            throw new Error(message);
        }

        if (blob) {
            return response.blob();
        }
        if (response.status === 204) {
            return null;
        }
        return response.json();
    }

    const api = {
        get: (path, options) => request(path, options),
        post: (path, body, options = {}) => request(path, { ...options, method: "POST", body }),
        postForm: (path, form, options = {}) => request(path, { ...options, method: "POST", form }),
        put: (path, body, options = {}) => request(path, { ...options, method: "PUT", body }),
        delete: (path, options = {}) => request(path, { ...options, method: "DELETE" })
    };

    // ----- Display helpers ------------------------------------------------------

    function escapeHTML(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    // Accepts "YYYY-MM-DD" or a longer ISO timestamp; only the date part is used.
    function formatDate(value) {
        if (!value) {
            return "No date available";
        }
        const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
        if (Number.isNaN(date.getTime())) {
            return "Invalid date";
        }
        return date.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
    }

    function formatNumber(value) {
        const number = Number(value);
        if (Number.isNaN(number)) {
            return "0";
        }
        return String(Math.round(number * 100) / 100);
    }

    function formatPercentage(value) {
        return `${Math.round(Number(value) || 0)}%`;
    }

    function toIsoDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    // Returns "YYYY-MM-DD" for the local date `daysAgo` days before today.
    function dateOffset(daysAgo) {
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        return toIsoDate(date);
    }

    function getTodayDate() {
        return toIsoDate(new Date());
    }

    function averageProgress(goals) {
        if (!goals.length) {
            return 0;
        }
        return goals.reduce((total, goal) => total + (Number(goal.progress) || 0), 0) / goals.length;
    }

    function showMessage(elementId, message, type = "success") {
        const element = document.getElementById(elementId);
        if (!element) {
            return;
        }
        element.textContent = message;
        element.classList.remove("message-success", "message-error");
        element.classList.add(`message-${type}`);
    }

    // Shows an error at the top of the page content (used when a page fails to load).
    function showPageError(message) {
        const container = document.querySelector(".main-content") || document.body;
        let banner = document.getElementById("page-error");
        if (!banner) {
            banner = document.createElement("p");
            banner.id = "page-error";
            banner.className = "form-message message-error";
            container.insertBefore(banner, container.firstChild);
        }
        banner.textContent = message;
    }

    // ----- Startup --------------------------------------------------------------

    applySavedTheme();
    const authorised = requireLogin();

    document.addEventListener("DOMContentLoaded", function () {
        document.querySelectorAll("#logout-button, .logout-button").forEach(button => {
            button.addEventListener("click", logout);
        });

        if (authorised && !isPublicPage()) {
            // Keep the theme in step with the saved server setting. A failure here
            // should not stop the page from working.
            api.get("/profile/settings")
                .then(settings => setDarkMode(settings.dark_mode))
                .catch(() => {});
        }
    });

    window.PGT = {
        API_BASE,
        api,
        getToken,
        getCurrentUser,
        setCurrentUser,
        saveSession,
        clearSession,
        logout,
        requireLogin,
        setDarkMode,
        escapeHTML,
        formatDate,
        formatNumber,
        formatPercentage,
        dateOffset,
        getTodayDate,
        averageProgress,
        showMessage,
        showPageError
    };
})();
