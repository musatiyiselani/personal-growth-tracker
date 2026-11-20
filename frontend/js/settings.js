
/* =====================================================
   PERSONAL GROWTH TRACKER
   Application Settings
===================================================== */

document.addEventListener("DOMContentLoaded", function () {

    const form = document.getElementById("settings-form");

    const themeSelect = document.getElementById("theme-setting");
    const notificationsCheckbox = document.getElementById("notifications-setting");
    const weekStartSelect = document.getElementById("week-start");

    const settings = PGT.getStoredData("settings", {
        theme: "light",
        notifications: false,
        weekStart: "monday"
    });


    // Apply the selected theme.

    function applyTheme(theme) {
        if (theme === "dark") {
            document.body.classList.add("dark-mode");
        } else {
            document.body.classList.remove("dark-mode");
        }
    }


    // Load saved preferences.

    if (themeSelect) {
        themeSelect.value = settings.theme;
    }

    if (notificationsCheckbox) {
        notificationsCheckbox.checked = settings.notifications;
    }

    if (weekStartSelect) {
        weekStartSelect.value = settings.weekStart;
    }

    applyTheme(settings.theme);


    // Apply theme immediately when changed.

    if (themeSelect) {
        themeSelect.addEventListener("change", function () {
            applyTheme(themeSelect.value);
        });
    }


    // Save settings.

    if (form) {
        form.addEventListener("submit", function (event) {
            event.preventDefault();

            const updatedSettings = {
                theme: themeSelect.value,
                notifications: notificationsCheckbox.checked,
                weekStart: weekStartSelect.value
            };

            PGT.saveStoredData("settings", updatedSettings);

            applyTheme(updatedSettings.theme);

            PGT.showMessage("settings-message", "Settings saved successfully!");
        });
    }

});
