// satchat Copyright 2014, 2015
// Paul Brewer KI6CQ - Economic and Financial Technology Consulting LLC - www.eaftc.com
//
// Open Source License: MIT License -- see http://opensource.org/licenses/MIT
// 
// satchat is a MeteorJS based chat room that also displays satellite tracking data
//
//

var _depSat = new Deps.Dependency();

var satWanted = [['(AO-7)','AO7'],
             ['(SO-50)','SO50'],
             ['NOAA 15','N15'],
             ['NOAA 18','N18'],
             ['NOAA 19','N19'],
             ['(FO-29)','FO29'],
             ['(AO-73)','AO73'],
                 ["ISS", "ISS"]
            ];

var sats = [];
for(var i=0,l=satWanted.length; i<l; ++i) sats.push(satWanted[i][1]);

var filterTLE = function(tle, spec){
  var i,l,j,match;
  var tleLength = tle.length;
  var tleOut = [];
  for(i=0,l=spec.length;i<l;++i){
    j = tle.length;
    match = false;
    while ((!match) && (j>0)){
      --j;
      match = (tle[j][0].indexOf(spec[i][0])>=0);
    }
    if (match) {
      tle[j][0] = spec[i][1];
      tleOut.push(tle[j]);
    }
  }
  return tleOut;
}

var updatePLibTLEs = function(){
  var rawTLE, filteredTLE;
  try {
    PLib.tleData = filterTLE(TLE.findOne({'expire':{$gt:+(new Date())}}).tleData, 
                             satWanted);
    PLib.InitializeData(); 
    _depSat.changed();
  } catch(e) {
    console.log("error in app.js updatePLibTLEs:",e)
  }
};

Messages = new Mongo.Collection("messages");
QTH = new Mongo.Collection("qth");
TLE = new Mongo.Collection("tle");
Meteor.subscribe("messages");
Meteor.subscribe("qth");
Meteor.subscribe("tle", updatePLibTLEs);
Meteor.subscribe("userPresence");  


satmag = 1.0;
  
Session.set('ignore',[]);

var utcHM = function(t){
  var d = new Date(t);
  var h = d.getUTCHours(t);
  var m = d.getUTCMinutes(t);
  if (h<10) h='0'+h;
  if (m<10) m='0'+m;
  return h+':'+m;  
};

var utcDHM = function(t){
  var d = new Date(t);
  var day = d.getUTCDate(t);
  return day+' '+utcHM(t);
};


whoIs = function(uid){
  var found =  Meteor.users.findOne(uid);
  if (found) found = found.username;
  return found;
};

myCall = '';
myGrid = '';
myLatLon = null;

Tracker.autorun(function(){
  myCall = Session.get('callsign');
  if (myCall){
    try {
      myGrid = QTH.findOne({'call':myCall}).grid;
      myLatLon = HamGridSquare.toLatLon(myGrid);
      $('.myGrid').val(myGrid);
      $('.myLat').val(myLatLon._lat);
      $('.myLon').val(myLatLon._lon);
      PLib.configureGroundStation(myLatLon._lat, myLatLon._lon);
      _depSat.changed();  
    } catch(e){};
  }
});

ignored = function(call){
  if (!Session.get('ignore')) return false;
  return (Session.get('ignore').indexOf(call)>=0);
};

checkedIn = function(){
  var everyone =  Presences.find().fetch();
  var calls = [];
  var call;
  for(var i=0,l=everyone.length;i<l;++i){
      if ((everyone[i].state) && (everyone[i].userId)){
        call = whoIs(everyone[i].userId);
        if (!ignored(call)) calls.push(call);
      }
  }
  return calls.sort();
};

lastMessages = function(msgCursor, order){
    var last = {}, lastmsgs = [],call='';
    var msgs = msgCursor.fetch();
    for(var i=0,l=msgs.length;i<l;++i){
      call = msgs[i].call;
      if (last[call]){
        if (msgs[i].t>last[call].t){
          last[call] = msgs[i];
        }
      } else {
        last[call] = msgs[i];
      }
    }
    for (k in last){
      if (last.hasOwnProperty(k)) lastmsgs.push(last[k]);
    }
  if (order) lastmsgs.sort(order);
  return lastmsgs;
};

orderBy = function(field, m){
  return function(a,b){
    if (a[field]>b[field]) return m;
    if (a[field]<b[field]) return -m;
    return 0;
  }
};

