import { AddressInfo } from 'net';
import { Server, createServer, IncomingMessage, ServerResponse } from 'http';
import { AxiosError } from 'axios';

import ScubaClient, { GetMetricsBatchResponse, ScubaMetrics, AdminResponseCseq } from '../src/client';
import { AdminActions, GetMetricsBatchBody } from '../src/api';
import { RequiredError } from '../src/base';

let response;
class MockScubaServer {
    server: Server;

    // Used to generate different metrics values for each APi
    reqId: number;

    errorResponse: number | undefined;

    constructor() {
        this.server = createServer(this.requestListener.bind(this));
    }

    requestListener(req: IncomingMessage, res: ServerResponse) {
        const { method, url } = req;
        if (this.errorResponse !== undefined) {
            // eslint-disable-next-line no-param-reassign
            res.statusCode = this.errorResponse;
            this.errorResponse = undefined;
            return res.end();
        }

        if (method === 'GET') {
            if (url?.startsWith('/health')) {
                // eslint-disable-next-line no-param-reassign
                res.statusCode = 204;
                return res.end();
            }
        }

        if (method === 'PUT') {
            if (url?.startsWith('/admin')) {
                response = <AdminResponseCseq>{
                    sessionId: '1',
                    cseq: 42,
                };

                return res.end(JSON.stringify(response));
            }
        }

        if (method === 'POST') {
            let bodyStr = '';

            req.on('data', chunk => {
                bodyStr += chunk.toString();
            });

            req.on('end', () => {
                const body = JSON.parse(bodyStr);
                const urlSections = url?.split('/');

                // getMetricsLatest and getMetrics
                if (urlSections?.length === 5) {
                    if (urlSections[4] === 'latest') {
                        this.reqId = 1;
                    } else {
                        this.reqId = 2;
                    }

                    response = <ScubaMetrics>{
                        metricsClass: urlSections[2],
                        resourceName: urlSections[3],
                        objectsTotal: this.reqId,
                        bytesTotal: 10 * this.reqId,
                        date: '2024-12-06',
                    };

                    res.end(JSON.stringify(response));
                }

                // getMetricsBatch
                if (urlSections?.length === 3) {
                    this.reqId = 3;

                    const { resourceNames } = body;
                    response = <GetMetricsBatchResponse>{
                        metrics: [
                            {
                                metricsClass: urlSections[2],
                                resourceName: resourceNames[0],
                                metrics: [
                                    {
                                        objectsTotal: this.reqId,
                                        bytesTotal: 10 * this.reqId,
                                        date: '2024-12-06',
                                    },
                                ],
                            },
                        ],
                    };

                    return res.end(JSON.stringify(response));
                }

                // getLatestSubMetrics and getSubMetrics
                if (urlSections?.length === 7) {
                    this.reqId = 4;

                    response = <ScubaMetrics>{
                        metricsClass: urlSections[2],
                        resourceName: urlSections[3],
                        objectsTotal: this.reqId,
                        bytesTotal: 10 * this.reqId,
                        date: '2024-12-06',
                    };

                    res.end(JSON.stringify(response));
                }

                return res.end();
            });
        }

        return undefined;
    }

    setErrorResponse(code: number) {
        this.errorResponse = code;
    }

    async start(): Promise<number> {
        return new Promise(resolve => {
            this.server.listen(0, () => {
                resolve((this.server?.address() as AddressInfo).port);
            });
        });
    }

    async close(): Promise<void> {
        return new Promise<void>(resolve => {
            this.server.close(() => resolve());
        });
    }
}

