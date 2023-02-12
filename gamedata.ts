import { RiotAPITypes } from '@fightmegg/riot-api/dist/cjs/@types/index';
import fs = require('node:fs');
import path = require('node:path');
import pug = require('pug');

const PATCH = '13.1.1';
const LANG = 'en_US'

const renderTable = pug.compileFile('table.pug');

//assumes that the datadragon.tgz corresponding to version specified in PATCH has been unzipped into ./resources
export function getChampNames():string[] {
    let champJson = JSON.parse(fs.readFileSync(`./resources/${PATCH}/data/${LANG}/champion.json`, {encoding: 'utf8'}));
    let champNames:string[] = [];
    for (const key in champJson.data) {
        //Inconsistency: Fiddlesticks represented as FiddleSticks in match API data
        champNames.push(key.toLowerCase()); //gives MonkeyKing -- matchdto represents MF as "MissFortune"
        //champNames.push(champJson.data[key].name); //gives Wukong
    }
    return champNames;
}

class ChampData {
    winsFor:number = 0;
    lossesFor:number = 0;
    gamesFor:number = 0;
    winrateFor:string = '';

    winsAgainst:number = 0;
    lossesAgainst:number = 0;
    gamesAgainst:number = 0;
    winrateAgainst:string = '';

    winsTotal:number = 0;
    lossesTotal:number = 0;
    gamesTotal:number = 0;
    winrateTotal:string = '';

    addWinFor() {
        this.winsFor += 1;
    }
    addLossFor() {
        this.lossesFor += 1;
    }
    addWinAgainst() {
        this.winsAgainst += 1;
    }
    addLossAgainst() {
        this.lossesAgainst += 1;
    }

    calculate() {
        this.winsTotal = this.winsFor + this.winsAgainst;
        this.lossesTotal = this.lossesFor + this.lossesAgainst;
        
        this.gamesFor = this.winsFor+this.lossesFor;
        this.gamesAgainst = this.winsAgainst+this.lossesAgainst;
        this.gamesTotal = this.winsTotal + this.lossesTotal;
        
        this.winrateFor = this.gamesFor > 0 ? (this.winsFor/this.gamesFor).toLocaleString(undefined,{style: 'percent', maximumFractionDigits:0}) : '';
        this.winrateAgainst = this.gamesAgainst > 0 ? (this.winsAgainst/this.gamesAgainst).toLocaleString(undefined,{style: 'percent', maximumFractionDigits:0}) : '';
        this.winrateTotal = this.gamesTotal > 0 ? (this.winsTotal/this.gamesTotal).toLocaleString(undefined,{style: 'percent', maximumFractionDigits:0}) : '';
    }
}

export class WinrateTable {
    puuid:string;
    table:{[key:string]:ChampData} = {};
    loggedGames:Set<string> = new Set();
    constructor(champNames:string[], puuid:string) {
        /*this.table = champNames.reduce((map:{[key:string]:ChampData}, name) => {
            map[name] = new ChampData();
            return map;
        }, {});*/
        this.puuid = puuid;

        for (const champ of champNames) {
            this.addChamp(champ);
        }
    }
    addChamp(champ:string) {
        this.table[champ] = new ChampData();
    }
    logGame(game:RiotAPITypes.MatchV5.MatchDTO, id:string) { //could accept a puuid as an argument?
        const TEAMSIZE = 5;

        if (this.loggedGames.has(id)) {
            console.error("ERROR - duplicate game", id);
        }

        this.loggedGames.add(id);

        const playerIndex = game.metadata.participants.indexOf(this.puuid);
        if (playerIndex === -1) {
            console.error(`puuid ${this.puuid} not found in game`);
        }
        else {
            //get all champs in game
            const champs:string[] = [];
            for (const participant of game.info.participants) {
                champs.push(participant.championName.toLowerCase()); //fix fiddlesticks inconsistency
            }
            
            //check if player won or lost
            const playerWon = game.info.participants[playerIndex].win;
            
            //update table
            let forIndex = playerIndex < 5 ? 0 : 5;
            let againstIndex = playerIndex < 5 ? 5 : 0;

            for (let i = forIndex; i < forIndex+TEAMSIZE; i++) {
                //console.log(champs[i]);
                playerWon ? this.table[champs[i]].addWinFor() : this.table[champs[i]].addLossFor();
            }
            for (let i = againstIndex; i < againstIndex+TEAMSIZE; i++) {
                //console.log(champs[i]);
                playerWon ? this.table[champs[i]].addLossAgainst() : this.table[champs[i]].addWinAgainst();
            }
        }
    }
    computeTable():string {
        for (const champ in this.table) {
            this.table[champ].calculate();
        }
        return renderTable({data:this.table});
    }
}


/* DEBUG
let puuid = 'QFhlRvMYTzY6mo7AGbKEqSVVlQIAlenq7BcmDrCn9cNdK1vqYYvTlYiJMjGWBoe3JYA9Ljhc-klxHg';
let champNames = getChampNames();
//console.log(champNames);

let testTable = new WinrateTable(champNames, puuid);
let gamefiles = fs.readdirSync("./gamedata");
let filetype = /.*parsed/;
let gf_new = gamefiles.reduce((arr, cur) => {
    console.log(cur, !filetype.test(cur));
    if(!filetype.test(cur)) {
        arr.push(cur);
    }
    return arr;
}, [] as string[]);
console.log(gf_new);

for (const file of gf_new) {
    let g = fs.readFileSync(`./gamedata/${file}`, {encoding: 'utf8'});
    let game = JSON.parse(g) as RiotAPITypes.MatchV5.MatchDTO;
    testTable.logGame(game);
    fs.writeFileSync(`./gamedata/${path.parse(file).name}_parsed.json`, JSON.stringify(testTable.table));
}
testTable.computeTable();
*/