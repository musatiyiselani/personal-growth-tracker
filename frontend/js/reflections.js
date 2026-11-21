document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("reflection-form");
    const dateInput = document.getElementById("reflection-date");
    const moodInput = document.getElementById("reflection-mood");
    const contentInput = document.getElementById("reflection-content");
    const container = document.getElementById("reflections-container");
    const submitButton = form ? form.querySelector('button[type="submit"]') : null;

    let reflections = [];
    let editingId = null;

    if (dateInput) {
        dateInput.value = PGT.getTodayDate();
        dateInput.max = PGT.getTodayDate(); // reflections cannot be written for future dates
    }

    // Loads the saved reflection for the selected date, if there is one.
    function fillFormForDate() {
        const existing = reflections.find(item => item.reflection_date === dateInput.value);
        editingId = existing ? existing.id : null;
        contentInput.value = existing ? existing.content : "";
        moodInput.value = existing && existing.mood ? existing.mood : "";
        submitButton.textContent = existing ? "Update Reflection" : "Save Reflection";
    }

    function renderReflections() {
        if (!reflections.length) {
            container.innerHTML = "<p>No reflections yet.</p>";
            return;
        }

        container.innerHTML = reflections.map(item => `
            <article class="reflection-card">
                <div class="reflection-card-header">
                    <div>
                        <h3>${PGT.formatDate(item.reflection_date)}</h3>
                        <p>Mood: ${item.mood ? PGT.escapeHTML(item.mood) : "Not specified"}</p>
                    </div>
                    <div>
                        <button type="button" class="edit-reflection link-button" data-reflection-id="${item.id}">Edit</button>
                        <button type="button" class="delete-reflection link-button" data-reflection-id="${item.id}">Delete</button>
                    </div>
                </div>
                <p style="white-space: pre-line;">${PGT.escapeHTML(item.content)}</p>
            </article>
        `).join("");
    }

    async function loadReflections() {
        try {
            // Normally one reflection per date. If there are several, the first one listed is used.
            reflections = await PGT.api.get("/reflections/");
            renderReflections();
            fillFormForDate();
        } catch (error) {
            PGT.showPageError(error.message);
        }
    }

    if (dateInput) {
        dateInput.addEventListener("change", fillFormForDate);
    }

    if (form) {
        form.addEventListener("submit", async function (event) {
            event.preventDefault();

            const content = contentInput.value.trim();
            const date = dateInput.value;
            const mood = moodInput.value || null;

            if (!content || !date) {
                PGT.showMessage("reflection-message", "Please choose a date and write your reflection.", "error");
                return;
            }

            const payload = { content, mood, reflection_date: date };

            submitButton.disabled = true;
            try {
                if (editingId) {
                    await PGT.api.put(`/reflections/${editingId}`, payload);
                    PGT.showMessage("reflection-message", "Reflection updated.", "success");
                } else {
                    await PGT.api.post("/reflections/", payload);
                    PGT.showMessage("reflection-message", "Reflection saved.", "success");
                }
                await loadReflections();
            } catch (error) {
                PGT.showMessage("reflection-message", error.message, "error");
            } finally {
                submitButton.disabled = false;
            }
        });
    }

    if (container) {
        container.addEventListener("click", async function (event) {
            const editButton = event.target.closest(".edit-reflection");
            if (editButton) {
                const item = reflections.find(entry => String(entry.id) === editButton.dataset.reflectionId);
                if (item) {
                    dateInput.value = item.reflection_date;
                    fillFormForDate();
                    contentInput.focus();
                    window.scrollTo({ top: 0, behavior: "smooth" });
                }
                return;
            }

            const deleteButton = event.target.closest(".delete-reflection");
            if (deleteButton) {
                if (!window.confirm("Delete this reflection?")) {
                    return;
                }
                try {
                    await PGT.api.delete(`/reflections/${deleteButton.dataset.reflectionId}`);
                    await loadReflections();
                } catch (error) {
                    PGT.showPageError(error.message);
                }
            }
        });
    }

    loadReflections();
});
