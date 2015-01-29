// server.js
Meteor.startup(function(){
  Messages = new Mongo.Collection("messages");
  QTH = new Mongo.Collection("qth");
  Lids = new Mongo.Collection("lids");
  Nologins = new Mongo.Collection("nologins");

  // fix legacy world map coords QTH
  var fixQTH = function(){
    var data = QTH.find({'qthxy': {$exists: true}}).fetch();
    var i=0,l=data.length;
    for(;i<l;++i){
      (function(x){
        var lat,lon,grid;
        lat = (x.qthxy.cy - 150.0) * (-90.0/150.0);
        lon = (x.qthxy.cx - 300.0) * (180.0/300.0);
        grid = HamGridSquare.fromLatLon(lat,lon);
        QTH.remove({'call': x.call});        
        QTH.insert({'call': x.call, 'grid': grid, 't': x.t});
        console.log('fixed: '+x.call+' grid:'+grid);
      })(data[i]);
    }
  };
  
  fixQTH(); 
  
  Meteor.publish("messages", function(){
    return Messages.find();
  });
  Meteor.publish("qth", function(){
    return QTH.find();
  });
  
  Meteor.publish("users", function(){
    return Users.find({},{fields: {_id:true, username: true}})
  });
  
  Meteor.publish('userPresence', function() {
  // requires meteor add tmeasday:presence
  // Setup some filter to find the users your user
  // cares about. It's unlikely that you want to publish the 
  // presences of _all_ the users in the system.

  // If for example we wanted to publish only logged in users we could apply:
  // filter = { userId: { $exists: true }};
  
    var filter = { userId: { $exists: true }}; 

    return Presences.find(filter, { fields: { state: true, userId: true }});

  });
  
  var reportLid = function(con, call, why){
    var recent = Lids.findOne({call: call, t: { $gt: (+new Date()-600000) }});
    var report = {call: call, con: con, why: why, t: +new Date()};
    if (!recent){
      try {
        console.log("Lid Report: "+JSON.stringify(report));
        Lids.insert(report);
      } catch(e) {console.log("reportLid error:"+JSON.stringify(e)); };
    }       
  };
  
  var prevMessageByCall = {};  
  var lastMessage = {};

  var sendMessage = function(call, txt){
    var msg = {'call':call, 'txt': txt, 't': +new Date()};
    prevMessageByCall[call]=msg;
    lastMessage=msg;
    Messages.insert(msg);
    return true;
  };
  
  var isNoLogin = function(call){
    // calls may not have whitespace
    if (/\s/.test(call)) return true;
    if ( (/^[A-Z0-9\-\/]+$/.test(call)) && (/[A-Z]/.test(call)) && (/\d/.test(call)) ){
      // valid is A-Z 0-9 dash slant
      // must have an A-Z and a 0-9
      return (!!Nologins.findOne({call: call.toLowerCase()}));
    }
    // no digits -- probably not a callsign
    return true;
  }
  
  // no forbidden calls for new users
  
  Accounts.validateNewUser(function (user) {
    return (!isNoLogin(user.username));
  }); 
  
  // no forbidden calls for existing users either
  
  Accounts.validateLoginAttempt(function(attempt){
    return ( (attempt.user) && (!isNoLogin(attempt.user.username)) );
  });
  
  getGrid = function(mycall){
    var grid;
    try {
      grid = QTH.findOne({'call':mycall}).grid;
    } catch(e){};
    return grid;
  }
  
  Meteor.methods({
    'chatRegister': function(mycall, newGrid){
      var oldGrid = getGrid(mycall);
      var grid = newGrid || oldGrid;
      console.log("in catRegister: "+mycall+" "+oldGrid+" "+newGrid);
      if (typeof(mycall)==="string" && (mycall.length>0)){
        try { 
          mycall = mycall.toUpperCase();
          if (mycall === Meteor.user().username){          
            if ( grid && (/^[A-Z][A-Z][0-9][0-9]/.test(grid)) && (grid.length<=6)){         
              QTH.remove({'call': mycall}); 
              QTH.insert({'call': mycall, 'grid': grid, 't': +new Date()});
              console.log("chatRegister: "+mycall+" "+grid);
              return true;
            }
          }
        } catch(e){ console.log("in chatregister, error:"+JSON.stringify(e));
                  }
      }
      return false;
    },
    'sendMessage': function(msg){
      var t = +new Date();
      var mycall = 'Nobody';
      // dont send msgs that are too long
      if (msg.length > 255) return false;
      try {
        mycall = Meteor.user().username;
        // an exception will be caught if user is null -- ignoring message
        // rules for ignoring messages 
        if (prevMessageByCall[mycall]){
          if (msg===prevMessageByCall[mycall].txt) return false;
          if (t < (1000+prevMessageByCall[mycall].t)){
            reportLid(this.connection,mycall,'flooding');
            prevMessageByCall[mycall].t = +new Date()+30000;
            return false;
          }
        }
        // fix ALL CAPS messages
        if (msg.toUpperCase()===msg){
          msg = msg.toLowerCase();
        }
        sendMessage(mycall, msg);
      } catch(e){ }
    }
  });
});
