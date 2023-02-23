import https = require('node:https');
require('dotenv').config();
import { RiotAPITypes } from '@fightmegg/riot-api/dist/cjs/@types/index';
import querystring = require('node:querystring');
import path_to_regexp = require('path-to-regexp');
import Bottleneck from "bottleneck";
import fs = require('node:fs');
import { WinrateTable, getChampNames } from './gamedata';
import { RiotRateLimits, LimitGroup } from './ratelimit';
import express = require('express');

const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();
const port = 3000;

const API_KEY = process.env.API_KEY;
const DB_CONN_STRING = process.env.DB_CONN_STRING;
const PLATFORM = 'na1';
const REGION = 'americas';
const champNames = getChampNames();
const ARAM_QUEUE_ID = 450;

const RATE_SAFENESS = 1.1;
const MAX_CONCURRENT = 1;
const INC = 5;

const toHostname = path_to_regexp.compile(':domain.api.riotgames.com');
const methodTypes:{[keys:string]:string} = {
    summoner: "summoner",
    matchIds: "matchv5",
    match: "matchv5"
};
const domains:{[keys:string]:string} = {
    summoner: PLATFORM,
    matchIds: REGION,
    match: REGION
};
const hosts:{[keys:string]:string} = {};
for (let key in domains) {
    hosts[key] = toHostname({domain:domains[key]});
}
const paths:{[keys:string]:string} = {
    summoner: '/lol/summoner/v4/summoners/by-name/:name',
    matchIds:'/lol/match/v5/matches/by-puuid/:puuid/ids',
    match:'/lol/match/v5/matches/:matchId'
};
const pathFns:{[keys:string]:path_to_regexp.PathFunction} = {};
for (let key in paths) {
    pathFns[key] = path_to_regexp.compile(paths[key], {encode: encodeURIComponent});
}
const bnecks:{[keys:string]:Bottleneck} = {};

