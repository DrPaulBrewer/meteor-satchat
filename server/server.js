// server.js
Meteor.startup(function(){
  Meteor.publish("track", function(){ 
    return Track.find(); 
  });
});
