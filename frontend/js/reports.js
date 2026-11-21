document.addEventListener("DOMContentLoaded", function () {
    const periodSelect = document.getElementById("report-period");
    const generateButton = document.getElementById("generate-report");
    const downloadButton = document.getElementById("download-report-pdf");
    const activitiesCount = document.getElementById("report-activities-count");
    const completedGoals = document.getElementById("report-completed-goals");
    const averageProgress = document.getElementById("report-average-progress");
    const summaryContainer = document.getElementById("report-summary");
    const breakdownContainer = document.getElementById("report-growth-breakdown");

    const CATEGORIES = ["Education", "Web Development", "Personal Growth", "Other"];
    const PERIOD_LABELS = {
        week: "Last 7 days",
        month: "Last 30 days",
        year: "Last 12 months",
        all: "All time"
    };
    const DAYS_BACK = { week: 6, month: 29, year: 364 };

    function currentRange() {
        const period = periodSelect.value;
        return {
            period,
            startDate: period === "all" ? "2000-01-01" : PGT.dateOffset(DAYS_BACK[period] ?? 6),
            endDate: PGT.getTodayDate()
        };
    }

    function renderSummary(data, period) {
        const summary = data.summary;
        summaryContainer.innerHTML = `
            <p><strong>Reporting period:</strong> ${PERIOD_LABELS[period]}</p>
            <ul>
                <li>Goals tracked: ${summary.total_goals}</li>
                <li>Milestones completed: ${summary.completed_milestones} of ${summary.total_milestones}</li>
                <li>Activity amount recorded: ${PGT.formatNumber(summary.activity_duration)} (mixed units across goals)</li>
                <li>Reflections written: ${summary.total_reflections}</li>
                <li>Achievements recorded: ${summary.total_achievements}</li>
            </ul>
        `;
    }

    function renderBreakdown(data) {
        breakdownContainer.innerHTML = CATEGORIES.map(category => {
            const goals = data.goals.filter(goal => goal.category === category);
            const progress = Math.min(100, Math.max(0, PGT.averageProgress(goals)));
            const activity = data.growth_by_category.find(item => item.category === category);
            const amount = activity ? PGT.formatNumber(activity.activity_duration) : "0";

            return `
                <article class="growth-area-card">
                    <h3>${category}</h3>
                    <p>${goals.length} goal${goals.length === 1 ? "" : "s"} &middot; ${PGT.formatPercentage(progress)} average progress</p>
                    <p>${amount} recorded in this period</p>
                </article>
            `;
        }).join("");
    }

    async function generateReport() {
        const { period, startDate, endDate } = currentRange();
        generateButton.disabled = true;
        try {
            const data = await PGT.api.get(`/reports/?start_date=${startDate}&end_date=${endDate}`);
            activitiesCount.textContent = data.summary.total_activities;
            completedGoals.textContent = data.summary.completed_goals;
            averageProgress.textContent = PGT.formatPercentage(data.summary.overall_progress);
            renderSummary(data, period);
            renderBreakdown(data);
        } catch (error) {
            PGT.showPageError(error.message);
        } finally {
            generateButton.disabled = false;
        }
    }

    async function downloadPdf() {
        const { startDate, endDate } = currentRange();
        downloadButton.disabled = true;
        try {
            // The PDF needs the Authorization header, so it is fetched as a file and saved from a blob URL.
            const blob = await PGT.api.get(`/reports/pdf?start_date=${startDate}&end_date=${endDate}`, { blob: true });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `personal-growth-report-${endDate}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (error) {
            PGT.showPageError(error.message);
        } finally {
            downloadButton.disabled = false;
        }
    }

    if (generateButton) {
        generateButton.addEventListener("click", generateReport);
    }
    if (downloadButton) {
        downloadButton.addEventListener("click", downloadPdf);
    }
});
