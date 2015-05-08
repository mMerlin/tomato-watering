'use strict';

var userName = 'Kipper123';
var apiKey = '0gb0qrvchc';

var tokens = ['4npov9wfaz', 'c6292whiqa', 'vvw9kh3gvk', 'tnyhwi3ryz'];

var plotly = require('plotly')(userName, apiKey);
var layout = {
  fileopt: 'extend', 
  filename: 'Tomatoes',
  title: 'Tomato Watering Schedule',
  xaxis : {title: 'Date/Time'},
  yaxis : {title: 'On/Off'}
};

var five = require('johnny-five');
var board = new five.Board();

var nTraces = 4;        // number of data feeds
var maxData = 200;      // number of data points displayed on graph

var loopTime = 300000;  // time between sampling (ms) - 5 minutes
var waterTime = 10000;  // time for watering event (ms) - 10 seconds
var dryValue = 700;     // sensor value that triggers a watering event 

var analogPin = ['A0', 'A1', 'A2', 'A3'];
var solenoidPin = [1, 3, 5, 7];
var pumpPin = 8;

var off = [0, 2, 4, 6];
var on = [1, 3, 5, 7];

var valves=[]; 
var done = [false, false, false, true];
var counter = 0;
 
var plotlyData = [
  {x:[], y:[], stream:{token: tokens[0], maxpoints: maxData}},
  {x:[], y:[], stream:{token: tokens[1], maxpoints: maxData}},
  {x:[], y:[], stream:{token: tokens[2], maxpoints: maxData}},
  {x:[], y:[], stream:{token: tokens[3], maxpoints: maxData}}
];


