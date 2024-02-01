import * as http from 'http';
import * as https from 'https';

import globalAxios, { AxiosRequestConfig, AxiosInstance } from 'axios';
import { aws4Interceptor } from 'aws4-axios';
import { Configuration, ConfigurationParameters } from './configuration';
import { ScubaApi } from './api';

export type MetricsClass = 'account' | 'bucket' | 'service';

export type Aws4InterceptorParameter = Parameters<typeof aws4Interceptor>[0];
export type ScubaAuth = {
    awsV4?: Aws4InterceptorParameter;
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
            const interceptor = aws4Interceptor({
                instance: this._axios,
                ...auth.awsV4,
                options: {
                    service: 's3',
                    ...auth.awsV4.options,
                },
            });

            // Fix lib aws4-axios that doesn't return proper axios headers that can
            // break some axios actions.
            // This can be removed once this PR with this comment is implemented:
            // https://github.com/jamesmbourne/aws4-axios/pull/1248#discussion_r1474243371
            this._authInterceptor = this._axios.interceptors.request.use(async req => {
                const signedReq = await interceptor(req);
                signedReq.headers = new globalAxios.AxiosHeaders(signedReq.headers);
                return signedReq;
            });
        }
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
        const year = lpad(date.getUTCFullYear(), 4);
        const month = lpad(date.getUTCMonth() + 1, 2);
        const day = lpad(date.getUTCDate(), 2);
        const dateString = `${year}-${month}-${day}`;
        const resp = (await this._api.getMetrics(metricsClass, resourceName, dateString, undefined, {
            ...this._defaultReqOptions,
            ...options,
        })) as any;
        return resp.data;
    }
}
