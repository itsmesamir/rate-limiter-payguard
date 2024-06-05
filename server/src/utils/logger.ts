import * as winston from 'winston';

// Define the format for logging
const logFormat = winston.format.printf((info) => {
  const formattedNamespace = info.metadata.namespace || '';
  return `${info.timestamp} [${info.level}] [${formattedNamespace}]: ${info.message}`;
});

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
    logFormat
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize()),
      level: 'info'
    })
  ]
});

export const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  }
};

/**
 * Creates a child logger with namespace for logging.
 *
 * @param {String} namespace
 * @returns {Object}
 */
export const withNameSpace = (namespace: string) => {
  return logger.child({ namespace });
};

// Export logger instance
export default logger;
