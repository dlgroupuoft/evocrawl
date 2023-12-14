var events = []
var nums_authzee = []
var stopfn = rrwebRecord({
  emit(event) {
  // push event into the events array
  events.push(event);
  if(events.length >= 10){
    stopFn();
  }
  },
});
var xss_az = function(num=""){
  nums_authzee.push(num)
  //alert(1);
}
