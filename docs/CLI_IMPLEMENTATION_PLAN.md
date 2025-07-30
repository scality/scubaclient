# CLI Implementation Plan for Scuba API

## Overview
Create a command-line interface for the Scuba API that wraps the existing ScubaClient SDK functionality in a separate CLI folder.

## Proposed CLI Structure

### Main Commands
```bash
scuba [command] [subcommand] [options]

# Metrics commands
scuba metrics get --class <account|bucket|service|location> --resource <name> [--date YYYY-MM-DD]
scuba metrics get-latest --class <account|bucket|service|location> --resource <name>
scuba metrics batch --class <account|bucket|service|location> --resources <name1,name2> [--dates date1,date2]

# Sub-metrics commands  
scuba submetrics get --class <class> --resource <name> --type <type> --name <name> [--date YYYY-MM-DD]
scuba submetrics get-latest --class <class> --resource <name> --type <type> --name <name>

# Health check
scuba health

# Admin commands (require admin privileges)
scuba admin start-ingest --session-id <id>
scuba admin stop-ingest --session-id <id>
scuba admin read-raft --session-id <id>
scuba admin trigger-repair --session-id <id>

# Internal commands
scuba internal account-metrics --canonical-id <id>
```

## Implementation Tasks

### 1. Setup CLI Framework in Separate Folder
- Create separate `cli/` directory at root level (parallel to `src/`)
- Add dependencies: `commander` for CLI parsing, `chalk` for colored output
- CLI will import and use the existing `src/` SDK as a dependency

### 2. Core CLI Infrastructure
- **Connection management**: Support configuration via:
  - CLI flags: `--host`, `--port`, `--https`, `--cert`, `--key`, `--ca`
  - Environment variables: `SCUBA_HOST`, `SCUBA_PORT`, `SCUBA_HTTPS`, `SCUBA_CERT`, `SCUBA_KEY`, `SCUBA_CA`
  - Config file: `~/.scuba/config.json`
- **Authentication**: Support credentials via:
  - Environment variables: `ACCESS_KEY_ID`, `SECRET_ACCESS_KEY`, `REGION`
  - Config file with credential profiles
  - CLI flags: `--access-key-id`, `--secret-access-key`, `--region`
- **Error handling**: Graceful error messages with exit codes
- **Configuration precedence**: CLI flags > env vars > config file > defaults

### 3. Command Implementation
- **Metrics commands**: Implement get, get-latest, batch operations
- **Sub-metrics commands**: Handle sub-metric specific operations  
- **Health command**: Simple health check with colored status output
- **Admin commands**: Protected admin operations with confirmation prompts

### 4. Output Formatting
- **JSON output**: `--json` flag for machine-readable output
- **Table output**: Default human-readable table format using `cli-table3`
- **Raw output**: `--raw` flag for minimal output

### 5. Environment Variables Support
- **Connection**: `SCUBA_HOST`, `SCUBA_PORT`, `SCUBA_HTTPS`, `SCUBA_CERT`, `SCUBA_KEY`, `SCUBA_CA`, `SCUBA_KEEP_ALIVE`
- **Authentication**: `ACCESS_KEY_ID`, `SECRET_ACCESS_KEY`, `REGION`
- **Behavior**: `SCUBA_OUTPUT_FORMAT` (json|table|raw)

### 6. Build & Distribution
- Update `package.json` with `bin` field pointing to CLI executable
- Add TypeScript compilation for CLI components
- Create separate `tsconfig.json` for CLI if needed
- Update build scripts to include CLI in distribution

## File Structure
```
cli/                       # Separate CLI folder
├── package.json           # CLI-specific dependencies
├── tsconfig.json          # CLI TypeScript config
├── src/
│   ├── index.ts           # CLI entry point
│   ├── commands/          # Command implementations
│   │   ├── metrics.ts
│   │   ├── submetrics.ts
│   │   ├── health.ts
│   │   ├── admin.ts
│   │   └── internal.ts
│   ├── utils/             # CLI utilities
│   │   ├── config.ts      # Configuration management
│   │   ├── auth.ts        # Authentication helpers
│   │   ├── output.ts      # Output formatting
│   │   └── errors.ts      # Error handling
│   └── types.ts           # CLI-specific types
├── bin/
│   └── scuba              # CLI executable script
└── README.md              # CLI documentation

src/                       # Existing SDK (unchanged)
├── client.ts
├── api.ts
└── ...
```

