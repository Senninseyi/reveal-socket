const config = {
  port: process.env.PORT || 8000,
  database: {
    host: "134.199.218.64",
    port: 3306,
    user: "prod_reveal_user", // XAMPP default username
    password: "RevealApp#@YP", // XAMPP default password is empty
    database: "prod_reveal_app",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    debug: false,
  },
  redis: {
    host: "127.0.0.1",
    port: 6379,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
  },
  onesignal: {
    appId: "ef1dcc05-bbd6-4407-be77-1c01faf3ef14",
    restApiKey:
      "os_v2_app_54o4ybn32zcapptxdqa7v47pcs5jp2ebgdrukuvwjeeh3xmd6jxakwraouaoozlppfog47f76l7ludernnbk73esa3pkfmamhf5thla",
  },
  environment: "development",
};

module.exports = config;
