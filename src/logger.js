import pino from 'pino';
import customTransport from './customTransport';

const logger = pino({
  level: 'info',
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
  prettyPrint: {
    translateTime: 'SYS:standard',
    ignore: 'pid,hostname',
  },
  transport: {
    target: customTransport,
  },
});

export default logger;
