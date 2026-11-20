
/* =====================================================
   PERSONAL GROWTH TRACKER
   Dashboard
===================================================== */

document.addEventListener("DOMContentLoaded", function () {

    const goals = PGT.updateGoalStatuses();
    const activities = PGT.getStoredData("activities", []);

    const activeGoals = goals.filter(
        goal => goal.status !== "completed"
    );

    const completedGoals = goals.filter(
        goal => goal.status === "completed"
    );

    const overallProgress = goals.length > 0
        ? goals.reduce((total, goal) => {
            return total + PGT.calculateGoalProgress(goal);
        }, 0) / goals.length
        : 0;

    document.getElementById("active-goals-count").textContent =
        activeGoals.length;

    document.getElementById("completed-goals-count").textContent =
        completedGoals.length;

    document.getElementById("activities-count").textContent =
        activities.length;

    document.getElementById("overall-progress").textContent =
        PGT.formatPercentage(overallProgress);


    // Growth area progress.

    const categories = [
        "Education",
        "Web Development",
        "Personal Growth",
        "Other"
    ];

    categories.forEach(category => {

        const categoryGoals = goals.filter(
            goal => goal.category === category
        );

        const progress = categoryGoals.length > 0
            ? categoryGoals.reduce((total, goal) => {
                return total + PGT.calculateGoalProgress(goal);
            }, 0) / categoryGoals.length
            : 0;

        const bar = document.querySelector(
            `.progress-fill[data-category="${category}"]`
        );

        const percentage = document.querySelector(
            `[data-category-text="${category}"]`
        );

        if (bar) {
            bar.style.width = `${progress}%`;
        }

        if (percentage) {
            percentage.textContent = PGT.formatPercentage(progress);
        }
    });


    // Recent goals.

    const goalsContainer = document.getElementById("dashboard-goals");

    if (goalsContainer) {
        const recentGoals = [...goals].slice(-5).reverse();

        goalsContainer.innerHTML = recentGoals.length
            ? recentGoals.map(goal => `
                <article class="goal-card">
                    <h3>${PGT.escapeHTML(goal.title)}</h3>
                    <p>${PGT.escapeHTML(goal.category)}</p>
                    <p>Progress: ${PGT.calculateGoalProgress(goal)}%</p>
                    <div class="progress-track">
                        <div class="progress-fill" style="width:${PGT.calculateGoalProgress(goal)}%"></div>
                    </div>
                </article>
            `).join("")
            : "<p>No goals available yet.</p>";
    }


    // Recent activities.

    const activitiesContainer = document.getElementById("dashboard-activities");

    if (activitiesContainer) {
        const recentActivities = [...activities]
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 5);

        activitiesContainer.innerHTML = recentActivities.length
            ? recentActivities.map(activity => `
                <article class="activity-card">
                    <h3>${PGT.escapeHTML(activity.title)}</h3>
                    <p>${PGT.escapeHTML(activity.amount)} ${PGT.escapeHTML(activity.unit || "")}</p>
                    <p>${PGT.formatDate(activity.date)}</p>
                </article>
            `).join("")
            : "<p>No activities recorded yet.</p>";
    }

});
