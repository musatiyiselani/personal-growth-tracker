
/* =====================================================
   PERSONAL GROWTH TRACKER
   Authentication
===================================================== */

document.addEventListener("DOMContentLoaded", function () {

    const users = () => PGT.getStoredData("users", []);

    // REGISTRATION

    const registerForm = document.getElementById("register-form");

    if (registerForm) {
        registerForm.addEventListener("submit", function (event) {
            event.preventDefault();

            const name = document.getElementById("name").value.trim();
            const email = document.getElementById("email").value.trim().toLowerCase();
            const password = document.getElementById("password").value;
            const confirmPassword = document.getElementById("confirm-password").value;
            const terms = document.getElementById("terms").checked;

            if (password.length < 8) {
                PGT.showMessage("register-message", "Password must contain at least 8 characters.", "error");
                return;
            }

            if (password !== confirmPassword) {
                PGT.showMessage("register-message", "Passwords do not match.", "error");
                return;
            }

            if (!terms) {
                PGT.showMessage("register-message", "Please accept the terms and conditions.", "error");
                return;
            }

            const existingUser = users().find(user => user.email === email);

            if (existingUser) {
                PGT.showMessage("register-message", "An account with this email already exists.", "error");
                return;
            }

            const newUser = {
                id: PGT.generateId(),
                name,
                email,
                password,
                bio: "",
                createdAt: new Date().toISOString()
            };

            const updatedUsers = users();
            updatedUsers.push(newUser);

            PGT.saveStoredData("users", updatedUsers);

            PGT.showMessage("register-message", "Account created successfully! Redirecting to login...");

            registerForm.reset();

            setTimeout(() => {
                window.location.href = "index.html";
            }, 1200);
        });
    }


    // LOGIN

    const loginForm = document.getElementById("login-form");

    if (loginForm) {
        loginForm.addEventListener("submit", function (event) {
            event.preventDefault();

            const email = document.getElementById("email").value.trim().toLowerCase();
            const password = document.getElementById("password").value;

            const user = users().find(account =>
                account.email === email &&
                account.password === password
            );

            if (!user) {
                PGT.showMessage("login-message", "Incorrect email address or password.", "error");
                return;
            }

            const currentUser = {
                id: user.id,
                name: user.name,
                email: user.email,
                bio: user.bio || ""
            };

            PGT.saveStoredData("currentUser", currentUser);

            PGT.showMessage("login-message", "Login successful! Redirecting...");

            window.location.href = "dashboard.html";
        });
    }


    // PASSWORD RECOVERY DEMONSTRATION

    const forgotForm = document.getElementById("forgot-password-form");

    if (forgotForm) {
        forgotForm.addEventListener("submit", function (event) {
            event.preventDefault();

            const email = document.getElementById("email").value.trim().toLowerCase();

            const user = users().find(account => account.email === email);

            if (!user) {
                PGT.showMessage("forgot-password-message", "No account was found with that email address.", "error");
                return;
            }

            PGT.showMessage(
                "forgot-password-message",
                "Your account was found. Password reset emails will be enabled when the backend is connected."
            );

            forgotForm.reset();
        });
    }

});
