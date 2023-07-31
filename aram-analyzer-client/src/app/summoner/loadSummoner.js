function longPoll(summoner) {
    let table = document.getElementById("data");

    fetch("http://alexahn.xyz/api/update/"+summoner).then(async (res) => { //for react: if WRT has no more games to update, stop polling (set/clear interval)
        if (res.ok) {
            table.outerHTML = await res.text();
            longPoll(summoner);
        }
    });
};

document.addEventListener('DOMContentLoaded', () => {
    let EXT = "summoner/";
    let path = window.location.pathname;
    let summoner = path.substring(path.indexOf(EXT)+EXT.length);
    let loader = document.getElementById("loader");
    console.log(summoner);
    fetch("http://alexahn.xyz/api/get/"+summoner).then(async (res) => {
        if (res.ok) {
            loader.outerHTML = await res.text();
            setTimeout(() => {longPoll(summoner)}, 3000);
        }
        else if (res.status === 404) {
            loader.outerHTML = "User not found."
        }
        else {
            loader.outerHTML = "Sorry, ARAMalyzer is currently offline!"
        }
    });
});