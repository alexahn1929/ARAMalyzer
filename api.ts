import https = require('node:https');
require('dotenv').config();

const api_key = process.env.API_KEY;
const region:string = "na1";
const summonerPath:string = '/lol/summoner/v4/summoners/by-name/';

let options:https.RequestOptions = {
    host: region + ".api.riotgames.com",
    path: "",
    headers:{
        'X-Riot-Token':api_key,
    },
  };

function getPuuid(summonerName:string): void {
    options["path"] = summonerPath+summonerName;
    const request = https.request(options, (res) => {
        /* DEBUG:
        console.log('statusCode:', res.statusCode);
        console.log('headers:', res.headers);
        res.on('data', (d) => {
            process.stdout.write(d);
        }); */

        let data = '';
        res.on('data', (chunk) => {
            data = data + chunk.toString();
        });
        res.on('end', () => {
            const body = JSON.parse(data);
            console.log(body);
        })
    });
    
    request.on('error', (error) => {
        console.error('Error:', error);
    })
    request.end();
}

getPuuid('agoofygoober');