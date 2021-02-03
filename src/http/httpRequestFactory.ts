import { HttpRequestOptions } from '../interfaces/httpRequestOptions';
import HttpRequest from './httpRequest';
import { defaultOptions } from './defaultRequestOptions';

export class HttpRequestFactory {

    private static instance: HttpRequest;

    /**
     * Factory up a version of the http request.
     *
     * If requiring a specific version, call this method to instantiate the specific singleton
     * @param options
     * @param forceNewOptions
     * @constructor
     */
    public static Instance(options?: Required<HttpRequestOptions>, forceNewOptions?: boolean): HttpRequest {
        if (forceNewOptions && options) {
            this.instance = new HttpRequest({ ...defaultOptions, ...options });
        }
        return this.instance ?? new HttpRequest({ ...defaultOptions, ...options });
    }
}
