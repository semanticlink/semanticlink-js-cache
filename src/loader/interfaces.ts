import Bottleneck from "bottleneck";

/**
 * Wrapper over the Bottleneck options
 * @see {@Link Loader.defaultOptions}
 */


export interface LoaderOptions extends BottleneckConstructorOptions {
}


/**
 * WARNING: This isn't exported from bottleneck, so copy the definition here
 */
export interface BottleneckConstructorOptions  {
    /**
     * How many jobs can be running at the same time.
     */
    readonly maxConcurrent?: number | null;
    /**
     * How long to wait after launching a job before launching another one.
     */
    readonly minTime?: number | null;
    /**
     * How long can the queue get? When the queue length exceeds that value, the selected `strategy` is executed to shed the load.
     */
    readonly highWater?: number | null;
    /**
     * Which strategy to use if the queue gets longer than the high water mark.
     */
    readonly strategy?: Bottleneck.Strategy | null;
    /**
     * The `penalty` value used by the `Bottleneck.strategy.BLOCK` strategy.
     */
    readonly penalty?: number | null;
    /**
     * How many jobs can be executed before the limiter stops executing jobs. If `reservoir` reaches `0`, no jobs will be executed until it is no longer `0`.
     */
    readonly reservoir?: number | null;
    /**
     * Every `reservoirRefreshInterval` milliseconds, the `reservoir` value will be automatically reset to `reservoirRefreshAmount`.
     */
    readonly reservoirRefreshInterval?: number | null;
    /**
     * The value to reset `reservoir` to when `reservoirRefreshInterval` is in use.
     */
    readonly reservoirRefreshAmount?: number | null;
    /**
     * The increment applied to `reservoir` when `reservoirIncreaseInterval` is in use.
     */
    readonly reservoirIncreaseAmount?: number | null;
    /**
     * Every `reservoirIncreaseInterval` milliseconds, the `reservoir` value will be automatically incremented by `reservoirIncreaseAmount`.
     */
    readonly reservoirIncreaseInterval?: number | null;
    /**
     * The maximum value that `reservoir` can reach when `reservoirIncreaseInterval` is in use.
     */
    readonly reservoirIncreaseMaximum?: number | null;
    /**
     * Optional identifier
     */
    readonly id?: string | null;
    /**
     * Set to true to leave your failed jobs hanging instead of failing them.
     */
    readonly rejectOnDrop?: boolean | null;
    /**
     * Set to true to keep track of done jobs with counts() and jobStatus(). Uses more memory.
     */
    readonly trackDoneStatus?: boolean | null;
    /**
     * Where the limiter stores its internal state. The default (`local`) keeps the state in the limiter itself. Set it to `redis` to enable Clustering.
     */
    readonly datastore?: string | null;
    /**
     * Override the Promise library used by Bottleneck.
     */
    readonly Promise?: any;
    /**
     * This object is passed directly to the redis client library you've selected.
     */
    readonly clientOptions?: any;
    /**
     * **ioredis only.** When `clusterNodes` is not null, the client will be instantiated by calling `new Redis.Cluster(clusterNodes, clientOptions)`.
     */
    readonly clusterNodes?: any;
    /**
     * An existing Bottleneck.RedisConnection or Bottleneck.IORedisConnection object to use.
     * If using, `datastore`, `clientOptions` and `clusterNodes` will be ignored.
     */
    /**
     * Optional Redis/IORedis library from `require('ioredis')` or equivalent. If not, Bottleneck will attempt to require Redis/IORedis at runtime.
     */
    readonly Redis?: any;
    /**
     * Bottleneck connection object created from `new Bottleneck.RedisConnection` or `new Bottleneck.IORedisConnection`.
     */
    readonly connection?: Bottleneck.RedisConnection | Bottleneck.IORedisConnection | null;
    /**
     * When set to `true`, on initial startup, the limiter will wipe any existing Bottleneck state data on the Redis db.
     */
    readonly clearDatastore?: boolean | null;
    /**
     * The Redis TTL in milliseconds for the keys created by the limiter. When `timeout` is set, the limiter's state will be automatically removed from Redis after timeout milliseconds of inactivity. Note: timeout is 300000 (5 minutes) by default when using a Group.
     */
    readonly timeout?: number | null;

    [propName: string]: any;
};
