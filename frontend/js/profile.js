
/* =====================================================
   PERSONAL GROWTH TRACKER
   User Profile
===================================================== */

document.addEventListener("DOMContentLoaded", function () {

    const form = document.getElementById("profile-form");

    const currentUser = PGT.getCurrentUser();

    if (!currentUser) {
        window.location.href = "index.html";
        return;
    }


    // Load profile information.

    document.getElementById("profile-name").value =
        currentUser.name || "";

    document.getElementById("profile-email").value =
        currentUser.email || "";

    document.getElementById("profile-bio").value =
        currentUser.bio || "";


    // Display account information.

    const accountInfo = document.getElementById(
        "profile-account-info"
    );

    if (accountInfo) {
        const users = PGT.getStoredData("users", []);

        const userAccount = users.find(
            user => user.id === currentUser.id
        );

        accountInfo.innerHTML = `
            <p><strong>Account email:</strong> ${PGT.escapeHTML(currentUser.email)}</p>
            <p><strong>Member since:</strong> ${
                userAccount?.createdAt
                    ? PGT.formatDate(userAccount.createdAt.substring(0, 10))
                    : "Not available"
            }</p>
        `;
    }


    // Save changes.

    if (form) {
        form.addEventListener("submit", function (event) {
            event.preventDefault();

            const name = document.getElementById("profile-name").value.trim();
            const email = document.getElementById("profile-email").value.trim().toLowerCase();
            const bio = document.getElementById("profile-bio").value.trim();

            if (!name || !email) {
                PGT.showMessage("profile-message", "Name and email are required.", "error");
                return;
            }

            const users = PGT.getStoredData("users", []);

            const emailInUse = users.some(user =>
                user.email === email && user.id !== currentUser.id
            );

            if (emailInUse) {
                PGT.showMessage("profile-message", "That email address is already in use.", "error");
                return;
            }

            const userIndex = users.findIndex(
                user => user.id === currentUser.id
            );

            if (userIndex === -1) {
                PGT.showMessage("profile-message", "Account not found.", "error");
                return;
            }

            users[userIndex] = {
                ...users[userIndex],
                name,
                email,
                bio
            };

            const updatedUser = {
                id: currentUser.id,
                name,
                email,
                bio
            };

            PGT.saveStoredData("users", users);
            PGT.saveStoredData("currentUser", updatedUser);

            PGT.showMessage("profile-message", "Profile updated successfully!");

            const updatedInfo = document.getElementById("profile-account-info");

            if (updatedInfo) {
                updatedInfo.innerHTML = `
                    <p><strong>Account email:</strong> ${PGT.escapeHTML(email)}</p>
                    <p><strong>Member since:</strong> ${
                        users[userIndex].createdAt
                            ? PGT.formatDate(users[userIndex].createdAt.substring(0, 10))
                            : "Not available"
                    }</p>
                `;
            }
        });
    }

});
