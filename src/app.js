// app.js
const http = require('http');
const https = require('https');
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose');

const fs = require('fs');
const fn = path.join(__dirname, 'config.json');
const data = fs.readFileSync(fn);

// our configuration file will be in json, so parse it
const conf = JSON.parse(data);

//console.log('secret:', sessionSecret);

const app = express();
require('./db.js');

const User = mongoose.model('User');
const Article = mongoose.model('Article');

app.use(bodyParser.json({
  strict: false
}));

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "http://localhost:3000");
  res.header('Access-Control-Allow-Credentials', 'true');
  //res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});


function getUser (sessionID) {
  //console.log('getUser called with sessionID:', sessionID);
  return new Promise( (resolve, reject) => {
    let user;
    User.findOne({sessionID: sessionID}).exec()
      .then(function (qUser) {
        //console.log('querried db and found:', qUser);
        if (qUser === null) {
          user = new User({
            sessionID: sessionID,
            liked: [],
            disliked: []
          });
        }
        else {
          user = qUser;
        }
        resolve(user);
      })
      .catch(function (err) {
        reject(err);
      });
    });
}

app.get('/api/articles', function(req, res) {
  let starting = new Date('Sat Feb 10 2018 23:57:38 GMT-0500 (EST)');
  let until = new Date();

  if (req.query.starting) {
    starting = new Date(req.query.starting);
  }
  if (req.query.until) {
    until = new Date(req.query.until);
  }

  let user, articles;

  getUser(req.session.id)

    .then(function (qUser) {
      user = qUser;
      return Article
        .where('createdAt').gte(starting).lte(until)
        .sort('-createdAt')
        .exec();
    })

    .then(function (qArticles) {

      if (qArticles === null) {
        throw 'no articles found';
      }

      //we need to make a deep copy of articles in order to modify/decorate it
      articles = JSON.parse(JSON.stringify(qArticles));

      articles = articles.map(function (article) {
        let status;
        console.log('the user is: ', user);
        console.log('the article id is: ', article._id, ' and \'\'+article._id === \'\'+user.liked[0] is ', ''+article._id === ''+user.liked[0]);
        if (user.liked.reduce(function (acc, cur) {
          return acc || ''+article._id === ''+cur;
        }, false)) {
          status = 'liked';
        }
        else if (user.disliked.reduce(function (acc, cur) {
          return acc || ''+article._id === ''+cur;
        }, false)) {
          status = 'disliked';
        }
        else {
          status = 'neutral';
        }
        article.status = status;

        return article;
      });
      return user.save();
    })

    .then(function (result) {
      res.json({ articles: articles });
    })

    .catch(function (err) {
      console.log(err);
      res.sendStatus(500);
    });
});

app.get('/api/hello', function(req, res) {
  console.log('GET request to path api/hello');
  res.json({ hello: "world" });
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
