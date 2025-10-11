import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkStuckTasks() {
  try {
    const stuckTasks = await prisma.aITask.findMany({
      where: {
        status: {
          notIn: ['COMPLETED', 'FAILED', 'CACHED']
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log('\n🔍 Stuck Tasks Found:', stuckTasks.length)
    console.log('==========================================\n')

    stuckTasks.forEach(task => {
      console.log(`ID: ${task.id}`)
      console.log(`Type: ${task.type}`)
      console.log(`Status: ${task.status}`)
      console.log(`Job: ${task.jobTitle} at ${task.company}`)
      console.log(`Created: ${task.createdAt}`)
      console.log(`Updated: ${task.updatedAt}`)
      console.log(`Current Step: ${task.currentStep || 'N/A'}`)
      console.log('------------------------------------------\n')
    })

    // Also show all tasks for context
    const allTasks = await prisma.aITask.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    })

    console.log('\n📋 Last 10 Tasks (All Statuses):')
    console.log('==========================================\n')

    allTasks.forEach(task => {
      console.log(`${task.status.padEnd(12)} | ${task.type.padEnd(25)} | ${task.jobTitle} at ${task.company}`)
    })

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkStuckTasks()