## Configuration Example
```json
// ~/.scuba/config.json
{
  "default": {
    "host": "localhost",
    "port": 8100,
    "https": false,
    "auth": {
      "accessKeyId": "...",
      "secretAccessKey": "...",
      "region": "us-east-1"
    }
  },
  "production": {
    "host": "scuba.prod.com",
    "port": 443,
    "https": true
  }
}
```

## Detailed Implementation Steps

### Phase 1: Project Setup
1. Create `cli/` directory structure
2. Initialize CLI-specific `package.json` with dependencies
3. Set up TypeScript configuration for CLI
4. Create basic CLI entry point with commander.js

### Phase 2: Core Infrastructure
1. Implement configuration management (`utils/config.ts`)
2. Set up authentication helpers (`utils/auth.ts`)
3. Create output formatting utilities (`utils/output.ts`)
4. Implement error handling (`utils/errors.ts`)

### Phase 3: Command Implementation
1. Implement metrics commands (`commands/metrics.ts`)
2. Implement sub-metrics commands (`commands/submetrics.ts`)
3. Implement health check command (`commands/health.ts`)
4. Implement admin commands (`commands/admin.ts`)
5. Implement internal commands (`commands/internal.ts`)

### Phase 4: Integration & Testing
1. Update root `package.json` for CLI distribution
2. Create executable script (`bin/scuba`)
3. Test CLI commands against mock/real Scuba service
4. Write CLI documentation

### Phase 5: Advanced Features
1. Add shell completion support
2. Implement config file profiles
3. Add verbose/debug logging options
4. Create man pages or help documentation

## CLI Flag Specifications

### Global Flags
- `--host <host>` - Scuba service host (env: `SCUBA_HOST`)
- `--port <port>` - Scuba service port (env: `SCUBA_PORT`)
- `--https` - Use HTTPS connection (env: `SCUBA_HTTPS`)
- `--cert <path>` - Client certificate path (env: `SCUBA_CERT`)
- `--key <path>` - Client key path (env: `SCUBA_KEY`)
- `--ca <path>` - CA certificate path (env: `SCUBA_CA`)
- `--access-key-id <id>` - Access key ID (env: `ACCESS_KEY_ID`)
- `--secret-access-key <key>` - Secret access key (env: `SECRET_ACCESS_KEY`)
- `--region <region>` - AWS region (env: `REGION`)
- `--profile <name>` - Configuration profile to use
- `--json` - Output in JSON format
- `--raw` - Output raw response
- `--verbose, -v` - Verbose output
- `--help, -h` - Show help
- `--version, -V` - Show version

### Command-Specific Flags
- `--class <type>` - Metrics class (account|bucket|service|location)
- `--resource <name>` - Resource name
- `--date <YYYY-MM-DD>` - Specific date for metrics
- `--resources <names>` - Comma-separated resource names for batch
- `--dates <dates>` - Comma-separated dates for batch
- `--type <type>` - Sub-metric type
- `--name <name>` - Sub-metric name
- `--session-id <id>` - Admin session ID
- `--canonical-id <id>` - Account canonical ID

## Implementation Code Examples and Guidance

### 1. CLI Entry Point (`cli/src/index.ts`)

```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import { setupMetricsCommands } from './commands/metrics';
import { setupSubmetricsCommands } from './commands/submetrics';
import { setupHealthCommand } from './commands/health';
import { setupAdminCommands } from './commands/admin';
import { setupInternalCommands } from './commands/internal';
import { loadConfig } from './utils/config';
import { handleError } from './utils/errors';

const program = new Command();

program
  .name('scuba')
  .description('Scuba API CLI tool')
  .version('1.0.0')
  .option('--host <host>', 'Scuba service host')
  .option('--port <port>', 'Scuba service port', parseInt)
  .option('--https', 'Use HTTPS connection')
  .option('--cert <path>', 'Client certificate path')
  .option('--key <path>', 'Client key path')
  .option('--ca <path>', 'CA certificate path')
  .option('--access-key-id <id>', 'Access key ID')
  .option('--secret-access-key <key>', 'Secret access key')
  .option('--region <region>', 'AWS region')
  .option('--profile <name>', 'Configuration profile')
  .option('--json', 'Output in JSON format')
  .option('--raw', 'Output raw response')
  .option('--verbose, -v', 'Verbose output');

// Setup command groups
setupMetricsCommands(program);
setupSubmetricsCommands(program);
setupHealthCommand(program);
setupAdminCommands(program);
setupInternalCommands(program);

// Global error handling
process.on('unhandledRejection', handleError);
process.on('uncaughtException', handleError);

program.parseAsync().catch(handleError);
```

