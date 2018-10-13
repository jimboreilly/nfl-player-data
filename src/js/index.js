var d3Fetch = require('d3-fetch');
var d3Select = require('d3-selection');
var d3Axis = require('d3-axis');
var d3Scale = require('d3-scale');
var d3Array = require('d3-array');
var d3Format = require('d3-format');
var d3Tip = require('d3-tip');

var svg = d3Select.select("#stats");
var maxFantasyPoints = 0;

const width = svg.attr("width");
const height = svg.attr("height");

//paddings for minimized size of graph to fit labels/title
const xPadding = 80;
const yPadding = 80;

const pointsPerYd = 0.1;
const pointsPerTd = 6;
const pointsPerRec = 1;
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

const reduceGameStats = (playerName, season, gameStats) => {
  let seasonStats = { Name: playerName, Season: season, GamesPlayed: 0, Attempts: 0, RushingYards: 0, RushingTd: 0, Fumbles: 0, Receptions: 0, ReceivingTds: 0, ReceivingYards: 0 };
  gameStats.forEach((game) => {
    seasonStats.GamesPlayed++;
    seasonStats.Attempts += game.Attempts;
    seasonStats.RushingYards += game.RushingYards;
    seasonStats.RushingTd += game.RushingTd;
    if (!isNaN(game.Fumbles)) seasonStats.Fumbles += game.Fumbles;
    if (!isNaN(game.Receptions)) {
      seasonStats.Receptions += game.Receptions;
      seasonStats.ReceivingYards += game.ReceivingYards;
      seasonStats.ReceivingTds += game.ReceivingTds;
    }
  });

  return seasonStats;
}
const calculateFantasyPoints = stats => {
  let fp = (stats.RushingYards * pointsPerYd)
    + (stats.RushingTd * pointsPerTd)
    + (stats.Fumbles * pointsPerFumble)
    + (stats.ReceivingYards * pointsPerYd)
    + (stats.ReceivingTds * pointsPerTd)
    + (stats.Receptions * pointsPerRec);

  if (fp > maxFantasyPoints) maxFantasyPoints = fp;
  return Math.round(fp * 10) / 10;
}

const accumulateStatsForGames = (playerName, season, games) => {
  let seasonStats = reduceGameStats(playerName, season, games);
  seasonStats.FantasyPoints = calculateFantasyPoints(seasonStats);

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

const plotAxis = (svg, xScale, yScale, totalSeasons, xAxisLabel, yAxisLabel) => {
  //x-axis, NFL Season
  var bottomAxis = d3Axis.axisBottom(xScale)
    .ticks(totalSeasons)
    .tickFormat(d3Format.format("d"));

  svg.append("g")
    .attr("transform", "translate(0," + (height - xPadding) + ")")
    .attr("class", "xaxis")
    .call(bottomAxis)
    .selectAll("text")
    .style("text-anchor", "end")
    .attr("dx", "-.8em")
    .attr("dy", ".15em")
    .attr("transform", function (d) {
      return "rotate(-65)"
    });


  //y-axis, fantasy points per rush attempt
  var leftAxis = d3Axis.axisLeft(yScale);
  svg.append("g")
    .attr("class", "yaxis")
    .attr("transform", "translate(" + yPadding + ", 0)")
    .call(leftAxis);
}

const plotPlayersOverEachSeason = (svg, seasonDataByPlayer, seasonScale, fantasyPointsScale) => {
  let tip = d3Tip()
    .attr('class', 'd3-tip')
    //.html(function (d) { return d.Name + "<br>" + "Fantasy Points: " + d.FantasyPoints })
    .html(d => { return "<span style='color:orange'>" + d.Name + "</span>" + "<br>" + "<span style='color:DarkTurquoise'>Fantasy Points: </span>" + d.FantasyPoints })
    .direction('n')
    .offset([-3, 0])

  svg.append('g').call(tip);

  let data = seasonDataByPlayer.map(season => season.StatsByPlayer).flat();

  svg.selectAll('circle')
    .data(data)
    .enter()
    .append('circle')
    .attr('r', 2)
    .attr("cx", d => { return seasonScale(d.Season) })
    .attr("cy", d => { return fantasyPointsScale(d.FantasyPoints) })
    .style("fill", "#45b3e7")
    .on('mouseover', tip.show)
    .on('mouseout', tip.hide);
}

d3Fetch.csv("data/Game_Logs_Runningback.csv", parseLine).then(data => {
  //Selects only regular season games where a running back had a recorded attempt
  let regularSeasonData = data.filter(game =>
    game.Season == 'Regular Season'
    && !isNaN(game.Attempts)
  )

  //Selects each individual running back that recorded an attempt
  let seasons = selectUniqueSeasons(regularSeasonData);
  let seasonDataByPlayer = buildPlayerStatsBySeason(seasons, regularSeasonData);

  let seasonExtent = d3Array.extent(seasons);

  let seasonScale = d3Scale.scaleLinear()
    .domain(seasonExtent)
    .range([xPadding, width - xPadding]);

  let fantasyPointsScale = d3Scale.scaleLinear()
    .domain([-1, maxFantasyPoints + 20])
    .range([height - yPadding, yPadding]);

  plotPlayersOverEachSeason(svg, seasonDataByPlayer, seasonScale, fantasyPointsScale);
  plotAxis(svg, seasonScale, fantasyPointsScale, seasons.length, "Season", "Fantasy Points By Rushing");
})