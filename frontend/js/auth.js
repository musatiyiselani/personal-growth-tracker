document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const forgotForm = document.getElementById("forgot-password-form");

    // ----- Login -----------------------------------------------------------------

    if (loginForm) {
        loginForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            const email = document.getElementById("email").value.trim();
            const password = document.getElementById("password").value;
            const remember = document.getElementById("remember-me")?.checked ?? false;
            const submitButton = loginForm.querySelector('button[type="submit"]');

            submitButton.disabled = true;
            PGT.showMessage("login-message", "Logging in...", "success");

            try {
                // The login endpoint expects form fields; "username" holds the email address.
                const form = new URLSearchParams();
                form.set("username", email);
                form.set("password", password);

                const data = await PGT.api.postForm("/users/login", form, { auth: false });
                PGT.saveSession(data.access_token, data.user, remember);

                try {
                    const settings = await PGT.api.get("/profile/settings");
                    PGT.setDarkMode(settings.dark_mode);
                } catch (error) {
                    // Theme sync is optional; continue to the dashboard.
                }

                window.location.href = "dashboard.html";
            } catch (error) {
                PGT.showMessage("login-message", error.message, "error");
                submitButton.disabled = false;
            }
        });
    }

    // ----- Registration ------------------------------------------------------------

    if (registerForm) {
        registerForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            const name = document.getElementById("name").value.trim();
            const email = document.getElementById("email").value.trim().toLowerCase();
            const password = document.getElementById("password").value;
            const confirmPassword = document.getElementById("confirm-password").value;
            const termsAccepted = document.getElementById("terms").checked;
            const submitButton = registerForm.querySelector('button[type="submit"]');

            if (password !== confirmPassword) {
                PGT.showMessage("register-message", "The passwords do not match.", "error");
                return;
            }
            if (password.length < 8) {
                PGT.showMessage("register-message", "Your password must be at least 8 characters.", "error");
                return;
            }
            if (!termsAccepted) {
                PGT.showMessage("register-message", "Please accept the terms to continue.", "error");
                return;
            }

            submitButton.disabled = true;
            try {
                await PGT.api.post("/users/register", { name, email, password }, { auth: false });
                PGT.showMessage("register-message", "Your account has been created. Redirecting to login...", "success");
                setTimeout(() => {
                    window.location.href = "index.html";
                }, 1200);
            } catch (error) {
                PGT.showMessage("register-message", error.message, "error");
                submitButton.disabled = false;
            }
        });
    }

    // ----- Forgot password ----------------------------------------------------------

    if (forgotForm) {
        forgotForm.addEventListener("submit", function (event) {
            event.preventDefault();
            PGT.showMessage(
                "forgot-password-message",
                "Password reset by email is not available yet. Please contact the app owner for help.",
                "error"
            );
        });
    }
});