### 2. Configuration Management (`cli/src/utils/config.ts`)

```typescript
import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { ScubaClientParameters } from '../../../src/client';

export interface CLIConfig {
  host?: string;
  port?: number;
  https?: boolean;
  cert?: string;
  key?: string;
  ca?: string;
  keepAlive?: boolean;
  auth?: {
    accessKeyId?: string;
    secretAccessKey?: string;
    region?: string;
  };
  outputFormat?: 'json' | 'table' | 'raw';
}

export interface ConfigProfiles {
  [profileName: string]: CLIConfig;
}

export function loadConfig(profile = 'default', cliOptions: any = {}): ScubaClientParameters {
  // Configuration precedence: CLI flags > env vars > config file > defaults
  const config: CLIConfig = {
    // Defaults
    host: 'localhost',
    port: 8100,
    https: false,
    keepAlive: false,
    auth: {
      region: 'us-east-1'
    }
  };

  // Load from config file
  const configPath = join(homedir(), '.scuba', 'config.json');
  if (existsSync(configPath)) {
    try {
      const fileConfig: ConfigProfiles = JSON.parse(readFileSync(configPath, 'utf8'));
      if (fileConfig[profile]) {
        Object.assign(config, fileConfig[profile]);
      }
    } catch (error) {
      console.warn(`Warning: Could not parse config file ${configPath}`);
    }
  }

  // Override with environment variables
  if (process.env.SCUBA_HOST) config.host = process.env.SCUBA_HOST;
  if (process.env.SCUBA_PORT) config.port = parseInt(process.env.SCUBA_PORT);
  if (process.env.SCUBA_HTTPS) config.https = process.env.SCUBA_HTTPS === 'true';
  if (process.env.SCUBA_CERT) config.cert = process.env.SCUBA_CERT;
  if (process.env.SCUBA_KEY) config.key = process.env.SCUBA_KEY;
  if (process.env.SCUBA_CA) config.ca = process.env.SCUBA_CA;
  if (process.env.SCUBA_KEEP_ALIVE) config.keepAlive = process.env.SCUBA_KEEP_ALIVE === 'true';
  if (process.env.ACCESS_KEY_ID) config.auth!.accessKeyId = process.env.ACCESS_KEY_ID;
  if (process.env.SECRET_ACCESS_KEY) config.auth!.secretAccessKey = process.env.SECRET_ACCESS_KEY;
  if (process.env.REGION) config.auth!.region = process.env.REGION;

  // Override with CLI options
  if (cliOptions.host) config.host = cliOptions.host;
  if (cliOptions.port) config.port = cliOptions.port;
  if (cliOptions.https) config.https = cliOptions.https;
  if (cliOptions.cert) config.cert = cliOptions.cert;
  if (cliOptions.key) config.key = cliOptions.key;
  if (cliOptions.ca) config.ca = cliOptions.ca;
  if (cliOptions.accessKeyId) config.auth!.accessKeyId = cliOptions.accessKeyId;
  if (cliOptions.secretAccessKey) config.auth!.secretAccessKey = cliOptions.secretAccessKey;
  if (cliOptions.region) config.auth!.region = cliOptions.region;

  // Convert to ScubaClientParameters
  return {
    host: config.host,
    port: config.port,
    useHttps: config.https,
    cert: config.cert,
    key: config.key,
    ca: config.ca,
    keepAlive: config.keepAlive,
    auth: config.auth?.accessKeyId ? {
      awsV4: {
        credentials: {
          accessKeyId: config.auth.accessKeyId,
          secretAccessKey: config.auth.secretAccessKey!
        },
        region: config.auth.region
      }
    } : undefined
  };
}
```

### 3. Output Formatting (`cli/src/utils/output.ts`)

