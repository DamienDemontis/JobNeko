import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanupStuckTasks() {
  try {
    console.log('\n🧹 Cleaning up stuck tasks...\n')

    // Find tasks that are stuck in PENDING or PROCESSING for more than 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)

    const stuckTasks = await prisma.aITask.findMany({
      where: {
        status: {
          in: ['PENDING', 'PROCESSING']
        },
        createdAt: {
          lt: fiveMinutesAgo
        }
      }
    })

    console.log(`Found ${stuckTasks.length} stuck tasks to clean up`)

    if (stuckTasks.length === 0) {
      console.log('✅ No stuck tasks found!')
      return
    }

    // Mark them as FAILED with appropriate error message
    const result = await prisma.aITask.updateMany({
      where: {
        id: {
          in: stuckTasks.map(t => t.id)
        }
      },
      data: {
        status: 'FAILED',
        error: 'Task cleanup: Stuck in pending/processing state',
        updatedAt: new Date()
      }
    })

    console.log(`✅ Cleaned up ${result.count} stuck tasks`)

    // Show what was cleaned
    stuckTasks.forEach(task => {
      console.log(`   - ${task.type}: ${task.jobTitle} at ${task.company} (${task.status})`)
    })

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

cleanupStuckTasks()
