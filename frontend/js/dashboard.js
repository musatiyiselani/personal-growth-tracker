document.addEventListener("DOMContentLoaded", async function () {
    const activeCount = document.getElementById("active-goals-count");
    const completedCount = document.getElementById("completed-goals-count");
    const activitiesCount = document.getElementById("activities-count");
    const overallProgress = document.getElementById("overall-progress");
    const goalsContainer = document.getElementById("dashboard-goals");
    const activitiesContainer = document.getElementById("dashboard-activities");

    const categories = ["Education", "Web Development", "Personal Growth", "Other"];

    function renderCategoryBars(goals) {
        categories.forEach(category => {
            const bar = document.querySelector(`.progress-fill[data-category="${category}"]`);
            const label = document.querySelector(`[data-category-text="${category}"]`);
            const categoryGoals = goals.filter(goal => goal.category === category);
            const progress = PGT.averageProgress(categoryGoals);

            if (bar) {
                bar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
            }
            if (label) {
                label.textContent = PGT.formatPercentage(progress);
            }
        });
    }

    function renderGoals(goals) {
        if (!goalsContainer) {
            return;
        }
        if (!goals.length) {
            goalsContainer.innerHTML = "<p>No goals yet. Create one on the My Goals page.</p>";
            return;
        }

        // The API returns goals newest first, so the first five are the most recent.
        goalsContainer.innerHTML = goals.slice(0, 5).map(goal => `
            <article class="goal-card">
                <h3>${PGT.escapeHTML(goal.title)}</h3>
                <p>${PGT.escapeHTML(goal.category)} &middot; ${PGT.escapeHTML(goal.status)}</p>
                <div class="progress-track"><div class="progress-fill" style="width: ${Math.min(100, Math.max(0, goal.progress))}%"></div></div>
                <p>${PGT.formatPercentage(goal.progress)} complete</p>
            </article>
        `).join("");
    }

    function renderActivities(activities) {
        if (!activitiesContainer) {
            return;
        }
        if (!activities.length) {
            activitiesContainer.innerHTML = "<p>No activities logged yet.</p>";
            return;
        }

        activitiesContainer.innerHTML = activities.slice(0, 5).map(activity => {
            const amount = activity.duration === null
                ? "No duration recorded"
                : `${PGT.formatNumber(activity.duration)} ${PGT.escapeHTML(activity.unit)}`;

            return `
                <article class="activity-card">
                    <h3>${PGT.escapeHTML(activity.title)}</h3>
                    <p>${PGT.escapeHTML(activity.category)} &middot; ${amount}</p>
                    <p>${PGT.formatDate(activity.activity_date)}</p>
                </article>
            `;
        }).join("");
    }

    try {
        const [goals, activities] = await Promise.all([
            PGT.api.get("/goals/"),
            PGT.api.get("/activities/")
        ]);

        const completed = goals.filter(goal => goal.status === "Completed");
        const active = goals.filter(goal => goal.status !== "Completed");

        if (activeCount) activeCount.textContent = active.length;
        if (completedCount) completedCount.textContent = completed.length;
        if (activitiesCount) activitiesCount.textContent = activities.length;
        if (overallProgress) overallProgress.textContent = PGT.formatPercentage(PGT.averageProgress(goals));

        renderCategoryBars(goals);
        renderGoals(goals);
        renderActivities(activities);
    } catch (error) {
        PGT.showPageError(error.message);
    }
});
