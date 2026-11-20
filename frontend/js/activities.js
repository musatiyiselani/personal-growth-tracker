
/* =====================================================
   PERSONAL GROWTH TRACKER
   Activity Tracking
===================================================== */

document.addEventListener("DOMContentLoaded", function () {

    const form = document.getElementById("activity-form");
    const container = document.getElementById("activities-container");
    const goalSelect = document.getElementById("activity-goal");
    const emptyMessage = document.getElementById("no-activities");
    const dateInput = document.getElementById("activity-date");

    if (dateInput) {
        dateInput.value = PGT.getTodayDate();
    }

    // Load goals into the dropdown.

    function loadGoals() {
        if (!goalSelect) return;

        const goals = PGT.getStoredData("goals", []);

        goalSelect.innerHTML = `
            <option value="">Select a goal</option>
            ${goals.map(goal => `
                <option value="${goal.id}">
                    ${PGT.escapeHTML(goal.title)}
                </option>
            `).join("")}
        `;
    }

    // Display recorded activities.

    function renderActivities() {
        if (!container) return;

        const activities = PGT.getStoredData("activities", []);

        const sortedActivities = [...activities].sort(
            (a, b) => b.date.localeCompare(a.date)
        );

        if (emptyMessage) {
            emptyMessage.style.display = activities.length ? "none" : "block";
        }

        container.innerHTML = sortedActivities.map(activity => {

            const goal = PGT.getStoredData("goals", []).find(
                item => item.id === activity.goalId
            );

            return `
                <article class="activity-card">

                    <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">

                        <h3>${PGT.escapeHTML(activity.title)}</h3>

                        <div style="position:relative;">

                            <button
                                type="button"
                                class="activity-menu-toggle"
                                aria-label="Activity options"
                                aria-expanded="false"
                                style="border:none; background:transparent; font-size:24px; cursor:pointer; padding:4px 10px;"
                            >⋮</button>

                            <div
                                class="activity-menu"
                                hidden
                                style="position:absolute; right:0; top:100%; z-index:10; background:var(--card-bg, white); border:1px solid var(--border-color, #ddd); border-radius:8px; padding:6px; min-width:110px; box-shadow:0 4px 12px rgba(0,0,0,0.12);"
                            >
                                <button
                                    type="button"
                                    class="delete-activity"
                                    data-id="${activity.id}"
                                    style="width:100%; border:none; background:transparent; color:#dc3545; padding:9px; text-align:left; cursor:pointer;"
                                >
                                    Delete
                                </button>
                            </div>

                        </div>

                    </div>

                    <p>Goal: ${PGT.escapeHTML(goal?.title || "Deleted goal")}</p>

                    <p>
                        Amount: ${PGT.escapeHTML(activity.amount)}
                        ${PGT.escapeHTML(activity.unit || "")}
                    </p>

                    <p>Date: ${PGT.formatDate(activity.date)}</p>

                    <p>${PGT.escapeHTML(activity.notes || "")}</p>

                </article>
            `;

        }).join("");
    }

    // Save a new activity.

    if (form) {
        form.addEventListener("submit", function (event) {
            event.preventDefault();

            const goalId = goalSelect.value;
            const goals = PGT.getStoredData("goals", []);

            const goal = goals.find(item => item.id === goalId);

            if (!goal) {
                PGT.showMessage(
                    "activity-message",
                    "Please select a valid goal.",
                    "error"
                );
                return;
            }

            const activity = {
                id: PGT.generateId(),
                goalId,
                title: document.getElementById("activity-title").value.trim(),
                amount: Number(document.getElementById("activity-amount").value),
                unit: goal.unit,
                date: dateInput.value,
                notes: document.getElementById("activity-notes").value.trim()
            };

            if (
                !activity.title ||
                activity.amount <= 0 ||
                !activity.date
            ) {
                PGT.showMessage(
                    "activity-message",
                    "Please enter valid activity details.",
                    "error"
                );
                return;
            }

            const activities = PGT.getStoredData("activities", []);

            activities.push(activity);

            PGT.saveStoredData("activities", activities);
            PGT.updateGoalStatuses();

            form.reset();
            dateInput.value = PGT.getTodayDate();

            PGT.showMessage(
                "activity-message",
                "Activity recorded successfully!"
            );

            renderActivities();
        });
    }

    // Handle three-dot menu and activity deletion.

    if (container) {
        container.addEventListener("click", function (event) {

            const toggle = event.target.closest(".activity-menu-toggle");

            if (toggle) {
                const menu = toggle.nextElementSibling;
                const isOpening = menu.hidden;

                container.querySelectorAll(".activity-menu").forEach(item => {
                    item.hidden = true;
                });

                container.querySelectorAll(".activity-menu-toggle").forEach(item => {
                    item.setAttribute("aria-expanded", "false");
                });

                if (isOpening) {
                    menu.hidden = false;
                    toggle.setAttribute("aria-expanded", "true");
                }

                return;
            }

            const deleteButton = event.target.closest(".delete-activity");

            if (deleteButton) {

                if (!confirm("Delete this activity?")) return;

                const id = deleteButton.dataset.id;

                const activities = PGT.getStoredData("activities", []).filter(
                    activity => String(activity.id) !== String(id)
                );

                PGT.saveStoredData("activities", activities);
                PGT.updateGoalStatuses();

                renderActivities();
            }

        });
    }

    loadGoals();
    renderActivities();

});
