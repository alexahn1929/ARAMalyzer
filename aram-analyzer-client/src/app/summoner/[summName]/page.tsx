"use client"
//because state variables are used, must use client components

import { useState, useEffect } from 'react';

let headerCategories = ['Ally Team', 'Enemy Team', 'Total'];
let propertyNames = ['Wins', 'Losses', 'Games', 'Win %'];
let propertyNames2 = ['winsFor', 'lossesFor', 'gamesFor', 'winrateFor', 'winsAgainst', 'lossesAgainst', 'gamesAgainst', 'winrateAgainst', 'winsTotal', 'lossesTotal', 'gamesTotal', 'winrateTotal'];
let headers = [];
for (let header of headerCategories) {
    for (let property of propertyNames) {
        headers.push(property);
    }
}

export default function Page({ params } : { params : { summName : string }}) { //separate into page and table components?
    const summName = params.summName;
    const [data, setData] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);
    
    function longPoll(summoner) {
        fetch("http://localhost:2000/api/update/"+summoner).then(async (res) => {
        //fetch("http://alexahn.xyz/api/update/"+summoner).then(async (res) => {
            if (res.ok) {
                res.json().then((apiJSON) => {
                    setData(apiJSON)
                    if (apiJSON.unloggedGames.length > 0) {
                        setTimeout(() => longPoll(summoner), 1000);
                    }
                });
                
            }
        });
    };

    useEffect(() => {
        fetch("http://localhost:2000/api/get/"+summName).then(async (res) => {
        // fetch("http://alexahn.xyz/api/get/"+summName).then(async (res) => {
            if (res.ok) {
                //console.log(res.json())
                res.json().then((apiJSON) => {
                    setData(apiJSON)
                    setTimeout(() => longPoll(summName), 1000);
                });
                
            }
            else if (res.status === 404) {
                setErrorMsg("User not found.");
            }
            else {
                setErrorMsg("Sorry, ARAMalyzer is currently offline!");
            }
        });
    }, []);

    let content = "";
    if (data !== null) {
        console.log(data);
        if (errorMsg !== null) {
            content = errorMsg;
        }
        else {
            content = (
                <table>
                    <thead>
                        <tr>
                            <th />
                            {headerCategories.map((cat, idx) => <th key={idx} colSpan={propertyNames.length}>{cat}</th>)}
                        </tr>
                        <tr>
                            <th>Champion</th>
                            {headers.map((head, idx) => <th key={idx}>{head}</th>)}
                        </tr>
                    </thead>
                    <tbody>{Object.entries(data.table).map(([champ, champData]) => <Row key={champ} name={champ} data={champData} />)}</tbody>
                </table>
            );
        }
    }
    return (
        <div className="main">
            {content}
        </div>
    );
};

function Row({name, data}) {
    return (
        <tr>
            <td>{name}</td>
            {propertyNames2.map((prop, idx) => <td key={idx}>{data[prop]}</td>)}
        </tr>
    );
};