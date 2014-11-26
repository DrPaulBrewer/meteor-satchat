// satchat Copyright 2014 
// Paul Brewer KI6CQ - Economic and Financial Technology Consulting LLC - www.eaftc.com
//
// <your name could be here too> if you contribute code features or patches we use
//
// Open Source License: MIT License -- see http://opensource.org/licenses/MIT
// 
// satchat is a MeteorJS based chat room that also displays satellite tracking data
//
// The chats and about 24hrs of 1 minute satellite tracking data are kept in a MongoDB database
// Calculations for tracking must be supplied to the database externally
//
// This file: world.js began as a modification of Baranovskiy's demo used on the Raphael js library website
// As of Nov.8, most of the demo code is gone and this is mostly sat display code
// Paul Brewer 8 Nov 2014 
// 
//

Track = new Mongo.Collection("track");
Messages = new Mongo.Collection("messages");
QTH = new Mongo.Collection("qth");
Meteor.subscribe("track");
Meteor.subscribe("messages");
Meteor.subscribe("qth");
Meteor.subscribe("userPresence");  

  
qthxy = {};
Session.set('ignore',[]);

var utcHMS = function(t){
  d = new Date(t);
  h = d.getUTCHours();
  m = d.getUTCMinutes();
  if (h<10) h='0'+h;
  if (m<10) m='0'+m;
  return h+':'+m;
};


whoIs = function(uid){
  var found =  Meteor.users.findOne(uid);
  if (found) found = found.username;
  return found;
};

checkedIn = function(){
  var everyone =  Presences.find().fetch();
  var calls = [];
  for(var i=0,l=everyone.length;i<l;++i){
      if ((everyone[i].state) && (everyone[i].userId)){
        calls.push(whoIs(everyone[i].userId));
      }
  }
  return calls.sort();
};

var registerHelpers = function(obj){
  for(var k in obj){
    if (obj.hasOwnProperty(k)){
      if (typeof(obj[k])==='function'){
        Template.registerHelper(k, obj[k]);
      }
    }
  }
};

registerHelpers({
  screenHeight: function(){
    return sceeen.height;
  },
  screenWidth: function(){
    return screen.width;
  },
  windowHeight: function(){
    return $(window).height();
  },
  windowWidth: function(){
    return $(window).width();
  },
  msgs: function(){ 
    var query = {call: {$nin: Session.get('ignore')}};
    return Messages.find(query);
  },
  checkedIn: function(){
    return checkedIn();
  },
  hms: utcHMS
});


Template.app.events({
  'keyup #ignore': function(event, template){
    Session.set('ignore',$('#ignore').val().split(/[ ,]+/));
  },
 'click .signout': function(event, template){
    if (confirm("thanks 73 was good qso - GO QRT?")){
        Meteor.logout();
        $('.signinEnabled').prop('disabled', true);
        Session.set('callsign','');
    }
  },
  'click .signin': function(event, template){
      var callsign = $('#callsign').val();
      if ((typeof(callsign)==="string") && (callsign.length>2)){
        callsign = callsign.toUpperCase();
        $('#callsign').val(callsign);
        Session.set('callsign',callsign);
        var pass = $('#pass').val();
        var onGoodPassword = function(){
            console.log('good password');
            Meteor.call('chatRegister', callsign, qthxy);
            $('.signinEnabled').prop('disabled',false);          
        };
        Meteor.loginWithPassword(callsign, $('#pass').val(), function(e){
          if (e){
            Accounts.createUser({'username': callsign, 
                                 'password': pass}, 
                                 function(e){
                                    if (e){
                                       $('#signinWarning').text('bad callsign or password');
                                    } else {
                                       console.log('created user');
                                       onGoodPassword();
                                    }
                                  });
            } else {    
              onGoodPassword();
          }
        });
      }
  },
  'click .send': function(){
    if ($('#compose').val().length>2){
      $('#send').prop('disabled', true);
      Meteor.call('sendMessage', $('#compose').val() );
      $('#compose').val('');
      setTimeout(function(){
        $('#send').prop('disabled', false);
      }, 1000);      
    }
  }
}); 

Template.app.rendered = function(){
  $('#chatBody').tabs().draggable().resizable();
}

Template.msg.rendered = function(){
    // select the parent of the paragraph elements and scoll to end if scrollable
    var chatDiv = this.$('p').parent('.vscroll'); 
    if (chatDiv) chatDiv.scrollTop(chatDiv.prop('scrollHeight'));
    // see http://stackoverflow.com/a/11551414/103081 for scroll to bottom
};

makeWorld = function (){
  var r = Raphael(0, 0, 600, 300);
  r.rect(0, 0, 1000, 400, 10).attr({
    stroke: "none",
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
        qthxy = world.getXY(pos.coords.latitude, pos.coords.longitude);
      });
  } catch (e) {}

  return {
    'r': r,
    'world': world
  }
};
  
satTrack = {};

var TrackUpdater = function(){
  Tracker.autorun(function(){
    console.log("fetching satellite tracks");
    var now = Math.floor((+new Date()/1000.0));
    var tracks = Track.find({'end': {$gt: now}}).fetch();
    for(i=0,l=tracks.length; i<l; ++i){
      if ((typeof satTrack[tracks[i].sat] === "undefined") || 
          (tracks[i].end>satTrack[tracks[i].sat].end) ){
        console.log("found: "+tracks[i].sat+" --> "+shortName(tracks[i].sat));
        satTrack[tracks[i].sat] = tracks[i];
      }
    }
  });    
};

