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

var stream0, stream1, stream2, stream3

var valves=[]; 
var truth = true;
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
  var sensor1 = new five.Sensor({pin: analogPin[1], freq: loopTime/5});
  var sensor2 = new five.Sensor({pin: analogPin[2], freq: loopTime/5});
  var sensor3 = new five.Sensor({pin: analogPin[3], freq: loopTime/5});

  sensor0.on('data', function(){

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
      stream1 = plotly.stream(tokens[1], function(err, res){
        if (err) return console.log(err);
        console.log(res);
      });
      stream2 = plotly.stream(tokens[2], function(err, res){
        if (err) return console.log(err);
        console.log(res);
      });
      stream3 = plotly.stream(tokens[3], function(err, res){
        if (err) return console.log(err);
        console.log(res);
      });
      console.log('streams created');

      for (var i = 0; i < nTraces; i++){
       
        if((i == 0 && sensor0.value < dryValue) || (i == 1 && sensor1.value < dryValue) || (i == 2 && sensor2.value < dryValue) || (i == 3 && sensor3.value < dryValue)){

          // write the data
          var saveTime = getDateString();
          var data = {
             x: saveTime,
             y: off[i]
          };
  
          streamPlotly(i, data);
          consoleLogger(counter, i, data);
          var data = {
             x: saveTime,
             y: on[i]
          };
          streamPlotly(i, data);
          consoleLogger(counter, i, data);
          // water the plant

          // open the valve
          valves[i].high();
          delay(1000);

          // turn the pump on
          pump.high();
          delay(waterTime);

          // close the valve
          valves[i].low();
          delay(1000);

          // turn the pump off
          pump.low();
          delay(1000);

          // write the data
          saveTime = getDateString();
          var data = {
            x: saveTime,
            y: on[i]
          };
          streamPlotly(i, data);
          consoleLogger(counter, i, data);
          var data = {
            x: saveTime,
            y: off[i]
          };
          streamPlotly(i, data);
          consoleLogger(counter, i, data);
        }
        else {

          // write the data
          var data = {
            x: getDateString(),
            y: off[i]
          }
          streamPlotly(i, data);
          consoleLogger(counter, i, data);
        }

        // close the valves (redundant, because the valves should already be closed
        for (var j = 0; j < nTraces; j++){
          valves[j].low();
          delay(1000);
        }

        // turn the pump off (redundant, because the pump should already be off
        pump.low();
        delay(1000);
      }
      counter++;
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

// helper function for streaming data to plotly
function streamPlotly(iNumber, dataToPlotly){
  if (iNumber == 0){
    stream0.write(JSON.stringify(dataToPlotly)+'\n');
  }
  else if (iNumber == 1){
    stream1.write(JSON.stringify(dataToPlotly)+'\n');
  }
  else if (iNumber == 2){
    stream2.write(JSON.stringify(dataToPlotly)+'\n');
  }
  else {
    stream3.write(JSON.stringify(dataToPlotly)+'\n');
  } 
  delay(100);
}
