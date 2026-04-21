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
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    loadPendingHabits();
  }, []);

  const loadPendingHabits = async () => {
    try {
      setLoading(true);
      const habits = await api.getTodayPending();
      setPendingHabits(habits);
      setCurrentHabitIndex(0);
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
      
      if (direction === 'skip') {
        const skippedHabit = updatedHabits.splice(currentHabitIndex, 1)[0];
        updatedHabits.push(skippedHabit);
        setPendingHabits(updatedHabits);
        toast('Skipped for now', { icon: '↻' });
      } else {
        updatedHabits.splice(currentHabitIndex, 1);
        setPendingHabits(updatedHabits);
        setCurrentHabitIndex(prev => Math.min(prev, updatedHabits.length - 1));
        toast.success(`${direction === 'yes' ? '✓' : '✗'} Recorded`);
      }
      
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

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const currentHabit = pendingHabits[currentHabitIndex];
  const remainingCount = pendingHabits.length;

  return (
    <div className="app">
      <Toaster position="top-center" />
      
      <HabitList 
        isOpen={showDrawer} 
        onClose={() => setShowDrawer(false)}
        onRefresh={loadPendingHabits}
      />
      
      <header className="app-header">
        <div className="header-left">
          <button className="menu-button" onClick={() => setShowDrawer(true)}>
            <span className="menu-icon">☰</span>
          </button>
          <button className="theme-toggle" onClick={toggleTheme}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
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
          {remainingCount > 0 && (
            <div className="remaining-count">{remainingCount} remaining</div>
          )}
        </div>

        <div className="swipe-container">
          {loading ? (
            <div className="loading-card">
              <div className="loading-spinner"></div>
            </div>
          ) : currentHabit ? (
            <SwipeCard habit={currentHabit} onSwipe={handleSwipe} />
          ) : (
            <div className="completion-card">
              <div className="completion-emoji">✨</div>
              <div className="completion-title">all caught up!</div>
              <div className="completion-subtitle">Come back tomorrow for more</div>
              <button className="add-habit-button" onClick={() => setShowAddForm(true)}>
                + add new habit
              </button>
            </div>
          )}
        </div>
      </main>

      {showAddForm && (
        <HabitForm onSubmit={handleAddHabit} onClose={() => setShowAddForm(false)} />
      )}

      {!loading && currentHabit && (
        <button className="fab-add" onClick={() => setShowAddForm(true)}>+</button>
      )}
    </div>
  );
}

export default App;