var PleaseSignIn = function(){
  $( "#dialog-psi" ).dialog({
      modal: true,
      buttons: {
        Ok: function() {
          $( this ).dialog( "close" );
        }
      }
  });
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

var byDateTimeStart = function(a,b){ 
  return a.dateTimeStart-b.dateTimeStart;
};

var nextSat = function(){
  var listOfPasses;
  var now = +(new Date());
  if (!myLatLon) return null;
  listOfPasses = PLib.getTodaysPasses().filter(
    function(p){
      return (p && p.dateTimeStart && (p.dateTimeStart>now));
    });
  listOfPasses.sort(byDateTimeStart);
  return listOfPasses[0];
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
  announcements: function(){
    var query = {$and: [{call: {$nin: Session.get('ignore')}},
                        {t: {$gt: (+new Date() - 2*86400000)}},
                                 {txt: {$in: [/^!/]}}
                                ]};
    var msgs =  Messages.find(query);
    return lastMessages(msgs, orderBy('call'));
  },
  lastTransmission: function(){
    var query = {call: {$nin: Session.get('ignore')}};
    return lastMessages(Messages.find(query), orderBy('time', -1));
  },
  checkedIn: function(){
    return checkedIn();
  },
  utcDHM: utcDHM,
  utcHM: utcHM,
  qths: function(){
    return QTH.find({},{sort: {"call": 1}}).fetch();
  },
  bearingToGrid: function(grid){
    try {
      if ((grid) && (myLatLon)) return Math.round(myLatLon.bearingTo(HamGridSquare.toLatLon(grid)));
    } catch(e){ console.log("in bearingToGrid "+grid+" error:"+e); };
    return '';
  },
  distanceToGrid: function(grid){
    try {
      if ((grid) && (myLatLon)) return Math.round(myLatLon.distanceTo(HamGridSquare.toLatLon(grid)));
    } catch(e){ console.log("in distanceToGrid "+grid+" error:"+e); };
    return '';
  },
  'nextSat': function(){ 
    _depSat.depend();
    try {
      var s = nextSat();
      var delay = (+s.dateTimeStart)-(+new Date());
      if (delay>0) setTimeout(function(){ _depSat.changed(); }, delay);
      return s;
    } catch(e) { console.log("error in nextSat helper:"+e); }
  }
});

Template.passTable.helpers({
  passes: function(){
    var listOfPasses;
    _depSat.depend();  
    if (!myLatLon) return null;
    listOfPasses = PLib.getTodaysPasses();
    listOfPasses.sort(byDateTimeStart);
    // thanks  http://stackoverflow.com/a/18216255/103081 for how to define explicit dependencies
    return listOfPasses;
  }
})

Template.app.events({
  'keyup #ignore': function(event, template){
    Session.set('ignore',$('#ignore').val().replace(/\n/g,' ').split(/[ ,]+/));
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
            Meteor.call('chatRegister', callsign);
            $('.signinEnabled').prop('disabled',false);          
        };
        Meteor.loginWithPassword(callsign, $('#pass').val(), function(e){
          if (e){
            // if bad password -- do nothing
            if (/password/.test(e.reason)) return false;
            if (/not found/.test(e.reason)){
              if (confirm("[create account] Check callsign for errors. You entered:  "+callsign)){
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

              }
            }
          } else {    
            onGoodPassword();
          }
        });
      }
  },
  'keyup #compose': function(){
    if (!Meteor.userId()){
      // not logged in
      PleaseSignIn();
    } else {
      if ( ($('#compose').val().length>2) && (/\n$/.test($('#compose').val()))  ) {
        $('#send').prop('disabled', true);
        Meteor.call('sendMessage', $('#compose').val());
        $('#compose').val('');
        setTimeout(function(){
          $('#send').prop('disabled', false);
        }, 1000);      
      }
    }
  },
  'click #satbigger': function(){
    satmag = satmag * 1.5;
  },
  'click #satsmaller': function(){
    satmag = satmag/1.5;
  },
  'click #updateQTHviaBrowser': function(){
      try {
        console.log("updating grid from browser geolocation data");
        if (navigator.geolocation) navigator.geolocation.getCurrentPosition(
          function (pos) {
            var grid;
            if (pos.coords) grid = HamGridSquare.fromLatLon(pos.coords);
            if (grid) Meteor.call('chatRegister', myCall, grid);
          });
      } catch (e) { console.log("error updating QTH via browser:"+e); };
  },
  'click #updateMyGrid': function(){
    console.log("updating grid to:"+$('#myGrid').val());
    Meteor.call('chatRegister', myCall, $('#myGrid').val());    
  },
  'click #updateMyLatLon': function(){
    try {
      console.log("converting lat/lon to grid");
      Meteor.call('chatRegister', myCall, HamGridSquare.fromLatLon(
        $('#myLat').val(),
        $('#myLon').val()
        )
                 );
    } catch(e){ console.log("error updating QTH via Lat/Lon:"+e); };
  }
}); 

