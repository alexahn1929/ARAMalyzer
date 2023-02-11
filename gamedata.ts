import { RiotAPITypes } from '@fightmegg/riot-api/dist/cjs/@types/index';
import fs = require('node:fs');
import path = require('node:path');
import pug = require('pug');

const renderTable = pug.compileFile('table.pug')

const PATCH = '13.1.1';
const LANG = 'en_US'

class ChampData {
    public winsFor:number = 0;
    public lossesFor:number = 0;
    public gamesFor:number = 0;
    public winrateFor:number = 0;

    public winsAgainst:number = 0;
    public lossesAgainst:number = 0;
    public gamesAgainst:number = 0;
    public winrateAgainst:number = 0;

    public winsTotal:number = 0;
    public lossesTotal:number = 0;
    public gamesTotal:number = 0;
    public winrateTotal:number = 0;

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
        this.gamesFor = this.winsFor+this.lossesFor;
        this.winrateFor = this.winsFor/this.gamesFor * 100;

        this.gamesAgainst = this.winsAgainst+this.lossesAgainst;
        this.winrateAgainst = this.winsAgainst/this.gamesAgainst * 100;

        this.winsTotal = this.winsFor + this.winsAgainst;
        this.lossesTotal = this.lossesFor + this.lossesAgainst;
        this.gamesTotal = this.winsTotal + this.lossesTotal;
        this.winrateTotal = this.winsTotal/this.gamesTotal * 100;
    }
}

//assumes that the datadragon.tgz corresponding to version specified in PATCH has been unzipped into ./resources
function getChampNames():string[] {
    let champJson = JSON.parse(fs.readFileSync(`./resources/${PATCH}/data/${LANG}/champion.json`, {encoding: 'utf8'}));
    let champNames:string[] = [];
    for (const key in champJson.data) {
        champNames.push(key); //gives MonkeyKing -- matchdto represents MF as "MissFortune"
        //champNames.push(champJson.data[key].name); //gives Wukong
    }
    return champNames;
}

class WinrateTable {
    puuid:string;
    table:{[key:string]:ChampData} = {};
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
    logGame(game:RiotAPITypes.MatchV5.MatchDTO) { //could accept a puuid as an argument?
        const TEAMSIZE = 5;

        const playerIndex = game.metadata.participants.indexOf(this.puuid);
        if (playerIndex === -1) {
            console.error(`puuid ${this.puuid} not found in game`);
        }
        else {
            //get all champs in game
            const champs:string[] = [];
            for (const participant of game.info.participants) {
                champs.push(participant.championName);
            }
            
            //check if player won or lost
            const playerWon = game.info.participants[playerIndex].win;
            
            //update table
            let forIndex = playerIndex < 5 ? 0 : 5;
            let againstIndex = playerIndex < 5 ? 5 : 0;

            for (let i = forIndex; i < forIndex+TEAMSIZE; i++) {
                console.log(champs[i]);
                playerWon ? this.table[champs[i]].addWinFor() : this.table[champs[i]].addLossFor();
            }
            for (let i = againstIndex; i < againstIndex+TEAMSIZE; i++) {
                console.log(champs[i]);
                playerWon ? this.table[champs[i]].addLossAgainst() : this.table[champs[i]].addWinAgainst();
            }
        }
    }
    computeTable() {
        for (const champ in this.table) {
            this.table[champ].calculate();
        }
        fs.writeFileSync(`./tables/table${Date.now()}.html`, renderTable({data: this.table}));
    }
}

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


