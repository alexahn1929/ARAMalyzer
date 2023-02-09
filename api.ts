import https = require('node:https');
require('dotenv').config();
import { RiotAPITypes} from '@fightmegg/riot-api/dist/cjs/@types/index';
import querystring = require('node:querystring');
import path_to_regexp = require('path-to-regexp');

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
    return new Promise((resolve, reject) => {
        const request = https.request(opts, (res) => {
            /* DEBUG:
            console.log('statusCode:', res.statusCode);
            console.log('headers:', res.headers);
            res.on('data', (d) => {
                process.stdout.write(d);
            }); */

            if (typeof res.statusCode !== 'undefined' && (res.statusCode < 200 || res.statusCode >= 300)) {
                //console.log(new Error('statusCode=' + res.statusCode));
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
            //console.error('Error:', error);
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
    console.log(options);

    return makeRequest(options).then((obj) => obj as string[]);
}

function getMatch(matchId:string): Promise<RiotAPITypes.Match.MatchDTO> {
    const toPath = path_to_regexp.compile(matchIdPath, {encode: encodeURIComponent});
    options.host = toHostname({domain:REGION});
    options.path = toPath({matchId});

    return makeRequest(options).then((obj) => obj as RiotAPITypes.Match.MatchDTO);
}

let sm = getSummoner('agoofygoober');
sm.then((out) => {
    console.log(out);
    let mts = getMatchIds(out.puuid, {queue: 0, start: 0, count: 3,});
    mts.then((out2) => {
        console.log(out2);
        out2.forEach((id) => getMatch(id).then((match) => console.log(match)));
    })
});