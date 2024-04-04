# Scuba Client Library

This repository provides a client library for the Scuba service.
The repository also provides a CLI binary to interact with the
Scuba Service.

The supported operations are:

- Get the utilization metrics at a given time
- Get the latest utilization metrics
- Check the health of the Scuba service

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
