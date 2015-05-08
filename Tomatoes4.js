/*jslint browser: false, node: true, devel: true, indent: 2, maxlen: 82 */
/* jshint bitwise: true, curly: true, eqeqeq: true, es3: false,
   forin: true, freeze: true, futurehostile: true, latedef: true,
   maxcomplexity: 8, maxstatements: 35, noarg: true, nocomma: true,
   noempty: true, nonew: true, singleGroups: true, undef: true, unused: true,
   plusplus: true, strict: true, browser: true, devel: true
*/
/*global net */
'use strict';

var five = require('johnny-five');
//var plotly = require('plotly');

//////////////////////////////////////////////////////////
// Setup (global) constants referenced by the functions //
//////////////////////////////////////////////////////////

var userName = 'Kipper123';
var apiKey = '0gb0qrvchc';

var tokens = ['4npov9wfaz', 'c6292whiqa'];

var layout = {
  fileopt: 'extend',
  filename: 'Tomatoes',
  title: 'Tomato Watering Schedule',
  xaxis : { title: 'Date/Time' },
  yaxis : { title: 'On/Off' }
};

var nTraces = 2;        // number of data feeds
var maxData = 200;      // number of data points displayed on graph

var waterTime = 10000;  // time for watering event (ms) - 10 seconds
var dryValue = 700;     // sensor value that triggers a watering event
var hardwareDelay = 1000; // minimum delay (ms) between slave hareward setting
                        // operations (that change power usage)

var off = [0, 2];
var on = [1, 3];


var board = new five.Board();
var plotly = require('plotly')(userName, apiKey);
var plotlyData = [
  { x: [], y: [], stream: { token: tokens[0], maxpoints: maxData }},
  { x: [], y: [], stream: { token: tokens[1], maxpoints: maxData }}
];

// Global variables
var pump = null;
var counter = 0;
var wateringControls = [];
var valves = [];
var done = [false, true];

///////////////////////////////////////////////////////////////
// Create functions that will be referenced later in the code //
///////////////////////////////////////////////////////////////

// Only needs refresh twice a year, to handle daylight savings time changes
var tzOffset = new Date().getTimezoneOffset() * 1000;// milliseconds from GMT
/***
 * get a time value for the local (server) timezone
 *
 * @return {unsigned long}
 */
function localDate() {
  return new Date() - tzOffset;
}// ./function localDate()

/***
 * Create a formatted date string from the current local time
 *
 * @param {data type} parmeter name parameter description
 * @return {string}
 */
function getDateString() {
  return new Date(localDate()).toISOString().replace('T', ' ').substr(0, 23);
}// ./function getDateString()

/***
 * emulate Arduino delay function
 *
 * Full blocking 'busy' wait
 *
 * @param {unsigned lone} millis milliseconds to wait
 * @return {undefined}
 */
function delay(millis) {
  var date, curDate;
  date = new Date();
  curDate = null;
  do {
    curDate = new Date();
  } while (curDate - date < millis);
}// ./function delay(millis)

/***
 * log data to the console (screen)
 *
 * This uses an outer scope variable to limit the data volumne
 *
 * @param {Object} counter    Limiter for number of repetitions to log
 * @param {Object} b          First generic data field to log
 * @param {Object} c          Second generic data field to log
 * @return {undefined}
 */
function consoleLogger(counter, b, c) {
  if (counter < 11) {//hpd should setup '11' as an outers scope constant
    console.log(counter, b, c);
  }
}// ./function consoleLogger(counter, b, c)

/***
 * function purpose
 *
 * @param {boolean} logIt     (local) Log the operations (only) when true
 * @return {data type}
 */
/***
 * close all of the (watering) valves being managed
 *
 * @return {undefined}
 */
