import { NextApiRequest, NextApiResponse } from 'next'
import { Server } from 'socket.io'
import { searchQueue } from '@/lib/queue/search-queue'

const ioHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  const socket = (res as any).socket
  if (!socket?.server.io) {
    console.log('[SocketIO] Initializing Socket.io server')
    const io = new Server(socket.server, {
      cors: {
        origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
        methods: ['GET', 'POST']
      },
      transports: ['websocket', 'polling']
    })

    socket.server.io = io

    io.on('connection', (socket) => {
      console.log(`[SocketIO] Client connected: ${socket.id}`)

      // 특정 jobId 구독
      socket.on('subscribe', async (jobId: string) => {
        console.log(`[SocketIO] Client ${socket.id} subscribed to job ${jobId}`)

        socket.join(jobId)

        try {
          const job = await searchQueue.getJob(jobId)

          if (!job) {
            socket.emit('job:error', { error: 'Job not found' })
            return
          }

          // 현재 상태 즉시 전송
          const state = await job.getState()
          const progress = typeof job.progress === 'number' ? job.progress : 0

          socket.emit('job:status', {
            jobId,
            state,
            progress: Math.round(progress)
          })

          // 작업 상태를 주기적으로 확인 (폴링)
          const pollInterval = setInterval(async () => {
            const currentState = await job.getState()
            const currentProgress = typeof job.progress === 'number' ? job.progress : 0

            if (currentState === 'completed') {
              socket.emit('job:completed', {
                jobId,
                result: job.returnvalue
              })
              clearInterval(pollInterval)
              socket.leave(jobId)
            } else if (currentState === 'failed') {
              socket.emit('job:failed', {
                jobId,
                error: job.failedReason || 'Unknown error'
              })
              clearInterval(pollInterval)
              socket.leave(jobId)
            } else {
              socket.emit('job:progress', {
                jobId,
                progress: Math.round(currentProgress)
              })
            }
          }, 1000)

          // 소켓 disconnect 시 폴링 정리
          socket.on('disconnect', () => {
            clearInterval(pollInterval)
            console.log(`[SocketIO] Client ${socket.id} disconnected from job ${jobId}`)
          })
        } catch (error) {
          console.error('[SocketIO] Error subscribing to job:', error)
          socket.emit('job:error', {
            error: 'Failed to subscribe to job'
          })
        }
      })

      socket.on('disconnect', () => {
        console.log(`[SocketIO] Client disconnected: ${socket.id}`)
      })
    })
  }

  res.end()
}

export default ioHandler
