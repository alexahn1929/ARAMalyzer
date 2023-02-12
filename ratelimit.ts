export interface RiotRateLimits {
    'x-app-rate-limit':string;
    'x-method-rate-limit':string;
}

class RateLimit {
    res:number;
    window:number;
    minInterval:number; //in ms

    constructor(rl:string) {
        let data = rl.split(":");
        this.res = Number(data[0]);
        this.window = Number(data[1]);
        this.minInterval = this.window/this.res*1000;
    }
}

export class LimitGroup { //when calculating interval, take into account first requests (for startup). settimeout 5 seconds?
    private looseness:number;

    limits:RateLimit[]; //make private after debug

    constructor(header:RiotRateLimits, looseness:number) {
        this.looseness = looseness;
        this.limits = [];
        let appLimits = header['x-app-rate-limit'].split(',');
        let methodLimits = header['x-method-rate-limit'].split(',');
        for (let lim of appLimits) {
            this.limits.push(new RateLimit(lim));
        }
        for (let lim of methodLimits) {
            this.limits.push(new RateLimit(lim));
        }
    }
    calcInterval():number {
        let longestInt = this.limits[0].minInterval;
        for (let rl of this.limits) {
            longestInt = Math.max(longestInt, rl.minInterval)
        }
        return Math.floor(longestInt*this.looseness);
    }
}