function allClosedOff(logIt) {
  var i;
  for (i = 0; i < nTraces; i += 1) {
    wateringControls[i].solenoid.close();
    delay(hardwareDelay);// Wait before hitting next solenoid pin
  }
  if (logIt === true) { console.log('solenoids closed'); }

  pump.open();// Pump off when relay is open
  delay(hardwareDelay);// Wait before next (possible) access to hardware control
  if (logIt === true) { console.log('pump off'); }
}// ./function allClosedOff()

/***
 * Configure the hardware used for the control system
 *
 * accesses and updates global variables
 *
 * @return {undefined}
 */
function initializeHardware() {
  var analogPin, solenoidPin, pumpPin, loopTime, i, controlPair;
  // Constants (only) needed by this function
  analogPin = ['A0', 'A1'];
  solenoidPin = [1, 3];
  pumpPin = 8;
  loopTime = 120000;  // time between sampling (ms) - 2 minutes

  // Associate input (moisture) sensors with the solenoid that controls the
  // the water for that area.
  for (i = 0; 0 < nTraces; i += 1) {
    controlPair = {
      moistureSensor: new five.Sensor({
        pin: analogPin[i],
        freq: loopTime,
        id: "Moisture Sensor " + i
      }),
      solenoid: new five.Relay({
        pin: solenoidPin[i],
        id: "Solenoid " + i,
        type: "NC"
      }),
      index: i
    };
    // Setup a limit for 'too dry, needs water'
    controlPair.booleanAt(dryValue);
    // TODO: move dryValue to local constants

    wateringControls.push(controlPair);
    console.log('Sensor and solenoid', i, 'initialized');
  }
  //

  // initialize the pump
  //pump = new five.Pin(pumpPin);
  pump = new five.Relay({
    pin: pumpPin,
    type: "NO",
    id: "Water Pump"
  });
  console.log('pump initialized');

  // make sure all of the solenoids are closed, and the pump is turned off
  allClosedOff();
}// ./function initializeHardware()

/***
 * Mark a change in watering state for a trace at the current time
 *
 * Send the 2 passed trace values for the specified control set, both for the
 * same (current) time, to get a nice square corner in the trace
 * when watering is turned on or off.
 *
 * @param {object} set        control set information
 * @param {integer} oldValue  The trace value for the old state
 * @param {integer} newValue  The trace value for the new state
 * @return {undefined}
 */
function sendChange(set, oldValue, newValue) {
  var data;

  // Repeat the current state value, at the new (current) time
  data = {
    x: getDateString(),
    y: oldValue
  };
  set.stream.write(JSON.stringify(data) + '\n');
  delay(100);
  // Same (x) timestamp, new y state value
  data.y = newValue;
  set.stream.write(JSON.stringify(data) + '\n');
  delay(100);

  // Report the first few streamed data points
  consoleLogger(counter, set.index, data);
}// ./function sendChange(set)

/***
 * Add a point to the trace to show checked, but no more water needed yet
 *
 * @param {object} set        control set information
 * @return {undefined}
 */
function sendStillOff(set) {
  var data;

  // Repeat the current state value, at the new (current) time
  data = {
    x: getDateString(),
    y: off[set.index]
  };
  set.stream.write(JSON.stringify(data) + '\n');
  delay(100);

  consoleLogger(counter, set.index, data);
}// ./sendStillOff(set)

/***
 * Give the plants some water
 *
 * @param {object} set      control set information
 * @return {undefined}
 */
function waterPlants(set) {
  set.solenoid.open();// Open the valve
  delay(hardwareDelay);
  pump.close();// turn the pump on

  delay(waterTime);// Wait for some water to flow

  set.solenoid.close();// Close the valve
  delay(hardwareDelay);
  pump.open();// turn the pump off
  delay(hardwareDelay);
}// ./function waterPlants(set)

/***
 * Water area when sensor shows it to be too dry
 *
 * @param {object} controlSet     Watering control with related sensor
 * @return {undefined}
 */
