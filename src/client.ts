import * as http from 'http';
import * as https from 'https';

import { AxiosRequestConfig } from 'axios';
import { Configuration, ConfigurationParameters } from './configuration';
import { ScubaApi } from './api';

export type MetricsClass = 'account' | 'bucket' | 'service';

export type ScubaClientParameters = Omit<
    ConfigurationParameters,
    'username' | 'password' | 'accessToken' | 'formDataCtor'
> & {
    host?: string;
    port?: number;
    useHttps?: boolean;
    key?: string;
    cert?: string;
    ca?: string;
    keepAlive?: boolean;
};

export type ScubaMetrics = {
    objectsTotal: number;
    bytesTotal: number;
    metricClass: string;
    resourceName: string;
};

function lpad(num: number, digits: number) {
    return num.toString().padStart(digits, '0');
}

export default class ScubaClient {
    private _api: ScubaApi;

    private _defaultReqOptions: { httpAgent: http.Agent; httpsAgent: https.Agent };

    constructor(params?: ScubaClientParameters) {
        const { basePath, host, port, useHttps, key, cert, ca, keepAlive } = params || {};
        const proto = useHttps ? 'https' : 'http';
        const _host = host || 'localhost';
        const _port = port || 8100;
        const _basePath = basePath || '';
        const connectionString = `${proto}://${_host}:${_port}${_basePath}`;

        this._defaultReqOptions = {
            httpAgent: new http.Agent({ keepAlive: keepAlive || false }),
            httpsAgent: new https.Agent({
                keepAlive: keepAlive || false,
                cert: cert || undefined,
                key: key || undefined,
                ca: ca ? [ca] : undefined,
            }),
        };

        // If basePath is a FQDN then it overrides the baked in config from the spec
        this._api = new ScubaApi(new Configuration({ ...params, basePath: connectionString }));
    }

    async getLatestMetrics(
        metricsClass: MetricsClass,
        resourceName: string,
        options?: AxiosRequestConfig,
    ): Promise<ScubaMetrics> {
        const resp = (await this._api.getLatestMetrics(metricsClass, resourceName, undefined, {
            ...this._defaultReqOptions,
            ...options,
        })) as any;
        return resp.data;
    }

    async getMetrics(
        metricsClass: MetricsClass,
        resourceName: string,
        date: Date,
        options?: AxiosRequestConfig,
    ): Promise<ScubaMetrics> {
        const year = lpad(date.getFullYear(), 4);
        const month = lpad(date.getMonth() + 1, 2);
        const day = lpad(date.getUTCDate(), 2);
        const dateString = `${year}-${month}-${day}`;
        const resp = (await this._api.getMetrics(metricsClass, resourceName, dateString, undefined, {
            ...this._defaultReqOptions,
            ...options,
        })) as any;
        return resp.data;
    }
}
