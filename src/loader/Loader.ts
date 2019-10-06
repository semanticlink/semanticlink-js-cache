import Bottleneck from 'bottleneck';
import {log} from 'semantic-link/lib/logger';
import {AxiosResponse} from "axios";
import {LoaderOptions, BottleneckConstructorOptions} from "./interfaces";

/**
 * Loading service to allow for rate limiting and prioritising concurrent requests and
 * being able to cancel some or all requests.
 *
 * Wraps bottleneck and axios cancellables in the background using es6 promises.
 *
 */
export default class Loader {
    private _currentOptions?: BottleneckConstructorOptions;
    private _cancel: () => Promise<void>;
    private _limiter: Bottleneck;
    private requests: { [id: string]: any };

    /**
     * @param {module:bottleneck.ConstructorOptions=} options
     */
    constructor(options?: BottleneckConstructorOptions) {

        this._currentOptions = options || Loader.defaultOptions();
        this._limiter = Loader.limiterFactory(options);
        this.requests = {};
        this._cancel = () => this._limiter.stop();

        this._limiter.on(Loader.event.ERROR, (error: any) :void=> {
            log.error(`[Limiter] Error: ${error}`);
        });

        this._limiter.on(Loader.event.DEBUG, (message: string) => {
            // this is quite noisey so limiting down to trace
            log.trace(`[Limiter] ${message}`);
        });
    }

    /**
     * Make a new limiter with the options
     * @param {module:bottleneck.ConstructorOptions} options
     * @return {module:bottleneck.Bottleneck}
     */
    static limiterFactory(options?: BottleneckConstructorOptions): Bottleneck {
        log.debug('[Limiter] Created');
        return new Bottleneck({...options, ...Loader.defaultOptions});
    }

    /**
     * @returns {LoaderOptions}
     */
    static get defaultOptions(): LoaderOptions {
        return {
            // num of jobs that can be running at the same time
            maxConcurrent: 5,
            // immediately launch the next job
            minTime: 0,
            // default: how long can the queue get? At this stage unlimited
            highWater: null,
            // this is actually the default
            strategy: Bottleneck.strategy.LEAK,
            // use es6 promise over the default Bluebird
            Promise: Promise
        };
    }


    /**
     * @see {@link Bottleneck.on}
     * @return {{EMPTY: string, IDLE: string, DROPPED: string, DEPLETED: string, DEBUG: string, ERROR: string}}
     */
    static get event() {
        return {
            EMPTY: 'empty',
            IDLE: 'idle',
            DROPPED: 'dropped',
            DEPLETED: 'depleted',
            DEBUG: 'debug',
            ERROR: 'error',
        };
    }

    /**
     * Access to the limiter. Chain the methods of this instance if you require it
     *
     * @example loader.limiter.on(loader.event.DEBUG, () => {});
     * @example itemsInQueue = loader.limiter.queued();
     * @example loader.limiter.schedule( ...
     * @return {Bottleneck}
     */
    get limiter(): Bottleneck {
        return this._limiter;
    }

    /**
     * Current options in the limiter
     * @return {module:bottleneck.ConstructorOptions|*}
     */
    get currentOptions(): BottleneckConstructorOptions {
        return this._currentOptions;
    }

    /**
     * This method wraps the limiter scheduler because it cannot deal with multiple requests at the same time on
     * the same 'id'. This queues up subsequent requests and then resolves them upon the original request.
     *
     * This is primarily used for GET requests.
     *
     * Note: this is a naive implementation of queue clearing.
     *
     * TODO: cancelled promises need to be cleared out of this queue too
     *
     * @see https://github.com/SGrondin/bottleneck/issues/68
     *
     * @param {string} id
     * @param {PromiseLike<T>} action
     * @param {*[]} args
     * @return {Promise<AxiosResponse>}
     */
    schedule<T>(
        id: string,
        action: () => Promise<T>,
        ...args: any[]): Promise<T> {
        if (!this.requests[id]) {
            const p:Promise<T> = new Promise((resolve, reject) => {
                this._limiter
                    .schedule({id}, action, ...args)
                    .then((result: T) => {
                        log.debug(`[Loader] resolved '${id}' (${this.requests[id].promises.length} subsequent requests)`);

                        // resolving with chain through to the subsequent requests
                        resolve(result);

                        // clean up the requests
                        delete this.requests[id];
                    })
                    .catch(reject);
            });

            this.requests[id] = {
                request: p,
                promises: []
            };

            log.debug(`[Loader] add key '${id}'`);
            return p;
        } else {
            // construct an array of promises that will be resolved with the original request value
            const p:Promise<T> = new Promise((resolve, reject) => {
                this.requests[id]
                    .request
                    .then(resolve)
                    .catch(reject);
            });
            this.requests[id].promises.push(p);
            log.debug(`[Loader] queued '${id}' (${this.requests[id].promises.length} in queue)`);
            return p;
        }

    }

    /**
     * This method wraps the limiter scheduler.
     *
     * This is primarily used for POST, PUT, PATCH, DELETE requests
     *
     * @param {PromiseLike<T>} action
     * @param {*[]} args

     * @return {*}
     */
    submit<T>(action: Promise<T>, ...args: any[]) {
        return this._limiter.schedule(action, ...args);
    }

    /**
     * Stop all current and pending requests and reset all queues.
     *
     * @returns {Request|PromiseLike<T | never>|Promise<T | never>|*}
     */
    clearAll() :Promise<void>{
        const {RECEIVED, RUNNING, EXECUTING, QUEUED} = this._limiter.counts();
        const itemsQueued = RECEIVED + QUEUED + RUNNING + EXECUTING;
        log.debug(`[Loader] aborting all request (${itemsQueued} in queue)`);
        // this will abort any xhr requests
        return this._cancel()
            .then(() => {
                log.debug('[Limiter] Limiter stopped');
                // unfortunately, we still need one! TODO: ask library for update to be able to clear queues and keep running
                this._limiter = Loader.limiterFactory(this._currentOptions);
            });
    }

}

export let loader = new Loader();
