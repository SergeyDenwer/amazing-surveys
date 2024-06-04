export default () => ({
  environment: process.env.NODE_ENV || 'dev',
  database: {
    type: process.env.DB_CONNECTION,
    host: process.env.DB_HOST,
    port: +process.env.DB_PORT,
    database: process.env.DB_DATABASE,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    ssl_required: process.env.DB_SSL_REQUIRED === 'true',
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
  },
  googleAnalytics: {
    measurementId: process.env.NODE_ENV === 'dev' ? process.env.DEV_GA_MEASUREMENT_ID : process.env.GA_MEASUREMENT_ID,
    apiSecret: process.env.NODE_ENV === 'dev' ? process.env.DEV_GA_API_SECRET : process.env.GA_API_SECRET,
  },
});
