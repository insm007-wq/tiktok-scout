module.exports = {
  apps: [
    {
      name: 'tiktalk-killa-web',
      script: 'npm',
      args: 'run dev',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'tiktalk-killa-worker',
      script: 'lib/queue/search-worker.ts',
      interpreter: 'tsx',
      instances: 3,
      exec_mode: 'cluster',
      max_memory_restart: '2G',
      env: {
        NODE_ENV: 'production',
        WORKER_CONCURRENCY: '50'  // 3워커 × 50 = 동접 300 지원
      },
      watch: false,
      ignore_watch: [
        'node_modules',
        '.next',
        'logs',
        'dist'
      ],
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ],
  deploy: {
    production: {
      user: 'node',
      host: 'your-railway-host',
      ref: 'origin/main',
      repo: 'git@github.com:your-repo/tik-tok-scout.git',
      path: '/var/www/tiktalk-killa',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production'
    }
  }
}
