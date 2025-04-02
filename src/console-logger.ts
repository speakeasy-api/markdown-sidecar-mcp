export const consoleLoggerLevels = [
  "debug",
  "warning",
  "info",
  "error",
] as const;

export type ConsoleLoggerLevel = (typeof consoleLoggerLevels)[number];

export type ConsoleLogger = {
  [key in ConsoleLoggerLevel]: (
    message: string,
    data?: Record<string, unknown>,
  ) => void;
};

export function createConsoleLogger(level: ConsoleLoggerLevel): ConsoleLogger {
  const min = consoleLoggerLevels.indexOf(level);
  const noop = () => {};

  const logger: ConsoleLogger = {
    debug: noop,
    warning: noop,
    info: noop,
    error: noop,
  };

  return consoleLoggerLevels.reduce((logger, level, i) => {
    if (i < min) {
      return logger;
    }

    logger[level] = log.bind(null, level);

    return logger;
  }, logger);
}

function log(
  level: ConsoleLoggerLevel,
  message: string,
  data?: Record<string, unknown>,
) {
  let line = "";
  const allData = [{ msg: message, l: level }, data];

  for (const ctx of allData) {
    for (const [key, value] of Object.entries(ctx || {})) {
      if (value == null) {
        line += ` ${key}=<${value}>`;
      } else if (typeof value === "function") {
        line += ` ${key}=<function>`;
      } else if (typeof value === "symbol") {
        line += ` ${key}=${value.toString()}`;
      } else if (typeof value === "string") {
        const v = value.search(/\s/g) >= 0 ? JSON.stringify(value) : value;
        line += ` ${key}=${v}`;
      } else if (typeof value !== "object") {
        line += ` ${key}=${value}`;
      } else {
        line += ` ${key}="${JSON.stringify(value)}"`;
      }
    }
  }

  console.error(line);
}
