# ARAMalyzer

ARAMalyzer is a web app that uses Riot Games' API for the popular video game League of Legends to analyze the win rates of champions (playable characters) in the ARAM (All Random All Mid) gamemode.
In ARAM, all players are assigned a random champion to play, as well as the option to "reroll" to receive another random champion. Players can also trade champions with their teammates.
ARAMalyzer's core functionality is a search bar which takes a player's in-game name as input and outputs relevant statistics from their ARAM games, grouped by champion.

## Rate Limits

Riot Games' API imposes rate limits upon users to control the frequency of API queries. Currently, the rate limit is such that ARAMalyzer is only able to query an ARAM match roughly once per second.
Additionally, Riot Games development API keys expire every 24 hours and must be manually renewed via captcha, so the app will appear offline unless I've refreshed my API key in the last 24 hours.
In order to work around this limitation, the ARAMalyzer website live-updates its data tables as the backend receives responses from the Riot API; this feature is observable when you look up an account which has not yet been cached in MongoDB (if you're interested, try searching a random name).
ARAMalyzer currently only gathers data from a player's last 100 games at the time of their first lookup, as only those match IDs are stored in MongoDB.
Future commits will seek to present data from all of a player's recorded ARAM games.

## Implementation

ARAMalyzer is written entirely in TypeScript, with a React/Next.js frontend (originally written in HTML/CSS/JS with Pug) and a Node.js/Express.js/MongoDB backend.
Riot Games API requests are rate-limited using the package "Bottleneck".
