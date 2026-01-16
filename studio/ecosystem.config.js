module.exports = {
  apps: [
    {
      name: 'navi-studio',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 5501',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        rootDir: process.env.rootDir
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
    },
  ],
}
