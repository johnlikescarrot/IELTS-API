import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';
import { ConfigError } from '../src/lib/errors.js';

describe('loadConfig', () => {
  it('returns defaults for an empty environment', () => {
    const config = loadConfig({});
    expect(config).toEqual({
      env: 'development',
      port: 3000,
      host: '0.0.0.0',
      logLevel: 'info',
      corsOrigins: true
    });
  });

  it('coerces numeric strings for PORT', () => {
    const config = loadConfig({ PORT: '8080' });
    expect(config.port).toBe(8080);
  });

  it('maps * to reflect any CORS origin', () => {
    expect(loadConfig({ CORS_ORIGINS: '*' }).corsOrigins).toBe(true);
    expect(loadConfig({ CORS_ORIGINS: ' * ' }).corsOrigins).toBe(true);
  });

  it('parses a comma-separated CORS allow-list and drops empty entries', () => {
    const config = loadConfig({ CORS_ORIGINS: 'https://a.com, , https://b.com,' });
    expect(config.corsOrigins).toEqual(['https://a.com', 'https://b.com']);
  });

  it('produces an empty allow-list when only blanks are given', () => {
    const config = loadConfig({ CORS_ORIGINS: ' , , ' });
    expect(config.corsOrigins).toEqual([]);
  });

  it('accepts every valid log level', () => {
    for (const level of ['fatal', 'error', 'warn', 'info', 'debug', 'trace']) {
      expect(loadConfig({ LOG_LEVEL: level }).logLevel).toBe(level);
    }
  });

  it('accepts all NODE_ENV values', () => {
    expect(loadConfig({ NODE_ENV: 'test' }).env).toBe('test');
    expect(loadConfig({ NODE_ENV: 'production' }).env).toBe('production');
  });

  it('rejects a non-numeric PORT with a ConfigError carrying field details', () => {
    expect(() => loadConfig({ PORT: 'not-a-port' })).toThrow(ConfigError);
    try {
      loadConfig({ PORT: 'not-a-port' });
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      const configError = error as ConfigError;
      expect(configError.statusCode).toBe(500);
      expect(configError.code).toBe('config_error');
      expect(configError.details).toBeDefined();
    }
  });

  it('rejects out-of-range ports and unknown log levels', () => {
    expect(() => loadConfig({ PORT: '99999' })).toThrow(ConfigError);
    expect(() => loadConfig({ LOG_LEVEL: 'loud' })).toThrow(ConfigError);
    expect(() => loadConfig({ NODE_ENV: 'staging' })).toThrow(ConfigError);
  });
});
