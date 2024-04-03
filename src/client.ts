import * as http from 'http';
import * as https from 'https';

import { SignatureV4 } from '@smithy/signature-v4';
import globalAxios, { AxiosRequestConfig, AxiosInstance, AxiosHeaders } from 'axios';
import { Sha256 } from '@aws-crypto/sha256-js';
import { URL } from 'url';
import { parse as parseQuerystring } from 'querystring';
import { ScubaApi } from './api';
import { Configuration, ConfigurationParameters } from './configuration';

export type MetricsClass = 'account' | 'bucket' | 'service';

type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type SignatureParameter = WithOptional<
    ConstructorParameters<typeof SignatureV4>[0],
    'service' | 'region' | 'sha256'
>;
export type ScubaAuth = {
    awsV4?: SignatureParameter;
};

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
    auth?: ScubaAuth;
};

export type ScubaMetrics = {
    objectsTotal: number;
    bytesTotal: number;
    metricsClass: string;
    resourceName: string;
    id?: number;
};

function lpad(num: number, digits: number) {
    return num.toString().padStart(digits, '0');
}

export default class ScubaClient {
    private _api: ScubaApi;

    private _defaultReqOptions: { httpAgent: http.Agent; httpsAgent: https.Agent };

    private _axios: AxiosInstance;

    /** Id of axios interceptor */
    private _authInterceptor: number | null = null;

    constructor(params?: ScubaClientParameters) {
        const { basePath, host, port, useHttps, key, cert, ca, keepAlive, auth } = params || {};
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

        this._axios = globalAxios.create();

        // If basePath is a FQDN then it overrides the baked in config from the spec
        this._api = new ScubaApi(new Configuration({ ...params, basePath: connectionString }), undefined, this._axios);

        if (auth) {
            this.setAuth(auth);
        }
    }

    /**
     * Remove current auth axios interceptor and add a new one
     * @param {ScubaAuth} auth Authentication method and options
     * @param {Aws4InterceptorParameter} [auth.awsV4] - parameters passed to aws4-axios
     * @return {undefined}
     */
    setAuth(auth: ScubaAuth): void {
        if (this._authInterceptor !== null && this._authInterceptor !== undefined) {
            this._axios.interceptors.request.eject(this._authInterceptor);
            this._authInterceptor = null;
        }

        if (auth.awsV4) {
            const signer = new SignatureV4({
                service: 's3',
                sha256: Sha256,
                region: 'us-east-1',
                ...auth.awsV4,
            });

            this._authInterceptor = this._axios.interceptors.request.use(async req => {
                const { host, hostname, pathname, protocol, search } = new URL(this._axios.getUri(req));
                // remove first char '?' from qs
                const query = parseQuerystring(search?.substring(1)) as Record<string, string | string[]>;

                const requestToSign = {
                    method: req.method?.toUpperCase()!,
                    headers: { host, ...(req.headers as Record<string, any>) },
                    body: req.data,
                    host,
                    hostname,
                    path: pathname,
                    protocol,
                    query,
                };
                const res = await signer.sign(requestToSign);

                // eslint-disable-next-line no-param-reassign
                req.headers = new AxiosHeaders(res.headers);
                return req;
            });
        }
    }

    async getLatestMetrics(
        metricsClass: MetricsClass,
        resourceName: string,
        options?: AxiosRequestConfig,
        body?: any,
    ): Promise<ScubaMetrics> {
        const resp = (await this._api.getLatestMetrics(metricsClass, resourceName, body, {
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
        body?: any,
    ): Promise<ScubaMetrics> {
        const year = lpad(date.getUTCFullYear(), 4);
        const month = lpad(date.getUTCMonth() + 1, 2);
        const day = lpad(date.getUTCDate(), 2);
        const dateString = `${year}-${month}-${day}`;
        const resp = (await this._api.getMetrics(metricsClass, resourceName, dateString, body, {
            ...this._defaultReqOptions,
            ...options,
        })) as any;
        return resp.data;
    }

    async healthCheck(options?: AxiosRequestConfig): Promise<void> {
        await this._api.healthCheck({ ...this._defaultReqOptions, ...options });
    }
}
