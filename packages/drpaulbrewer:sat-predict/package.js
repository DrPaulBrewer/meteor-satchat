Package.describe({
  name: 'drpaulbrewer:sat-predict',
  summary: 'maintains Track mongo collection by fetching satellite tracking data from KD2BD predict binary',
  version: '0.1.0',
  git: ' /* Fill me in! */ '
});

Package.onUse(function(api) {
  api.versionsFrom('1.0');
  api.use('mongo','server');
  api.use('mrt:latlon','server');
  api.imply('mrt:latlon');
  api.export('satPredict', 'server');
  api.addFiles('drpaulbrewer:sat-predict.js', 'server');
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('drpaulbrewer:sat-predict');
  api.addFiles('drpaulbrewer:sat-predict-tests.js');
});