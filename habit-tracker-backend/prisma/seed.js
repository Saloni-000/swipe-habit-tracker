import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');
  
  // Create sample habits
  const habits = [
    { name: 'Journal', question: 'Did you journal today?', frequency: 'daily' },
    { name: 'Exercise', question: 'Did you exercise?', frequency: 'daily' },
    { name: 'Meditate', question: 'Did you meditate today?', frequency: 'daily' },
    { name: 'Read', question: 'Did you read a book?', frequency: 'daily' },
    { name: 'Water', question: 'Did you drink enough water?', frequency: 'daily' },
  ];
  
  for (const habit of habits) {
    await prisma.habit.create({
      data: {
        ...habit,
        streak: {
          create: {
            currentStreak: 0,
            longestStreak: 0
          }
        }
      }
    });
  }
  
  console.log('✅ Seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });