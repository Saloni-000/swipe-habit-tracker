import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

export const api = {
  // Get all habits
  getHabits: async () => {
    const response = await axios.get(`${API_BASE_URL}/habits`);
    return response.data;
  },
  
  // Create a new habit
  createHabit: async (habitData) => {
    const response = await axios.post(`${API_BASE_URL}/habits`, habitData);
    return response.data;
  },
  
  // Get today's pending habits
  getTodayPending: async () => {
    const response = await axios.get(`${API_BASE_URL}/today/pending`);
    return response.data;
  },
  
  // Record a swipe response
  recordResponse: async (habitId, response) => {
    const res = await axios.post(`${API_BASE_URL}/responses`, {
      habitId,
      response
    });
    return res.data;
  },
  
  // Delete a habit
  deleteHabit: async (habitId) => {
    const response = await axios.delete(`${API_BASE_URL}/habits/${habitId}`);
    return response.data;
  }
};