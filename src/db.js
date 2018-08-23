// db.js
const mongoose = require('mongoose');
const ObjectID = mongoose.Schema.Types.ObjectId;
mongoose.plugin(schema => { schema.options.usePushEach = true; });

//my schema goes here!
const Game = new mongoose.Schema({
  deleted: Boolean,
  status: String,
  awayTeamFinal: Number,
  awayTeamDetails: [{
    number: Number,
    sequence: Number,
    runs: Number,
    hits: Number,
    errors: Number,
    type: String
  }],
  homeTeamFinal: Number,
  homeTeamDetails: [{
    number: Number,
    sequence: Number,
    runs: Number,
    hits: Number,
    errors: Number,
    type: String
  }],
  isPeriodOver: String,
  currentPeriod: 7,
  currentPeriodHalf: String,
  oddsAvailable: false,
  createdAt: Date,
  modifiedAt: Date,
  feedId: String,
  awayTeam: {type: ObjectID, ref: 'Team'},
  dateTime: Date,
  homeTeam: {type: ObjectID, ref: 'Team'},
  league: {type: ObjectID, ref: 'League'},
  id: String,
});

const Team = new mongoose.Schema({
  deleted: Boolean,
  teamColor: String,
  textColor: String,
  createdAt: Date,
  modifiedAt: Date,
  feedId: String,
  abbr: String,
  league: {type: ObjectID, ref: 'League'},
  market: String,
  name: String,
  id: String,
});

const League = new mongoose.Schema({
  deleted: Boolean,
  createdAt: Date,
  modifiedAt: Date,
  feedId: String,
  alias: String,
  name: String,
  id: String,
});

mongoose.model('Game', Game);
mongoose.model('Team', Team);
mongoose.model('League', League);

let dbconf = null;
// is the environment variable, NODE_ENV, set to PRODUCTION?
if (process.env.NODE_ENV === 'PRODUCTION') {
 // if we're in PRODUCTION mode, then read the configration from a file
 // use blocking file io to do this...
 const fs = require('fs');
 const path = require('path');
 const fn = path.join(__dirname, 'config.json');
 const data = fs.readFileSync(fn);

 // our configuration file will be in json, so parse it and set the
 // conenction string appropriately!
 const conf = JSON.parse(data);
 dbconf = conf.dbconf;
} else {
 // if we're not in PRODUCTION mode, then use
 dbconf = 'mongodb://localhost/barstool';
}

mongoose.connect(dbconf, { useNewUrlParser: true });
