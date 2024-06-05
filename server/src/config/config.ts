import * as pkg from '../../package.json';

const isTestEnvironment = process.env.NODE_ENV === 'test';
const PORT = (isTestEnvironment && 8888) || process.env.APP_PORT || 8080;

export default {
  env: process.env.NODE_ENV || 'development',
  app: {
    name: (pkg as any).name,
    version: (pkg as any).version,
    description: (pkg as any).description,
    host: process.env.APP_HOST,
    baseUrl: process.env.API_BASE_URL,
    port: PORT,
    isTestEnvironment
  }
};
