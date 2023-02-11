import https = require('node:https');
require('dotenv').config();
import { RiotAPITypes } from '@fightmegg/riot-api/dist/cjs/@types/index';
import querystring = require('node:querystring');
import path_to_regexp = require('path-to-regexp');
import Bottleneck from "bottleneck";
import fs = require('node:fs');

const API_KEY = process.env.API_KEY;
const PLATFORM = 'na1';
const REGION = 'americas';

const toHostname = path_to_regexp.compile(':domain.api.riotgames.com');
const summonerPath:string = '/lol/summoner/v4/summoners/by-name/:name';
const matchesPath:string = '/lol/match/v5/matches/by-puuid/:puuid/ids';
const matchIdPath:string = '/lol/match/v5/matches/:matchId';

let options:https.RequestOptions = {
    host: '',
    path: '',
    headers: {
        'X-Riot-Token':API_KEY,
    },
  };


function makeRequest(opts:https.RequestOptions):Promise<object> {
    // DEBUG
    console.log(opts);

    return new Promise((resolve, reject) => {
        const request = https.request(opts, (res) => {
            /* DEBUG: */
            console.log('statusCode:', res.statusCode);
            console.log('headers:', res.headers, '\n');
            /*res.on('data', (d) => {
                process.stdout.write(d);
            }); */

            if (typeof res.statusCode !== 'undefined' && (res.statusCode < 200 || res.statusCode >= 300)) {
                console.log(new Error('statusCode=' + res.statusCode));
                return reject(new Error('statusCode=' + res.statusCode));
            }
            
            let data = '';
            res.on('data', (chunk) => {
                data = data + chunk.toString();
            });
            res.on('end', () => {
                resolve(JSON.parse(data));
            })
        });

        request.on('error', (error) => {
            console.error('Error:', error);
            reject(error);
        })
        request.end();
    });
}

function getSummoner(name:string): Promise<RiotAPITypes.Summoner.SummonerDTO> {
    const toPath = path_to_regexp.compile(summonerPath, {encode: encodeURIComponent});
    options.host = toHostname({domain:PLATFORM});
    options.path = toPath({name});
    
    return makeRequest(options).then((obj) => obj as RiotAPITypes.Summoner.SummonerDTO);
}

function getMatchIds(puuid:string, params?:querystring.ParsedUrlQueryInput): Promise<string[]> {
    const toPath = path_to_regexp.compile(matchesPath, {encode: encodeURIComponent});
    options.host = toHostname({domain:REGION});
    options.path = toPath({puuid});
    if (typeof params !== 'undefined') {
        options.path += `?${querystring.encode(params)}`;
    }
    //console.log(options);

    return makeRequest(options).then((obj) => obj as string[]);
}

function getMatch(matchId:string): Promise<RiotAPITypes.MatchV5.MatchDTO> {
    const toPath = path_to_regexp.compile(matchIdPath, {encode: encodeURIComponent});
    options.host = toHostname({domain:REGION});
    options.path = toPath({matchId});

    return makeRequest(options).then((obj) => obj as RiotAPITypes.MatchV5.MatchDTO);
}

/* DEBUG:
let sm = getSummoner('agoofygoober');
sm.then((out) => {
    console.log(out);
    let mts = getMatchIds(out.puuid, {queue: 450, start: 0, count: 3,});
    mts.then((out2) => {
        console.log(out2);
        out2.forEach((id) => getMatch(id).then((match) => console.log(match)));
    })
});*/


class RateLimit {
    public res:number;
    public interval:number;

    constructor(rl:string) {
        let data = rl.split(":");
        this.res = Number(data[0]);
        this.interval = Number(data[1]);
    }
}

function makeBottleneck(maxConcurrent:number, minTime:number, rl:RateLimit):Bottleneck {
    return new Bottleneck({
        maxConcurrent,
        minTime,
        reservoir: rl.res,
        reservoirRefreshAmount: rl.res,
        reservoirRefreshInterval: rl.interval,
    });
}

const APP_LIMIT_1 = new RateLimit("20:1");
const APP_LIMIT_2 = new RateLimit("100:120");
const METHOD_LIMIT_MATCH = new RateLimit("2000:10");
const METHOD_LIMIT_SUMMONER = new RateLimit("2000:60");
const MAX_CONCURRENT = 1;
const MIN_TIME = 1000;

async function setReservoir(lim:Bottleneck, val:number):Promise<void> {
    let curRes = await lim.currentReservoir();
    if (typeof curRes === 'number') {
        await lim.incrementReservoir(val - curRes);
        console.log(`reservoir incremented from ${curRes} to ${await lim.currentReservoir()}`)
    }
}


const appLimiter1 = makeBottleneck(MAX_CONCURRENT, MIN_TIME, APP_LIMIT_1);
const appLimiter2 = makeBottleneck(MAX_CONCURRENT, MIN_TIME, APP_LIMIT_2);
const summonerLimiter = makeBottleneck(MAX_CONCURRENT, MIN_TIME, METHOD_LIMIT_SUMMONER);
const matchLimiter = makeBottleneck(MAX_CONCURRENT, MIN_TIME, METHOD_LIMIT_MATCH);

matchLimiter.on("error", (error) => {console.error(error)});

const ARAM_QUEUE_ID = 450;

appLimiter2.chain(appLimiter1);
summonerLimiter.chain(appLimiter2);
matchLimiter.chain(appLimiter2);


/*const getSummoner_rl = summonerLimiter.wrap(getSummoner);
const getMatchIds_rl = summonerLimiter.wrap(getMatchIds);
const getMatch_rl = summonerLimiter.wrap(getMatch);*/

//for debug: must execute "$mkdir gamedata" in . to work
function exportMatch(match:RiotAPITypes.MatchV5.MatchDTO) {
    let json = JSON.stringify(match);
    let matchId = match.metadata.matchId;
    fs.writeFileSync(`./gamedata/${matchId}.json`, json);
}

async function getAllMatches(puuid:string) { //:Promise<string[]>
    //note: couldn't get this to work using matchLimiter.submit (callback method)
    //also works using wrap

    matchLimiter.schedule(getMatchIds, puuid, {queue: ARAM_QUEUE_ID, count: 3,}).then((ids) => {
        console.log(ids);
        ids.forEach((id) => {
            matchLimiter.schedule(getMatch, id).then(x => {
                console.log(x)
                exportMatch(x);
            });
        });
    });
    

    /*mts.then((out2) => {
        console.log(out2);
        out2.forEach((id) => getMatch(id).then((match) => console.log(match)));
    })*/
    /*let matches = await getMatchIds_rl(puuid, {queue: ARAM_QUEUE_ID, count: 3,});
    matches.forEach((id) => {
        getMatch_rl(id).then(x => console.log(x));
    });*/
}

getSummoner('agoofygoober').then((summ) => getAllMatches(summ.puuid));

//recursive function to pull match data until no more matches come out
/*
        const allMatches = ids.map((id:string) => matchLimiter.submit(getMatch, id, (out) => console.log(out)));
        return Promise.all(allMatches);
*/

