'use strict';

//var userName = 'Kipper123';
//var apiKey = '0gb0qrvchc';

var plotly = require('plotly')('Kipper123', '0gb0qrvchc');
var five = require('johnny-five');
var board = new five.Board;

//var tokens = '4npov9wfaz';

//var maxData = 20;
var truth = true;
var i = 0;

var fakeData = [0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1];

var data = [{x:[], y:[], stream:{token: '4npov9wfaz', maxpoints: 20}}];
var layout = {fileopt: 'extend', filename: 'TestPlotly'};

board.on('ready', function(){

  // initialize the plotly graph
  plotly.plot(data, layout, function (err, msg){
    if (err) return console.log (err);
    console.log(msg);
  
    // create a data stream
    var stream = plotly.stream('4npov9wfaz', function (err,res){
      if (err) return console.log(err);
      console.log(res);
      clearInterval(loop); // once stream is closed, stop writing
    });

    while(truth){
      var data = {
        x : getDateString(),
        y : fakeData[i]
      }
      stream.write(JSON.stringify(data)+'\n');
      console.log(i, data);
      delay(2000);
      i++
      if (i >= fakeData.length){
        i = 0;
      }
    }
  });
});

function getDateString(){
  var time = new Date();
  var datestr = new Date(time - 21600000).toISOString().replace(/T/, ' ').replace(/Z/, '');
  return datestr;
}

function delay(millis){
  var date = new Date();
  var curDate = null;
  do {curDate = new Date();}
  while(curDate - date < millis);
}
