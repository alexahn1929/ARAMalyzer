document.addEventListener('DOMContentLoaded', () => {
    let EXT = "summoner/";
    let path = window.location.pathname;
    let summoner = path.substring(path.indexOf(EXT)+EXT.length);
    let loader = document.getElementById("loader");
    console.log(summoner);
    fetch("http://alexahn.xyz/api/"+summoner).then(async (res) => {
        if (res.ok) {
            loader.outerHTML = await res.text();
        }
        else if (res.status == 404) {
            loader.outerHTML = "User not found."
        }
        else {
            loader.outerHTML = "Sorry, ARAMalyzer is currently offline!"
        }
    });
});