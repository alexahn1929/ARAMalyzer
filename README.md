# ARAMalyzer

ARAMalyzer is a web app that uses Riot Games' API for the popular video game League of Legends to analyze the win rates of champions (playable characters) in the ARAM (All Random All Mid) gamemode.
In ARAM, all players are assigned a random champion to play, as well as the option to "reroll" to receive another random champion. Players can also trade champions with their teammates.
ARAMalyzer's core functionality is a search bar which takes a player's in-game name as input and outputs relevant statistics from their ARAM games, grouped by champion.

## Rate Limits

Riot Games' API imposes rate limits upon users to control the frequency of API queries. Currently, the rate limit is such that ARAMalyzer is only able to query an ARAM match roughly once per second.
As a result, ARAMalyzer presently only returns data from the player's last 5 games. Future commits will seek to implement caching of analyzed data to enable the presentation of data from
all of a player's recorded ARAM games simultaneously.

## Implementation

ARAMalyzer is written entirely in TypeScript, and uses the template engine Pug to live-render data tables in HTML format. Data tables are served to the frontend using Express.js.
API requests are made using Node.js and rate-limited using the package "Bottleneck".
