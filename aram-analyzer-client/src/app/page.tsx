export default function Page() {
    return ( //instead of form/redirect, use onchange/state variable?
        <div className="home">
            <div className="desc">{"Champion win rates, organized by team, for a summoner's ARAM games:"}</div>
            <form action="/summoner" className="query">
                <input id="querybar" type="search" name="summoner" placeholder="Summoner name, ex. AGoofyGoober" />
                <button id="querybutton" type="submit">Search</button>
            </form>
        </div>
    );
}