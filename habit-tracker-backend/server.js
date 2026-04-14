import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Prisma v7 with Better SQLite3 adapter (correct package name)
const adapter = new PrismaBetterSqlite3({
  url: 'file:./dev.db'
});
const prisma = new PrismaClient({ adapter });

app.use(cors());
app.use(express.json());

// ============ HELPER FUNCTIONS ============

// Get start of day
const getStartOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Check if habit should be tracked today
const shouldTrackToday = (habit, date = new Date()) => {
  if (habit.frequency === 'daily') return true;
  
  if (habit.frequency === 'weekly') {
    const customDays = habit.customDays ? JSON.parse(habit.customDays) : [];
    const today = date.getDay(); // 0 = Sunday, 6 = Saturday
    return customDays.includes(today);
  }
  
  return true;
};

// Update streak for a habit
async function updateStreak(habitId, isSuccess) {
  let streak = await prisma.streak.findUnique({
    where: { habitId }
  });
  
  if (!streak) {
    streak = await prisma.streak.create({
      data: {
        habitId,
        currentStreak: 0,
        longestStreak: 0
      }
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

// GET all habits
app.get('/api/habits', async (req, res) => {
  try {
    const habits = await prisma.habit.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      include: { streak: true }
    });
    res.json(habits);
  } catch (error) {
    console.error('Error fetching habits:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST create habit
app.post('/api/habits', async (req, res) => {
  try {
    const { name, question, frequency, customDays } = req.body;
    
    const habit = await prisma.habit.create({
      data: {
        name,
        question: question || `Did you ${name.toLowerCase()} today?`,
        frequency,
        customDays: customDays || null,
        streak: {
          create: {
            currentStreak: 0,
            longestStreak: 0
          }
        }
      },
      include: { streak: true }
    });
    
    res.json(habit);
  } catch (error) {
    console.error('Error creating habit:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET today's pending habits
app.get('/api/today/pending', async (req, res) => {
  try {
    const today = getStartOfDay();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Get all active habits
    const habits = await prisma.habit.findMany({
      where: { isActive: true },
      include: { streak: true }
    });
    
    // Filter habits that should be tracked today
    const todayHabits = habits.filter(h => shouldTrackToday(h, today));
    
    // Get today's responses
    const responses = await prisma.habitResponse.findMany({
      where: {
        date: {
          gte: today,
          lt: tomorrow
        }
      }
    });
    
    // Get or create daily session
    let dailySession = await prisma.dailySession.findUnique({
      where: { date: today }
    });
    
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
    
    // Build pending habits list
    let pendingHabits = [];
    
    // First: Add skipped habits
    for (const habitId of skippedQueue) {
      const habit = todayHabits.find(h => h.id === habitId);
      if (habit && !completedIds.includes(habitId)) {
        pendingHabits.push(habit);
      }
    }
    
    // Then: Add unanswered habits
    const answeredIds = responses.map(r => r.habitId);
    const unansweredHabits = todayHabits.filter(h => 
      !answeredIds.includes(h.id) && 
      !completedIds.includes(h.id) &&
      !skippedQueue.includes(h.id)
    );
    
    pendingHabits = [...pendingHabits, ...unansweredHabits];
    
    // Add response status to each habit
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

// POST record response
app.post('/api/responses', async (req, res) => {
  try {
    const { habitId, response } = req.body;
    const today = getStartOfDay();
    
    // Save the response
    const habitResponse = await prisma.habitResponse.upsert({
      where: {
        habitId_date: {
          habitId,
          date: today
        }
      },
      update: {
        response,
        respondedAt: new Date()
      },
      create: {
        habitId,
        date: today,
        response
      }
    });
    
    // Update daily session
    let dailySession = await prisma.dailySession.findUnique({
      where: { date: today }
    });
    
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
      
      // Update streak
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============ START SERVER ============
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});