lastSeenSec = function(call){
  var qthFound = QTH.findOne({'call':call});
  var msgFound = Messages.findOne({'call':call}, {$sort: {'t':-1}});
  var t = 0;
  if (msgFound && msgFound.t) t = msgFound.t;
  if (qthFound && qthFound.t && (qthFound.t>t)) t = qthFound.t;
  return (+new Date()-t)/1000.0;
};

var QTHUpdater = function(r){
  var stamp = 0;
  r.roll = {};
  var ageColor = function(t){
    var age;
    var red=255;
    var green=0;
    var old = 1000*3600*24;
    var color;
    if(typeof(t)==="number"){
      age = +new Date()-t;
      red = Math.round(255*age/old);
      if (red>255) red=255;
    }
    green = 255-red;
    color =  'rgb('+red+', '+green+', 0)';
    return color;
  }
  Tracker.autorun(function(){
    var updates = QTH.find({'t': {$gt: stamp}},{$sort:{'t':1}}).fetch();
    var myCall = $('#myCall').val();
    var myColor = 'aqua';
    stamp = +new Date();
    for(var i=0,l=updates.length; i<l; ++i) (function(i){
      var cx = updates[i].qthxy.cx;
      var cy = updates[i].qthxy.cy;
      var t = updates[i].t;
      var call = updates[i].call;
      var color = 0;
      if (r.roll[call]){
        color = (call===myCall)? myColor: ageColor(t);
        r.roll.marker.attr({fill: color});
      } else {
        r.roll[call]={};
        r.setStart();
        r.rect(cx-20,cy-20,60,40).attr({fill:"yellow"});
        r.text(cx, cy, call);
        r.roll[call].popup = r.setFinish().hide().mouseout(function(){
          setTimeout(function(){r.roll[call].popup.hide()}, 3000);
        });
        color = (call===myCall)? myColor: ageColor(t);
        r.roll.marker = r.rect(cx-3,cy-3,6,6).toFront().attr({fill: color})
          .hover(function(){r.roll[call].popup.toFront().show()},
             function(){});
      }
    })(i);
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
  if (Math.abs(pos0[1]-pos1[1])<170){
    pos[1] = pos0[1]*q0+pos1[1]*q1;    
  } else { 
    pos[1] = -179.99;  // just stick it on the eastern edge for now
  }

  return pos; // returns a 2 element array lat, -long
};

Meteor.startup(function(){
  $('.signinEnabled').prop('disabled',true);
  app = makeWorld();
  satPosXY = function(sat){
    var pos = satPos(sat);
    return app.world.getXY(pos[0],-pos[1]); // -pos[1] because predict uses +long for West, - for east
    // returns an object with cx, cy attributes, ready to use in RaphaelJS circle.attr() function
  }
  drawISS = function(){
    app.r.setStart();
    app.r.rect(-12,-10,3,20).attr("fill","#ff0");
    app.r.rect(12,-10,3,20).attr("fill","#00f");
    app.r.rect(-7,-5,14,10).attr("fill","#000");
    app.r.text(1,0,"ISS").attr("fill","#bbb");
    return app.r.setFinish();
  };
  drawSat = function(name, color){
    app.r.setStart();
    app.r.circle(0,0,5).attr("fill", color);
    app.r.rect(-15,5,30,10).attr("fill","#000");
    app.r.text(0,10,name).attr("fill", color);
    return app.r.setFinish().transform("S1.5");
  };
  shortNames = {
    'NOAA-15': 'N15',
    'NOAA-18': 'N18',
    'NOAA-19': 'N19',
    'OSCAR-7': 'AO7',
    'OSCAR-29': 'FO29',
    'OSCAR-50': 'SO50',
    'FUNCUBE-1': 'AO73'
  };
  shortName = function(predictName){
    return shortNames[predictName] || predictName;    
  }
  satAnimation = function(){
    var sats = Object.keys(satTrack);
    var fills = ['#f00','#0f0','#00f','#ff0','#f0f','#0ff','#fff','#800','#080','#008'];
    var balls = [];
    var coords;
    for(i=0,l=sats.length;i<l;++i){
      if (sats[i]==="ISS"){
        balls[i] = drawISS();
      } else {
        balls[i] = drawSat(shortName(sats[i]), fills[i]);
      }
    }
    var animationStep = function(){
      for(i=0,l=sats.length;i<l;++i){
        var coords = satPosXY(sats[i]);
        balls[i].transform("T"+coords.cx+","+coords.cy);
      }
    }
    setInterval(animationStep, 1000);
  }
  UTC = function(){
    $('#timeUTC').text(new Date().toUTCString());
  };
  UTC();
  setInterval(UTC, 1000);  
  setTimeout(function(){
    if (Meteor.userId()){
      console.log(Meteor.userId());
      console.log("recognized as:"+whoIs(Meteor.userId()));
      $(".signinEnabled").prop("disabled",false);
    }
  }, 2000);
  
  setTimeout(QTHUpdater.bind({}, app.r), 3000);

  setTimeout(satAnimation, 4000);   
});

