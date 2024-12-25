import type { LoggerOptions } from 'pino';

export const loggerConfig: LoggerOptions = {
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV === 'production'
      ? undefined
      : {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
  base: {
    env: process.env.NODE_ENV || 'development',
  },
};
