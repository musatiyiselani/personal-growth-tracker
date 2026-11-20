
/* =====================================================
   PERSONAL GROWTH TRACKER
   Daily Reflections
===================================================== */

document.addEventListener("DOMContentLoaded", function () {

    const form = document.getElementById("reflection-form");
    const container = document.getElementById("reflections-container");
    const dateInput = document.getElementById("reflection-date");

    function getReflections() {
        const stored = PGT.getStoredData("dailyReflection", []);

        let reflections = [];

        if (Array.isArray(stored)) {
            reflections = stored;
        } else if (stored && typeof stored === "object") {
            if (Array.isArray(stored.reflections)) {
                reflections = stored.reflections;
            } else if (stored.date) {
                reflections = [stored];
            } else {
                reflections = Object.values(stored).filter(
                    item => item && typeof item === "object" && item.date
                );
            }
        }

        PGT.saveStoredData("dailyReflection", reflections);

        return reflections;
    }

    if (dateInput) {
        dateInput.value = PGT.getTodayDate();
    }

    // Display saved reflections.

    function renderReflections() {
        if (!container) return;

        const reflections = getReflections();

        const sorted = [...reflections].sort(
            (a, b) => b.date.localeCompare(a.date)
        );

        container.innerHTML = sorted.length
            ? sorted.map(reflection => `
                <article class="reflection-card">

                    <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">

                        <h3>${PGT.formatDate(reflection.date)}</h3>

                        <div style="position:relative;">
                            <button
                                type="button"
                                class="reflection-menu-toggle"
                                aria-label="Reflection options"
                                aria-expanded="false"
                                style="border:none; background:transparent; font-size:24px; cursor:pointer; padding:4px 10px;"
                            >⋮</button>

                            <div
                                class="reflection-menu"
                                hidden
                                style="position:absolute; right:0; top:100%; z-index:10; background:var(--card-bg, white); border:1px solid var(--border-color, #ddd); border-radius:8px; padding:6px; min-width:110px; box-shadow:0 4px 12px rgba(0,0,0,0.12);"
                            >
                                <button
                                    type="button"
                                    class="delete-reflection"
                                    data-date="${reflection.date}"
                                    style="width:100%; border:none; background:transparent; color:#dc3545; padding:9px; text-align:left; cursor:pointer;"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>

                    </div>

                    <p><strong>Accomplishments:</strong></p>
                    <p>${PGT.escapeHTML(reflection.accomplishments || "Nothing recorded.")}</p>

                    <p><strong>What I learned:</strong></p>
                    <p>${PGT.escapeHTML(reflection.learning || "Nothing recorded.")}</p>

                    <p><strong>Improvements:</strong></p>
                    <p>${PGT.escapeHTML(reflection.improvement || "Nothing recorded.")}</p>

                </article>
            `).join("")
            : "<p>No reflections recorded yet.</p>";
    }

    // Load an existing reflection when its date is selected.

    if (dateInput) {
        dateInput.addEventListener("change", function () {

            const reflections = getReflections();

            const reflection = reflections.find(
                item => item.date === dateInput.value
            );

            document.getElementById("accomplishments").value =
                reflection?.accomplishments || "";

            document.getElementById("learning").value =
                reflection?.learning || "";

            document.getElementById("improvement").value =
                reflection?.improvement || "";
        });
    }

    // Save or update a reflection.

    if (form) {
        form.addEventListener("submit", function (event) {
            event.preventDefault();

            const date = dateInput.value;

            const reflection = {
                date,
                accomplishments: document.getElementById("accomplishments").value.trim(),
                learning: document.getElementById("learning").value.trim(),
                improvement: document.getElementById("improvement").value.trim()
            };

            if (
                !reflection.accomplishments &&
                !reflection.learning &&
                !reflection.improvement
            ) {
                PGT.showMessage(
                    "reflection-message",
                    "Please write something before saving.",
                    "error"
                );
                return;
            }

            const reflections = getReflections();

            const existingIndex = reflections.findIndex(
                item => item.date === date
            );

            if (existingIndex >= 0) {
                reflections[existingIndex] = reflection;
            } else {
                reflections.push(reflection);
            }

            PGT.saveStoredData("dailyReflection", reflections);

            PGT.showMessage(
                "reflection-message",
                "Your reflection has been saved!"
            );

            renderReflections();
        });
    }

    // Handle three-dot menu and deletion.

    if (container) {
        container.addEventListener("click", function (event) {

            const toggle = event.target.closest(".reflection-menu-toggle");

            if (toggle) {
                const menu = toggle.nextElementSibling;
                const isOpening = menu.hidden;

                container.querySelectorAll(".reflection-menu").forEach(item => {
                    item.hidden = true;
                });

                container.querySelectorAll(".reflection-menu-toggle").forEach(item => {
                    item.setAttribute("aria-expanded", "false");
                });

                if (isOpening) {
                    menu.hidden = false;
                    toggle.setAttribute("aria-expanded", "true");
                }

                return;
            }

            const deleteButton = event.target.closest(".delete-reflection");

            if (deleteButton) {
                if (!confirm("Are you sure you want to delete this reflection?")) {
                    return;
                }

                const date = deleteButton.dataset.date;

                const reflections = getReflections().filter(
                    item => item.date !== date
                );

                PGT.saveStoredData("dailyReflection", reflections);

                renderReflections();
            }
        });
    }

    renderReflections();

});