```typescript
import Table from 'cli-table3';
import chalk from 'chalk';
import { ScubaMetrics } from '../../../src/client';

export interface OutputOptions {
  format: 'json' | 'table' | 'raw';
  verbose?: boolean;
}

export function formatMetricsOutput(metrics: ScubaMetrics | ScubaMetrics[], options: OutputOptions): string {
  if (options.format === 'json') {
    return JSON.stringify(metrics, null, 2);
  }

  if (options.format === 'raw') {
    return Array.isArray(metrics) 
      ? metrics.map(m => `${m.resourceName}: ${m.bytesTotal} bytes, ${m.objectsTotal} objects`).join('\n')
      : `${metrics.resourceName}: ${metrics.bytesTotal} bytes, ${metrics.objectsTotal} objects`;
  }

  // Table format (default)
  const table = new Table({
    head: ['Resource', 'Class', 'Date', 'Bytes Total', 'Objects Total'].map(h => chalk.cyan(h)),
    colWidths: [20, 15, 12, 15, 15]
  });

  const metricsArray = Array.isArray(metrics) ? metrics : [metrics];
  
  metricsArray.forEach(metric => {
    table.push([
      metric.resourceName,
      metric.metricsClass,
      metric.date,
      formatBytes(metric.bytesTotal),
      metric.objectsTotal.toLocaleString()
    ]);
  });

  return table.toString();
}

export function formatHealthOutput(health: any, options: OutputOptions): string {
  if (options.format === 'json') {
    return JSON.stringify(health, null, 2);
  }

  if (options.format === 'raw') {
    return health.date ? `OK - ${health.date}` : 'OK';
  }

  return health.date 
    ? chalk.green(`✓ Scuba service is healthy (${health.date})`)
    : chalk.green('✓ Scuba service is healthy');
}

function formatBytes(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}
```

### 4. Error Handling (`cli/src/utils/errors.ts`)

```typescript
import chalk from 'chalk';
import { AxiosError } from 'axios';

export function handleError(error: any): never {
  if (error.isAxiosError) {
    const axiosError = error as AxiosError;
    if (axiosError.response) {
      console.error(chalk.red(`HTTP ${axiosError.response.status}: ${axiosError.response.statusText}`));
      if (axiosError.response.data) {
        console.error(chalk.red(JSON.stringify(axiosError.response.data, null, 2)));
      }
    } else if (axiosError.request) {
      console.error(chalk.red('Network error: Unable to connect to Scuba service'));
    } else {
      console.error(chalk.red(`Request error: ${axiosError.message}`));
    }
  } else if (error instanceof Error) {
    console.error(chalk.red(`Error: ${error.message}`));
  } else {
    console.error(chalk.red(`Unknown error: ${error}`));
  }
  
  process.exit(1);
}

export function validateRequired(value: any, name: string): void {
  if (!value) {
    throw new Error(`${name} is required`);
  }
}
```

### 5. Metrics Commands (`cli/src/commands/metrics.ts`)

