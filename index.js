var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var mailer = require('express-mailer');
var uuid = require('uuid');
var nconf = require('nconf');

var users = [];

nconf.env().argv().file({ file: 'config.json' });

mailer.extend(app, {
  from: nconf.get('mailer:from'),
  host: nconf.get('mailer:host'),
  secureConnection: true,
  port: 465,
  transportMethod: 'SMTP',
  auth: {
    user: nconf.get('mailer:username'),
    pass: nconf.get('mailer:password')
  }
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

var port = process.env.PORT || 8080;

var router = express.Router();

router.post('/registration', function(req, res) {
  if (!req.body) {
    res.status(400).json({ result: 'ERROR' });
    return;
  }
  var fullName = req.body.fullName;
  var nickname = req.body.nickname;
  var emailAddress = req.body.emailAddress;
  var otp_token = uuid.v1();
  var otp_expiry = Date.now() + 3600000;
  var user = {
    fullName: fullName,
    nickname: nickname,
    emailAddress: emailAddress,
    otp: {
      token: otp_token,
      expiry: otp_expiry
    }
  };
  users.push(user);
  app.mailer.send('registration_mail', {
    to: user.emailAddress,
    subject: 'Dojo Chat registration',
    fullName: user.fullName,
    nickname: user.nickname,
    token: user.otp.token
  }, function (err) {
    if (err) {
      console.log(err);
      res.status(500).json({ result: 'ERROR'});
      return;
    }
    res.json({ result: 'OK', token: otp_token });
  });
});

router.put('/registration/:token', function(req, res) {
  if (!req.body) {
    res.status(400).json({ result: 'OK' });
    return;
  }
  var token = req.params.token;
  var password = req.body.password;
  for (var i = 0; i < users.length; ++i) {
    if (users[i].hasOwnProperty('otp')) {
      if (users[i].otp.token === token && Date.now() < users[i].otp.expiry) {
        users[i].password = password;
        res.json({ result: 'OK' });
        return;
      }
    }
  }
  res.status(404).json({ result: 'ERROR' });
});

router.post("/login", function(req, res) {
  if (!req.body) {
    res.status(400).json({ result: 'ERROR'});
    return;
  }
  var username = req.params.username;
  var password = req.params.password;
  for (var i = 0; i < users.length; ++i) {
    if (users[i].nickname === username || users[i].emailAddress === username) {
      if (users[i].password === password) {
        res.json({ result: 'OK'});
      } else {
        res.status(401).json({ result: 'ERROR' });
      }
      return;
    }
  }
  res.status(404).json({ result: 'ERROR' });
});

app.use('/api', router);

app.listen(port);
console.log('Dojo Chat Server running on port ' + port);