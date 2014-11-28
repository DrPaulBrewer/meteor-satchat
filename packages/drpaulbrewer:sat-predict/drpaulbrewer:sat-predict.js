// drpaulbrewer:sat-predict.js Copyright 2014 Paul Brewer KI6CQ
// Open Source License: The MIT License http://opensource.org/licenses/MIT

var path = Npm.require('path');

var predictBinary = path.resolve('./assets/app/predict/predict');
var updateKepsSh = path.resolve('./assets/app/predict/update-keps.sh');
var updateKeps = '/bin/bash '+updateKepsSh;
var dotpredict = path.resolve('./assets/app/predict/dotpredict');

console.log('predictBinary:'+predictBinary);
console.log('updateKeps:'+updateKeps);
console.log('dotpredict:'+dotpredict);

var child = Npm.require('child_process');
var fs = Npm.require('fs');

var e;

console.log("cwd is:"+process.cwd());

try {
  fs.chmodSync(predictBinary, 0755);
  fs.chmodSync(updateKepsSh, 0755);
  fs.symlinkSync(dotpredict, process.env.HOME+'/.predict','dir');
} catch(e){console.log("error setting up files in sat-predict.js: "+e);};


satPredict = {};

satPredict.Track = new Mongo.Collection("track");
satPredict.Track.remove({}, function(e){ if(e) console.log(e);});

satPredict.groundTrack = function(sat, cb){
  var parseOutput = function(e, stdout, stderr){
    var ee;
    var result = [];
    var t=0, tlast=0, lat=0, lon=0, row, lines, i=0, l=0;
    if (e) {
      console.log('error executing predict:'+JSON.stringify(e));
      console.log('looking for predict binary at:'+predictBinary);
      console.log('current working directory:'+process.cwd());
      return null;      
    }
    try {
      lines = stdout.split("\n");
      for(i=0,l=lines.length;i<l;++i){
        row = lines[i].split(/\s+/);
        try {
          t = parseInt(row[0]);
          lat = parseInt(row[7]);
          lon = parseInt(row[8]);
          if (lon>180) lon=lon-360;
          if (t>tlast) {
            result.push([lat,lon]);
            tlast = t;
          }
        } catch(ee){};
      }
    } catch(ee){ return cb(ee,null); }
    cb(null,
       {'sat': sat,
        'start': d0,
        'end': tlast,
        'delta': 60,
        'latlon': result
       }); 
  };
  var d0 = Math.round(+new Date()/1000.0);
  var d1 = d0+86400;
  var cmd = predictBinary+' -f '+sat+' '+d0+' '+d1+'m';
  child.exec(cmd, parseOutput);
};

satPredict.defaultSatelliteList = ['NOAA-15',
                         'NOAA-18',
                         'NOAA-19',
                         'OSCAR-7',
                         'OSCAR-29',
                         'FUNCUBE-1',
                         'OSCAR-50',
                         'ISS'];

var trackInsert = Meteor.bindEnvironment(function(e, track){
  if (!e) satPredict.Track.insert(track);
});

satPredict.updateTrack = Meteor.bindEnvironment(function(satlist){
  var sats = satlist || satPredict.satellites;
  var refill = function(e){
    if (e) return console.log('satPredict.Track.remove failed:'+e);
    for(var i=0,l=sats.length;i<l;++i) (function(i){  
       satPredict.groundTrack(sats[i], trackInsert);
    })(i);
  };
  satPredict.Track.remove({}, refill);
});

satPredict.updateKeps = function(){
  child.exec(updateKeps, function(e,stdout,stderr){if ((e) || (stderr)) console.log(e+stderr);});  
};

satPredict.init = function(sats){
  satPredict.satellites = sats || satPredict.defaultSatelliteList;
  satPredict.updateKeps();
  setTimeout( function(){ satPredict.updateTrack(); }, 30000);
  setInterval(function(){ satPredict.updateTrack();}, 86400.0*1000.0/2.0);
  setInterval(function(){ satPredict.updateKeps();}, 86400.0*1000.0*7.0);
  Meteor.publish("track", function(){ 
    return Track.find(); 
  });  
};




