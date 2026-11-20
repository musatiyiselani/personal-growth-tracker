
/* =====================================================
   PERSONAL GROWTH TRACKER
   Goal Management
===================================================== */

document.addEventListener("DOMContentLoaded", function () {

    const form = document.getElementById("goal-form");
    const container = document.getElementById("goals-container");
    const emptyMessage = document.getElementById("no-goals");

    let editingGoalId = null;

    function getGoals() {
        return PGT.getStoredData("goals", []);
    }

    // Display goals and milestones.

    function renderGoals() {
        const goals = PGT.updateGoalStatuses();

        if (!container) return;

        if (emptyMessage) {
            emptyMessage.style.display = goals.length ? "none" : "block";
        }

        container.innerHTML = goals.map(goal => {
            const progress = PGT.calculateGoalProgress(goal);
            const milestones = goal.milestones || [];

            return `
                <article class="goal-card">

                    <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">

                        <h3>${PGT.escapeHTML(goal.title)}</h3>

                        <div style="position:relative;">

                            <button
                                type="button"
                                class="goal-menu-toggle"
                                aria-label="Goal options"
                                aria-expanded="false"
                                style="border:none; background:transparent; font-size:24px; cursor:pointer; padding:4px 10px;"
                            >⋮</button>

                            <div
                                class="goal-menu"
                                hidden
                                style="position:absolute; right:0; top:100%; z-index:10; background:var(--card-bg, white); border:1px solid var(--border-color, #ddd); border-radius:8px; padding:6px; min-width:110px; box-shadow:0 4px 12px rgba(0,0,0,0.12);"
                            >
                                <button
                                    type="button"
                                    class="delete-goal"
                                    data-id="${goal.id}"
                                    style="width:100%; border:none; background:transparent; color:#dc3545; padding:9px; text-align:left; cursor:pointer;"
                                >Delete</button>
                            </div>

                        </div>

                    </div>

                    <p>${PGT.escapeHTML(goal.description || "")}</p>
                    <p>Category: ${PGT.escapeHTML(goal.category)}</p>
                    <p>Deadline: ${PGT.formatDate(goal.deadline)}</p>
                    <p>Weekly target: ${PGT.escapeHTML(goal.target)} ${PGT.escapeHTML(goal.unit)}</p>
                    <p>Status: ${PGT.escapeHTML(goal.status || "active")}</p>

                    <p>Progress: ${progress}%</p>

                    <div class="progress-track">
                        <div class="progress-fill" style="width:${progress}%"></div>
                    </div>

                    <div class="milestone-list">
                        <h4>Milestones</h4>

                        ${milestones.map(milestone => `
                            <div class="milestone-item">
                                <label>
                                    <input
                                        type="checkbox"
                                        class="milestone-checkbox"
                                        data-goal-id="${goal.id}"
                                        data-milestone-id="${milestone.id}"
                                        ${milestone.completed ? "checked" : ""}
                                    >
                                    ${PGT.escapeHTML(milestone.title)}
                                </label>

                                <button
                                    type="button"
                                    class="delete-button delete-milestone"
                                    data-goal-id="${goal.id}"
                                    data-milestone-id="${milestone.id}"
                                >Remove</button>
                            </div>
                        `).join("")}
                    </div>

                    <div class="milestone-form">
                        <input
                            type="text"
                            class="new-milestone"
                            data-goal-id="${goal.id}"
                            placeholder="Add a milestone"
                        >

                        <button
                            type="button"
                            class="secondary-button add-milestone"
                            data-goal-id="${goal.id}"
                        >Add Milestone</button>
                    </div>

                    <div class="goal-actions">
                        <button
                            type="button"
                            class="edit-button edit-goal"
                            data-id="${goal.id}"
                        >Edit</button>
                    </div>

                </article>
            `;
        }).join("");
    }

    // Create or update a goal.

    if (form) {
        form.addEventListener("submit", function (event) {
            event.preventDefault();

            const goals = getGoals();

            const goalData = {
                title: document.getElementById("goal-title").value.trim(),
                description: document.getElementById("goal-description").value.trim(),
                category: document.getElementById("goal-category").value,
                deadline: document.getElementById("goal-deadline").value,
                target: Number(document.getElementById("goal-target").value),
                unit: document.getElementById("goal-unit").value
            };

            if (
                !goalData.title ||
                !goalData.category ||
                !goalData.deadline ||
                goalData.target <= 0
            ) {
                PGT.showMessage(
                    "goal-message",
                    "Please complete all required fields.",
                    "error"
                );
                return;
            }

            if (editingGoalId) {
                const index = goals.findIndex(
                    goal => String(goal.id) === String(editingGoalId)
                );

                if (index !== -1) {
                    goals[index] = {
                        ...goals[index],
                        ...goalData
                    };
                }

                editingGoalId = null;

            } else {
                goals.push({
                    id: PGT.generateId(),
                    ...goalData,
                    milestones: [],
                    status: "active",
                    createdAt: PGT.getTodayDate()
                });
            }

            PGT.saveStoredData("goals", goals);
            PGT.updateGoalStatuses();

            form.reset();

            form.querySelector('button[type="submit"]').textContent = "Create Goal";

            PGT.showMessage("goal-message", "Goal saved successfully!");

            renderGoals();
        });
    }

    // Handle goal and milestone buttons.

    if (container) {
        container.addEventListener("click", function (event) {

            const button = event.target.closest("button");

            if (!button || !container.contains(button)) return;

            // Open or close the goal three-dot menu.

            if (button.classList.contains("goal-menu-toggle")) {

                const menu = button.nextElementSibling;
                const isOpening = menu.hidden;

                container.querySelectorAll(".goal-menu").forEach(item => {
                    item.hidden = true;
                });

                container.querySelectorAll(".goal-menu-toggle").forEach(item => {
                    item.setAttribute("aria-expanded", "false");
                });

                if (isOpening) {
                    menu.hidden = false;
                    button.setAttribute("aria-expanded", "true");
                }

                return;
            }

            // Delete a goal.

            if (button.classList.contains("delete-goal")) {

                const goalId = button.dataset.id;

                if (!confirm("Are you sure you want to delete this goal?")) {
                    return;
                }

                const goals = getGoals().filter(
                    goal => String(goal.id) !== String(goalId)
                );

                PGT.saveStoredData("goals", goals);
                PGT.updateGoalStatuses();
                renderGoals();

                return;
            }

            // Edit a goal.

            if (button.classList.contains("edit-goal")) {

                const goalId = button.dataset.id;

                const goal = getGoals().find(
                    item => String(item.id) === String(goalId)
                );

                if (!goal || !form) return;

                document.getElementById("goal-title").value = goal.title;
                document.getElementById("goal-description").value = goal.description || "";
                document.getElementById("goal-category").value = goal.category;
                document.getElementById("goal-deadline").value = goal.deadline;
                document.getElementById("goal-target").value = goal.target;
                document.getElementById("goal-unit").value = goal.unit;

                editingGoalId = goal.id;

                form.querySelector('button[type="submit"]').textContent = "Update Goal";

                form.scrollIntoView({
                    behavior: "smooth"
                });

                return;
            }

            // Add a milestone.

            if (button.classList.contains("add-milestone")) {

                const goalId = button.dataset.goalId;

                const input = container.querySelector(
                    `.new-milestone[data-goal-id="${goalId}"]`
                );

                if (!input) return;

                const title = input.value.trim();

                if (!title) {
                    alert("Enter a milestone name first.");
                    return;
                }

                const goals = getGoals();

                const goal = goals.find(
                    item => String(item.id) === String(goalId)
                );

                if (!goal) return;

                if (!goal.milestones) {
                    goal.milestones = [];
                }

                goal.milestones.push({
                    id: PGT.generateId(),
                    title: title,
                    completed: false
                });

                PGT.saveStoredData("goals", goals);
                renderGoals();

                return;
            }

            // Delete a milestone using the original Remove button.

            if (button.classList.contains("delete-milestone")) {

                const goalId = button.dataset.goalId;
                const milestoneId = button.dataset.milestoneId;

                const goals = getGoals();

                const goal = goals.find(
                    item => String(item.id) === String(goalId)
                );

                if (!goal) return;

                goal.milestones = (goal.milestones || []).filter(
                    milestone => String(milestone.id) !== String(milestoneId)
                );

                PGT.saveStoredData("goals", goals);
                PGT.updateGoalStatuses();
                renderGoals();

                return;
            }
        });

        // Mark milestones as completed or incomplete.

        container.addEventListener("change", function (event) {

            if (!event.target.classList.contains("milestone-checkbox")) {
                return;
            }

            const goalId = event.target.dataset.goalId;
            const milestoneId = event.target.dataset.milestoneId;

            const goals = getGoals();

            const goal = goals.find(
                item => String(item.id) === String(goalId)
            );

            if (!goal) return;

            const milestone = (goal.milestones || []).find(
                item => String(item.id) === String(milestoneId)
            );

            if (milestone) {
                milestone.completed = event.target.checked;
            }

            PGT.saveStoredData("goals", goals);
            PGT.updateGoalStatuses();
            renderGoals();
        });
    }

    renderGoals();

});
