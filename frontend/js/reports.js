
/* =====================================================
   PERSONAL GROWTH TRACKER
   Reports
===================================================== */

document.addEventListener("DOMContentLoaded", function () {

    const generateButton = document.getElementById("generate-report");

    function generateReport() {

        const period = document.getElementById("report-period").value;

        const activities = PGT.getStoredData("activities", []);
        const goals = PGT.updateGoalStatuses();

        const today = new Date();
        today.setHours(23, 59, 59, 999);

        const days = {
            week: 7,
            month: 30,
            year: 365
        };

        let filteredActivities = activities;

        if (period !== "all") {
            const cutoff = new Date();
            cutoff.setHours(0, 0, 0, 0);
            cutoff.setDate(cutoff.getDate() - days[period] + 1);

            filteredActivities = activities.filter(activity => {
                const date = new Date(`${activity.date}T00:00:00`);

                return date >= cutoff && date <= today;
            });
        }

        const completedGoals = goals.filter(
            goal => goal.status === "completed"
        );

        const averageProgress = goals.length
            ? goals.reduce((total, goal) => {
                return total + PGT.calculateGoalProgress(goal);
            }, 0) / goals.length
            : 0;


        // Update report statistics.

        document.getElementById("report-activities-count").textContent =
            filteredActivities.length;

        document.getElementById("report-completed-goals").textContent =
            completedGoals.length;

        document.getElementById("report-average-progress").textContent =
            PGT.formatPercentage(averageProgress);


        // Generate summary.

        const summary = document.getElementById("report-summary");

        summary.innerHTML = `
            <p><strong>Reporting period:</strong> ${period === "all" ? "All time" : period}</p>
            <p><strong>Activities recorded:</strong> ${filteredActivities.length}</p>
            <p><strong>Goals created:</strong> ${goals.length}</p>
            <p><strong>Goals completed:</strong> ${completedGoals.length}</p>
            <p><strong>Average goal progress:</strong> ${PGT.formatPercentage(averageProgress)}</p>
        `;


        // Growth area breakdown.

        const categories = [
            "Education",
            "Web Development",
            "Personal Growth",
            "Other"
        ];

        const breakdown = document.getElementById(
            "report-growth-breakdown"
        );

        breakdown.innerHTML = categories.map(category => {

            const categoryGoals = goals.filter(
                goal => goal.category === category
            );

            const progress = categoryGoals.length
                ? categoryGoals.reduce((total, goal) => {
                    return total + PGT.calculateGoalProgress(goal);
                }, 0) / categoryGoals.length
                : 0;

            return `
                <article class="growth-card">
                    <h3>${category}</h3>
                    <div class="progress-track">
                        <div class="progress-fill" style="width:${progress}%"></div>
                    </div>
                    <p class="growth-percentage">${PGT.formatPercentage(progress)}</p>
                    <p>${categoryGoals.length} goals</p>
                </article>
            `;
        }).join("");
    }


    if (generateButton) {
        generateButton.addEventListener("click", generateReport);
    }

    generateReport();

});
