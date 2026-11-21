document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("settings-form");
    const themeSelect = document.getElementById("theme-setting");
    const notificationsCheckbox = document.getElementById("notifications-setting");
    const weekStartSelect = document.getElementById("week-start");

    function fillForm(settings) {
        themeSelect.value = settings.dark_mode ? "dark" : "light";
        notificationsCheckbox.checked = Boolean(settings.notifications_enabled);
        weekStartSelect.value = settings.week_start;
    }

    // Preview the theme as soon as it is changed; it is saved when the form is submitted.
    themeSelect.addEventListener("change", function () {
        PGT.setDarkMode(themeSelect.value === "dark");
    });

    async function loadSettings() {
        try {
            const settings = await PGT.api.get("/profile/settings");
            fillForm(settings);
            PGT.setDarkMode(settings.dark_mode);
        } catch (error) {
            PGT.showPageError(error.message);
        }
    }

    if (form) {
        form.addEventListener("submit", async function (event) {
            event.preventDefault();

            const submitButton = form.querySelector('button[type="submit"]');
            const payload = {
                dark_mode: themeSelect.value === "dark",
                notifications_enabled: notificationsCheckbox.checked,
                week_start: weekStartSelect.value
            };

            submitButton.disabled = true;
            try {
                const settings = await PGT.api.put("/profile/settings", payload);
                fillForm(settings);
                PGT.setDarkMode(settings.dark_mode);
                PGT.showMessage("settings-message", "Settings saved.", "success");
            } catch (error) {
                PGT.showMessage("settings-message", error.message, "error");
            } finally {
                submitButton.disabled = false;
            }
        });
    }

    loadSettings();
});