Template.app.rendered = function(){
  $('#chatBody').tabs();
  if (($.browser) && (!$.browser.mobile)){
    // desktop only
    $('#chatBody').draggable().resizable();    
  }
  Template.app.firstscrollqso = 1;
  $('.firstscrollqso').click(function(){
      if (Template.app.firstscrollqso) scrollToEnd($('#qso .vscroll'));
      Template.app.firstscrollqso = 0;
  });
};

// see http://stackoverflow.com/a/11551414/103081 for scroll to bottom

scrollToEnd = function(j){
  if (j && j.scrollTop) j.scrollTop(j.prop('scrollHeight'));
};

Template.msg.rendered = function(){
    // select the parent of the paragraph elements and scoll to end if scrollable
    var chatDiv = this.$('p').parent('.vscroll'); 
    scrollToEnd(chatDiv);
};

makeWorld = function (width, height){
  var r = Raphael(0, 0, width, height);
  world = r.image("/nasa-world-dec.jpg",0,0,width,height);
  world.getXY = function (lat, lon) {
    return {
      cx: lon * (width/(2*180)) + (width/2),
      cy: lat * (-height/(2*90)) + (height/2)
    };
  };
  world.getLatLon = function (x, y) {
    var lat,lon;
    lat = (y - (height/2)) * (-90.0/(height/2));
    lon = (x - (width/2)) * (180.0/(width/2));
    if (typeof(LatLon)==='function') return new LatLon(lat,lon);
    return {"lat": lat, "lon": lon}
  };

  return {
    'r': r,
    'height': height,
    'width': width,
    'world': world
  }
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
    var myColor = 'aqua';
    stamp = +new Date();
    for(var i=0,l=updates.length; i<l; ++i) (function(i){
      var location = HamGridSquare.toLatLon(updates[i].grid);
      var coords = app.world.getXY(location._lat, location._lon );
      var cx = coords.cx;
      var cy = coords.cy;
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

Meteor.startup(function(){
  $('.signinEnabled').prop('disabled',true);
  $('.initiallyHidden').hide();
  app = makeWorld(600,300);
  drawISS = function(){
    var txt2;
    app.r.setStart();
    app.r.rect(-12,-10,3,20).attr("fill","#ff0");
    app.r.rect(12,-10,3,20).attr("fill","#00f");
    app.r.rect(-7,-5,14,10).attr("fill","#000");
    app.r.text(1,0,"ISS").attr("fill","#bbb");
    txt2 = app.r.text(1,18,"").attr("fill","#ee3");
    txt2.node.id='satInfoISS';
    return app.r.setFinish();
  };
  drawSat = function(name, color){
    var mag = 100; 
    var txt1, txt2;
    app.r.setStart();
    app.r.circle(0,0,5).attr("fill", color);
    app.r.rect(-15,5,30,10).attr("fill","#000");
    txt1 = app.r.text(0,10,name).attr("fill", color);
    txt2 = app.r.text(0,20,'').attr("fill", color);
    txt2.node.id = 'satInfo'+name;
    return app.r.setFinish().transform("s1.5");
  };
  satAnimation = function(){
    var fills = ['#f00','#0f0','#88f','#ff0','#f0f','#0ff','#fff','#d00','#0d0','#80d'];
    app.balls = [];
    var balls = app.balls;
    var coords;
    for(i=0,l=sats.length;i<l;++i){
      if (sats[i]==="ISS"){
        balls[i] = drawISS();
      } else {
        balls[i] = drawSat(sats[i], fills[i]);
      }
    }
    var animationStep = function(){
      var satInfo, coords, txt;
      for(var i=0,l=sats.length;i<l;++i){ 
        try {
          satInfo = PLib.QuickFind(sats[i]);
          coords = app.world.getXY(satInfo.latitude, satInfo.longitude);
          balls[i].transform("S"+satmag+"T"+coords.cx+","+coords.cy);
          if (myGrid && (satInfo.elevation>0)){
            txt = '@'+Math.round(satInfo.azimuth)+'° ∠'+Math.round(satInfo.elevation)+'°';
          } else {
            txt = '';
          }
          $('#satInfo'+sats[i]).text(txt);
        } catch(e){
          console.log("error in animationStep: "+e);
        }
      }      
    };
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

