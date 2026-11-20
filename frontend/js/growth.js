
/* =====================================================
   PERSONAL GROWTH TRACKER
   Growth History and Charts
===================================================== */

document.addEventListener("DOMContentLoaded", function () {

    const canvas = document.getElementById("growth-chart");
    const periodSelect = document.getElementById("chart-period");
    const emptyMessage = document.getElementById("chart-empty-message");
    const categoryContainer = document.getElementById("growth-history-categories");

    if (!canvas) return;

    const context = canvas.getContext("2d");

    const periods = {
        "1day": 1,
        "7days": 7,
        "1month": 30,
        "90days": 90,
        "365days": 365
    };

    function getFilteredHistory() {
        const history = PGT.getStoredData("growthHistory", []);

        const period = periodSelect?.value || "7days";

        const validHistory = history
            .filter(entry =>
                entry &&
                entry.date &&
                Number.isFinite(Number(entry.progress))
            )
            .sort((a, b) => a.date.localeCompare(b.date));

        if (period === "lifetime") {
            return validHistory;
        }

        const days = periods[period] || 7;

        const cutoff = new Date();
        cutoff.setHours(0, 0, 0, 0);
        cutoff.setDate(cutoff.getDate() - days + 1);

        return validHistory.filter(entry => {
            const entryDate = new Date(entry.date + "T00:00:00");
            return !isNaN(entryDate) && entryDate >= cutoff;
        });
    }

    function drawChart() {
        const history = getFilteredHistory();

        const width = canvas.clientWidth || 600;
        const height = 280;
        const ratio = window.devicePixelRatio || 1;

        canvas.width = width * ratio;
        canvas.height = height * ratio;

        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.clearRect(0, 0, width, height);

        // Show the empty message only when no records exist.

        if (history.length === 0) {
            if (emptyMessage) {
                emptyMessage.style.display = "block";
            }
            return;
        }

        if (emptyMessage) {
            emptyMessage.style.display = "none";
        }

        const padding = {
            left: 45,
            right: 25,
            top: 25,
            bottom: 40
        };

        const graphWidth = width - padding.left - padding.right;
        const graphHeight = height - padding.top - padding.bottom;

        // Draw horizontal grid lines.

        context.strokeStyle = "#e2e8f0";
        context.lineWidth = 1;
        context.font = "11px Arial";

        for (let i = 0; i <= 4; i++) {
            const y = padding.top + (graphHeight / 4) * i;

            context.beginPath();
            context.moveTo(padding.left, y);
            context.lineTo(width - padding.right, y);
            context.stroke();

            context.fillStyle = "#718096";
            context.fillText(`${100 - i * 25}%`, 3, y + 4);
        }

        // Calculate graph points.

        const firstDate = new Date(history[0].date + "T00:00:00");
        const lastDate = new Date(history[history.length - 1].date + "T00:00:00");

        const dateRange = Math.max(
            1,
            (lastDate - firstDate) / (1000 * 60 * 60 * 24)
        );

        const points = history.map(entry => {
            const date = new Date(entry.date + "T00:00:00");

            const datePosition = history.length === 1
                ? 0.5
                : (date - firstDate) / (dateRange * 24 * 60 * 60 * 1000);

            const progress = Math.max(
                0,
                Math.min(100, Number(entry.progress))
            );

            return {
                x: padding.left + datePosition * graphWidth,
                y: padding.top + graphHeight - (progress / 100) * graphHeight,
                date: entry.date,
                progress
            };
        });

        // Draw the progress line.

        if (points.length > 1) {
            context.beginPath();

            points.forEach((point, index) => {
                if (index === 0) {
                    context.moveTo(point.x, point.y);
                } else {
                    context.lineTo(point.x, point.y);
                }
            });

            context.strokeStyle = "#398bd1";
            context.lineWidth = 3;
            context.stroke();
        }

        // Draw the progress points, including a single record.

        points.forEach(point => {
            context.beginPath();
            context.arc(point.x, point.y, 5, 0, Math.PI * 2);
            context.fillStyle = "#245586";
            context.fill();

            context.fillStyle = "#245586";
            context.font = "bold 11px Arial";
            context.textAlign = "center";
            context.fillText(
                `${Math.round(point.progress)}%`,
                point.x,
                point.y - 12
            );
        });

        // Display date labels.

        context.fillStyle = "#718096";
        context.font = "11px Arial";
        context.textAlign = "left";

        context.fillText(
            PGT.formatDate(points[0].date),
            padding.left,
            height - 8
        );

        if (points.length > 1) {
            const lastDateLabel = PGT.formatDate(
                points[points.length - 1].date
            );

            context.textAlign = "right";

            context.fillText(
                lastDateLabel,
                width - padding.right,
                height - 8
            );
        }
    }

    // Display progress by growth area.

    function renderCategories() {
        if (!categoryContainer) return;

        const goals = PGT.updateGoalStatuses();

        const categories = [
            "Education",
            "Web Development",
            "Personal Growth",
            "Other"
        ];

        categoryContainer.innerHTML = categories.map(category => {

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
                        <div
                            class="progress-fill"
                            style="width:${progress}%"
                        ></div>
                    </div>

                    <p class="growth-percentage">
                        ${PGT.formatPercentage(progress)}
                    </p>
                </article>
            `;
        }).join("");
    }

    if (periodSelect) {
        periodSelect.addEventListener("change", drawChart);
    }

    window.addEventListener("resize", drawChart);

    PGT.saveProgressSnapshot();

    drawChart();
    renderCategories();

});
