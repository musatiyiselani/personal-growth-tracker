document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("activity-form");
    const goalSelect = document.getElementById("activity-goal");
    const dateInput = document.getElementById("activity-date");
    const container = document.getElementById("activities-container");
    const emptyMessage = document.getElementById("no-activities");
    const submitButton = form ? form.querySelector('button[type="submit"]') : null;

    let goals = [];

    if (dateInput) {
        dateInput.value = PGT.getTodayDate();
        dateInput.max = PGT.getTodayDate(); // activities cannot be logged for future dates
    }

    function populateGoalOptions() {
        if (!goalSelect) {
            return;
        }
        const previous = goalSelect.value;
        goalSelect.innerHTML = '<option value="">Select a goal</option>' + goals.map(goal =>
            `<option value="${goal.id}">${PGT.escapeHTML(goal.title)} (${PGT.escapeHTML(goal.category)})</option>`
        ).join("");
        if (previous) {
            goalSelect.value = previous;
        }
    }

    function renderActivities(activities) {
        if (!activities.length) {
            emptyMessage.hidden = false;
            container.innerHTML = "";
            return;
        }
        emptyMessage.hidden = true;

        container.innerHTML = activities.map(activity => {
            const amount = activity.duration === null
                ? "No duration recorded"
                : `${PGT.formatNumber(activity.duration)} ${PGT.escapeHTML(activity.unit)}`;

            return `
                <article class="activity-card">
                    <div class="activity-card-header">
                        <div>
                            <h3>${PGT.escapeHTML(activity.title)}</h3>
                            <p>${PGT.escapeHTML(activity.category)} &middot; ${amount}</p>
                            <p>${PGT.formatDate(activity.activity_date)}</p>
                        </div>
                        <button type="button" class="delete-activity link-button" data-activity-id="${activity.id}">Delete</button>
                    </div>
                    ${activity.description ? `<p>${PGT.escapeHTML(activity.description)}</p>` : ""}
                </article>
            `;
        }).join("");
    }

    async function loadActivities() {
        try {
            const activities = await PGT.api.get("/activities/");
            renderActivities(activities);
        } catch (error) {
            PGT.showPageError(error.message);
        }
    }

    async function loadGoals() {
        try {
            goals = await PGT.api.get("/goals/");
            populateGoalOptions();
        } catch (error) {
            PGT.showPageError(error.message);
        }
    }

    if (form) {
        form.addEventListener("submit", async function (event) {
            event.preventDefault();

            const goal = goals.find(item => String(item.id) === goalSelect.value);
            const title = document.getElementById("activity-title").value.trim();
            const amount = Number(document.getElementById("activity-amount").value);
            const notes = document.getElementById("activity-notes").value.trim();
            const date = dateInput.value;

            if (!goal) {
                PGT.showMessage("activity-message", "Please choose a goal.", "error");
                return;
            }
            if (!title || !(amount > 0) || !date) {
                PGT.showMessage("activity-message", "Please enter a title, a positive amount, and a date.", "error");
                return;
            }

            const payload = {
                title,
                description: notes || null,
                category: goal.category,
                duration: amount,
                unit: goal.unit,
                activity_date: date
            };

            submitButton.disabled = true;
            try {
                await PGT.api.post("/activities/", payload);
                PGT.showMessage("activity-message", "Activity logged.", "success");
                form.reset();
                dateInput.value = PGT.getTodayDate();
                populateGoalOptions();
                await loadActivities();
            } catch (error) {
                PGT.showMessage("activity-message", error.message, "error");
            } finally {
                submitButton.disabled = false;
            }
        });
    }

    if (container) {
        container.addEventListener("click", async function (event) {
            const button = event.target.closest(".delete-activity");
            if (!button) {
                return;
            }
            if (!window.confirm("Delete this activity?")) {
                return;
            }
            try {
                await PGT.api.delete(`/activities/${button.dataset.activityId}`);
                await loadActivities();
            } catch (error) {
                PGT.showPageError(error.message);
            }
        });
    }

    loadGoals();
    loadActivities();
});
