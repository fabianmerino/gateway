import { pino } from 'pino';
import { loggerConfig } from './config.js';

export const logger = pino(loggerConfig);

// Typed convenience methods
export const logInfo = (component: string, message: string, data?: object) => {
  logger.info({ component, ...data }, message);
};

export const logError = (
  component: string,
  message: string,
  error?: Error | unknown
) => {
  logger.error(
    {
      component,
      err: error instanceof Error ? error : new Error(String(error)),
    },
    message
  );
};
