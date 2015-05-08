'use strict';
var plotly = require('plotly')('Kipper123', '0gb0qrvchc');
var five = require("johnny-five");
var board = new five.Board();

var data = [{x:[], y:[], stream:{token:'4npov9wfaz', maxpoints: 200}}];
var layout = {fileopt: 'extend', filename: 'tmp36 nodey arduino!'};

board.on("ready", function() {

  // create a new tmp36 sensor object

  var tmp36 = new five.Sensor({
    pin: "A0",
    freq: 1000, // get reading every 1000 ms
    thresh: 0.5
  });

  var counter = 0

  //initialize the plotly graph
  plotly.plot(data, layout, function(err,msg){
    if (err) return console.log(err);
    console.log(msg);

    // once it's initialized, create a plotly stream to pipe the data
    var stream = plotly.stream('4npov9wfaz', function(err,res){
      if (err) return console.log(err);
      console.log(res);
      clearInterval(loop); // once stream is closed, stop writing
    });

    // this gets called each time there is a new sensor reading
    tmp36.on("data", function(){
      var data = {
        x : getDateString(),
        y : convertTemperature(this.value)
      };

      if (counter < 11){
        console.log(data);
        counter = counter + 1;
      }

      //  write the data to the plotly stream
      stream.write(JSON.stringify(data)+'\n');
      var data = {
        x : getDateString(),
        y : 150
      }
      stream.write(JSON.stringify(data)+'\n');
    });
  });
});


// helper function to convert sersor value to temp

function convertTemperature(value){
  var voltage = value *0.004882814
  var celsius = (voltage - 0.5) * 100;
  return celsius;
}


// helper function to get a formatted data string

function getDateString(){
  var time = new Date();
  var datestr = new Date(time - 21600000).toISOString().replace(/T/, " ").replace(/Z/, "");
  return datestr;
}
