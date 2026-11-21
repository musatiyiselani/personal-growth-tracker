document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("goal-form");
    const container = document.getElementById("goals-container");
    const emptyMessage = document.getElementById("no-goals");
    const submitButton = form ? form.querySelector('button[type="submit"]') : null;

    let goals = [];
    let editingGoalId = null;

    function setEditMode(goal) {
        editingGoalId = goal ? goal.id : null;
        submitButton.textContent = goal ? "Update Goal" : "Create Goal";
        if (!goal) {
            form.reset();
        }
    }

    function fillForm(goal) {
        document.getElementById("goal-title").value = goal.title;
        document.getElementById("goal-description").value = goal.description || "";
        document.getElementById("goal-category").value = goal.category;
        document.getElementById("goal-deadline").value = goal.deadline || "";
        document.getElementById("goal-target").value = goal.weekly_target;
        document.getElementById("goal-unit").value = goal.unit;
        setEditMode(goal);
        document.getElementById("goal-title").focus();
    }

    function statusLabel(status) {
        return status === "Completed" ? "Completed" : status === "In Progress" ? "In progress" : "Not started";
    }

    function renderGoals() {
        if (!goals.length) {
            emptyMessage.hidden = false;
            container.innerHTML = "";
            return;
        }
        emptyMessage.hidden = true;

        container.innerHTML = goals.map(goal => {
            const progress = Math.min(100, Math.max(0, Number(goal.progress) || 0));
            const milestones = (goal.milestones || []).map(milestone => `
                <li class="milestone-item">
                    <label>
                        <input type="checkbox" class="milestone-checkbox"
                            data-goal-id="${goal.id}" data-milestone-id="${milestone.id}"
                            ${milestone.completed ? "checked" : ""}>
                        ${PGT.escapeHTML(milestone.title)}
                    </label>
                    <button type="button" class="delete-milestone link-button"
                        data-goal-id="${goal.id}" data-milestone-id="${milestone.id}">Remove</button>
                </li>
            `).join("");

            return `
                <article class="goal-card" data-goal-card="${goal.id}">
                    <div class="goal-card-header">
                        <div>
                            <h3>${PGT.escapeHTML(goal.title)}</h3>
                            <p>${PGT.escapeHTML(goal.category)} &middot; ${statusLabel(goal.status)}</p>
                        </div>
                        <div class="goal-menu">
                            <button type="button" class="goal-menu-toggle" data-goal-id="${goal.id}" aria-label="Goal options">&#8943;</button>
                            <div class="goal-menu-items" hidden>
                                <button type="button" class="edit-goal" data-goal-id="${goal.id}">Edit</button>
                                <button type="button" class="delete-goal" data-goal-id="${goal.id}">Delete</button>
                            </div>
                        </div>
                    </div>

                    ${goal.description ? `<p>${PGT.escapeHTML(goal.description)}</p>` : ""}

                    <p>Weekly target: ${PGT.formatNumber(goal.weekly_target)} ${PGT.escapeHTML(goal.unit)}</p>
                    <p>Deadline: ${goal.deadline ? PGT.formatDate(goal.deadline) : "No deadline"}</p>

                    <div class="progress-track"><div class="progress-fill" style="width: ${progress}%"></div></div>
                    <p>${PGT.formatPercentage(progress)} complete</p>

                    <h4>Milestones</h4>
                    <ul class="milestone-list">${milestones || "<li>No milestones yet.</li>"}</ul>
                    <form class="milestone-form" data-goal-id="${goal.id}">
                        <input type="text" class="milestone-title" placeholder="Add a milestone" maxlength="200" required>
                        <button type="submit" class="secondary-button">Add</button>
                    </form>
                </article>
            `;
        }).join("");
    }

    async function loadGoals() {
        try {
            goals = await PGT.api.get("/goals/");
            renderGoals();
        } catch (error) {
            PGT.showPageError(error.message);
        }
    }

    // ----- Create and update goals ---------------------------------------------

    if (form) {
        form.addEventListener("submit", async function (event) {
            event.preventDefault();

            const title = document.getElementById("goal-title").value.trim();
            const description = document.getElementById("goal-description").value.trim();
            const category = document.getElementById("goal-category").value;
            const deadline = document.getElementById("goal-deadline").value;
            const target = Number(document.getElementById("goal-target").value);
            const unit = document.getElementById("goal-unit").value;

            if (!title || !category || !deadline || !(target > 0)) {
                PGT.showMessage("goal-message", "Please complete every field with a valid target.", "error");
                return;
            }

            const payload = {
                title,
                description: description || null,
                category,
                weekly_target: target,
                unit,
                deadline
            };

            submitButton.disabled = true;
            try {
                if (editingGoalId) {
                    await PGT.api.put(`/goals/${editingGoalId}`, payload);
                    PGT.showMessage("goal-message", "Goal updated.", "success");
                } else {
                    // The start date is set to today; the form does not ask for it.
                    await PGT.api.post("/goals/", { ...payload, start_date: PGT.getTodayDate() });
                    PGT.showMessage("goal-message", "Goal created.", "success");
                }
                setEditMode(null);
                await loadGoals();
            } catch (error) {
                PGT.showMessage("goal-message", error.message, "error");
            } finally {
                submitButton.disabled = false;
            }
        });
    }

    // ----- Goal and milestone actions (event delegation) ------------------------

    if (container) {
        container.addEventListener("click", async function (event) {
            const menuToggle = event.target.closest(".goal-menu-toggle");
            if (menuToggle) {
                const menu = menuToggle.nextElementSibling;
                const wasHidden = menu.hidden;
                document.querySelectorAll(".goal-menu-items").forEach(item => { item.hidden = true; });
                menu.hidden = !wasHidden;
                return;
            }

            const editButton = event.target.closest(".edit-goal");
            if (editButton) {
                document.querySelectorAll(".goal-menu-items").forEach(item => { item.hidden = true; });
                const goal = goals.find(item => String(item.id) === editButton.dataset.goalId);
                if (goal) {
                    fillForm(goal);
                }
                return;
            }

            const deleteGoalButton = event.target.closest(".delete-goal");
            if (deleteGoalButton) {
                if (!window.confirm("Delete this goal and its milestones?")) {
                    return;
                }
                try {
                    await PGT.api.delete(`/goals/${deleteGoalButton.dataset.goalId}`);
                    if (String(editingGoalId) === deleteGoalButton.dataset.goalId) {
                        setEditMode(null);
                    }
                    await loadGoals();
                } catch (error) {
                    PGT.showPageError(error.message);
                }
                return;
            }

            const deleteMilestoneButton = event.target.closest(".delete-milestone");
            if (deleteMilestoneButton) {
                try {
                    await PGT.api.delete(
                        `/goals/${deleteMilestoneButton.dataset.goalId}/milestones/${deleteMilestoneButton.dataset.milestoneId}`
                    );
                    await loadGoals();
                } catch (error) {
                    PGT.showPageError(error.message);
                }
            }
        });

        container.addEventListener("change", async function (event) {
            const checkbox = event.target.closest(".milestone-checkbox");
            if (!checkbox) {
                return;
            }
            try {
                await PGT.api.put(
                    `/goals/${checkbox.dataset.goalId}/milestones/${checkbox.dataset.milestoneId}`,
                    { completed: checkbox.checked }
                );
                await loadGoals();
            } catch (error) {
                checkbox.checked = !checkbox.checked;
                PGT.showPageError(error.message);
            }
        });

        container.addEventListener("submit", async function (event) {
            const milestoneForm = event.target.closest(".milestone-form");
            if (!milestoneForm) {
                return;
            }
            event.preventDefault();
            const input = milestoneForm.querySelector(".milestone-title");
            const title = input.value.trim();
            if (!title) {
                return;
            }
            try {
                await PGT.api.post(`/goals/${milestoneForm.dataset.goalId}/milestones`, { title });
                await loadGoals();
            } catch (error) {
                PGT.showPageError(error.message);
            }
        });
    }

    // Close open goal menus when the user clicks anywhere else.
    document.addEventListener("click", function (event) {
        if (!event.target.closest(".goal-menu")) {
            document.querySelectorAll(".goal-menu-items").forEach(item => { item.hidden = true; });
        }
    });

    loadGoals();
});
