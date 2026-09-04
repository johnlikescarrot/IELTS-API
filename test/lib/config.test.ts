import { describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG, parseCli, usage } from '../../src/lib/config.js';

describe('usage', () => {
  it('documents every flag', () => {
    const text = usage();
    for (const flag of ['--port', '--host', '--silent', '--help', '--version', 'PORT', 'HOST']) {
      expect(text).toContain(flag);
    }
  });
});

describe('parseCli', () => {
  it('returns defaults for no arguments', () => {
    expect(parseCli([])).toEqual({ kind: 'serve', config: DEFAULT_CONFIG });
  });

  it('recognises --help and -h', () => {
    expect(parseCli(['--help'])).toEqual({ kind: 'help' });
    expect(parseCli(['-h'])).toEqual({ kind: 'help' });
  });

  it('recognises --version and -v', () => {
    expect(parseCli(['--version'])).toEqual({ kind: 'version' });
    expect(parseCli(['-v'])).toEqual({ kind: 'version' });
  });

  it('parses --port and -p', () => {
    expect(parseCli(['--port', '8080'])).toEqual({
      kind: 'serve',
      config: { ...DEFAULT_CONFIG, port: 8080 },
    });
    expect(parseCli(['-p', '0'])).toEqual({ kind: 'serve', config: { ...DEFAULT_CONFIG, port: 0 } });
  });

  it('rejects a missing or malformed port', () => {
    expect(() => parseCli(['--port'])).toThrow(/requires a port number/);
    expect(() => parseCli(['--port', 'http'])).toThrow(/requires a port number/);
    expect(() => parseCli(['--port', '-1'])).toThrow(/requires a port number/);
  });

  it('rejects a port above 65535', () => {
    expect(() => parseCli(['--port', '70000'])).toThrow(/between 0 and 65535/);
  });

  it('parses --host and -H', () => {
    expect(parseCli(['--host', '127.0.0.1'])).toEqual({
      kind: 'serve',
      config: { ...DEFAULT_CONFIG, host: '127.0.0.1' },
    });
    expect(parseCli(['-H', 'localhost'])).toEqual({
      kind: 'serve',
      config: { ...DEFAULT_CONFIG, host: 'localhost' },
    });
  });

  it('rejects a missing host value', () => {
    expect(() => parseCli(['--host'])).toThrow(/requires a host address/);
    expect(() => parseCli(['--host', '--silent'])).toThrow(/requires a host address/);
  });

  it('parses --silent and -s', () => {
    expect(parseCli(['--silent'])).toEqual({ kind: 'serve', config: { ...DEFAULT_CONFIG, log: false } });
    expect(parseCli(['-s'])).toEqual({ kind: 'serve', config: { ...DEFAULT_CONFIG, log: false } });
  });

  it('rejects unknown flags', () => {
    expect(() => parseCli(['--nope'])).toThrow(/Unknown argument: --nope/);
  });

  it('applies PORT and HOST from the environment', () => {
    expect(parseCli([], { PORT: '4000', HOST: '127.0.0.1' })).toEqual({
      kind: 'serve',
      config: { host: '127.0.0.1', port: 4000, log: true },
    });
  });

  it('lets explicit arguments win over the environment', () => {
    expect(parseCli(['--port', '5000', '--host', '0.0.0.0'], { PORT: '4000', HOST: '127.0.0.1' })).toEqual({
      kind: 'serve',
      config: { host: '0.0.0.0', port: 5000, log: true },
    });
  });

  it('ignores malformed environment values', () => {
    expect(parseCli([], { PORT: 'not-a-port', HOST: '' })).toEqual({ kind: 'serve', config: DEFAULT_CONFIG });
    expect(parseCli([], { PORT: '70000' })).toEqual({ kind: 'serve', config: DEFAULT_CONFIG });
  });
});
