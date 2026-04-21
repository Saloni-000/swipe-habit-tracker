import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const api = {
  getHabits: async () => {
    const response = await axios.get(`${API_BASE_URL}/habits`);
    return response.data;
  },
  
  createHabit: async (habitData) => {
    const response = await axios.post(`${API_BASE_URL}/habits`, habitData);
    return response.data;
  },
  
  updateHabit: async (habitId, habitData) => {
    const response = await axios.put(`${API_BASE_URL}/habits/${habitId}`, habitData);
    return response.data;
  },
  
  deleteHabit: async (habitId) => {
    const response = await axios.delete(`${API_BASE_URL}/habits/${habitId}`);
    return response.data;
  },
  
  getTodayPending: async () => {
    const response = await axios.get(`${API_BASE_URL}/today/pending`);
    return response.data;
  },
  
  recordResponse: async (habitId, response) => {
    const res = await axios.post(`${API_BASE_URL}/responses`, { habitId, response });
    return res.data;
  }
};