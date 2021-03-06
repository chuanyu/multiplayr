/**
 *
 * utils.ts
 *
 * Export common utility functions.
 *
 */

export function randomRoomId(): string {
    return Math.floor((Math.random() * 899999 + 100000)).toString();
}

export const uniqueId = (
    () => {

        let uniqidSeed: number = Math.floor(Math.random() * 0x75bcd15);

        function uniqueId(
            prefix?: string,
            moreEntropy = false
        ): string {
            // +   original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
            // +    revised by: Kankrelune (http://www.webfaktory.info/)
            // %        note 1: Uses an internal counter (in php_js global) to avoid collision
            // *     example 1: uniqid();
            // *     returns 1: 'a30285b160c14'
            // *     example 2: uniqid('foo');
            // *     returns 2: 'fooa30285b1cd361'
            // *     example 3: uniqid('bar', true);
            // *     returns 3: 'bara20285b23dfd1.31879087'
            if (prefix === undefined) {
                prefix = '';
            }

            let retId = prefix;
            const formatSeed = (seed, reqWidth) => {
                seed = parseInt(seed, 10).toString(26); // to hex str
                if (reqWidth < seed.length) { // so long we split
                    return seed.slice(seed.length - reqWidth);
                }
                if (reqWidth > seed.length) { // so short we pad
                    return [1 + (reqWidth - seed.length)].join('0') + seed;
                }
                return seed;
            };

            uniqidSeed = uniqidSeed + 1;

            retId += formatSeed(parseInt(new Date().getTime().toString(), 11), 3);
            retId += formatSeed(uniqidSeed, 3); // add seed hex string
            if (moreEntropy) {
                // for more entropy we add a float lower to 10
                retId += (Math.random() * 10).toFixed(8).toString();
            }

            return retId;
        }

        return uniqueId;
    })();

export function shuffleArray(o: any[]) {
    let j = 0;
    let x = o[0];
    let i = 0;

    for (i = o.length; i; i = i - 1) {
        j = Math.floor(Math.random() * i);
        x = o[i];
        o[i] = o[j];
        o[j] = x;
    }

    return o;
}

export function isArray(obj: any) {
    return Object.prototype.toString.call(obj) === '[object Array]';
}

export function isFunction(functionToCheck: any) {
    const getType = {};
    return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
}

export function extendObj(
    ori: any,
    extend: any,
    override: boolean
) {
    forEach(extend, (i) => {
        if (override || !ori.hasOwnProperty(i)) {
            ori[i] = extend[i];
        }
    });
}

export function extendObjClone(
    ori: any,
    extend: any,
    override: boolean
) {
    const tr = [];

    forEach(
        ori,
        (key, value) => {
            tr[key] = value;
        });

    forEach(extend, (key) => {
        if (override || !tr.hasOwnProperty(key)) {
            tr[key] = extend[key];
        }
    });

    return tr;
}

export function forEach(
    kvp: any,
    cb: (key: any, value?: any) => any
) {
    if (kvp) {
        Object.keys(kvp).forEach((key) => {
            cb(key, kvp[key]);
        });
    }
}

export function contains(
    arr: any[],
    needle: any
) {
    for (let i = 0; i < arr.length; i = i + 1) {
        if (arr[i] === needle) {
            return true;
        }
    }
    return false;
}

export function shuffle(
    a: any[]
) {
    for (let i = a.length; i; i = i - 1) {
        const j = Math.floor(Math.random() * i);
        [a[i - 1], a[j]] = [a[j], a[i - 1]];
    }
}

// Returns cartesian product of arrays, e.g.
// cartesianProduct([[1, 2], ["x, "y", "z"]]) =
// [[1, "x"], [1, "y"], [1, "z"], [2, "x"], [2, "y"], [2, "z"]]
// cartesianProduct([[1, 2]]) = [[1], [2]]
export function cartesianProduct(possibilities: any[][]): any[][] {
    if (possibilities.length == 0) {
        return [];
    }
    const acc = possibilities[0].map((e) => [e]);
    const rest = possibilities.slice(1);
    return rest.reduce((cur_tuples, next_possibilities) =>
        cur_tuples.map((cur_tuple) =>
            next_possibilities.map((possibility) => [...cur_tuple, possibility])
        ).reduce((a, v) => a.concat(v)), acc
    );
}

// Returns random integer in low..high, inclusive
export function randInt(low: number, high: number): number {
    return Math.floor(Math.random() * (high - low + 1)) + low;
}

// Assert given condition is true, throw exception with stack trace if not.
export function assert(cond: boolean, message?: string) {
    if (!cond) {
        const error = new Error();
        throw("assertion failed: " + (message ? message : "") + " call stack: " + error.stack);
    }
}
