var predictBinary = './private/predict/predict'
var child = Npm.require('child_process');
var fs = Npm.require('fs');

satPredict = {};

satPredict.Track = new Mongo.Collection("track");

satPredict.groundTrack = function(sat, cb){
  var parseOutput = function(e, stdout, stderr){
    var ee;
    if (e) return console.log('error executing predict:'+JSON.stringify(e));  
    try {
      var lines = stdout.split("\n");
      var result = [];
      var t, lat, lon, row;
      for(var i=0,l=lines.length;i<l;++i){
        row = lines[i].split(/\s+/);
        t = parseInt(row[0]);
        lat = parseInt(row[7]);
        lon = parseInt(row[8]);
        if (lon>180) lon=lon-360;
        if (t) result.push([lat,lon]);
      }
    } catch(ee){ return cb(ee,null); }
    cb(null,
       {'sat': sat,
        'start': d0,
        'end': t,
        'delta': 60,
        'latlon': result
       }); 
  };
  var d0 = Math.round(+new Date()/1000.0);
  var d1 = d0+86400;
  var cmd = predictBinary+' -f '+sat+' '+d0+' '+d1+'m';
  child.exec(cmd, parseOutput);
};

satPredict.satellites = ['NOAA-15',
                         'NOAA-18',
                         'NOAA-19',
                         'OSCAR-7',
                         'OSCAR-29',
                         'FUNCUBE-1',
                         'OSCAR-50',
                         'ISS'];

satPredict.updateTrack = function(satlist){
  var sats = satlist || satPredict.satellites;
  var cb = function(e, track){
    if (!e) satPredict.Track.insert(track);
  };
  var refill = function(e){
    if (e) return false;
    for(var i=0,l=sats.length;i<l;++i) (function(i){  
      setTimeout(function(){ satPredict.groundtrack(sats[i], cb);}, 200*i);
    })(i);
  };
  Track.remove({}, refill);
};

Meteor.startup(function(){
  satPredict.updateTrack();
  setInterval(function(){ satPredict.updateTrack();}, 86400.0*1000.0/2.0);
  Meteor.publish("track", function(){ 
    return Track.find(); 
  });
});

