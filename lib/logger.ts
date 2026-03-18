/**
 * lib/logger.ts
 * Centralized structured logger for QA-Copilot.
 * Outputs timestamped, color-coded log entries with module context.
 * Compatible with PM2, Docker, and standard stdout/stderr.
 */

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

const LOG_COLORS: Record<LogLevel, string> = {
    DEBUG: "\x1b[36m",  // Cyan
    INFO:  "\x1b[32m",  // Green
    WARN:  "\x1b[33m",  // Yellow
    ERROR: "\x1b[31m",  // Red
};
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

// Minimum log level from env: LOG_LEVEL=DEBUG|INFO|WARN|ERROR (default: INFO)
const LEVEL_PRIORITY: Record<LogLevel, number> = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const MIN_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) || "INFO";

function shouldLog(level: LogLevel): boolean {
    return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[MIN_LEVEL];
}

function timestamp(): string {
    return new Date().toISOString();
}

function formatMessage(level: LogLevel, module: string, message: string, meta?: Record<string, any>): string {
    const color = LOG_COLORS[level];
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
    return `${color}${BOLD}[${level}]${RESET} ${timestamp()} ${color}[${module}]${RESET} ${message}${metaStr}`;
}

/**
 * Create a scoped logger for a specific module.
 * Usage:
 *   const log = createLogger("BrowserLauncher");
 *   log.info("Browser launched", { headed: true });
 *   log.error("Launch failed", { error: err.message });
 */
export function createLogger(module: string) {
    return {
        debug(message: string, meta?: Record<string, any>) {
            if (shouldLog("DEBUG")) console.log(formatMessage("DEBUG", module, message, meta));
        },
        info(message: string, meta?: Record<string, any>) {
            if (shouldLog("INFO")) console.log(formatMessage("INFO", module, message, meta));
        },
        warn(message: string, meta?: Record<string, any>) {
            if (shouldLog("WARN")) console.warn(formatMessage("WARN", module, message, meta));
        },
        error(message: string, meta?: Record<string, any>) {
            if (shouldLog("ERROR")) console.error(formatMessage("ERROR", module, message, meta));
        },
    };
}
