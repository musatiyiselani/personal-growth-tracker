
document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("activity-form");
    const goalSelect = document.getElementById("activity-goal");
    const dateInput = document.getElementById("activity-date");
    const container = document.getElementById("activities-container");
    const emptyMessage = document.getElementById("no-activities");
    const submitButton = form
        ? form.querySelector('button[type="submit"]')
        : null;

    // Editing elements
    const editModal = document.getElementById("edit-activity-modal");
    const editForm = document.getElementById("edit-activity-form");
    const editGoalSelect = document.getElementById("edit-activity-goal");
    const editTitle = document.getElementById("edit-activity-title");
    const editAmount = document.getElementById("edit-activity-amount");
    const editDate = document.getElementById("edit-activity-date");
    const editNotes = document.getElementById("edit-activity-notes");
    const editMessage = document.getElementById("edit-activity-message");
    const cancelEditButton = document.getElementById("cancel-edit-activity");

    let goals = [];
    let activities = [];
    let currentActivity = null;

    if (dateInput) {
        dateInput.value = PGT.getTodayDate();
        dateInput.max = PGT.getTodayDate();
    }

    editDate.max = PGT.getTodayDate();

    function populateGoalOptions(select) {
        if (!select) {
            return;
        }

        const previous = select.value;

        select.innerHTML =
            '<option value="">No related goal</option>' +
            goals.map(goal =>
                `<option value="${goal.id}">
                    ${PGT.escapeHTML(goal.title)}
                    (${PGT.escapeHTML(goal.category)})
                </option>`
            ).join("");

        if (previous) {
            select.value = previous;
        }
    }

    function renderActivities(activityList) {
        activities = activityList;

        if (!activities.length) {
            emptyMessage.hidden = false;
            container.innerHTML = "";
            return;
        }

        emptyMessage.hidden = true;

        container.innerHTML = activities.map(activity => {
            const amount = activity.duration === null
                ? "No duration recorded"
                : `${PGT.formatNumber(activity.duration)}
                   ${PGT.escapeHTML(activity.unit)}`;

            return `
                <article class="activity-card">
                    <div class="activity-card-header">
                        <div>
                            <h3>${PGT.escapeHTML(activity.title)}</h3>

                            <p>
                                ${PGT.escapeHTML(activity.category)}
                                &middot; ${amount}
                            </p>

                            <p>
                                ${PGT.formatDate(activity.activity_date)}
                            </p>
                        </div>

                        <div class="activity-actions">
                            <button
                                type="button"
                                class="edit-activity link-button"
                                data-activity-id="${activity.id}"
                            >
                                Edit
                            </button>

                            <button
                                type="button"
                                class="delete-activity link-button"
                                data-activity-id="${activity.id}"
                            >
                                Delete
                            </button>
                        </div>
                    </div>

                    ${
                        activity.description
                            ? `<p>${PGT.escapeHTML(activity.description)}</p>`
                            : ""
                    }
                </article>
            `;
        }).join("");
    }

    async function loadActivities() {
        try {
            const activityList = await PGT.api.get("/activities/");
            renderActivities(activityList);
        } catch (error) {
            PGT.showPageError(error.message);
        }
    }

    async function loadGoals() {
        try {
            goals = await PGT.api.get("/goals/");

            populateGoalOptions(goalSelect);
            populateGoalOptions(editGoalSelect);
        } catch (error) {
            PGT.showPageError(error.message);
        }
    }

    // ----- Create activity (existing functionality) ---------------------

    if (form) {
        form.addEventListener("submit", async function (event) {
            event.preventDefault();

            const selectedGoalId = goalSelect.value;

            const goal = selectedGoalId
                ? goals.find(item => String(item.id) === selectedGoalId)
                : null;

            const title = document
                .getElementById("activity-title")
                .value.trim();

            const amount = Number(
                document.getElementById("activity-amount").value
            );

            const notes = document
                .getElementById("activity-notes")
                .value.trim();

            const date = dateInput.value;

            if (selectedGoalId && !goal) {
                PGT.showMessage(
                    "activity-message",
                    "The selected goal could not be found.",
                    "error"
                );
                return;
            }

            if (!title || !(amount > 0) || !date) {
                PGT.showMessage(
                    "activity-message",
                    "Please enter a title, a positive amount, and a date.",
                    "error"
                );
                return;
            }

            const payload = {
                title: title,
                description: notes || null,
                goal_id: goal ? goal.id : null,
                category: goal ? goal.category : "Other",
                duration: amount,
                unit: goal ? goal.unit : "repetitions",
                activity_date: date
            };

            submitButton.disabled = true;

            try {
                await PGT.api.post("/activities/", payload);

                PGT.showMessage(
                    "activity-message",
                    "Activity logged successfully.",
                    "success"
                );

                form.reset();

                dateInput.value = PGT.getTodayDate();

                populateGoalOptions(goalSelect);

                await loadActivities();

            } catch (error) {
                PGT.showMessage(
                    "activity-message",
                    error.message,
                    "error"
                );
            } finally {
                submitButton.disabled = false;
            }
        });
    }

    // ----- Open editing modal --------------------------------------------

    function openEditModal(activity) {
        currentActivity = activity;

        populateGoalOptions(editGoalSelect);

        editTitle.value = activity.title || "";
        editAmount.value = activity.duration ?? "";
        editDate.value = activity.activity_date
            ? activity.activity_date.slice(0, 10)
            : "";
        editNotes.value = activity.description || "";
        editGoalSelect.value = activity.goal_id
            ? String(activity.goal_id)
            : "";

        PGT.showMessage("edit-activity-message", "", "success");

        editModal.showModal();
    }

    if (container) {
        container.addEventListener("click", async function (event) {
            const editButton = event.target.closest(".edit-activity");
            const deleteButton = event.target.closest(".delete-activity");

            // Edit activity
            if (editButton) {
                const activity = activities.find(
                    item => String(item.id) === editButton.dataset.activityId
                );

                if (activity) {
                    openEditModal(activity);
                }

                return;
            }

            // Delete activity (existing functionality)
            if (deleteButton) {
                if (!window.confirm("Delete this activity?")) {
                    return;
                }

                try {
                    await PGT.api.delete(
                        `/activities/${deleteButton.dataset.activityId}`
                    );

                    await loadActivities();

                } catch (error) {
                    PGT.showPageError(error.message);
                }
            }
        });
    }

    // ----- Save edited activity -----------------------------------------

    editForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        if (!currentActivity) {
            return;
        }

        const selectedGoalId = editGoalSelect.value;

        const goal = selectedGoalId
            ? goals.find(item => String(item.id) === selectedGoalId)
            : null;

        const title = editTitle.value.trim();
        const amount = Number(editAmount.value);
        const date = editDate.value;
        const notes = editNotes.value.trim();

        if (selectedGoalId && !goal) {
            PGT.showMessage(
                "edit-activity-message",
                "The selected goal could not be found.",
                "error"
            );
            return;
        }

        if (!title || !(amount > 0) || !date) {
            PGT.showMessage(
                "edit-activity-message",
                "Please enter a title, a positive amount, and a date.",
                "error"
            );
            return;
        }

        if (date > PGT.getTodayDate()) {
            PGT.showMessage(
                "edit-activity-message",
                "Activity dates cannot be in the future.",
                "error"
            );
            return;
        }

        const payload = {
            title: title,
            description: notes || null,
            goal_id: goal ? goal.id : null,
            category: goal ? goal.category : currentActivity.category,
            duration: amount,
            unit: goal ? goal.unit : currentActivity.unit,
            activity_date: date
        };

        const saveButton = editForm.querySelector('button[type="submit"]');
        saveButton.disabled = true;

        try {
            await PGT.api.put(
                `/activities/${currentActivity.id}`,
                payload
            );

            editModal.close();
            currentActivity = null;

            await loadActivities();

        } catch (error) {
            PGT.showMessage(
                "edit-activity-message",
                error.message,
                "error"
            );
        } finally {
            saveButton.disabled = false;
        }
    });

    cancelEditButton.addEventListener("click", function () {
        editModal.close();
        currentActivity = null;
    });

    loadGoals();
    loadActivities();
});
