/*jslint browser: false, node: true, devel: true, todo: false, indent: 2, maxlen: 82 */
/* jshint bitwise: true, curly: true, eqeqeq: true, es3: false,
   forin: true, freeze: true, futurehostile: true, latedef: true,
   maxcomplexity: 8, maxstatements: 35, noarg: true, nocomma: true,
   noempty: true, nonew: true, singleGroups: true, undef: true, unused: true,
   plusplus: true, strict: true, browser: true, devel: true
*/
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
var maxData = 200;      // number of data points displayed on streaming graph

var waterTime = 10000;  // time for watering event (ms) - 10 seconds
var hardwareDelay = 1000; // minimum delay (ms) between slave hardware setting
                        // operations (that change power usage)
var heartRate = 30000;  // once every 30 seconds

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
var waitingQueue = [];

///////////////////////////////////////////////////////////////
// Create functions that will be referenced later in the code //
///////////////////////////////////////////////////////////////

// Only needs refresh twice a year, to handle daylight savings time changes
var tzOffset = new Date().getTimezoneOffset() * 60000;// milliseconds from GMT
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
  // TODO: do heartbeat every 30 seconds while waiting??  Only needed if delay
  // can get > heartRate (nothing currently does)
  // doHeartbeat();
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
  var analogPin, solenoidPin, pumpPin, loopTime, dryValue,
    i, controlPair;
  // Constants (only) needed by this function
  analogPin = ['A0', 'A1'];
  solenoidPin = [1, 3];
  pumpPin = 8;
  loopTime = 120000;  // time between sampling (ms) - 2 minutes
  dryValue = 700;     // maximum sensor value that triggers a watering event

  // Associate input (moisture) sensors with the solenoid that controls the
  // the water for that area.
  for (i = 0; i < nTraces; i += 1) {
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
    controlPair.moistureSensor.booleanAt(dryValue);

    // Add a property to the sensor so the control set can be easily found when
    // the sensor is available (in the data.on callback)
    controlPair.moistureSensor.parentSet = i;

    wateringControls.push(controlPair);
    console.log('Sensor and solenoid', i, 'initialized');
  }

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
 * Send a single data point to the stream configured for a control set
 *
 * @param {object} set        control set information
 * @param {array} state       The trace values for the state
 * @param {string} time       The time value for the data point
 * @return {object}
 */
function sendTracePoint(set, state, time) {
  var data = {
    x: time,
    y: state[set.index]
  };
  set.stream.write(JSON.stringify(data) + '\n');
  // Make sure do not get multiple points sent too close together.  Probably
  // not needed, since documentation says there is some buffering.  Should never
  // be more than 4 data points in close succesion, and the (plotly server)
  // buffer should be able to handle that much.
  delay(100);
  consoleLogger(counter, set.index, data);
  return data;
}// ./function sendTracePoint(set, state, time)

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
 * callback function for repeating (timed) sensor reads
 *
 * Stream data to plotly, logging watering events
 *
 * @return {undefined}
 */
function controlMoisture() {
  /* jshint validthis: true */
  var set, data, controlSet;
  // console.log(this.id, this.pin, this.value, this.parentSet);
  controlSet = wateringControls[this.parentSet];
  console.log('controlMoisture for set', controlSet.index);

  // NOTE: current testing says queueing is not really needed.  Despite the event
  // 'model' being used, all events are sequential: processing of a received
  // event completes before the next event is received, though they were
  // 'triggered' at the same time.
  // Guessing that the library is walking a loop, and doing 'callback' when
  // conditions match.  The callback function has to return before the next
  // event can get checked for.
  waitingQueue.push(controlSet.index);
  console.log('Current queue length:', waitingQueue.length);
  while (waitingQueue[0] !== controlSet.index) {
    // Some other control set is processing
    delay(waterTime);
    console.log('delayed checking for set', controlSet.index);
  }

  // Always send an 'off' data point at the start of processing.  That will be
  // the only point logged, unless watering is needed.
  data = sendTracePoint(controlSet, off, getDateString());
  if (controlSet.moistureSensor.boolean === false) {
    // Too Dry
    // Mark the trace to show when the watering starts and stops
    data = sendTracePoint(controlSet, on, data.x);
    waterPlants(controlSet);
    data = sendTracePoint(controlSet, on, getDateString());
    data = sendTracePoint(controlSet, off, data.x);
  }

  // Close valves and turn pump off
  // redundant, because the valves should already be closed and pump off
  allClosedOff();

  counter += 1;
  // Remove (just) finished index from the queue
  set = waitingQueue.shift();
  if (set !== controlSet.index) {
    console.log('Logic error: current process was for', controlSet.index,
      'but queue said', set);
  }
}// ./function controlMoisture()

/***
 * Handle cleanup when a plotly stream is closed.
 *
 * callback function when stream is created
 *
 * @param {object} err error object
 * @return {undefined}
 */
function streamFinished(err, res) {
  /* jshint validthis: true */
  if (err) {
    console.log('streaming failed:');
    return console.log(err);
  }
  console.log('streamed response:', res);
  console.log(this);// Explore the callback context
}// ./function streamFinished(err, res)

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

  for (i = 0; i < nTraces; i += 1) {
    // Create a stream for logging events to the trace for the current
    // controls set
    // NOTE: have not seen the callback actually excuted.  What w/should trigger
    // it?  Sample code at github.com/plotly/plotly-nodejs makes it look like
    // the callback gets executed when the steam is closed.  That never happens
    // here.
    wateringControls[i].stream = plotly.stream(tokens[i], streamFinished);
    // Setup a function to run each time new data is read from the sensor
    // (each 'loopTime' ms)
    wateringControls[i].moistureSensor.on('data', controlMoisture);
  }
  console.log('sensor processing intialized');
}// ./function logWatering(msg)

/***
 * Send heart beat / keep alive signal to each plotly stream
 *
 * @return {undefined}
 */
function doHeartbeat() {
  var i;
  console.log('heartbeat at', getDateString());
  // TODO: could filter out heartbeats that occur right after moisture control
  for (i = 0; i < nTraces; i += 1) {
    wateringControls[i].stream.write('\n');
    // data point throttling is for json.  No JSON here, so should not need to
    // insert any artificial delay.
  }
}// .//function doHeartbeat

/***
 * Start heartbeat, to prevent socket error / timeout while waiting for next
 * actual sensor reading
 *
 * @return {undefined}
 */
function startHeartbeat() {
  var heartbeat;
  // initialize a dummy input, and use reads on it to create a heartbeat for
  // the streaming data.
  heartbeat = new five.Sensor({
    pin: 'A5',
    freq: heartRate,
    id: "Heartbeat"
  });

  heartbeat.on('data', doHeartbeat);
  console.log('heartbeat processing intialized');
}// ./function startHeartbeat()

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
    startHeartbeat();
    console.log('watering initialzation done');
  });
  // TESTING Setup processing, without plotly logging
  // doWatering();
}// ./function initializeWatering()

////////////////////////////////////
// Start of actual code execution //
////////////////////////////////////

board.on('ready', initializeWatering);
// board.on('ready', function () {
//   initializeWatering();// Execute this (once) when the slaved Ardunio is ready
// });
