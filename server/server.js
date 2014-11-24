// server.js
Meteor.startup(function(){
  Track = new Mongo.Collection("track");
  Messages = new Mongo.Collection("messages");
  QTH = new Mongo.Collection("qth");
  Lids = new Mongo.Collection("lids");
  Meteor.publish("track", function(){ 
    return Track.find(); 
  });
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
  
  Meteor.methods({
    'chatRegister': function(mycall, qthxy){
      if (typeof(mycall)==="string" && (mycall.length>0)){
        try { 
          mycall = mycall.toUpperCase();
          if (mycall === Meteor.user().username){
            if (qthxy && qthxy.cx && qthxy.cy){
              qthxy.cx = Math.round(qthxy.cx);
              qthxy.cy = Math.round(qthxy.cy);
              QTH.remove({'call': mycall});          
              QTH.insert({'call': mycall, 'qthxy': qthxy, 't': +new Date()});
            }
          }
        } catch(e){ console.log("in chatregister, error:"+JSON.stringify(e));
                  }
      }
      return true;
    },
    'sendMessage': function(msg){
      var t = +new Date();
      try {
        var mycall = Meteor.user().username;
        // rules for ignoring messages 
        if (prevMessageByCall[mycall]){
          if (msg===prevMessageByCall[mycall].txt) return false;
          if (t < (2000+prevMessageByCall[mycall].t)){
            reportLid(this.connection,mycall,'flooding');
            prevMessageByCall[mycall].t = +new Date()+30000;
            return false;
          }
        }
        sendMessage(mycall, msg);
      } catch(e){ console.log("sendMesage call from bad user"); }
    }
  });
});
