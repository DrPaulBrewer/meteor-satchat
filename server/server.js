// server.js
Meteor.startup(function(){
  Meteor.publish("track", function(){ 
    return Track.find(); 
  });
  Meteor.publish("messages", function(){
    return Messages.find();
  });
  var sendMessage = function(call, txt){
    Messages.insert({'call': call, 'txt': txt, 't': +new Date()});
    return true;
  };
  Meteor.methods({
    'chatRegister': function(mycall){
      sendMessage(mycall, 'sign on');
      return true;
    },
    'sendMessage': sendMessage
  });
});
