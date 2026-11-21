document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("profile-form");
    const nameInput = document.getElementById("profile-name");
    const emailInput = document.getElementById("profile-email");
    const bioInput = document.getElementById("profile-bio");
    const accountInfo = document.getElementById("profile-account-info");
    const preview = document.getElementById("profile-picture-preview");
    const pictureInput = document.getElementById("profile-picture-input");
    const uploadButton = document.getElementById("upload-picture");
    const removeButton = document.getElementById("remove-picture");

    function renderAccountInfo(user) {
        accountInfo.innerHTML = `
            <p><strong>Email:</strong> ${PGT.escapeHTML(user.email)}</p>
            <p><strong>Member since:</strong> ${PGT.formatDate(user.created_at)}</p>
        `;
    }

    function renderPicture(path) {
        if (!path) {
            preview.hidden = true;
            preview.removeAttribute("src");
            return;
        }
        // Cache-busting query so a replaced picture shows immediately.
        preview.src = `${PGT.API_BASE}${path}?t=${Date.now()}`;
        preview.hidden = false;
    }

    function fillForm(user) {
        nameInput.value = user.name;
        emailInput.value = user.email;
        bioInput.value = user.bio || "";
        renderAccountInfo(user);
        renderPicture(user.profile_picture);
    }

    async function loadProfile() {
        try {
            const user = await PGT.api.get("/profile/");
            PGT.setCurrentUser(user);
            fillForm(user);
        } catch (error) {
            PGT.showPageError(error.message);
        }
    }

    if (form) {
        form.addEventListener("submit", async function (event) {
            event.preventDefault();

            const submitButton = form.querySelector('button[type="submit"]');
            const payload = {
                name: nameInput.value.trim(),
                email: emailInput.value.trim().toLowerCase(),
                bio: bioInput.value.trim()
            };

            if (!payload.name || !payload.email) {
                PGT.showMessage("profile-message", "Name and email are required.", "error");
                return;
            }

            submitButton.disabled = true;
            try {
                const user = await PGT.api.put("/profile/", payload);
                PGT.setCurrentUser(user);
                fillForm(user);
                PGT.showMessage("profile-message", "Your profile has been updated.", "success");
            } catch (error) {
                PGT.showMessage("profile-message", error.message, "error");
            } finally {
                submitButton.disabled = false;
            }
        });
    }

    if (uploadButton) {
        uploadButton.addEventListener("click", async function () {
            const file = pictureInput.files[0];
            if (!file) {
                PGT.showMessage("picture-message", "Please choose an image first.", "error");
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                PGT.showMessage("picture-message", "The picture must be 5 MB or smaller.", "error");
                return;
            }

            const formData = new FormData();
            formData.append("file", file);

            uploadButton.disabled = true;
            try {
                const data = await PGT.api.postForm("/profile/picture", formData);
                renderPicture(data.profile_picture);
                pictureInput.value = "";
                PGT.showMessage("picture-message", "Profile picture uploaded.", "success");
            } catch (error) {
                PGT.showMessage("picture-message", error.message, "error");
            } finally {
                uploadButton.disabled = false;
            }
        });
    }

    if (removeButton) {
        removeButton.addEventListener("click", async function () {
            try {
                await PGT.api.delete("/profile/picture");
                renderPicture(null);
                PGT.showMessage("picture-message", "Profile picture removed.", "success");
            } catch (error) {
                PGT.showMessage("picture-message", error.message, "error");
            }
        });
    }

    loadProfile();
});
