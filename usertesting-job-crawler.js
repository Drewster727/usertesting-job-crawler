// CLI usage:
// phantomjs [--ssl-protocol=any] usertesting-job-crawler.js [-v|--verbose]

var system = require('system');
var fs = require('fs');

var VERBOSE = false;
var loadInProgress = false;

// Calculate path of this file
var PWD = '';
var current_path_arr = system.args[0].split('/');
if (current_path_arr.length == 1) {
  PWD = '.';
} else {
  current_path_arr.pop();
  PWD = current_path_arr.join('/');
}

// ...from command
var configFile = PWD + '/config.json'
system.args.forEach(function(val, i) {
  if (val == '-v' || val == '--verbose') {
    VERBOSE = true;
  }
  if (val == '--config') {
    if (system.args.length == i) console.log('failed to set config - no option given');
    else {
      configFile = system.args[i + 1];
    }
  }
});

try {
  var settings = JSON.parse(fs.read(configFile));
  if (!settings.username || !settings.password || !settings.init_url) {
    console.log('Missing username, password, and/or initial URL. Exiting...');
    phantom.exit();
  }
} catch (e) {
  console.log('Could not find ' + configFile);
  phantom.exit();
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
  if (query == 'report-jobs') {
    if (VERBOSE) { console.log('Found the following jobs: ' + msg); }
    else { console.log(msg); }
    return;
  }
  if (query == 'report-no-jobs') {
    if (VERBOSE) { console.log('No jobs found'); }
    else { console.log('None'); }
    return;
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

page.viewportSize = {
  width: 1920,
  height: 1080
};
page.open(settings.init_url);
var steps = [
  function() { // Log in
    page.evaluate(function() {
      document.getElementById('user_email').value = window.callPhantom('username');
      document.getElementById('user_password').value = window.callPhantom('password');
      document.forms["new_user"].submit();
    });
  },
  function() { // dashboard
    page.render('ut.png');

    page.evaluate(function() {
      var tbl = document.querySelector(".available-test__table");
      var jobs = tbl.querySelector('tbody').rows;
      var jobCount = jobs.length;

      if (jobCount > 0) {
        var removals = tbl.querySelectorAll(".banner--error, .input--checkbox, .btn-group");
        for (var i = 0; i < removals.length; i++) {
          removals[i].parentNode.removeChild(removals[i]);
        }

        var html = tbl.outerHTML;
        window.callPhantom('report-jobs', html);
      }
      else {
        window.callPhantom('report-no-jobs');
      }
    });
  }
];

var i = 0;
interval = setInterval(function() {
  if (loadInProgress) {
    return;
  }
  if (!steps[i] || typeof steps[i] != "function") {
    return phantom.exit();
  }

  steps[i]();
  i++;

}, 300);
