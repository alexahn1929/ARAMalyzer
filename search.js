let button = document.getElementById("querybutton");
let bar = document.getElementById("querybar");

button.addEventListener("click", function () {
    let str = bar.value.trim();
    console.log(str);
    if (str !== "") {
        window.location.href = `/${str}`;
    }
});

bar.addEventListener("keyup", function (event) {
    if (event.code === 'Enter') {
        button.click();
    }
});