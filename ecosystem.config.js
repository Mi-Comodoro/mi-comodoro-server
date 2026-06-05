module.exports = {
  apps: [
    {
      name: 'mi-comodoro-server',
      script: 'dist/src/main.js',
      cwd: '/var/www/intranet/mi-comodoro-server',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
