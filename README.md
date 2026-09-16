# Scuba Client Library

This repository provides a client library for the Scuba service.
The repository also provides a CLI binary to interact with the
Scuba Service.

The supported operations are:

- Get the utilization metrics at a given time
- Get the latest utilization metrics
- Check the health of the Scuba service

## Installation

```bash
yarn add @scality/scubaclient
```

The published package ships the compiled JavaScript along with its type
declarations, so nothing is built at install time and consumers do not
need a TypeScript compiler of their own.

The package was previously installed from git under the unscoped name
`scubaclient`, so existing consumers also need to update their imports:
`require('scubaclient')` becomes `require('@scality/scubaclient')`.

## Contributing

In order to contribute, please follow the
[Contributing Guidelines](
https://github.com/scality/Guidelines/blob/master/CONTRIBUTING.md).

## Prerequisite

- Recommended Node version: >16.x.
- Yarn must be installed to build the project.
- An Open API yaml file defining the routes to use.

Node.js can be installed from [nodejs.org](https://nodejs.org/en/download/) and
Yarn can be installed from [yarnpkg.com](https://yarnpkg.com/en/docs/install).

## Usage

To generate the client, run the following command:

```bash
./bin/generate-client.sh
```

### Authentication

ScubaClient supports AWS Signature Version 4 authentication. To use this
authentication method, you must have a set of credentials with permission
to perform the desired operations.

### Command-Line Interface

Command-line support is not yet available.
