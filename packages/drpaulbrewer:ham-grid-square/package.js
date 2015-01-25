Package.describe({
  name: 'drpaulbrewer:ham-grid-square',
  version: '0.0.1',
  // Brief, one-line summary of the package.
  summary: '',
  // URL to the Git repository containing the source code for this package.
  git: '',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.0.3.1');
  api.addFiles('drpaulbrewer:ham-grid-square.js');
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('drpaulbrewer:ham-grid-square');
  api.addFiles('drpaulbrewer:ham-grid-square-tests.js');
});
