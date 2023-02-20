document.addEventListener('DOMContentLoaded', () => {
    let summoner = window.location.pathname;
    let loader = document.getElementById("loader");
    console.log(summoner);
    fetch("http://204.48.24.123"+summoner).then(async (res) => {
        if (res.ok) {
            loader.outerHTML = await res.text();
        }
        else {
            loader.outerHTML = "User not found."
        }
    });
});