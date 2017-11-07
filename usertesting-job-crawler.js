var system = require('system');
var fs = require('fs');

var VERBOSE = true;
var loadInProgress = false;
var url = "https://www.usertesting.com/my_dashboard"

var settings = {
  username: 'mcminn.drew@gmail.com',
  password: 'Swordfish77'
}

var page = require('webpage').create();

page.onConsoleMessage = function(msg) {
  if (!VERBOSE) {
    return;
  }
  console.log(msg);
};

page.onError = function(msg, trace) {
  if (!VERBOSE) {
    return;
  }
  console.error('Error on page: ' + msg);
}

page.onCallback = function(query, msg) {
  if (query == 'username') {
    return settings.username;
  }
  if (query == 'password') {
    return settings.password;
  }
  if (query == 'fireClick') {
    return function() {
      return fireClick;
    } // @todo:david DON'T KNOW WHY THIS DOESN'T WORK! :( Just returns [Object object])
  }
  if (query == 'report-jobs') {
    if (VERBOSE) {
      console.log('Found the following jobs: ' + msg);
    } else {
      console.log(msg);
    }
    phantom.exit();
  }
  if (query == 'fatal-error') {
    console.log('Fatal error: ' + msg);
    phantom.exit();
  }
  return null;
}

page.onLoadStarted = function() {
  loadInProgress = true;
};
page.onLoadFinished = function() {
  loadInProgress = false;
};
//page.open(url);
var steps = [
  function() {
    page.open(url);
  },
  function() { // Log in
    page.evaluate(function() {
      console.log('On USERTESTING login page...');
      document.getElementById('user_email').value = window.callPhantom('username');
      document.getElementById('user_password').value = window.callPhantom('password');
      document.forms["new_user"].submit();
    });
  },
  function() { // dashboard
    page.evaluate(function() {
      var jobCount = document.querySelector(".available-test__table").querySelector('tbody').rows;
      if (jobCount > 0) {
        console.log(jobCount);
        var x = 1;
      }
    });
    page.render('ut.png');
  },
  function() {
    // send email
    console.log('email');
  }
];

var i = 0;
interval = setInterval(function() {
  if (loadInProgress) {
    return;
  } // not ready yet...
  if (!steps[i] || typeof steps[i] != "function") {
    return phantom.exit();
  }

  steps[i]();
  i++;

}, 300);

var final = function() {
  console.log('Requesting available jobs...');

  page.onConsoleMessage = function(msg) {
    if (msg == "EXIT") {
      phantom.exit();
    }
    console.log(msg);
  };
};
