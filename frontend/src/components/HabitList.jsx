import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import { toast } from 'react-hot-toast';
import HabitForm from './HabitForm';

const HabitList = ({ isOpen, onClose, onRefresh }) => {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingHabit, setEditingHabit] = useState(null);
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [editedHabits, setEditedHabits] = useState({});

  useEffect(() => {
    if (isOpen) {
      loadHabits();
    }
  }, [isOpen]);

  const loadHabits = async () => {
    try {
      setLoading(true);
      const data = await api.getHabits();
      // Sort by order field
      const sorted = data.sort((a, b) => (a.order || 0) - (b.order || 0));
      setHabits(sorted);
    } catch (error) {
      toast.error('Failed to load habits');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (habitId, habitName) => {
    if (!confirm(`Delete "${habitName}"? This will remove all history.`)) return;
    
    try {
      await api.deleteHabit(habitId);
      toast.success('Habit deleted');
      await loadHabits();
      onRefresh?.();
    } catch (error) {
      toast.error('Failed to delete habit');
    }
  };

  const handleEdit = (habit) => {
    setEditingHabit(habit);
  };

  const handleUpdateHabit = async (habitData) => {
    try {
      await api.updateHabit(editingHabit.id, habitData);
      toast.success('Habit updated!');
      setEditingHabit(null);
      await loadHabits();
      onRefresh?.();
    } catch (error) {
      toast.error('Failed to update habit');
    }
  };

  const handleToggleActive = async (habit) => {
    try {
      await api.updateHabit(habit.id, { 
        name: habit.name,
        question: habit.question,
        frequency: habit.frequency,
        customDays: habit.customDays,
        order: habit.order || 0,
        isActive: !habit.isActive 
      });
      toast.success(`Habit ${habit.isActive ? 'paused' : 'activated'}`);
      await loadHabits();
      onRefresh?.();
    } catch (error) {
      toast.error('Failed to update habit');
    }
  };

  const toggleBulkEdit = () => {
    if (bulkEditMode) {
      handleBulkSave();
    }
    setBulkEditMode(!bulkEditMode);
    if (!bulkEditMode) {
      const initial = {};
      habits.forEach(h => {
        initial[h.id] = { 
          name: h.name, 
          question: h.question,
          order: h.order || 0
        };
      });
      setEditedHabits(initial);
    }
  };

  const handleBulkChange = (habitId, field, value) => {
    setEditedHabits(prev => ({
      ...prev,
      [habitId]: { ...prev[habitId], [field]: value }
    }));
  };

  const handleBulkSave = async () => {
    const promises = habits.map(habit => {
      const changes = editedHabits[habit.id];
      if (changes) {
        const hasChanges = 
          changes.name !== habit.name || 
          changes.question !== habit.question ||
          changes.order !== (habit.order || 0);
        
        if (hasChanges) {
          return api.updateHabit(habit.id, {
            name: changes.name,
            question: changes.question,
            order: changes.order || 0,
            frequency: habit.frequency,
            customDays: habit.customDays,
            isActive: habit.isActive
          });
        }
      }
      return Promise.resolve();
    });

    try {
      await Promise.all(promises);
      toast.success('All changes saved!');
      await loadHabits();
      onRefresh?.();
      setBulkEditMode(false);
    } catch (error) {
      toast.error('Failed to save some changes');
    }
  };

  const getFrequencyDisplay = (habit) => {
    if (habit.frequency === 'daily') return 'Daily';
    
    if (habit.frequency === 'weekly' && habit.customDays) {
      try {
        const days = JSON.parse(habit.customDays);
        if (days.length === 7) return 'Every day';
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return days.map(d => dayNames[d]).join(', ');
      } catch {
        return 'Weekly';
      }
    }
    
    return 'Custom';
  };

  const getDayAbbr = (dayIndex) => {
    return ['S', 'M', 'T', 'W', 'T', 'F', 'S'][dayIndex];
  };

  const getFrequencyPills = (habit) => {
    if (habit.frequency === 'daily') {
      return (
        <div className="frequency-pills">
          {[0, 1, 2, 3, 4, 5, 6].map(day => (
            <span key={day} className="pill active">{getDayAbbr(day)}</span>
          ))}
        </div>
      );
    }
    
    if (habit.frequency === 'weekly' && habit.customDays) {
      try {
        const selectedDays = JSON.parse(habit.customDays);
        return (
          <div className="frequency-pills">
            {[0, 1, 2, 3, 4, 5, 6].map(day => (
              <span 
                key={day} 
                className={`pill ${selectedDays.includes(day) ? 'active' : ''}`}
              >
                {getDayAbbr(day)}
              </span>
            ))}
          </div>
        );
      } catch {
        return null;
      }
    }
    
    return null;
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && !editingHabit && (
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
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30 }}
            >
              <div className="drawer-header">
                <h2>Your Habits</h2>
                <div className="drawer-header-actions">
                  <button 
                    className={`bulk-edit-button ${bulkEditMode ? 'active' : ''}`}
                    onClick={toggleBulkEdit}
                  >
                    {bulkEditMode ? 'Save All' : 'Bulk Edit'}
                  </button>
                  <button className="close-drawer" onClick={onClose}>×</button>
                </div>
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
                        className={`habit-card ${!habit.isActive ? 'inactive' : ''}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <div className="habit-header">
                          <div className="habit-title">
                            <div 
                              className={`habit-status ${habit.isActive ? 'active' : 'paused'}`}
                              onClick={() => !bulkEditMode && handleToggleActive(habit)}
                              title={habit.isActive ? 'Active - Click to pause' : 'Paused - Click to activate'}
                            >
                              {habit.isActive ? '●' : '○'}
                            </div>
                            
                            {bulkEditMode ? (
                              <input
                                type="text"
                                className="bulk-edit-input"
                                value={editedHabits[habit.id]?.name || habit.name}
                                onChange={(e) => handleBulkChange(habit.id, 'name', e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                placeholder="Name"
                              />
                            ) : (
                              <h3>{habit.name}</h3>
                            )}
                            
                            {habit.streak?.currentStreak > 0 && (
                              <span className="streak-indicator">
                                🔥 {habit.streak.currentStreak}
                              </span>
                            )}
                          </div>
                          
                          {!bulkEditMode && (
                            <div className="habit-actions">
                              <button
                                className="edit-habit"
                                onClick={() => handleEdit(habit)}
                                title="Edit habit"
                              >
                                ✎
                              </button>
                              <button
                                className="delete-habit"
                                onClick={() => handleDelete(habit.id, habit.name)}
                                title="Delete habit"
                              >
                                🗑️
                              </button>
                            </div>
                          )}
                        </div>
                        
                        {bulkEditMode ? (
                          <>
                            <input
                              type="text"
                              className="bulk-edit-input bulk-question-input"
                              value={editedHabits[habit.id]?.question || habit.question}
                              onChange={(e) => handleBulkChange(habit.id, 'question', e.target.value)}
                              placeholder="Question"
                            />
                            <div className="bulk-order-row">
                              <label className="order-label">Order:</label>
                              <input
                                type="number"
                                className="bulk-order-input"
                                value={editedHabits[habit.id]?.order ?? habit.order ?? 0}
                                onChange={(e) => handleBulkChange(habit.id, 'order', parseInt(e.target.value) || 0)}
                                min="0"
                              />
                            </div>
                          </>
                        ) : (
                          <p className="habit-question">{habit.question}</p>
                        )}
                        
                        <div className="habit-frequency">
                          <span className="freq-label">Frequency:</span>
                          <span className="freq-value">{getFrequencyDisplay(habit)}</span>
                        </div>
                        
                        {getFrequencyPills(habit)}
                        
                        <div className="habit-stats">
                          <div className="stat">
                            <span className="stat-value">{habit.streak?.currentStreak || 0}</span>
                            <span className="stat-label">streak</span>
                          </div>
                          <div className="stat">
                            <span className="stat-value">{habit.streak?.longestStreak || 0}</span>
                            <span className="stat-label">best</span>
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