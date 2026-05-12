// src/scripts/seedChallenges.ts
import { prisma } from '../src/prisma'

async function main() {
  await prisma.challenge.createMany({
    data: [
      {
        title: '4 часа фокуса',
        description: 'Выполняй не менее 240 минут помодоро ежедневно в течение 30 дней',
        type: 'pomodoro_daily',
        targetValue: 240,
        durationDays: 30,
        entryFee: 200,
        rewardXp: 1250,
        rewardCredits: 750, // 550 прибыли 
      },
      {
        title: 'Марафон задач',
        description: 'Закрывай не менее 5 задач ежедневно в течение 14 дней',
        type: 'tasks_daily',
        targetValue: 5,
        durationDays: 14,
        entryFee: 100,
        rewardXp: 500,
        rewardCredits: 300, // 200 прибыли 
      },
      {
        title: 'Привычки 21 день',
        description: 'Выполняй минимум 5 привычек ежедневно 21 день',
        type: 'habit_daily',
        targetValue: 5,
        durationDays: 21,
        entryFee: 150,
        rewardXp: 750,
        rewardCredits: 500, // 350 прибыли 
      },
      {
        title: '3 задачи в день',
        description: 'Закрывай не менее 3 задач ежедневно в течение 7 дней',
        type: 'tasks_daily',
        targetValue: 3,
        durationDays: 7,
        entryFee: 50,
        rewardXp: 250,
        rewardCredits: 150, // 100 прибыли 
      },
    ],
    skipDuplicates: true,
  })
  console.log('Challenges seeded')
}

main().finally(() => prisma.$disconnect())