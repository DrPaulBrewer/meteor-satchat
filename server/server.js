// server.js
Meteor.startup(function(){
  Track = new Mongo.Collection("track");
  Messages = new Mongo.Collection("messages");
  QTH = new Mongo.Collection("qth");
  Meteor.publish("track", function(){ 
    return Track.find(); 
  });
  Meteor.publish("messages", function(){
    return Messages.find();
  });
  Meteor.publish("qth", function(){
    return QTH.find();
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
  
  
  var sendMessage = function(call, txt){
    Messages.insert({'call': call, 'txt': txt, 't': +new Date()});
    return true;
  };
  Meteor.methods({
    'chatRegister': function(mycall, qthxy){
      if (typeof(mycall)==="string" && (mycall.length>0)){
        mycall = mycall.toUpperCase();
        sendMessage(mycall, 'sign on');
        if (qthxy && qthxy.cx && qthxy.cy){
          qthxy.cx = Math.round(qthxy.cx);
          qthxy.cy = Math.round(qthxy.cy);
          QTH.remove({'call': mycall});          
          QTH.insert({'call': mycall, 'qthxy': qthxy, 't': +new Date()});
        }
      }
      return true;
    },
    'sendMessage': sendMessage
  });
});
