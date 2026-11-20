
/* =====================================================
   PERSONAL GROWTH TRACKER
   Achievements
===================================================== */

document.addEventListener("DOMContentLoaded", function () {

    const goals = PGT.updateGoalStatuses();

    const completedGoals = goals.filter(
        goal => goal.status === "completed"
    );

    const completedMilestones = [];

    goals.forEach(goal => {
        (goal.milestones || []).forEach(milestone => {
            if (milestone.completed) {
                completedMilestones.push({
                    ...milestone,
                    goalTitle: goal.title
                });
            }
        });
    });

    const totalAchievements =
        completedGoals.length + completedMilestones.length;


    // Update statistics.

    document.getElementById("achievement-goals-count").textContent =
        completedGoals.length;

    document.getElementById("achievement-milestones-count").textContent =
        completedMilestones.length;

    document.getElementById("achievement-total-count").textContent =
        totalAchievements;


    // Display completed goals.

    const goalsContainer = document.getElementById(
        "completed-goals-container"
    );

    if (goalsContainer) {
        goalsContainer.innerHTML = completedGoals.length
            ? completedGoals.map(goal => `
                <article class="achievement-card">
                    <div class="achievement-icon">🏆</div>
                    <div>
                        <h3>${PGT.escapeHTML(goal.title)}</h3>
                        <p>${PGT.escapeHTML(goal.category)}</p>
                        <p>100% completed</p>
                    </div>
                </article>
            `).join("")
            : "<p>No completed goals yet. Keep going!</p>";
    }


    // Display completed milestones.

    const milestonesContainer = document.getElementById(
        "completed-milestones-container"
    );

    if (milestonesContainer) {
        milestonesContainer.innerHTML = completedMilestones.length
            ? completedMilestones.map(milestone => `
                <article class="achievement-card">
                    <div class="achievement-icon">⭐</div>
                    <div>
                        <h3>${PGT.escapeHTML(milestone.title)}</h3>
                        <p>Goal: ${PGT.escapeHTML(milestone.goalTitle)}</p>
                    </div>
                </article>
            `).join("")
            : "<p>No completed milestones yet.</p>";
    }

});
