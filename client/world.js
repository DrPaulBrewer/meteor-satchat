// This world.js began as a modification of Baranovskiy's demo used on the Raphael js library site
// As of Nov.8, most of the demo code is gone and this is mostly sat display code
// Paul Brewer 8 Nov 2014 
// 
//


function makeWorld(){
  var r = Raphael(0, 0, 1000, 400);
  r.rect(0, 0, 1000, 400, 10).attr({
    stroke: "none",
//    fill: "0-#9bb7cb-#adc8da"
    fill: "#fff"
  });
  world = r.image("/nasa-world-dec.jpg",0,0,600,300);
  world.getXY = function (lat, lon) {
    return {
      cx: lon * (300.0/180.0) + 300.0,
      cy: lat * (-150.0/90.0) + 150.0
    };
  };
  world.getLatLon = function (x, y) {
    return {
      lat: (y - 150.0) / -(90.0/150.0),
      lon: (x - 300.0) / (180.0/300.0)
    };
  };

  try {
    navigator.geolocation && navigator.geolocation.getCurrentPosition(
      function (pos) {
        c = world.getXY(pos.coords.latitude, pos.coords.longitude);
        r.rect(c.cx-2,c.cy-2,4,4).attr({fill: "none", 
                         stroke: "#f00"});
      });
  } catch (e) {}

  return {
    'r': r,
    'world': world
  }
};
  
Meteor.startup(function(){
  app = makeWorld();
  Meteor.subscribe("track");
  satTrack = {};
  var TrackUpdater = function(){
    Tracker.autorun(function(){
        console.log("fetching Tracks");
        var now = Math.floor((+new Date()/1000.0));
        var tracks = Track.find({'end': {$gt: now}}).fetch();
        for(i=0,l=tracks.length; i<l; ++i){
          if ((typeof satTrack[tracks[i].sat] === "undefined") || 
              (tracks[i].end>satTrack[tracks[i].sat].end) ){
            satTrack[tracks[i].sat] = tracks[i];
          }
        }
     });    
  };
  setTimeout(TrackUpdater, 3000);
  satPos = function(sat){
    var s = satTrack[sat];
    var time = (+new Date())/1000;
    var idx = Math.floor((time-s.start)/s.delta);
    var q1 = ((time - s.start)%s.delta)/s.delta;
    var q0 = 1.0 - q1;
    var pos0 = s.latlon[idx];
    var pos1 = s.latlon[idx+1];
    var pos = [];
    pos[0] = pos0[0]*q0+pos1[0]*q1;
    pos[1] = pos0[1]*q0+pos1[1]*q1;
    return pos; // returns a 2 element array lat, -long
  };
  satPosXY = function(sat){
    var pos = satPos(sat);
    return app.world.getXY(pos[0],-pos[1]); // -pos[1] because predict uses +long for West, - for east
    // returns an object with cx, cy attributes, ready to use in RaphaelJS circle.attr() function
  }
  satAnimation = function(){
    function lx(i){ return 20+(i%3)*100; }
    function ly(i){ return 300+20*Math.floor(i/3);}
    var sats = Object.keys(satTrack);
    var fills = ['#f00','#0f0','#00f','#ff0','#f0f','#0ff','#fff','#800','#080','#008'];
    var balls = [];
    var coords;
    for(i=0,l=sats.length;i<l;++i){
      app.r.setStart();
      app.r.circle(0,0,3).attr("fill",fills[i]);
      app.r.text(50,0, sats[i]);
      app.r.setFinish().transform("T"+lx(i)+","+ly(i));
      balls[i] = app.r.circle(0,0,5).attr("fill",fills[i]);
    }
    var animationStep = function(){
      for(i=0,l=sats.length;i<l;++i){
        var coords = satPosXY(sats[i]);
        balls[i].transform("T"+coords.cx+","+coords.cy);
      }
    }
    setInterval(animationStep, 1000);
  }
  setTimeout(satAnimation, 4000); 
});