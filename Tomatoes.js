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

var sensors=[], valves=[]; 

var truth = true;
var counter = 0;
 
var data = [
  {x: [], y: [], stream:{token: tokens[0], maxpoints: maxData}},
  {x: [], y: [], stream:{token: tokens[1], maxpoints: maxData}},
  {x: [], y: [], stream:{token: tokens[2], maxpoints: maxData}},
  {x: [], y: [], stream:{token: tokens[3], maxpoints: maxData}}
];

board.on('ready', function(){

  // initialize the plotly graph
  plotly.plot(data, layout, function(err, msg){
    if (err) return console.log(err);
    console.log(msg);

    // once it's initialized, create a plotly stream to pipe the data
    var stream = plotly.stream(tokens[0], tokens[1], tokens[2], tokens[3], function(err,res){
      if (err) return console.log(err);
      console.log(res);
      clearInterval(loop); // once stream is closed, stop writing
    });

    // initialize the sensors
    for (var i = 0; i < nTraces; i++){
      var sensor = new five.Sensor(analogPin[i]);
      sensors.push(sensor);
    }

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


    while (truth == true){

      for (var i = 0; i < nTraces; i++){
       
        if(sensors[i].value < dryValue){
          var saveTime = getDateString();
          data = getDataString(i, saveTime, off[i]);

          // write the data
          stream.write(JSON.stringify(data)+'\n');
          delay(100);
          if (counter < 31){
            console.log(data);
            counter = counter + 1;
          }

          data = getDataString(i, saveTime, on[i]);
          stream.write(JSON.stringify(data)+'\n');
          delay(100);
          if (counter < 31){
            console.log(data);
            counter = counter + 1;
          }

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

          saveTime = getDateString();
          data = getDataString(i, saveTime, on[i]);
          stream.write(JSON.stringify(data)+'\n');
          delay(100);
          if (counter < 31){
            console.log(data);
            counter = counter + 1;
          }
          data = getDataString(i, saveTime, off[i]);
          stream.write(JSON.stringify(data)+'\n');
          delay(100);
          if (counter < 31){
            console.log(data);
            counter = counter + 1;
          }
        }
        else {
          data = getDataString(99, getDateString(), 0); 
          stream.write(JSON.stringify(data)+'\n');
          delay(100);
          if (counter < 31){
            console.log(data);
            counter = counter + 1;
          }
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
      delay(loopTime);
    }
  });
});


// helper function to open the solenoid valves

//function openValve(number){
//  valves[number].high();
//  delay(1000);
//}

// helper function to close the solenoid valves
//function closeValve(number){
//  valves[number].low();
//  delay(1000);
//}

// helper function to turn the pump on

//function pumpOn(){
//  pump.high();
//  delay (waterTime);
//}

// helper funtion to turn pump off

//function pumpOff(){
//  pump.low();
//  delay(1000);
//}

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

// helper function to set up data string

function getDataString(i, x, y){
  if (i == 0){
    var datastr = [
      {x: x, y: y},
      {x: x, y: off[1]},
      {x: x, y: off[2]},
      {x: x, y: off[3]}
    ];
  }
  else if (i == 1){
    var datastr = [
      {x: x, y: off[0]},
      {x: x, y: y},
      {x: x, y: off[2]},
      {x: x, y: off[3]}
    ];
  }
  else if (i == 2){
    var datastr = [
      {x: x, y: off[0]},
      {x: x, y: off[1]},
      {x: x, y: y},
      {x: x, y: off[3]}
    ];
  }
  else if (i == 3){
    var datastr = [
      {x: x, y: off[0]},
      {x: x, y: off[1]},
      {x: x, y: off[2]},
      {x: x, y: y}
    ];
  }
  else {
    var datastr = [
      {x: x, y: off[0]},
      {x: x, y: off[1]},
      {x: x, y: off[2]},
      {x: x, y: off[3]}
    ];
  }
  return datastr
}
