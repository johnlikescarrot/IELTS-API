/**
 * Command-line configuration.
 */

/** Runtime configuration of the HTTP server. */
export interface ServerConfig {
  /** Interface to bind. */
  host: string;
  /** TCP port to bind. */
  port: number;
  /** Whether to print startup and request logs. */
  log: boolean;
}

/** Default configuration: bind all interfaces on port 3000. */
export const DEFAULT_CONFIG: ServerConfig = {
  host: '0.0.0.0',
  port: 3000,
  log: true,
};

/** Outcome of parsing command-line arguments. */
export type CliResult = { kind: 'serve'; config: ServerConfig } | { kind: 'help' } | { kind: 'version' };

/** Printable usage text. */
export function usage(): string {
  return [
    'ielts-api - a free, no-authentication IELTS research API',
    '',
    'Usage: ielts-api [options]',
    '',
    'Options:',
    '  -p, --port <number>   TCP port to bind (default: 3000, 0 = random free port)',
    '  -H, --host <address>  Interface to bind (default: 0.0.0.0)',
    '  -s, --silent          Disable startup and request logging',
    '  -h, --help            Show this help text',
    '  -v, --version         Print the version and exit',
    '',
    'Environment:',
    '  PORT                  Overrides --port when set',
    '  HOST                  Overrides --host when set',
    '',
    'Documentation: /docs        OpenAPI: /openapi.json',
  ].join('\n');
}

/**
 * Parse command-line arguments.
 *
 * @param argv - Arguments without the node executable and script path.
 * @param env - Environment overrides.
 * @throws {Error} When an unknown flag or an invalid value is supplied.
 */
export function parseCli(argv: readonly string[], env: NodeJS.ProcessEnv = {}): CliResult {
  const config: ServerConfig = { ...DEFAULT_CONFIG };
  let portFromArg = false;
  let hostFromArg = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index] as string;
    switch (argument) {
      case '-h':
      case '--help':
        return { kind: 'help' };
      case '-v':
      case '--version':
        return { kind: 'version' };
      case '-s':
      case '--silent':
        config.log = false;
        break;
      case '-p':
      case '--port': {
        const raw = argv[index + 1];
        index += 1;
        if (raw === undefined || !/^\d+$/.test(raw)) {
          throw new Error(`${argument} requires a port number between 0 and 65535`);
        }
        config.port = Number.parseInt(raw, 10);
        if (config.port > 65535) {
          throw new Error(`${argument} must be between 0 and 65535`);
        }
        portFromArg = true;
        break;
      }
      case '-H':
      case '--host': {
        const raw = argv[index + 1];
        index += 1;
        if (raw === undefined || raw.startsWith('-')) {
          throw new Error(`${argument} requires a host address`);
        }
        config.host = raw;
        hostFromArg = true;
        break;
      }
      default:
        throw new Error(`Unknown argument: ${argument}`);
    }
  }

  const envPort = env.PORT;
  if (!portFromArg && envPort !== undefined && /^\d+$/.test(envPort)) {
    const parsed = Number.parseInt(envPort, 10);
    if (parsed <= 65535) {
      config.port = parsed;
    }
  }
  const envHost = env.HOST;
  if (!hostFromArg && envHost !== undefined && envHost.length > 0) {
    config.host = envHost;
  }

  return { kind: 'serve', config };
}
