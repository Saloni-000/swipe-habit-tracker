import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../services/api";
import { toast } from "react-hot-toast";

const HabitList = ({ isOpen, onClose, onRefresh }) => {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);

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
      await api.deleteHabit(habitId);
      toast.success("Habit deleted");
      await loadHabits();
      onRefresh?.();
    } catch (error) {
      toast.error("Failed to delete habit");
    }
  };

  const getFrequencyDisplay = (habit) => {
    if (habit.frequency === "daily") {
      return "Daily";
    }

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

  return (
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
                  {habits.map((habit, index) => (
                    <motion.div
                      key={habit.id}
                      className="habit-card"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <div className="habit-header">
                        <div className="habit-title">
                          <h3>{habit.name}</h3>
                          {habit.streak?.currentStreak > 0 && (
                            <span className="streak-indicator">
                              🔥 {habit.streak.currentStreak}
                            </span>
                          )}
                        </div>
                        <button
                          className="delete-habit"
                          onClick={() => handleDelete(habit.id, habit.name)}
                          title="Delete habit"
                        >
                          🗑️
                        </button>
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
                          <span className="stat-label">current</span>
                        </div>
                        <div className="stat">
                          <span className="stat-value">
                            {habit.streak?.longestStreak || 0}
                          </span>
                          <span className="stat-label">best</span>
                        </div>
                        <div className="stat">
                          <span className="stat-value">
                            {habit.responses?.filter(
                              (r) => r.response === "yes",
                            ).length || 0}
                          </span>
                          <span className="stat-label">total ✓</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default HabitList;
