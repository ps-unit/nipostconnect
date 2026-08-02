// PM2 Ecosystem Config — NiPOST Connect v5
// Usage:
//   pm2 start ecosystem.config.js
//   pm2 start ecosystem.config.js --env production
//   pm2 save && pm2 startup

module.exports = {
  apps: [
    {
      name:   "nipost-connect",
      script: "./server/server.js",
      cwd:    __dirname,

      // Cluster mode — one worker per CPU core
      instances: "max",
      exec_mode: "cluster",

      // Environment
      env: {
        NODE_ENV: "development",
        PORT: 5000,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 5000,
      },

      // Restart policy
      max_restarts:    10,
      min_uptime:      "5s",
      restart_delay:   2000,
      autorestart:     true,

      // Logs
      error_file:   "./logs/error.log",
      out_file:     "./logs/out.log",
      merge_logs:   true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      max_size:     "50M",
      retain:       10,

      // Memory guard — restart if over 512 MB
      max_memory_restart: "512M",

      // Watch (disable in production)
      watch: false,

      // Graceful shutdown
      kill_timeout:   5000,
      listen_timeout: 10000,
      shutdown_with_message: true,
    },
  ],
};
