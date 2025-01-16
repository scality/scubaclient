import { AddressInfo } from 'net';
import { Server, createServer, IncomingMessage, ServerResponse } from 'http';
import { AxiosError } from 'axios';

import ScubaClient, { GetMetricsBatchResponse, ScubaMetrics, AdminResponseCseq } from '../src/client';
import { AdminActions, GetMetricsBatchBody } from '../src/api';
import { RequiredError } from '../src/base';

let response;
class MockScubaServer {
    server: Server;

    errorResponse: number | undefined;

    mockResponse: any;

    constructor() {
        this.server = createServer(this.requestListener.bind(this));
        this.mockResponse = null;
    }

    setMockResponse(response: any) {
        this.mockResponse = response;
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
                if (this.mockResponse) {
                    return res.end(JSON.stringify(this.mockResponse));
                }

                const body = JSON.parse(bodyStr);
                const urlSections = url?.split('/');

                // getMetricsLatest and getMetrics
                if (urlSections?.length === 5) {
                    response = <ScubaMetrics>{
                        metricsClass: urlSections[2],
                        resourceName: urlSections[3],
                        objectsTotal: '100',
                        bytesTotal: '1000',
                        date: '2024-12-06',
                    };

                    res.end(JSON.stringify(response));
                }

                // getMetricsBatch
                if (urlSections?.length === 3) {
                    const { resourceNames } = body;
                    response = <GetMetricsBatchResponse>{
                        metrics: [
                            {
                                metricsClass: urlSections[2],
                                resourceName: resourceNames[0],
                                metrics: [
                                    {
                                        objectsTotal: '100',
                                        bytesTotal: '1000',
                                        date: '2024-12-06',
                                    },
                                ],
                            },
                        ],
                    };

                    return res.end(JSON.stringify(response));
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
        mockServer.setMockResponse(null);
    });

    afterAll(async () => {
        await mockServer.close();
    });

    describe('Test getLatestMetrics', () => {
        it('should return a successful response received by scuba', async () => {
            const expectedResponse = {
                metricsClass,
                resourceName,
                objectsTotal: '100',
                bytesTotal: '1000',
                date: '2024-12-06',
            };

            await expect(scubaClient.getLatestMetrics('bucket', 'test-bucket')).resolves.toStrictEqual(
                expectedResponse,
            );
        });

        it('should handle responses with large numbers', async () => {
            const largeNumberResponse = {
                metricsClass,
                resourceName,
                objectsTotal: '9007199254740992',
                bytesTotal: '90071992547409920',
                date: '2024-12-06',
            };

            mockServer.setMockResponse(largeNumberResponse);
            await expect(scubaClient.getLatestMetrics('bucket', 'test-bucket')).resolves.toStrictEqual(
                largeNumberResponse,
            );
        });

        it('should throw when receiving an error response from scuba', async () => {
            let errorCode = 500;
            mockServer.setErrorResponse(errorCode);
            await expect(scubaClient.getLatestMetrics('bucket', 'test-bucket')).rejects.toThrowError(AxiosError);

            errorCode = 403;
            mockServer.setErrorResponse(errorCode);
            await expect(scubaClient.getLatestMetrics('bucket', 'test-bucket')).rejects.toMatchObject({
                response: {
                    status: errorCode,
                },
            });
        });
    });

    describe('Test getMetrics', () => {
        it('should return a successful response received by scuba', async () => {
            const expectedResponse = {
                metricsClass,
                resourceName,
                objectsTotal: '100',
                bytesTotal: '1000',
                date: '2024-12-06',
            };

            await expect(scubaClient.getMetrics('bucket', 'test-bucket', new Date())).resolves.toStrictEqual(
                expectedResponse,
            );
        });

        it('should handle responses with large numbers', async () => {
            const largeNumberResponse = {
                metricsClass,
                resourceName,
                objectsTotal: '9007199254740992',
                bytesTotal: '90071992547409920',
                date: '2024-12-06',
            };

            mockServer.setMockResponse(largeNumberResponse);
            await expect(scubaClient.getMetrics('bucket', 'test-bucket', new Date())).resolves.toStrictEqual(
                largeNumberResponse,
            );
        });

        it('should throw when receiving an error response from scuba', async () => {
            let errorCode = 500;
            mockServer.setErrorResponse(errorCode);
            await expect(scubaClient.getMetrics('bucket', 'test-bucket', new Date())).rejects.toThrowError(AxiosError);

            errorCode = 403;
            mockServer.setErrorResponse(errorCode);
            await expect(scubaClient.getMetrics('bucket', 'test-bucket', new Date())).rejects.toMatchObject({
                response: {
                    status: errorCode,
                },
            });
        });
    });

    describe('Test getMetricsBatch', () => {
        it('should return a successful response received by scuba', async () => {
            const expectedResponse = {
                metrics: [
                    {
                        metricsClass,
                        resourceName,
                        metrics: [
                            {
                                objectsTotal: '100',
                                bytesTotal: '1000',
                                date: '2024-12-06',
                            },
                        ],
                    },
                ],
            };

            await expect(
                scubaClient.getMetricsBatch('bucket', <GetMetricsBatchBody>{ resourceNames: ['test-bucket'] }),
            ).resolves.toStrictEqual(expectedResponse);
        });

        it('should handle responses with large numbers', async () => {
            const largeNumberResponse = {
                metrics: [
                    {
                        metricsClass,
                        resourceName,
                        metrics: [
                            {
                                objectsTotal: '9007199254740992', // Number.MAX_SAFE_INTEGER + 1
                                bytesTotal: '90071992547409920',
                                date: '2024-12-06',
                            },
                        ],
                    },
                ],
            };

            mockServer.setMockResponse(largeNumberResponse);
            await expect(
                scubaClient.getMetricsBatch('bucket', <GetMetricsBatchBody>{ resourceNames: ['test-bucket'] }),
            ).resolves.toStrictEqual(largeNumberResponse);
        });

        it('should throw when receiving an error response from scuba', async () => {
            let errorCode = 500;
            mockServer.setErrorResponse(errorCode);
            await expect(
                scubaClient.getMetricsBatch('bucket', <GetMetricsBatchBody>{ resourceNames: ['test-bucket'] }),
            ).rejects.toThrowError(AxiosError);

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
            await expect(scubaClient.getMetricsBatch('bucket', <GetMetricsBatchBody>{})).rejects.toThrowError(
                RequiredError,
            );
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
            await expect(scubaClient.admin(AdminActions.AdminReadRaftCseq, '1')).rejects.toThrowError(AxiosError);

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
            await expect(scubaClient.healthCheck()).rejects.toThrowError(AxiosError);

            errorCode = 403;
            mockServer.setErrorResponse(errorCode);
            await expect(scubaClient.healthCheck()).rejects.toMatchObject({
                response: {
                    status: errorCode,
                },
            });
        });

        it('should throw ECONNREFUSED when not able to connect to the server', async () => {
            mockServer.close();
            await expect(scubaClient.healthCheck()).rejects.toThrowError('ECONNREFUSED');
        });
    });
});
