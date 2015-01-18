Package.describe({
  name: 'drpaulbrewer:west-predictlib',
  summary: 'PredictLib by Andrew West: A Port of John Magliacanes KD2BD Predict C code to Javascript; Meteor Packaging by Paul Brewer KI6CQ',
  version: '1.0.0',
  git: ' /* Fill me in! */ '
});

Package.onUse(function(api) {
  api.versionsFrom('1.0');
  api.export("PLib","client");
  api.addFiles('drpaulbrewer:west-predictlib.js', 'client');
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('drpaulbrewer:west-predictlib');
  api.addFiles('drpaulbrewer:west-predictlib-tests.js');
});
