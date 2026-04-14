import React, { useState } from 'react';
import { motion } from 'framer-motion';

const HabitForm = ({ onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    question: '',
    frequency: 'daily',
    customDays: []
  });

  const weekDays = [
    { value: 0, label: 'S', full: 'Sun' },
    { value: 1, label: 'M', full: 'Mon' },
    { value: 2, label: 'T', full: 'Tue' },
    { value: 3, label: 'W', full: 'Wed' },
    { value: 4, label: 'T', full: 'Thu' },
    { value: 5, label: 'F', full: 'Fri' },
    { value: 6, label: 'S', full: 'Sat' }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Please enter a habit name');
      return;
    }
    
    if (formData.frequency === 'weekly' && formData.customDays.length === 0) {
      alert('Please select at least one day for weekly habits');
      return;
    }
    
    const submitData = {
      ...formData,
      question: formData.question || `Did you ${formData.name.toLowerCase()} today?`,
      customDays: formData.frequency === 'weekly' ? JSON.stringify(formData.customDays) : null
    };
    
    onSubmit(submitData);
  };

  const toggleDay = (dayValue) => {
    setFormData(prev => ({
      ...prev,
      customDays: prev.customDays.includes(dayValue)
        ? prev.customDays.filter(d => d !== dayValue)
        : [...prev.customDays, dayValue].sort((a, b) => a - b)
    }));
  };

  const getFrequencyText = () => {
    if (formData.frequency === 'daily') return 'Every day';
    if (formData.customDays.length === 0) return 'Select days';
    if (formData.customDays.length === 7) return 'Every day';
    
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const selectedDays = formData.customDays.map(d => dayNames[d]);
    
    if (selectedDays.length <= 3) {
      return selectedDays.join(', ');
    }
    return `${selectedDays.length} days per week`;
  };

  return (
    <motion.div 
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div 
        className="modal-content"
        initial={{ scale: 0.9, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 50 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>New Habit</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Habit Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Meditation"
              autoFocus
            />
          </div>
          
          <div className="form-group">
            <label>Question (optional)</label>
            <input
              type="text"
              value={formData.question}
              onChange={e => setFormData({ ...formData, question: e.target.value })}
              placeholder="Did you meditate today?"
            />
          </div>
          
          <div className="form-group">
            <label>Frequency</label>
            <div className="frequency-options">
              <button
                type="button"
                className={`freq-option ${formData.frequency === 'daily' ? 'active' : ''}`}
                onClick={() => setFormData({ ...formData, frequency: 'daily' })}
              >
                <span className="freq-icon">📅</span>
                <span className="freq-label">Daily</span>
              </button>
              <button
                type="button"
                className={`freq-option ${formData.frequency === 'weekly' ? 'active' : ''}`}
                onClick={() => setFormData({ ...formData, frequency: 'weekly' })}
              >
                <span className="freq-icon">📊</span>
                <span className="freq-label">Custom</span>
              </button>
            </div>
          </div>
          
          {formData.frequency === 'weekly' && (
            <motion.div 
              className="form-group"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              <label>Select Days</label>
              <div className="day-selector-container">
                <div className="day-selector">
                  {weekDays.map(day => (
                    <button
                      key={day.value}
                      type="button"
                      className={`day-button ${formData.customDays.includes(day.value) ? 'selected' : ''}`}
                      onClick={() => toggleDay(day.value)}
                      title={day.full}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
                <div className="frequency-summary">
                  {getFrequencyText()}
                </div>
              </div>
            </motion.div>
          )}
          
          <div className="form-actions">
            <button type="button" onClick={onClose} className="cancel-button">
              Cancel
            </button>
            <button type="submit" className="submit-button">
              Create Habit
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default HabitForm;