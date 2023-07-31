"use client"

import type { WinrateTable } from "../../../../../server/gamedata";
import { useState, useEffect, useCallback } from 'react';

let headerCategories = ['Ally Team', 'Enemy Team', 'Total'];
let propertyNames = ['Wins', 'Losses', 'Games', 'Win %'];
let propertyNames2 = ['winsFor', 'lossesFor', 'gamesFor', 'winrateFor', 'winsAgainst', 'lossesAgainst', 'gamesAgainst', 'winrateAgainst', 'winsTotal', 'lossesTotal', 'gamesTotal', 'winrateTotal'];
let headers : string[] = [];
for (let header of headerCategories) {
    for (let property of propertyNames) {
        headers.push(property);
    }
}

export default function Page({ params } : { params : { summName : string }}) { //separate into page and table components?
    const summName = params.summName;
    
    const [dataTable, setDataTable] = useState<WinrateTable | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    
    const longPoll = useCallback((summoner : string) => {
        // fetch("http://localhost:2000/api/update/"+summoner).then(async (res) => { //for testing
        fetch("http://aramalyzer.alexahn.xyz/api/update/"+summoner).then(async (res) => { //prod
            if (res.ok) {
                res.json().then((apiJSON : WinrateTable) => {
                    setDataTable(apiJSON)
                    if (apiJSON.unloggedGames.length > 0) {
                        setTimeout(() => longPoll(summoner), 1000);
                    }
                });
            }
        });
    }, []);

    useEffect(() => {
        // fetch("http://localhost:2000/api/get/"+summName).then(async (res) => { //for testing
        fetch("http://aramalyzer.alexahn.xyz/api/get/"+summName).then(async (res) => { //prod
            if (res.ok) {
                //console.log(res.json())
                res.json().then((apiJSON : WinrateTable) => {
                    setDataTable(apiJSON)
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
    }, [summName, longPoll]);

    let content = <div id="loader"></div>;
    if (dataTable !== null) {
        //console.log(data);
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
                <tbody>{Object.entries(dataTable.table).map(([champ, champData]) => <Row key={champ} name={champ} data={champData} />)}</tbody>
            </table>
        );
    }
    else if (errorMsg !== null) {
        content = <div>{errorMsg}</div>;
    }
    return (
        <div className="main">
            {content}
        </div>
    );
};

function Row({name, data} : { name:string, data:{ [key:string]: any } }) {
    return (
        <tr>
            <td>{name}</td>
            {propertyNames2.map((prop, idx) => <td key={idx}>{data[prop]}</td>)}
        </tr>
    );
};