```typescript
import { Command } from 'commander';
import ScubaClient, { MetricsClass } from '../../../../src/client';
import { loadConfig } from '../utils/config';
import { formatMetricsOutput, OutputOptions } from '../utils/output';
import { handleError, validateRequired } from '../utils/errors';

export function setupMetricsCommands(program: Command): void {
  const metrics = program
    .command('metrics')
    .description('Metrics operations');

  // scuba metrics get
  metrics
    .command('get')
    .description('Get metrics for a specific resource and date')
    .requiredOption('--class <type>', 'Metrics class (account|bucket|service|location)')
    .requiredOption('--resource <name>', 'Resource name')
    .option('--date <YYYY-MM-DD>', 'Specific date (defaults to today)')
    .action(async (options, cmd) => {
      try {
        validateRequired(options.class, 'class');
        validateRequired(options.resource, 'resource');

        const config = loadConfig(cmd.parent.opts().profile, cmd.parent.opts());
        const client = new ScubaClient(config);

        const date = options.date ? new Date(options.date) : new Date();
        const metrics = await client.getMetrics(
          options.class as MetricsClass,
          options.resource,
          date
        );

        const outputOptions: OutputOptions = {
          format: cmd.parent.opts().json ? 'json' : cmd.parent.opts().raw ? 'raw' : 'table',
          verbose: cmd.parent.opts().verbose
        };

        console.log(formatMetricsOutput(metrics, outputOptions));
      } catch (error) {
        handleError(error);
      }
    });

  // scuba metrics get-latest
  metrics
    .command('get-latest')
    .description('Get latest metrics for a resource')
    .requiredOption('--class <type>', 'Metrics class (account|bucket|service|location)')
    .requiredOption('--resource <name>', 'Resource name')
    .action(async (options, cmd) => {
      try {
        validateRequired(options.class, 'class');
        validateRequired(options.resource, 'resource');

        const config = loadConfig(cmd.parent.opts().profile, cmd.parent.opts());
        const client = new ScubaClient(config);

        const metrics = await client.getLatestMetrics(
          options.class as MetricsClass,
          options.resource
        );

        const outputOptions: OutputOptions = {
          format: cmd.parent.opts().json ? 'json' : cmd.parent.opts().raw ? 'raw' : 'table',
          verbose: cmd.parent.opts().verbose
        };

        console.log(formatMetricsOutput(metrics, outputOptions));
      } catch (error) {
        handleError(error);
      }
    });

  // scuba metrics batch
  metrics
    .command('batch')
    .description('Get batch metrics for multiple resources')
    .requiredOption('--class <type>', 'Metrics class (account|bucket|service|location)')
    .requiredOption('--resources <names>', 'Comma-separated resource names')
    .option('--dates <dates>', 'Comma-separated dates (YYYY-MM-DD format)')
    .action(async (options, cmd) => {
      try {
        validateRequired(options.class, 'class');
        validateRequired(options.resources, 'resources');

        const config = loadConfig(cmd.parent.opts().profile, cmd.parent.opts());
        const client = new ScubaClient(config);

        const resourceNames = options.resources.split(',').map((s: string) => s.trim());
        const dates = options.dates ? options.dates.split(',').map((s: string) => s.trim()) : undefined;

        const batchBody = {
          resourceNames,
          dates
        };

        const metrics = await client.getMetricsBatch(
          options.class as MetricsClass,
          batchBody
        );

        const outputOptions: OutputOptions = {
          format: cmd.parent.opts().json ? 'json' : cmd.parent.opts().raw ? 'raw' : 'table',
          verbose: cmd.parent.opts().verbose
        };

        console.log(JSON.stringify(metrics, null, 2)); // Batch results are complex, use JSON
      } catch (error) {
        handleError(error);
      }
    });
}
```

### 6. Package.json Setup (`cli/package.json`)

```json
{
  "name": "scuba-cli",
  "version": "1.0.0",
  "description": "Command-line interface for Scuba API",
  "main": "lib/index.js",
  "bin": {
    "scuba": "./bin/scuba"
  },
  "scripts": {
    "build": "tsc",
    "dev": "ts-node src/index.ts",
    "test": "jest"
  },
  "dependencies": {
    "commander": "^9.4.1",
    "chalk": "^4.1.2",
    "cli-table3": "^0.6.3"
  },
  "devDependencies": {
    "@types/node": "^18.11.11",
    "typescript": "^4.9.5",
    "ts-node": "^10.9.1"
  },
  "peerDependencies": {
    "scubaclient": "^1.1.1"
  }
}
```

### 7. Executable Script (`cli/bin/scuba`)

```bash
#!/usr/bin/env node
require('../lib/index.js');
```

### 8. TypeScript Configuration (`cli/tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "es2018",
    "module": "commonjs",
    "lib": ["es2018"],
    "outDir": "./lib",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "lib", "**/*.test.ts"]
}
```

## Implementation Guidelines for Agents

1. **Start with CLI structure**: Create the directory structure first, then implement each component incrementally
2. **Use existing ScubaClient**: Import and instantiate the existing client, don't reimplement API calls
3. **Follow commander.js patterns**: Use commander's fluent API for consistent CLI behavior
4. **Handle configuration layering**: Implement the precedence order (CLI flags > env vars > config file > defaults)
5. **Add comprehensive error handling**: Catch and format all possible error types (network, validation, etc.)
6. **Test incrementally**: Test each command as you implement it
7. **Use TypeScript throughout**: Maintain type safety by importing types from the SDK

This implementation approach keeps the CLI completely separate from the SDK while allowing it to leverage the existing ScubaClient functionality.