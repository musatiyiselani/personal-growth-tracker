
/* =====================================================
   PERSONAL GROWTH TRACKER
   Common JavaScript Functions
===================================================== */

function getStoredData(key, defaultValue = []) {
    try {
        const data = localStorage.getItem(key);
        return data === null ? defaultValue : JSON.parse(data);
    } catch (error) {
        console.error("Storage error:", error);
        return defaultValue;
    }
}

function saveStoredData(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error("Storage error:", error);
        return false;
    }
}

function generateId() {
    if (window.crypto?.randomUUID) {
        return window.crypto.randomUUID();
    }

    return Date.now().toString(36) +
        Math.random().toString(36).substring(2);
}

function getTodayDate() {
    const today = new Date();

    return [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0")
    ].join("-");
}

function formatDate(dateString) {
    if (!dateString) return "No date available";

    const date = new Date(`${dateString}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return "Invalid date";
    }

    return date.toLocaleDateString("en-ZA", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => {
        const characters = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return characters[character];
    });
}

function showMessage(elementId, message, type = "success") {
    const element = document.getElementById(elementId);

    if (!element) return;

    element.textContent = message;

    element.classList.remove(
        "message-success",
        "message-error",
        "message-warning"
    );

    element.classList.add(`message-${type}`);
}

function formatPercentage(value) {
    const percentage = Number(value) || 0;

    return `${Math.round(
        Math.min(100, Math.max(0, percentage))
    )}%`;
}

function getCurrentUser() {
    return getStoredData("currentUser", null);
}

function logout() {
    localStorage.removeItem("currentUser");
    window.location.href = "index.html";
}

function getWeeklyActivityAmount(goalId) {
    const activities = getStoredData("activities", []);

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setHours(0, 0, 0, 0);
    sevenDaysAgo.setDate(today.getDate() - 6);

    return activities
        .filter(activity => {
            if (activity.goalId !== goalId) return false;

            const activityDate = new Date(
                `${activity.date}T00:00:00`
            );

            return activityDate >= sevenDaysAgo &&
                activityDate <= today;
        })
        .reduce((total, activity) => {
            return total + Number(activity.amount || 0);
        }, 0);
}

function calculateGoalProgress(goal) {
    const weeklyAmount = getWeeklyActivityAmount(goal.id);
    const target = Number(goal.target) || 0;

    const activityProgress = target > 0
        ? Math.min(100, (weeklyAmount / target) * 100)
        : 0;

    const milestones = goal.milestones || [];

    const completedMilestones = milestones.filter(
        milestone => milestone.completed
    ).length;

    const milestoneProgress = milestones.length > 0
        ? (completedMilestones / milestones.length) * 100
        : null;

    const progress = milestoneProgress === null
        ? activityProgress
        : (activityProgress + milestoneProgress) / 2;

    return Math.round(Math.min(100, progress));
}

function saveProgressSnapshot() {
    const goals = getStoredData("goals", []);

    const progress = goals.length > 0
        ? goals.reduce((total, goal) => {
            return total + calculateGoalProgress(goal);
        }, 0) / goals.length
        : 0;

    const history = getStoredData("growthHistory", []);
    const today = getTodayDate();

    const existingIndex = history.findIndex(
        entry => entry.date === today
    );

    const snapshot = {
        date: today,
        progress: Math.round(progress)
    };

    if (existingIndex >= 0) {
        history[existingIndex] = snapshot;
    } else {
        history.push(snapshot);
    }

    saveStoredData("growthHistory", history);
}

function updateGoalStatuses() {
    const goals = getStoredData("goals", []);

    goals.forEach(goal => {
        goal.progress = calculateGoalProgress(goal);

        if (goal.progress >= 100) {
            goal.status = "completed";
        } else {
            goal.status = "active";
        }
    });

    saveStoredData("goals", goals);
    saveProgressSnapshot();

    return goals;
}


// APPLY SAVED THEME ON EVERY PAGE.

function applySavedTheme() {
    const settings = getStoredData("settings", {
        theme: "light"
    });

    if (settings.theme === "dark") {
        document.body.classList.add("dark-mode");
    } else {
        document.body.classList.remove("dark-mode");
    }
}


// SHARED PAGE FUNCTIONS.

document.addEventListener("DOMContentLoaded", function () {

    applySavedTheme();

    document.querySelectorAll(
        "#logout-button, .logout-button"
    ).forEach(button => {
        button.addEventListener("click", logout);
    });

});


// SHARED APPLICATION OBJECT.

window.PGT = {
    getStoredData,
    saveStoredData,
    generateId,
    getTodayDate,
    formatDate,
    escapeHTML,
    showMessage,
    formatPercentage,
    getCurrentUser,
    logout,
    getWeeklyActivityAmount,
    calculateGoalProgress,
    saveProgressSnapshot,
    updateGoalStatuses,
    applySavedTheme
};
