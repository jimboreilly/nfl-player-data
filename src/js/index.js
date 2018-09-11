var d3Fetch = require('d3-fetch');
var d3Select = require('d3-selection');

const parseLine = (line) => {
  return {
    Name: line['Name'],
    Season: line['Season'],
    Year: parseInt(line['Year']),
    Attempts: parseInt(line['Rushing Attempts']),
  };
}

d3Fetch.csv("data/Game_Logs_Runningback.csv", parseLine).then(data => {
  console.log(data);

  let regularSeasonData = data.filter(game =>
    game.Season == 'Regular Season'
    && !isNaN(game.Attempts)
  )

  console.log(regularSeasonData);
})