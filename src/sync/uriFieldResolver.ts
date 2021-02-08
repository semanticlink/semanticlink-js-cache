import anylogger from 'anylogger';
import { Resolver } from '../interfaces/resolver';

const log = anylogger('UriFieldResolver');

export class UriFieldResolver {
    /**
     * Match urls within a text field
     *
     * @example
     *  http://example.com/2
     *  https://example.com/2
     *  https://example.com/resource/2
     */
    public static regExp = /(https?:\/\/)([^ '"]*)/gi;

    /**
     * Look through a string and tokenise for all urls and replace using a resolver
     * @param value text string containing an urls
     * @param resolver has a map of key/values to make the replacements in the string
     */
    public static resolve<T>(value: (T & string) | T, resolver: Resolver): (T & string) | T {
        if (typeof value === 'string') {
            let str: string = value;
            const found = str.match(UriFieldResolver.regExp);
            if (found) {
                for (const uri of found) {
                    str = str.replace(new RegExp(uri, 'g'), resolver.resolve(uri));
                }
                return str as T & string;
            }
        } else {
            log.warn('Uri field resolver cannot process field of type %s', typeof value);
        }
        return value;
    }
}
