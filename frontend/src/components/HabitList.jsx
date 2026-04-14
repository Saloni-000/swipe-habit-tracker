import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../services/api";
import { toast } from "react-hot-toast";
import HabitForm from "./HabitForm";

const HabitList = ({ isOpen, onClose, onRefresh }) => {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingHabit, setEditingHabit] = useState(null);
  const [expandedHabit, setExpandedHabit] = useState(null);
  const [habitStats, setHabitStats] = useState({});

  useEffect(() => {
    if (isOpen) {
      loadHabits();
    }
  }, [isOpen]);

  const loadHabits = async () => {
    try {
      setLoading(true);
      const data = await api.getHabits();
      setHabits(data);

      // Load stats for each habit
      const statsPromises = data.map((habit) =>
        api.getHabitStats(habit.id).catch(() => null),
      );
      const statsResults = await Promise.all(statsPromises);
      const statsMap = {};
      data.forEach((habit, index) => {
        if (statsResults[index]) {
          statsMap[habit.id] = statsResults[index];
        }
      });
      setHabitStats(statsMap);
    } catch (error) {
      toast.error("Failed to load habits");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (habitId, habitName) => {
    if (!confirm(`Delete "${habitName}"? This will remove all history.`))
      return;

    try {
      const result = await api.deleteHabit(habitId);
      console.log("Delete result:", result);
      toast.success("Habit deleted");
      await loadHabits();
      onRefresh?.();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(
        `Failed to delete habit: ${error.response?.data?.error || error.message}`,
      );
    }
  };

  const handleEdit = (habit) => {
    console.log("Editing habit:", habit);
    setEditingHabit(habit);
  };

  const handleUpdateHabit = async (habitData) => {
    try {
      console.log("Updating habit:", editingHabit.id, habitData);
      const result = await api.updateHabit(editingHabit.id, habitData);
      console.log("Update result:", result);
      toast.success("Habit updated!");
      setEditingHabit(null);
      await loadHabits();
      onRefresh?.();
    } catch (error) {
      console.error("Update error:", error);
      toast.error(
        `Failed to update habit: ${error.response?.data?.error || error.message}`,
      );
    }
  };

  const handleToggleActive = async (habit) => {
    try {
      await api.updateHabit(habit.id, {
        ...habit,
        isActive: !habit.isActive,
        customDays: habit.customDays || null,
      });
      toast.success(`Habit ${habit.isActive ? "paused" : "activated"}`);
      await loadHabits();
      onRefresh?.();
    } catch (error) {
      toast.error("Failed to update habit");
    }
  };

  const toggleExpand = (habitId) => {
    setExpandedHabit(expandedHabit === habitId ? null : habitId);
  };

  const getFrequencyDisplay = (habit) => {
    if (habit.frequency === "daily") return "Daily";

    if (habit.frequency === "weekly" && habit.customDays) {
      const days = JSON.parse(habit.customDays);
      if (days.length === 7) return "Daily";

      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const selectedDays = days.map((d) => dayNames[d]);

      return selectedDays.join(" · ");
    }

    return "Custom";
  };

  const getDayAbbr = (dayIndex) => {
    return ["S", "M", "T", "W", "T", "F", "S"][dayIndex];
  };

  const getFrequencyPills = (habit) => {
    if (habit.frequency === "daily") {
      return (
        <div className="frequency-pills">
          {[0, 1, 2, 3, 4, 5, 6].map((day) => (
            <span key={day} className="pill active">
              {getDayAbbr(day)}
            </span>
          ))}
        </div>
      );
    }

    if (habit.frequency === "weekly" && habit.customDays) {
      const selectedDays = JSON.parse(habit.customDays);
      return (
        <div className="frequency-pills">
          {[0, 1, 2, 3, 4, 5, 6].map((day) => (
            <span
              key={day}
              className={`pill ${selectedDays.includes(day) ? "active" : ""}`}
            >
              {getDayAbbr(day)}
            </span>
          ))}
        </div>
      );
    }

    return null;
  };

  const getCompletionRate = (habitId) => {
    const stats = habitStats[habitId];
    if (!stats || stats.total === 0) return 0;
    return Math.round((stats.yes / stats.total) * 100);
  };

  const getLastWeekStats = (habitId) => {
    const stats = habitStats[habitId];
    if (!stats || !stats.recentResponses) return [];

    const last7Days = stats.recentResponses.slice(0, 7).reverse();
    return last7Days;
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              className="drawer-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
            <motion.div
              className="habit-drawer"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30 }}
            >
              <div className="drawer-header">
                <h2>Your Habits</h2>
                <button className="close-drawer" onClick={onClose}>
                  ×
                </button>
              </div>

              <div className="drawer-content">
                {loading ? (
                  <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <p>Loading habits...</p>
                  </div>
                ) : habits.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">🌱</div>
                    <h3>No habits yet</h3>
                    <p>Add your first habit to start tracking</p>
                  </div>
                ) : (
                  <div className="habits-list">
                    {habits.map((habit, index) => {
                      const stats = habitStats[habit.id];
                      const completionRate = getCompletionRate(habit.id);
                      const isExpanded = expandedHabit === habit.id;

                      return (
                        <motion.div
                          key={habit.id}
                          className={`habit-card ${!habit.isActive ? "inactive" : ""} ${isExpanded ? "expanded" : ""}`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <div className="habit-header">
                            <div className="habit-title">
                              <div
                                className={`habit-status ${habit.isActive ? "active" : "paused"}`}
                                onClick={() => handleToggleActive(habit)}
                                title={
                                  habit.isActive
                                    ? "Active - Click to pause"
                                    : "Paused - Click to activate"
                                }
                              >
                                {habit.isActive ? "●" : "○"}
                              </div>
                              <h3>{habit.name}</h3>
                              {habit.streak?.currentStreak > 0 && (
                                <span className="streak-indicator">
                                  🔥 {habit.streak.currentStreak}
                                </span>
                              )}
                            </div>
                            <div className="habit-actions">
                              <button
                                className="expand-habit"
                                onClick={() => toggleExpand(habit.id)}
                                title={isExpanded ? "Show less" : "Show more"}
                              >
                                {isExpanded ? "−" : "+"}
                              </button>
                              <button
                                className="edit-habit"
                                onClick={() => handleEdit(habit)}
                                title="Edit habit"
                              >
                                ✎
                              </button>
                              <button
                                className="delete-habit"
                                onClick={() =>
                                  handleDelete(habit.id, habit.name)
                                }
                                title="Delete habit"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                          <p className="habit-question">{habit.question}</p>
                          <div className="habit-frequency">
                            <span className="freq-label">Frequency:</span>
                            <span className="freq-value">
                              {getFrequencyDisplay(habit)}
                            </span>
                          </div>
                          {getFrequencyPills(habit)}
                          
                          <div className="habit-stats">
                            <div className="stat">
                              <span className="stat-value">
                                {habit.streak?.currentStreak || 0}
                              </span>
                              <span className="stat-label">streak</span>
                            </div>
                            <div className="stat">
                              <span className="stat-value">
                                {habit.streak?.longestStreak || 0}
                              </span>
                              <span className="stat-label">best</span>
                            </div>
                          </div>
                          {/* Progress bar */}
                          <div className="progress-bar-container">
                            <div
                              className="progress-bar"
                              style={{ width: `${completionRate}%` }}
                            />
                          </div>
                          {/* Expanded content */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                className="expanded-content"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                              >
                                <div className="stats-detail">
                                  <div className="stats-row">
                                    <span>Total tracked:</span>
                                    <span>{stats?.total || 0} days</span>
                                  </div>
                                  <div className="stats-row">
                                    <span>Yes responses:</span>
                                    <span className="text-success">
                                      {stats?.yes || 0}
                                    </span>
                                  </div>
                                  <div className="stats-row">
                                    <span>No responses:</span>
                                    <span className="text-danger">
                                      {stats?.no || 0}
                                    </span>
                                  </div>
                                  <div className="stats-row">
                                    <span>Skipped:</span>
                                    <span className="text-muted">
                                      {stats?.skip || 0}
                                    </span>
                                  </div>
                                </div>

                                {/* Last 7 days visualization */}
                                <div className="week-history">
                                  <label>Last 7 days:</label>
                                  <div className="history-pills">
                                    {getLastWeekStats(habit.id).map(
                                      (response, idx) => (
                                        <div
                                          key={idx}
                                          className={`history-pill ${response?.response || "empty"}`}
                                          title={
                                            response?.response || "no data"
                                          }
                                        >
                                          {response?.response === "yes"
                                            ? "✓"
                                            : response?.response === "no"
                                              ? "✗"
                                              : response?.response === "skip"
                                                ? "↻"
                                                : "−"}
                                        </div>
                                      ),
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {editingHabit && (
        <HabitForm
          onSubmit={handleUpdateHabit}
          onClose={() => setEditingHabit(null)}
          initialData={editingHabit}
        />
      )}
    </>
  );
};

export default HabitList;
