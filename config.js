const config = {
  port: process.env.PORT || 3000,
  database: {
    host: '134.199.218.64',
    port: 3306,
    user: 'prod_reveal_user',  // XAMPP default username
    password: 'RevealApp#@YP',  // XAMPP default password is empty
    database: 'prod_reveal_app',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    debug: false
  },
  redis: {
    host: '127.0.0.1',
    port: 6379,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3
  },
  onesignal: {
    appId: "YOUR_ONESIGNAL_APP_ID",
    restApiKey: "YOUR_ONESIGNAL_REST_API_KEY",
  },
  environment: "development"
};

module.exports = config;
