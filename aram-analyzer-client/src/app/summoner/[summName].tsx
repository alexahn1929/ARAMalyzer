import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

//server vs client component?

export default function Table() {
    const summName =  useRouter().query.summName;
    const [data, setData] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);
    
    function longPoll(summoner) {
        fetch("http://alexahn.xyz/api/update/"+summoner).then(async (res) => { //for react: if WRT has no more games to update, stop polling (set/clear interval)
            if (res.ok) {
                setData(res.json());
                if (data.unloggedGames.length > 0) {
                    setTimeout(() => longPoll(summoner), 0);
                }
            }
        });
    };

    useEffect(() => {
        fetch("http://alexahn.xyz/api/get/"+summoner).then(async (res) => {
            if (res.ok) {
                setData(res.json());
                setTimeout(() => {longPoll(summoner)}, 3000);
            }
            else if (res.status === 404) {
                setErrorMsg("User not found.");
            }
            else {
                setErrorMsg("Sorry, ARAMalyzer is currently offline!");
            }
        });
    });

    let content = "";
    if (data !== null) {
        if (errorMsg !== null) {
            content = errorMsg;
        }
        else {
            content = <table>
                
                {Object.entries(data.table).map(([champ, champData]) => <Row key={champ} data={champData} />)}
            </table>
            // ^ make header rows
        }
    }
    return (
        <div className="main">
            {content}
        </div>
    );
};


function Row({key, data}) {
    // make data rows
};