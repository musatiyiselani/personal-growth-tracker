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

    let pictureObjectUrl = null;

    function renderAccountInfo(user) {
        accountInfo.innerHTML = `
            <p><strong>Email:</strong> ${PGT.escapeHTML(user.email)}</p>
            <p><strong>Member since:</strong> ${PGT.formatDate(user.created_at)}</p>
        `;
    }

    function fillForm(user) {
        nameInput.value = user.name;
        emailInput.value = user.email;
        bioInput.value = user.bio || "";
        renderAccountInfo(user);
    }

    function releasePictureUrl() {
        if (pictureObjectUrl) {
            URL.revokeObjectURL(pictureObjectUrl);
            pictureObjectUrl = null;
        }
    }

    // The picture is private, so it is fetched with the sign-in token and shown from a
    // temporary local URL. A plain <img src="..."> cannot send the token.
    async function renderPicture(hasPicture) {
        releasePictureUrl();
        if (!hasPicture) {
            preview.hidden = true;
            preview.removeAttribute("src");
            return;
        }
        try {
            const blob = await PGT.api.get("/profile/picture", { blob: true });
            pictureObjectUrl = URL.createObjectURL(blob);
            preview.src = pictureObjectUrl;
            preview.hidden = false;
        } catch (error) {
            preview.hidden = true;
            PGT.showMessage("picture-message", error.message, "error");
        }
    }

    async function loadProfile() {
        try {
            const user = await PGT.api.get("/profile/");
            PGT.setCurrentUser(user);
            fillForm(user);
            await renderPicture(Boolean(user.profile_picture));
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
                await PGT.api.postForm("/profile/picture", formData);
                pictureInput.value = "";
                await renderPicture(true);
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
                await renderPicture(false);
                PGT.showMessage("picture-message", "Profile picture removed.", "success");
            } catch (error) {
                PGT.showMessage("picture-message", error.message, "error");
            }
        });
    }

    loadProfile();
});