function controlMoisture(controlSet) {
  var set, othersDone;
  // Report which control set is being processed, and the state of all other
  // controls sets
  othersDone = true;
  for (set = 0; set < nTraces; set += 1) {
    if (set !== controlSet.index) {
      console.log('Processing set', controlSet.index, ', done[' + set + '] =',
        done[set]);
    }
  }

  // TODO: setup a fifo queue to process waiting controls sets
  //waitingQueue.push(controlSet.index);
  //while (waitingQueue[0] !== controlsSet.index) {}
  while (othersDone() === false) {
    // Some other control set is processing
    delay(waterTime);
    console.log('delayed checking for set', controlSet.index);
    // TODO: Report waiting queue sequence
  }
  // Could still get a race condition, if more than one set was waiting to
  // be processed, and they all try to start at once.
  done[controlSet.index] = false;

  if (controlSet.moistureSensor.boolean === false) {
    // Too Dry
    // Mark the trace to show when the watering starts and stops
    sendChange(controlSet, off[controlSet.index], on[controlSet.index]);
    waterPlants();
    sendChange(controlSet, on[controlSet.index], off[controlSet.index]);
  } else {
    // Enough moisture
    // Mark the trace to show we checked the moisture, and did not water
    sendStillOff(controlSet);
  }

  // Close valves and turn pump off
  // redundant, because the valves should already be closed and pump off
  allClosedOff();

  counter += 1;
  done[controlSet.index] = true;
}// ./function controlMoisture(controlSet)

/***
 * Finish setup after plotly has (successfully) completed initialization
 *
 * ref: https://github.com/plotly/plotly-nodejs README \callback(err,msg)\
 * error_object = {
 *   url: "",
 *   message: "",
 *   warning: "",
 *   error: ""
 * }
 *
 * @param {object} err          error object
 * @param {object} msg          response object
 * @return {data type}
 */
function logWatering(msg) {
  var i;
  console.log(msg);
  console.log('plotly graph initialized');

  // Create the streams for logging the watering events
  // sensor based event processing.
  for (i = 0; i < nTraces; i += 1) {
    // Create a stream for logging events to the trace for the current
    // controls set
    wateringControls[i].stream = plotly.stream(tokens[i], function (err, res) {
      if (err) {
        console.log('setup for stream', i, 'failed:');
        return console.log(err);
      }
      console.log('stream', i, 'setup response:', res);
    });

    // Setup a function to run each time new data is read from the sensor
    // (each 'loopTime' ms)
    wateringControls[i].moistureSensor.on('data', function () {
      // TODO: might need some extra closure scope init, to keep the 'i' value
      // var setIndex = i;
      console.log('running anonymous function for sensor', i);
      controlMoisture(wateringControls[i]);
    });
    //TODO configure sensor barrier, then use .boolean as trigger
  }

}// ./function logWatering(msg)

/***
 * Find out if all other controls sets are currently done processing
 *
 * @param {integer} current       The index of the current set being processed
 * @return {boolean}
 */
function othersDone(current) {
  var i, allDone = true;
  for (i = 0; i < nTraces; i += 1) {
    if (i !== current) {
      if (done[i] !== true) {
        allDone = false;
      }
    }
  }
  return allDone;
}// ./function othersDone(current)

/***
 * Start the main hardware control process.
 *
 * This is [to be] run when the slaved Arduino board is ready to start accepting
 * commands.  Johnny-five is alive!
 *
 * @return {data type}
 */
function initializeWatering() {
  console.log('Slaved board is ready');

  initializeHardware();
  console.log('Slave board hardware is configured');

  // initialize the plotly graph
  // ref: https://github.com/plotly/plotly-nodejs README \plotly.plot\
  plotly.plot(plotlyData, layout, function (err, msg) {
    if (err) {
      // Just report the problem and exit, can not initialize plotly
      return console.log(err);
    }

    logWatering(msg);
  });
}// ./function initializeWatering()

////////////////////////////////////
// Start of actual code execution //
////////////////////////////////////

board.on('ready', function () {
  initializeWatering();// Execute this (once) when the slaved Ardunio is ready
});
