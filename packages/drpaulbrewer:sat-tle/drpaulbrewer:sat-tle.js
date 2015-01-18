TLE = new Mongo.Collection("tle");
TLE.remove({}, function(e){ if(e) console.log("TLE.remove:"+e); });

var urls = [
  'http://www.celestrak.com/NORAD/elements/amateur.txt',
  'http://www.celestrak.com/NORAD/elements/weather.txt'
  ];

var updateTLE = function(){
  var convert = function(data){
    var data2 = data.replace("\r",'');
    var lines = data2.split("\n");
    var result = [];
    var i,l;
    var done = false;
    for(i=0,l=lines.length; i<l; ++i){
      if (((i%3) === 0) && (lines[i].length<1)) done=1;
      if (!done){ 
        if ((i%3)===0){
          result.push([lines[i].trim()]);
        } else {
          result[Math.floor(i/3)].push(lines[i].trim());
        }
      }
    }
    return result;
  };
  var r = Array.prototype.concat.apply([], 
           urls.map(
             function(u){ 
               var remote = HTTP.get(u);
               return convert(remote.content); 
             }
           ));
  console.log(r);
  TLE.insert({
    'begin': (+new Date()),
    'expire': (+new Date()+1000*3600*24*7),
    'tleData': r
  });
};

updateTLE();
setInterval(updateTLE, 1000*3600*24*7);
Meteor.publish("tle", function(){ return TLE.find({}); });