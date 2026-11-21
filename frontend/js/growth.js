document.addEventListener("DOMContentLoaded", function () {
    const periodSelect = document.getElementById("chart-period");
    const canvas = document.getElementById("growth-chart");
    const emptyMessage = document.getElementById("chart-empty-message");
    const categoriesContainer = document.getElementById("growth-history-categories");
    const context = canvas ? canvas.getContext("2d") : null;

    const CHART_HEIGHT = 320;
    const CATEGORIES = ["Education", "Web Development", "Personal Growth", "Other"];

    // Returns the first day of the period as "YYYY-MM-DD". The end date is always today.
    function startDateFor(period) {
        const daysBack = {
            "1day": 0,
            "7days": 6,
            "1month": 29,
            "90days": 89,
            "365days": 364
        };
        if (period === "lifetime") {
            return "2000-01-01";
        }
        return PGT.dateOffset(daysBack[period] ?? 6);
    }

    function resizeCanvas() {
        const ratio = window.devicePixelRatio || 1;
        const width = canvas.clientWidth;
        canvas.width = width * ratio;
        canvas.height = CHART_HEIGHT * ratio;
        canvas.style.height = `${CHART_HEIGHT}px`;
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    function drawChart(history, startDate, endDate) {
        resizeCanvas();
        const width = canvas.clientWidth;
        const padding = { top: 24, right: 20, bottom: 36, left: 44 };
        const plotWidth = width - padding.left - padding.right;
        const plotHeight = CHART_HEIGHT - padding.top - padding.bottom;

        context.clearRect(0, 0, width, CHART_HEIGHT);

        // Horizontal gridlines and percentage labels
        context.font = "12px sans-serif";
        context.fillStyle = "#666";
        context.strokeStyle = "#d9d9d9";
        context.lineWidth = 1;
        for (let level = 0; level <= 100; level += 25) {
            const y = padding.top + plotHeight - (level / 100) * plotHeight;
            context.beginPath();
            context.moveTo(padding.left, y);
            context.lineTo(padding.left + plotWidth, y);
            context.stroke();
            context.textAlign = "right";
            context.fillText(`${level}%`, padding.left - 8, y + 4);
        }

        if (!history.length) {
            return;
        }

        const first = new Date(`${startDate}T00:00:00`).getTime();
        const last = new Date(`${endDate}T00:00:00`).getTime();
        const range = Math.max(last - first, 1);

        const points = history.map(entry => {
            const time = new Date(`${entry.date}T00:00:00`).getTime();
            return {
                x: padding.left + ((time - first) / range) * plotWidth,
                y: padding.top + plotHeight - (Math.min(100, Math.max(0, entry.progress)) / 100) * plotHeight,
                label: entry.date,
                value: entry.progress
            };
        });

        context.strokeStyle = "#1c4e80";
        context.lineWidth = 2;
        context.beginPath();
        points.forEach((point, index) => {
            if (index === 0) {
                context.moveTo(point.x, point.y);
            } else {
                context.lineTo(point.x, point.y);
            }
        });
        context.stroke();

        context.fillStyle = "#1c4e80";
        points.forEach(point => {
            context.beginPath();
            context.arc(point.x, point.y, 4, 0, Math.PI * 2);
            context.fill();
        });

        // Date labels at the start and end of the plotted range
        context.fillStyle = "#666";
        context.textAlign = "left";
        context.fillText(PGT.formatDate(points[0].label), padding.left, CHART_HEIGHT - 12);
        context.textAlign = "right";
        context.fillText(PGT.formatDate(points[points.length - 1].label), padding.left + plotWidth, CHART_HEIGHT - 12);
    }

    function renderCategories(goals, growthByCategory) {
        categoriesContainer.innerHTML = CATEGORIES.map(category => {
            const categoryGoals = goals.filter(goal => goal.category === category);
            const progress = Math.min(100, Math.max(0, PGT.averageProgress(categoryGoals)));
            const activity = growthByCategory.find(item => item.category === category);
            const units = activity ? PGT.formatNumber(activity.activity_duration) : "0";

            return `
                <article class="growth-area-card">
                    <h3>${category}</h3>
                    <div class="progress-track"><div class="progress-fill" style="width: ${progress}%"></div></div>
                    <p>${PGT.formatPercentage(progress)} average goal progress</p>
                    <p>${units} recorded in the selected period</p>
                </article>
            `;
        }).join("");
    }

    let lastChart = null; // remembers the last response so resizing can redraw without a request

    async function loadGrowth() {
        const period = periodSelect.value;
        const startDate = startDateFor(period);
        const endDate = PGT.getTodayDate();

        try {
            const data = await PGT.api.get(`/reports/?start_date=${startDate}&end_date=${endDate}`);
            const history = data.progress_history || [];
            lastChart = { history, startDate, endDate };

            emptyMessage.hidden = history.length > 0;
            drawChart(history, startDate, endDate);
            renderCategories(data.goals || [], data.growth_by_category || []);
        } catch (error) {
            PGT.showPageError(error.message);
        }
    }

    if (periodSelect) {
        periodSelect.addEventListener("change", loadGrowth);
    }
    window.addEventListener("resize", () => {
        if (lastChart) {
            drawChart(lastChart.history, lastChart.startDate, lastChart.endDate);
        }
    });

    if (canvas) {
        loadGrowth();
    }
});
