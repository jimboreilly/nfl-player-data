var d3Fetch = require('d3-fetch');
var d3Select = require('d3-selection');
var d3Axis = require('d3-axis');
var d3Scale = require('d3-scale');
var d3Array = require('d3-array');
var d3Format = require('d3-format');

var svg = d3Select.select("#stats");
var maxFantasyPoints = 0;

const width = svg.attr("width");
const height = svg.attr("height");

//paddings for minimized size of graph to fit labels/title
const xPadding = 80;
const yPadding = 80;

const pointsPerYd = 0.1;
const pointsPerTd = 6;
const pointsPerFumble = -2;

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
    ReceivingTds: parseInt(line["Receiving TDs"]),
    Fumbles: parseInt(line["Fumbles"])
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
  let seasonStats = { Name: playerName, Season: season, GamesPlayed: 0, Attempts: 0, RushingYards: 0, RushingTd: 0, Fumbles: 0 };
  games.forEach((game) => {
    seasonStats.GamesPlayed++;
    seasonStats.Attempts += game.Attempts;
    seasonStats.RushingYards += game.RushingYards;
    seasonStats.RushingTd += game.RushingTd;
    if (!isNaN(game.Fumbles)) seasonStats.Fumbles += game.Fumbles;
  });

  seasonStats.FantasyPoints = (seasonStats.RushingYards * pointsPerYd)
    + (seasonStats.RushingTd * pointsPerTd)
    + (seasonStats.Fumbles * pointsPerFumble);

  if (seasonStats.FantasyPoints > maxFantasyPoints) maxFantasyPoints = seasonStats.FantasyPoints;
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
    return {
      Season: season, StatsByPlayer: playersInSeason.map(player => {
        let statsForPlayer = gamesInSeason.filter(game => game.Name == player);
        return accumulateStatsForGames(player, season, statsForPlayer);
      })
    };
  });
}

const plotAxis = (svg, xScale, yScale, xAxisLabel, yAxisLabel) => {
  //x-axis, NFL Season
  var bottomAxis = d3Axis.axisBottom(xScale).tickFormat(d3Format.format("d"));
  svg.append("g")
    .attr("transform", "translate(0," + (height - xPadding) + ")")
    .attr("class", "xaxis")
    .call(bottomAxis);

  //y-axis, fantasy points per rush attempt
  var leftAxis = d3Axis.axisLeft(yScale);
  svg.append("g")
    .attr("class", "yaxis")
    .attr("transform", "translate(" + yPadding + ", 0)")
    .call(leftAxis);

  //x-axis label
  svg.append("text")
    .attr("transform", "translate(" + (width / 2.3) + "," + (height - (xPadding / 2)) + ")")
    .text(xAxisLabel);

  //y-axis label, rotated to be vertical text
  svg.append("text")
    .attr("transform", "translate(" + yPadding / 3 + "," + (height / 1.7) + ")rotate(270)")
    .text(yAxisLabel);
}

const plotPlayersOverEachSeason = (svg, seasonDataByPlayer, seasonScale, fantasyPointsScale) => {
  seasonDataByPlayer.map(seasonWithStats => {
    seasonWithStats.StatsByPlayer.map(player =>
      svg.append("circle")
        .attr("cx", seasonScale(seasonWithStats.Season))
        .attr("cy", fantasyPointsScale(player.FantasyPoints))
        .attr("r", 2)
        .style("fill", "#45b3e7")
    )
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
  //console.log(buildSeasonStatsByPlayer(players, regularSeasonData));

  console.log(seasons);
  let seasonDataByPlayer = buildPlayerStatsBySeason(seasons, regularSeasonData);
  console.log(seasonDataByPlayer);

  let seasonExtent = d3Array.extent(seasons);

  let seasonScale = d3Scale.scaleLinear()
    .domain(seasonExtent)
    .range([xPadding, width - xPadding]);

  console.log(seasonExtent);

  let fantasyPointsScale = d3Scale.scaleLinear()
    .domain([-10, maxFantasyPoints + 20])
    .range([height - yPadding, yPadding]);

  plotPlayersOverEachSeason(svg, seasonDataByPlayer, seasonScale, fantasyPointsScale);
  plotAxis(svg, seasonScale, fantasyPointsScale, "Season", "Fantasy Points By Rushing");
})