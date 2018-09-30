var d3Fetch = require('d3-fetch');
var d3Select = require('d3-selection');

const parseLine = (line) => {
  return {
    Name: line['Name'],
    Season: line['Season'],
    Year: parseInt(line['Year']),
    Attempts: parseInt(line['Rushing Attempts']),
    RushingYards: parseInt(line["Rushing Yards"]),
    RushingTd: parseInt(line["Rushing TDs"]),
    Receptions: parseInt(line["Receptions"]),
    ReceivingYards: parseInt(line["Receiving Yards"]),
    ReceivingTds: parseInt(line["Receiving TDs"])
  };
}

const selectUniquePlayerNames = (gameData) => {
  let players = new Array();
  gameData.forEach((singleGameOfData) => { if (players.indexOf(singleGameOfData.Name) === -1) players.push(singleGameOfData.Name); });
  return players;
}

const selectUniqueSeasons = (gameData) => {
  let seasons = new Array();
  gameData.forEach((singleGameOfData) => { if (seasons.indexOf(singleGameOfData.Year) === -1) seasons.push(singleGameOfData.Year); });
  return seasons
}

const accumulateStatsForGames = (playerName, season, games) => {
  let seasonStats = { Name: playerName, Season: season, Attempts: 0, RushingYards: 0, RushingTd: 0 };
  games.forEach((game) => {
    seasonStats.Attempts += game.Attempts;
    seasonStats.RushingYards += game.RushingYards;
    seasonStats.RushingTd += game.RushingTd;
  });

  return seasonStats;
}

const buildSeasonFromAllGamesForPlayer = (playerName, allGamesForPlayer) => {
  let yearsActive = new Array();
  allGamesForPlayer.forEach((singleGameOfData) => { if (yearsActive.indexOf(singleGameOfData.Year) === -1) yearsActive.push(singleGameOfData.Year); });
  return yearsActive.map((season) => {
    let gamesInSeason = allGamesForPlayer.filter((game) => game.Year == season);
    return accumulateStatsForGames(playerName, season, gamesInSeason);
  });
}

const buildSeasonStatsByPlayer = (players, regularSeasonData) => {
  return players.map(player => {
    let allGamesForPlayer = regularSeasonData.filter(game => game.Name == player);
    return buildSeasonFromAllGamesForPlayer(player, allGamesForPlayer);
  })
}

const buildPlayerStatsBySeason = (seasons, regularSeasonData) => {
  return seasons.map(season => {
    let gamesInSeason = regularSeasonData.filter(game => game.Year == season);
    let playersInSeason = selectUniquePlayerNames(gamesInSeason);
    return playersInSeason.map(player => {
      gamesInSeason.filter(game => game.Name === player).map(statsForPlayer => accumulateStatsForGames(player, season, statsForPlayer));
    });
  });
}

d3Fetch.csv("data/Game_Logs_Runningback.csv", parseLine).then(data => {
  console.log(data);

  //Selects only regular season games where a running back had a recorded attempt
  let regularSeasonData = data.filter(game =>
    game.Season == 'Regular Season'
    && !isNaN(game.Attempts)
  )

  //Selects each individual running back that recorded an attempt
  let players = selectUniquePlayerNames(regularSeasonData);
  let seasons = selectUniqueSeasons(regularSeasonData);

  console.log(regularSeasonData);
  console.log(players);
  console.log(buildSeasonStatsByPlayer(players, regularSeasonData));

  console.log(seasons);
  console.log(buildPlayerStatsBySeason(seasons, regularSeasonData));
})