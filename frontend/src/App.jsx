import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import SwipeCard from './components/SwipeCard';
import HabitForm from './components/HabitForm';
import HabitList from './components/HabitList';
import { api } from './services/api';
import './App.css';

function App() {
  const [pendingHabits, setPendingHabits] = useState([]);
  const [currentHabitIndex, setCurrentHabitIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [todayStats, setTodayStats] = useState({ yes: 0, no: 0, skip: 0 });

  useEffect(() => {
    loadPendingHabits();
  }, []);

  const loadPendingHabits = async () => {
    try {
      setLoading(true);
      const habits = await api.getTodayPending();
      setPendingHabits(habits);
      setCurrentHabitIndex(0);
      
      const stats = { yes: 0, no: 0, skip: 0 };
      habits.forEach(h => {
        if (h.todayResponse) {
          stats[h.todayResponse]++;
        }
      });
      setTodayStats(stats);
    } catch (error) {
      toast.error('Failed to load habits');
    } finally {
      setLoading(false);
    }
  };

  const handleSwipe = async (habitId, direction) => {
    try {
      await api.recordResponse(habitId, direction);
      
      const updatedHabits = [...pendingHabits];
      const currentHabit = updatedHabits[currentHabitIndex];
      
      if (direction === 'skip') {
        updatedHabits.splice(currentHabitIndex, 1);
        updatedHabits.push(currentHabit);
        setPendingHabits(updatedHabits);
        toast('Skipped for now', { icon: '↻' });
      } else {
        updatedHabits.splice(currentHabitIndex, 1);
        setPendingHabits(updatedHabits);
        setCurrentHabitIndex(prev => Math.min(prev, updatedHabits.length - 1));
        toast.success(`${direction === 'yes' ? '✓ Yes!' : '✗ No'}`);
      }
      
      setTodayStats(prev => ({
        ...prev,
        [direction]: prev[direction] + 1
      }));
      
      if (updatedHabits.length === 0) {
        setTimeout(() => loadPendingHabits(), 500);
      }
    } catch (error) {
      toast.error('Failed to record response');
    }
  };

  const handleAddHabit = async (habitData) => {
    try {
      await api.createHabit(habitData);
      toast.success('Habit created!');
      setShowAddForm(false);
      loadPendingHabits();
    } catch (error) {
      toast.error('Failed to create habit');
    }
  };

  const currentHabit = pendingHabits[currentHabitIndex];

  return (
    <div className="app">
      <Toaster position="top-center" />
      
      <HabitList 
        isOpen={showDrawer} 
        onClose={() => setShowDrawer(false)}
        onRefresh={loadPendingHabits}
      />
      
      <header className="app-header">
        <button 
          className="menu-button"
          onClick={() => setShowDrawer(true)}
        >
          <span className="menu-icon">☰</span>
        </button>
        <h1>swipe</h1>
        <div className="header-spacer"></div>
      </header>

      <main className="app-main">
        <div className="date-header">
          <div className="date-display">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>

        <div className="swipe-container">
          {loading ? (
            <div className="loading-card">
              <div className="loading-spinner"></div>
              <p>Loading your habits...</p>
            </div>
          ) : currentHabit ? (
            <SwipeCard
              key={currentHabit.id}
              habit={currentHabit}
              onSwipe={handleSwipe}
            />
          ) : (
            <div className="completion-card">
              <div className="completion-emoji">✨</div>
              <div className="completion-title">all caught up!</div>
              <div className="completion-subtitle">
                You've answered everything for today
              </div>
              <button 
                className="add-habit-button"
                onClick={() => setShowAddForm(true)}
              >
                + add new habit
              </button>
            </div>
          )}
        </div>

        <div className="today-summary">
          <div className="stat-item">
            <div className="stat-value">{todayStats.yes}</div>
            <div className="stat-label">yes</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{todayStats.no}</div>
            <div className="stat-label">no</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{todayStats.skip}</div>
            <div className="stat-label">skipped</div>
          </div>
        </div>
      </main>

      {showAddForm && (
        <HabitForm
          onSubmit={handleAddHabit}
          onClose={() => setShowAddForm(false)}
        />
      )}

      {!loading && !currentHabit && (
        <button 
          className="fab-add"
          onClick={() => setShowAddForm(true)}
        >
          +
        </button>
      )}
    </div>
  );
}

export default App;