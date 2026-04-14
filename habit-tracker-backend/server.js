import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pkg;
dotenv.config();

const app = express();

// Choose adapter based on environment
let prisma;

if (process.env.NODE_ENV === 'production') {
  // PostgreSQL for production (Render)
  console.log('🐘 Using PostgreSQL adapter for production');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });
} else {
  // SQLite for local development
  console.log('📁 Using SQLite adapter for development');
  const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' });
  prisma = new PrismaClient({ adapter });
}

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// ============ HELPER FUNCTIONS ============
const getStartOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const shouldTrackToday = (habit, date = new Date()) => {
  if (habit.frequency === 'daily') return true;
  if (habit.frequency === 'weekly') {
    const customDays = habit.customDays ? JSON.parse(habit.customDays) : [];
    const today = date.getDay();
    return customDays.includes(today);
  }
  return true;
};

async function updateStreak(habitId, isSuccess) {
  let streak = await prisma.streak.findUnique({ where: { habitId } });
  
  if (!streak) {
    streak = await prisma.streak.create({
      data: { habitId, currentStreak: 0, longestStreak: 0 }
    });
  }
  
  const newCurrentStreak = isSuccess ? streak.currentStreak + 1 : 0;
  const newLongestStreak = Math.max(streak.longestStreak, newCurrentStreak);
  
  return prisma.streak.update({
    where: { habitId },
    data: {
      currentStreak: newCurrentStreak,
      longestStreak: newLongestStreak,
      lastUpdated: new Date()
    }
  });
}

// ============ API ROUTES ============

app.get('/api/habits', async (req, res) => {
  try {
    const habits = await prisma.habit.findMany({
      orderBy: { order: 'asc' },
      include: { streak: true }
    });
    res.json(habits);
  } catch (error) {
    console.error('Error fetching habits:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/habits', async (req, res) => {
  try {
    const { name, question, frequency, customDays } = req.body;
    
    const habit = await prisma.habit.create({
      data: {
        name,
        question: question || `Did you ${name.toLowerCase()} today?`,
        frequency,
        customDays: customDays || null,
        isActive: true,
        streak: { create: { currentStreak: 0, longestStreak: 0 } }
      },
      include: { streak: true }
    });
    
    res.json(habit);
  } catch (error) {
    console.error('Error creating habit:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/habits/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, question, frequency, customDays, isActive } = req.body;
    
    const habit = await prisma.habit.update({
      where: { id },
      data: {
        name,
        question,
        frequency,
        customDays: customDays || null,
        isActive: isActive !== undefined ? isActive : true
      },
      include: { streak: true }
    });
    
    res.json(habit);
  } catch (error) {
    console.error('Error updating habit:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/habits/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.habitResponse.deleteMany({ where: { habitId: id } });
    await prisma.streak.deleteMany({ where: { habitId: id } });
    await prisma.habit.delete({ where: { id } });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting habit:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/today/pending', async (req, res) => {
  try {
    const today = getStartOfDay();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const habits = await prisma.habit.findMany({
      where: { isActive: true },
      include: { streak: true }
    });
    
    const todayHabits = habits.filter(h => shouldTrackToday(h, today));
    const responses = await prisma.habitResponse.findMany({
      where: { date: { gte: today, lt: tomorrow } }
    });
    
    let dailySession = await prisma.dailySession.findUnique({ where: { date: today } });
    
    if (!dailySession) {
      dailySession = await prisma.dailySession.create({
        data: {
          date: today,
          completedHabits: JSON.stringify([]),
          skippedHabits: JSON.stringify([])
        }
      });
    }
    
    const completedIds = JSON.parse(dailySession.completedHabits);
    const skippedQueue = JSON.parse(dailySession.skippedHabits);
    
    let pendingHabits = [];
    
    for (const habitId of skippedQueue) {
      const habit = todayHabits.find(h => h.id === habitId);
      if (habit && !completedIds.includes(habitId)) {
        pendingHabits.push(habit);
      }
    }
    
    const answeredIds = responses.map(r => r.habitId);
    const unansweredHabits = todayHabits.filter(h => 
      !answeredIds.includes(h.id) && 
      !completedIds.includes(h.id) &&
      !skippedQueue.includes(h.id)
    );
    
    pendingHabits = [...pendingHabits, ...unansweredHabits];
    
    const habitsWithStatus = pendingHabits.map(habit => {
      const response = responses.find(r => r.habitId === habit.id);
      return {
        id: habit.id,
        name: habit.name,
        question: habit.question,
        frequency: habit.frequency,
        customDays: habit.customDays,
        todayResponse: response?.response || null,
        streak: habit.streak || { currentStreak: 0, longestStreak: 0 }
      };
    });
    
    res.json(habitsWithStatus);
  } catch (error) {
    console.error('Error in /today/pending:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/responses', async (req, res) => {
  try {
    const { habitId, response } = req.body;
    const today = getStartOfDay();
    
    const habitResponse = await prisma.habitResponse.upsert({
      where: { habitId_date: { habitId, date: today } },
      update: { response, respondedAt: new Date() },
      create: { habitId, date: today, response }
    });
    
    let dailySession = await prisma.dailySession.findUnique({ where: { date: today } });
    
    if (!dailySession) {
      dailySession = await prisma.dailySession.create({
        data: {
          date: today,
          completedHabits: JSON.stringify([]),
          skippedHabits: JSON.stringify([])
        }
      });
    }
    
    const completedHabits = JSON.parse(dailySession.completedHabits);
    let skippedHabits = JSON.parse(dailySession.skippedHabits);
    
    if (response === 'skip') {
      if (!skippedHabits.includes(habitId)) {
        skippedHabits.push(habitId);
      }
    } else {
      if (!completedHabits.includes(habitId)) {
        completedHabits.push(habitId);
      }
      skippedHabits = skippedHabits.filter(id => id !== habitId);
      await updateStreak(habitId, response === 'yes');
    }
    
    await prisma.dailySession.update({
      where: { date: today },
      data: {
        completedHabits: JSON.stringify(completedHabits),
        skippedHabits: JSON.stringify(skippedHabits)
      }
    });
    
    res.json(habitResponse);
  } catch (error) {
    console.error('Error recording response:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/habits/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    
    const habit = await prisma.habit.findUnique({
      where: { id },
      include: {
        streak: true,
        responses: {
          orderBy: { date: 'desc' },
          take: 30
        }
      }
    });
    
    if (!habit) {
      return res.status(404).json({ error: 'Habit not found' });
    }
    
    const stats = {
      total: habit.responses.length,
      yes: habit.responses.filter(r => r.response === 'yes').length,
      no: habit.responses.filter(r => r.response === 'no').length,
      skip: habit.responses.filter(r => r.response === 'skip').length,
      streak: habit.streak,
      recentResponses: habit.responses
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
});