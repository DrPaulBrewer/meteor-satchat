// server.js
Meteor.startup(function(){
  Meteor.publish("track", function(){ 
    return Track.find(); 
  });
  Meteor.publish("messages", function(){
    return messages.find();
  });
  Meteor.methods({
    'sendMessage':function(key, room, msg){
    }
  });
});