const client = new MongoClient(DB_CONN_STRING, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const options:https.RequestOptions = {
    host: '',
    path: '',
    headers: {
        'X-Riot-Token':API_KEY,
    },
  };
let readHeaders:boolean = false;

function makeRequest(opts:https.RequestOptions, type:string):Promise<object> {
    // DEBUG
    console.log(opts);

    return new Promise((resolve, reject) => {
        const request = https.request(opts, (res) => {
            /* DEBUG: */
            console.log('statusCode:', res.statusCode);
            console.log('headers:', res.headers, '\n');
            if (typeof res.statusCode !== 'undefined' && (res.statusCode < 200 || res.statusCode >= 300)) {
                return reject(new Error('statusCode=' + res.statusCode));
            }
            if (readHeaders && !(type in bnecks)) {
                let interval = new LimitGroup(res.headers as object as RiotRateLimits, RATE_SAFENESS).calcInterval(); //ugly cast
                bnecks[type] = new Bottleneck({maxConcurrent: MAX_CONCURRENT, minTime: interval});
                bnecks[type].on("error", (error) => {console.error(error)});
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
    const key = 'summoner';
    options.host = toHostname({domain: domains[key]});
    options.path = pathFns[key]({name});
    
    return makeRequest(options, methodTypes[key]).then((obj) => obj as RiotAPITypes.Summoner.SummonerDTO);
}

function getMatchIds(puuid:string, params?:querystring.ParsedUrlQueryInput): Promise<string[]> {
    const key = 'matchIds';
    options.host = toHostname({domain: domains[key]}); //redundant - can be done outside function
    options.path = pathFns[key]({puuid});
    if (typeof params !== 'undefined') {
        options.path += `?${querystring.encode(params)}`;
    }
    //console.log(options);

    return makeRequest(options, methodTypes[key]).then((obj) => obj as string[]);
}

function getMatch(matchId:string): Promise<RiotAPITypes.MatchV5.MatchDTO> {
    const key = 'match';
    options.host = toHostname({domain: domains[key]});
    options.path = pathFns[key]({matchId});

    return makeRequest(options, methodTypes[key]).then((obj) => obj as RiotAPITypes.MatchV5.MatchDTO);
}


//for debug: must execute "$mkdir gamedata" in . to work
function exportMatch(match:RiotAPITypes.MatchV5.MatchDTO) {
    let json = JSON.stringify(match);
    let matchId = match.metadata.matchId;
    fs.writeFileSync(`./gamedata/${matchId}.json`, json);
}


function getGameEnd(game:RiotAPITypes.MatchV5.MatchDTO):number {
    let info = game.info;
    if ("gameEndTimestamp" in info) {
        //console.log("yaas");
        return info.gameEndTimestamp as number;
    }
    return info.gameStartTimestamp + info.gameDuration;
}
/* DEBUG
getMatch('NA1_4050029730').then(x => console.log(getGameEnd(x)));
console.log();
getMatch('NA1_4573630208').then(x => console.log(getGameEnd(x)));
*/


//rename to analyzeProfile later?
//inner functions may be slower?
async function getAllMatches(name:string, numMatches:number):Promise<string> { //returns HTML table. Later make numMatches an optional param
    //note: couldn't get this to work using matchLimiter.submit (callback method)
    //also works using wrap

    let puuid:string = await bnecks["summoner"].schedule(getSummoner, name).then((summ) => summ.puuid)/*.catch(() => {return ""});
    
    if (puuid === "") {
        return "USER NOT FOUND"; //with react, just return {}?
    }*/

    let playerData = new WinrateTable(puuid, champNames);

    async function getMatchesLimit(endTime:number, remaining:number):Promise<string> {
        if (remaining <= 0) {
            console.log('none remaining');
            return playerData.computeTable();
        }
        else {
            let hasMatches = true;
            let newEnd = -1;
            await bnecks["matchv5"].schedule(getMatchIds, puuid, {endTime, queue: ARAM_QUEUE_ID, count: INC,}).then((ids) => {
                console.log("MATCH IDS:", ids);

                if (ids.length < INC) {
                    console.log('no more matches');
                    hasMatches = false;
                }
                return Promise.all(ids.map(async (id) => { // vs. using a for...of loop, this function waits for all results before computing final table or making next matchIDs query
                    await bnecks["matchv5"].schedule(getMatch, id).then((game) => { // this needs await -- otherwise the parent function returns Promise.all before all games are logged
                        if (id === ids[ids.length-1]) {
                            console.log("LAST ID:", id);
                            newEnd = Math.floor(getGameEnd(game)/1000)-30; //set endTime of next getMatchIds call to 30 seconds before end of the oldest game
                            console.log("NEW END:", newEnd);
                        }

                        //console.log(game);
                        //exportMatch(game);
                        playerData.logGame(game);
                    });
                }));
            });
            if (!hasMatches) {
                return playerData.computeTable();
            }
            else {
                if (newEnd === -1) {
                    console.error('Invalid newEnd');
                }
                console.log("recurring");
                return getMatchesLimit(newEnd, remaining-INC);
            }
        }
    }
    return getMatchesLimit(Math.floor(Date.now()/1000), numMatches);
    //async function getMatchesNoLimit(endTime:number):Promise<string> {

    /*if (typeof numMatches !== 'undefined') {
        return getMatchesLimit(Math.floor(Date.now()/1000), numMatches);
    }
    else {
        return getMatchesNoLimit(Math.floor(Date.now()/1000));
    }*/
}

let col;
async function setup() {
    await client.connect();
    console.log("Connected correctly to server");
    col = client.db("aram").collection("accounts");

    readHeaders = true;
    await getSummoner('agoofygoober').then((summ) => getMatchIds(summ.puuid));
    readHeaders = false;
}

async function getProfile(name:string) {
    let puuid:string = await bnecks["summoner"].schedule(getSummoner, name).then((summ) => summ.puuid); //if this errors, should send 404 to client api request
    let doc = await col.findOne({puuid});
    if (doc !== null) {
        console.log("found");
        return WinrateTable.from(doc).computeTable();
    }
    else {
        console.log("not found");
        let wt = new WinrateTable(puuid, champNames);
        await bnecks["matchv5"].schedule(getMatchIds, puuid, {queue: ARAM_QUEUE_ID, count:100}).then((ids) => {
            for (let id of ids) {
                wt.unloggedGames.push(id);
            }
        }); //later add endTime as a param to get all games recursively
        await col.insertOne(wt);
        return wt.computeTable();
    }
}

async function updateProfile(name:string, numGames=3) { //later change name to puuid (when using react frontend)
    //if Date.now()-lastUpdated more than 1 day:
    //    add new games

    let puuid:string = await bnecks["summoner"].schedule(getSummoner, name).then((summ) => summ.puuid);
    let wt:WinrateTable = WinrateTable.from((await col.findOneAndDelete({puuid})).value);
    console.log(wt.computeTable());
    let ct = Math.min(numGames, wt.unloggedGames.length);
    for (let i=0; i < ct; i++) {
        let id = wt.unloggedGames.pop();
        await bnecks["matchv5"].schedule(getMatch, id).then((game) => wt.logGame(game));
    }
    await col.insertOne(wt);
    return wt.computeTable();
}

async function startServer() {
    await setup();
    /*app.get('/api/:summName', async (req, res) => {
        try {
            res.send(await getAllMatches(req.params.summName, 6));
        }
        catch {
            res.sendStatus(404);
        }
    });*/
    app.get('/api/get/:summName', async (req, res) => {
        try {
            res.send(await getProfile(req.params.summName));
        }
        catch {
            res.sendStatus(404);
        }
    });
    app.get('/api/update/:summName', async (req, res) => {
        res.send(await updateProfile(req.params.summName));
    });

    app.listen(port, () => {
        console.log(`App listening on port ${port}`);
    });


    /*DEBUG:
    fs.writeFileSync(`./tables/table${Date.now()}.html`, await getProfile("agoofygoober"));
    fs.writeFileSync(`./tables/table${Date.now()}.html`, await getProfile("agoofygoober"));
    fs.writeFileSync(`./tables/table${Date.now()}.html`, await updateProfile("agoofygoober"));*/
}

startServer();

//setup().then(() => getAllMatches('agoofygoober', 15).then(x => fs.writeFileSync(`./tables/table${Date.now()}.html`, x)));

//getAllMatches('agoofygoober', 6).then(x => fs.writeFileSync(`./tables/table${Date.now()}.html`, x)));