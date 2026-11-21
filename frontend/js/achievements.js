document.addEventListener("DOMContentLoaded", async function () {
    const goalsCount = document.getElementById("achievement-goals-count");
    const milestonesCount = document.getElementById("achievement-milestones-count");
    const totalCount = document.getElementById("achievement-total-count");
    const goalsContainer = document.getElementById("completed-goals-container");
    const milestonesContainer = document.getElementById("completed-milestones-container");

    function renderCompletedGoals(completedGoals) {
        if (!completedGoals.length) {
            goalsContainer.innerHTML = "<p>No completed goals yet. Keep going!</p>";
            return;
        }
        goalsContainer.innerHTML = completedGoals.map(goal => `
            <article class="achievement-card">
                <h3>${PGT.escapeHTML(goal.title)}</h3>
                <p>${PGT.escapeHTML(goal.category)} &middot; Deadline: ${goal.deadline ? PGT.formatDate(goal.deadline) : "none"}</p>
            </article>
        `).join("");
    }

    function renderCompletedMilestones(milestones) {
        if (!milestones.length) {
            milestonesContainer.innerHTML = "<p>No completed milestones yet.</p>";
            return;
        }
        milestonesContainer.innerHTML = milestones.map(item => `
            <article class="achievement-card">
                <h3>${PGT.escapeHTML(item.title)}</h3>
                <p>${PGT.escapeHTML(item.goalTitle)}${item.completed_at ? ` &middot; Completed ${PGT.formatDate(item.completed_at)}` : ""}</p>
            </article>
        `).join("");
    }

    try {
        const goals = await PGT.api.get("/goals/");

        const completedGoals = goals.filter(goal => goal.status === "Completed");
        const completedMilestones = goals.flatMap(goal =>
            (goal.milestones || [])
                .filter(milestone => milestone.completed)
                .map(milestone => ({ ...milestone, goalTitle: goal.title }))
        );

        if (goalsCount) goalsCount.textContent = completedGoals.length;
        if (milestonesCount) milestonesCount.textContent = completedMilestones.length;
        if (totalCount) totalCount.textContent = completedGoals.length + completedMilestones.length;

        if (goalsContainer) renderCompletedGoals(completedGoals);
        if (milestonesContainer) renderCompletedMilestones(completedMilestones);
    } catch (error) {
        PGT.showPageError(error.message);
    }
});