board.on('ready', function(){

  // initialize the solenoid valves
  for (var i = 0; i < nTraces; i++){
    var valve = new five.Pin(solenoidPin[i]);
    valves.push(valve);
  }

  // initialize the pump
  var pump = new five.Pin(pumpPin);

  // make sure the solenoids are closed
  for (var i = 0; i < nTraces; i++){
    valves[i].low;
    delay(1000);
  }
    
  // make sure pump is turned off
  pump.low();
  delay(1000);

  // initialize the sensors
  var sensor0 = new five.Sensor({pin: analogPin[0], freq: loopTime});
  var sensor1 = new five.Sensor({pin: analogPin[1], freq: loopTime});
  var sensor2 = new five.Sensor({pin: analogPin[2], freq: loopTime});
  var sensor3 = new five.Sensor({pin: analogPin[3], freq: loopTime});

  sensor0.on('data', function(){

    while (!done[3]){
      delay(waterTime);
    }
    //initialize the plotly graph
    plotly.plot(plotlyData, layout, function(err, msg){
      if (err) return console.log(err);
      console.log(msg);
      console.log('plotly graph initialized');

      // create the data streams to pipe the data
      stream0 = plotly.stream(tokens[0], function(err, res){
        if (err) return console.log(err);
        console.log(res);
      });
      console.log('stream0 created');
       
      if(sensor0.value < dryValue){

        // write the data
        var saveTime = getDateString();
        var data = {
           x: saveTime,
           y: off[0]
        };
  
        stream0.write(JSON.stringify(data)+'\n');
        delay(100);
        consoleLogger(counter, 0, data);
        var data = {
           x: saveTime,
           y: on[0]
        };
        stream0.write(JSON.stringify(data)+'\n');
        delay(100);
        consoleLogger(counter, 0, data);
        // water the plant

        // open the valve
        valves[0].high();
        delay(1000);

        // turn the pump on
        pump.high();
        delay(waterTime);

        // close the valve
        valves[0].low();
        delay(1000);

        // turn the pump off
        pump.low();
        delay(1000);

        // write the data
        saveTime = getDateString();
        var data = {
          x: saveTime,
          y: on[0]
        };
        stream0.write(JSON.stringify(data)+'\n');
        delay(100);
        consoleLogger(counter, 0, data);
        var data = {
          x: saveTime,
          y: off[0]
        };
        stream0.write(JSON.stringify(data)+'\n');
        delay(100);
        consoleLogger(counter, 0, data);
      }
      else {

        // write the data
        var data = {
          x: getDateString(),
          y: off[0]
        };
        stream0.write(JSON.stringify(data)+'\n');
        delay(100);
        consoleLogger(counter, 0, data);
      }

      // close the valves (redundant, because the valves should already be closed
      for (var i = 0; i < nTraces; i++){
        valves[i].low();
        delay(1000);
      }

      // turn the pump off (redundant, because the pump should already be off
      pump.low();
      delay(1000);
     
      counter++;
      done[3] = false;
      done[0] = true;
    });
  });

  sensor1.on('data', function(){
    
    while (!done[0]){
      delay(waterTime);
    }

    // initialize the plotly graph
    plotly.plot(plotlyData, layout, function(err, msg){
      if (err) return console.log(err);
      console.log(msg);
      console.log('plotly graph initialized');

      // create data stream
      stream1 = plotly.stream(tokens[1], function(err, res){
        if (err) return console.log(err);
        console.log(res);
      });
      console.log('stream1 created');

      if(sensor1.value < dryValue){

        //write the data
        var saveTime = getDataString();
        var data = {
           x : saveTime,
           y : off[1]
        };

        stream1.write(JSON.stringify(data)+'\n');
        delay(100);
        consoleLogger(counter, 1, data);
        var data = {
          x : saveTime,
          y : on[1]
        };
        stream1.write(JSON.stringify(data)+'\n');
        delay(100);
        consoleLogger(counter, 1, data);

        // water the plant

        // open the valve
        valve[1].high();
        delay(1000);

        // turn the pump on
        pump.high();
        delay(waterTime);

        // close the valve
        valves[1].low();
        delay(1000);

        // turn the pump off
        pump.low();
        delay(1000);

        // write the data
        saveTime = getDateString();
        var data = {
          x : saveTime,
          y : on[1]
        };
        stream1.write(JSON.stringify(data)+'\n');
        delay(100);
        consoleLogger(counter, 1, data);
        var data = {
          x: saveTime,
          y: off[1]
        };
        stream1.write(JSON.sringify(data)+'\n');
        delay(100);
      }
      else{

        // write the data
        var data = {
          x : getDateString(),
          y : off[1]
        };
        stream1.write(JSON.stringify(data)+'\n');
        delay(100);
      }

      // close the valves (redundant, because the valves should already be closed
      for (var i = 0; i < nTraces; i++){
        valves[i].low();
        delay(1000);
      }

      // turn the pump off (redundant, because the pump should already be off
      pump.low();
      delay(1000);
      
      counter++;
      done[0] = false;
      done[1] = true;
    });
  });

  sensor2.on('data', function(){

    while(!done[1]){
      delay(waterTime);
    }
    
    // initialize the plotyly graph
    plotly.plot(plotlyData, layout, function(err, res){
    stream2 = plotly.stream(tokens[2], function (err, res){
      if (err) return console.log(err);
      console.log('plotly graph initialized');

      // create the data streams to pipe the data
      stream2 = plotly.stream(tokens[2], function(err, res){
        if (err) return console.log(err);
        console.log(res);
      });
      console.log('stream2 created');

      if(sensor2.value < dryValue){

        // write the data
        var saveTime = getDateString();
        var date = {
          x : saveTime,
          y : off[2]
        };
        stream2.write(JSON.stringify(data)+'\n');
        delay(100);
        consoleLogger(counter, 2, data);
        var data = {
          x : saveTime,
          y : on[2]
        };
        stream2.write(JSON.stringify(data)+'\n');
        delay(100);
        consoleLogger(counter, 2, data);
        
        // water the plant

        // open the valve
        valves[2].high();
        delay(1000);

        // turn the pump on
        pump.high();
        delay(waterTime);

        // close the valve
        valves[2].low();
        delay(1000);
  
        // turn the pump off
        pump.low();
        delay(1000);

        // write the data
        saveTime = getDateString();
        var data = {
          x : saveTime,
          y : on[2]
        };
        stream2.write(JSON.stringify(data)+'\n');
        delay(100);
        consoleLogger(counter, 2, data);
        var data = {
          x : saveTime,
          y : off[2]
        };
        stream2.write(JSON.stringify(data)+'\n');
        consoleLogger(counter, 2, data);
        delay(100);
      }
      else{
        
        // write the data
        var data = {
          x : getDateString(),
          y : off[2]
        };
        stream2.write(JSON.stringify(data)+'n');
        delay(100);
        consoleLogger(counter, 2, data);
      }

      // close the valves (redundant, because the valves should already be closed
      for (var i = 0; i < nTraces; i++){
        valves[i].low();
        delay(1000);
      }

      // turn the pump off (redundant, because the pump should already be off
      pump.low();
      delay(1000);
    
      counter++;
      done[1] = false;
      done[2] = true;
    });
  });

  sensor3.on('data', function(){
   
    while(!done[2]){
      delay(waterTime);
    }

    //initialize the plotly graph
    plotly.plot(plotlyData, layout, function(err, msg){
      if (err) return console.log(err);
      console.log(res);
      console.log('plotly graph initialized');

      // create the data stream to pipe the data
      stream3 = plotly.stream(tokens[3], function(err, res){
        if (err) return console.log(err);
        console.log(res);
      });
      console.log('stream3 created');

      if(sensor3.value < dryValue){
      
        // write the data
        var saveTime = getDateString();
        var data = {
          x : saveTime,
          y : off[3]
        };
        stream3.write(JSON.stringify(data)+'\n');
        delay(100);
        consoleLogger(counter, 3, data);
   
        var data = {
          x : saveTime,
          y : on[3]
        };
        stream3.write(JSON.stringify(data)+'\n');
        delay(100);
        consoleLogger(counter, 3, data);

        // water the plant

        // open the valve
        valves[3].high();
        delay(1000);
      
        // turn the pump on
        pump.high();
        delay(waterTime);

        // close the valve
        valves[3].low();
        delay(1000);

        // turn the pump off
        pump.low();
        delay(1000);

        // write the data
        saveTime = getDateString();
        var data = {
          x : saveTime,
          y : on[3]
        };
        stream3.write(JSON.stringify(data)+'\n');
        delay(100);
        consoleLogger(counter, 3, data);

        var data = {
          x: saveTime,
          y: off[3]
        };
        stream3.write(JSON.stringify(data)+'\n');
        delay(100);
        consoleLogger(counter, 3, data);
      }
      else{
   
        // write the data
        var data = {
          x: getDateString(),
          y: off[3]
        };
        stream3.write(JSON.stringify(data)+'\n');
        delay(100);
        consoleLogger(counter, 3, data);
      }

      // close the valves (redundant, because the valves should already be closed
      for(var i = 0; i < nTraces; i++){
        valves[i].low();
        delay(1000);
      }
      // turn pump off (redundant, because pump should already be off
      pump.low();
      delay(1000);
    
      counter++;
      done[2] = false;
      done[3] = true;
    });            
  });
});


// helper function to get a formatted date string

function getDateString(){
  var time = new Date();
  var datestr = new Date(time - 21600000).toISOString().replace(/T/, " ").replace(/Z/, "");
  return datestr;
}

// delay function as in Arduino C++

function delay(millis){
  var date = new Date();
  var curDate = null;
  do {curDate = new Date();}
  while(curDate - date < millis);
}


// helper function to log data to the console screen
function consoleLogger(a, b, c){
  if (counter < 11){
    console.log(a, b, c);
  }
}