describe('Test client', () => {
    let mockServer: MockScubaServer;
    let scubaClient: ScubaClient;
    let port: number;
    const metricsClass = 'bucket';
    const resourceName = 'test-bucket';

    beforeAll(async () => {
        mockServer = new MockScubaServer();
        port = await mockServer.start();
    });

    beforeEach(async () => {
        scubaClient = new ScubaClient({ port });
    });

    afterAll(async () => {
        await mockServer.close();
    });

    describe('Test getLatestMetrics', () => {
        it('should return a successful response received by scuba', async () => {
            const response = {
                metricsClass,
                resourceName,
                objectsTotal: 1,
                bytesTotal: 10,
                date: '2024-12-06',
            };

            await expect(scubaClient.getLatestMetrics('bucket', 'test-bucket')).resolves.toStrictEqual(response);
        });

        it('should throw when receiving an error response from scuba', async () => {
            let errorCode = 500;

            mockServer.setErrorResponse(errorCode);
            await expect(scubaClient.getLatestMetrics('bucket', 'test-bucket')).rejects.toThrow(AxiosError);

            errorCode = 403;
            mockServer.setErrorResponse(errorCode);
            await expect(scubaClient.getLatestMetrics('bucket', 'test-bucket')).rejects.toMatchObject({
                response: {
                    status: errorCode,
                },
            });
        });
    });

    describe('Test getLatestSubMetrics', () => {
        it('should return a successful response received by scuba', async () => {
            const response = {
                metricsClass,
                resourceName,
                objectsTotal: 4,
                bytesTotal: 40,
                date: '2024-12-06',
            };

            await expect(
                scubaClient.getLatestSubMetrics('bucket', 'test-bucket', 'location', 'location1'),
            ).resolves.toStrictEqual(response);
        });

        it('should throw when receiving an error response from scuba', async () => {
            let errorCode = 500;

            mockServer.setErrorResponse(errorCode);
            await expect(
                scubaClient.getLatestSubMetrics('bucket', 'test-bucket', 'location', 'location1'),
            ).rejects.toThrow(AxiosError);

            errorCode = 403;
            mockServer.setErrorResponse(errorCode);
            await expect(
                scubaClient.getLatestSubMetrics('bucket', 'test-bucket', 'location', 'location1'),
            ).rejects.toMatchObject({
                response: {
                    status: errorCode,
                },
            });
        });
    });

    describe('Test getMetrics', () => {
        it('should return a successful response received by scuba', async () => {
            const response = {
                metricsClass,
                resourceName,
                objectsTotal: 2,
                bytesTotal: 20,
                date: '2024-12-06',
            };

            await expect(scubaClient.getMetrics('bucket', 'test-bucket', new Date())).resolves.toStrictEqual(response);
        });

        it('should throw when receiving an error response from scuba', async () => {
            let errorCode = 500;
            mockServer.setErrorResponse(errorCode);
            await expect(scubaClient.getMetrics('bucket', 'test-bucket', new Date())).rejects.toThrow(AxiosError);

            errorCode = 403;
            mockServer.setErrorResponse(errorCode);
            await expect(scubaClient.getMetrics('bucket', 'test-bucket', new Date())).rejects.toMatchObject({
                response: {
                    status: errorCode,
                },
            });
        });
    });

    describe('Test getSubMetrics', () => {
        it('should return a successful response received by scuba', async () => {
            const response = {
                metricsClass,
                resourceName,
                objectsTotal: 4,
                bytesTotal: 40,
                date: '2024-12-06',
            };

            await expect(
                scubaClient.getSubMetrics('bucket', 'test-bucket', new Date(), 'location', 'location1'),
            ).resolves.toStrictEqual(response);
        });

        it('should throw when receiving an error response from scuba', async () => {
            let errorCode = 500;
            mockServer.setErrorResponse(errorCode);
            await expect(
                scubaClient.getSubMetrics('bucket', 'test-bucket', new Date(), 'location', 'location1'),
            ).rejects.toThrow(AxiosError);

            errorCode = 403;
            mockServer.setErrorResponse(errorCode);
            await expect(
                scubaClient.getSubMetrics('bucket', 'test-bucket', new Date(), 'location', 'location1'),
            ).rejects.toMatchObject({
                response: {
                    status: errorCode,
                },
            });
        });
    });

    describe('Test geMetricsBatch', () => {
        it('should return a successful response received by scuba', async () => {
            const metricsClass = 'bucket';
            const resourceName = 'test-bucket';
            const response = {
                metrics: [
                    {
                        metricsClass,
                        resourceName,
                        metrics: [
                            {
                                objectsTotal: 3,
                                bytesTotal: 30,
                                date: '2024-12-06',
                            },
                        ],
                    },
                ],
            };

            await expect(
                scubaClient.getMetricsBatch('bucket', <GetMetricsBatchBody>{ resourceNames: ['test-bucket'] }),
            ).resolves.toStrictEqual(response);
        });

        it('should throw when receiving an error response from scuba', async () => {
            let errorCode = 500;
            mockServer.setErrorResponse(errorCode);
            await expect(
                scubaClient.getMetricsBatch('bucket', <GetMetricsBatchBody>{ resourceNames: ['test-bucket'] }),
            ).rejects.toThrow(AxiosError);

            errorCode = 403;
            mockServer.setErrorResponse(errorCode);
            await expect(
                scubaClient.getMetricsBatch('bucket', <GetMetricsBatchBody>{ resourceNames: ['test-bucket'] }),
            ).rejects.toMatchObject({
                response: {
                    status: errorCode,
                },
            });
        });

        it('should throw when the body does not include the resourceNames field', async () => {
            await expect(scubaClient.getMetricsBatch('bucket', <GetMetricsBatchBody>{})).rejects.toThrow(RequiredError);
        });
    });

    describe('Test admin', () => {
        it('should return a successful response received by scuba', async () => {
            const response = {
                sessionId: '1',
                cseq: 42,
            };

            await expect(scubaClient.admin(AdminActions.AdminReadRaftCseq, '1')).resolves.toStrictEqual(response);
        });

        it('should throw when receiving an error response from scuba', async () => {
            let errorCode = 500;
            mockServer.setErrorResponse(errorCode);
            await expect(scubaClient.admin(AdminActions.AdminReadRaftCseq, '1')).rejects.toThrow(AxiosError);

            errorCode = 403;
            mockServer.setErrorResponse(errorCode);
            await expect(scubaClient.admin(AdminActions.AdminReadRaftCseq, '1')).rejects.toMatchObject({
                response: {
                    status: errorCode,
                },
            });
        });
    });

    describe('Test healthCheck', () => {
        it('should return a successful response received by scuba', async () => {
            await expect(scubaClient.healthCheck()).resolves.toEqual('');
        });

        it('should throw when receiving an error response from scuba', async () => {
            let errorCode = 500;
            mockServer.setErrorResponse(errorCode);
            await expect(scubaClient.healthCheck()).rejects.toThrow(AxiosError);

            errorCode = 403;
            mockServer.setErrorResponse(errorCode);
            await expect(scubaClient.healthCheck()).rejects.toMatchObject({
                response: {
                    status: errorCode,
                },
            });
        });

        it('should throw ECONNREFUSED when not able to connect to the server', async () => {
            await mockServer.close();
            // When localhost resolves to both ::1 and 127.0.0.1, node reports the failed
            // connection as an AggregateError with an empty message, so match on the code.
            await expect(scubaClient.healthCheck()).rejects.toMatchObject({ code: 'ECONNREFUSED' });
        });
    });
});
