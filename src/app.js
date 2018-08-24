// app.js
const http = require('http');
const https = require('https');
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose');
const fetch = require('node-fetch');

const fs = require('fs');
const fn = path.join(__dirname, 'config.json');
const data = fs.readFileSync(fn);

// our configuration file will be in json, so parse it
const conf = JSON.parse(data);

const app = express();
require('./db.js');

const Game = mongoose.model('Game');
const Team = mongoose.model('Team');
const League = mongoose.model('League');

const fetchedGames = [];
let uniqueID = 0;
fetch('https://2ncp9is1k8.execute-api.us-east-1.amazonaws.com/dev/feed/game/one')
  .then((res) => {
    return res.json();
  })
  .then((json) => {
    //console.log('got something from the web...');
    //console.log(json);
    fetchedGames.push(json);
    return fetch('https://2ncp9is1k8.execute-api.us-east-1.amazonaws.com/dev/feed/game/two')
  })
  .then((res) => {
    return res.json();
  })
  .then((json) => {
    //console.log('got something from the web...');
    //console.log(json);
    fetchedGames.push(json);
    for( const g in fetchedGames ) {
      //we have to check if we got something in the format { "game": ...content } or if we got { ...content }
      let fGame;
      if( fetchedGames[g].game ) {
        fGame = fetchedGames[g].game;
      }
      else {
        fGame = fetchedGames[g];
      }
      //fix for the two documents having identical ids
      fGame.id = uniqueID++;

      const league = fGame.league;
      league.createdAt = new Date(league.createdAt);
      league.modifiedAt = new Date(league.modifiedAt);
      league.foreignId = league.id;
      league.id = undefined;

      const homeTeam = fGame.homeTeam;
      homeTeam.createdAt = new Date(homeTeam.createdAt);
      homeTeam.modifiedAt = new Date(homeTeam.modifiedAt);
      homeTeam.foreignId = homeTeam.id;
      homeTeam.id = undefined;

      const awayTeam = fGame.awayTeam;
      awayTeam.createdAt = new Date(awayTeam.createdAt);
      awayTeam.modifiedAt = new Date(awayTeam.modifiedAt);
      awayTeam.foreignId = awayTeam.id;
      awayTeam.id = undefined;

      const game = fGame;
      game.createdAt = new Date(game.createdAt);
      game.modifiedAt = new Date(game.modifiedAt);
      game.foreignId = game.id;
      for( const hd in game.homeTeamDetails ) {
        //fixing the bad naming convention 'type', because this is a protected field for mongoose
        game.homeTeamDetails[hd].entryType = game.homeTeamDetails[hd].type;
        game.homeTeamDetails[hd].type = undefined;
        //fixing the bad naming convention 'errors', because this is a protected field for mongoose
        game.homeTeamDetails[hd].entryErrors = game.homeTeamDetails[hd].errors;
        game.homeTeamDetails[hd].errors = undefined;
      }
      //and doing the same for the awayTeamDetails
      for( const ad in game.awayTeamDetails ) {
        game.awayTeamDetails[ad].entryType = game.awayTeamDetails[ad].type;
        game.awayTeamDetails[ad].type = undefined;
        game.awayTeamDetails[ad].entryErrors = game.awayTeamDetails[ad].errors;
        game.awayTeamDetails[ad].errors = undefined;
      }
      game.id = undefined;

      let leagueID, homeID, awayID;
      League.findOneAndUpdate( {foreignId: league.foreignId}, league, {upsert: true, new: true}).exec()
        .then( (res) => {
          // console.log('just updated league:');
          // console.log(res);
          if( res !== null ) {
            leagueID = res._id;
            homeTeam.league = leagueID;
            return Team.findOneAndUpdate( {foreignId: homeTeam.foreignId}, homeTeam, {upsert: true, new: true}).exec();
          }
          else {
            throw 'could not update league\n';
          }
        }, (res) => {
          throw 'league update rejected with ' + res + '\n';
        })
        .then( (res) => {
          // console.log('just updated home team:');
          // console.log(res);
          if( res !== null ) {
            homeID = res._id;
            awayTeam.league = leagueID;
            return Team.findOneAndUpdate( {foreignId: awayTeam.foreignId}, awayTeam, {upsert: true, new: true}).exec();
          }
          else {
            throw 'could not update home team\n';
          }
        }, (res) => {
          throw 'home team update rejected with ' + res + '\n';
        })
        .then( (res) => {
          // console.log('just updated away team:');
          // console.log(res);
          if( res !== null ) {
            awayID = res._id;

            game.league = leagueID;
            game.homeTeam = homeID;
            game.awayTeam = awayID;
            return Game.findOneAndUpdate( {foreignId: game.foreignId}, game, {upsert: true, new: true} ).exec();
          }
          else {
            throw 'could not update away team\n';
          }
        }, (res) => {
          throw 'away team update rejected with ' + res + '\n';
        })
        .then( (res) => {
          // console.log('just updated game:');
          // console.log(res._id);
        }, (res) => {
          throw 'game update rejected with ' + res + '\n';
        })
        .catch( (err) => {
          throw err;
        })

    }
  })
  .catch((err) => {
    throw err;
  });

app.use(bodyParser.json({
  strict: false
}));

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "http://localhost:3000");
  res.header('Access-Control-Allow-Credentials', 'true');
  //res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});


app.get('/api/hello', function(req, res) {
  //console.log('GET request to path api/hello');
  res.json({ hello: "world" });
});

app.get('/api/games', function(req, res) {
  if( !req.query.id ) {
    res.json( { error: 'you must provide an id as a query argument' } );
  }
  else {
    Game.findOne({foreignId: req.query.id})
      .populate('awayTeam')
      .populate('homeTeam')
      .populate('league')
      .exec()
      .then( (game) => {
        res.json(game);
      })
      .catch( (err) => {
        throw err;
      });
  }
});

app.get('/api/games/all', function(req, res) {
  Game.find()
    .populate('awayTeam')
    .populate('homeTeam')
    .populate('league')
    .exec()
    .then( (games) => {
      res.json(games);
    })
    .catch( (err) => {
      throw err;
    });
});

let portHTTP = 8000, portHTTPS = 8000;

let options = {};

if (process.env.NODE_ENV === 'PRODUCTION') {
  portHTTP = 80;
  portHTTPS = 443;

  options = {
    key: fs.readFileSync(conf.key),
    cert: fs.readFileSync(conf.cert)
  };
}

http.createServer(app).listen(portHTTP);
if (process.env.NODE_ENV === 'PRODUCTION') {
  https.createServer(options, app).listen(portHTTPS);
}
