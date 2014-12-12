Package.describe({
  name: 'drpaulbrewer:sat-tle',
  summary: ' fetch NORAD two line elements needed for satellite predictions ',
  version: '0.1.0',
  git: ' /* Fill me in! */ '
});

Package.onUse(function(api) {
  api.use('mongo','server');
  api.use('http','server');
  api.versionsFrom('1.0');
  api.addFiles('drpaulbrewer:sat-tle.js','server');
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('drpaulbrewer:sat-tle');
  api.addFiles('drpaulbrewer:sat-tle-tests.js');
});
