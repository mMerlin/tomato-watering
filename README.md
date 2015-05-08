Control and log sensor based watering events

Use sensors to control the activation of a pump and (one at a time) solenoids to
maintain the desired moisture levels.  Record each watering event to an online
charting application

Technologies used:
RaspberryPi

Arduino
- StandardFirmata
node.js
- johnny-five
- plotly


Reference Information
Johnny-five
- repository https://github.com/rwaldron/johnny-five
- documentation https://github.com/rwaldron/johnny-five/wiki

plotly
- https://github.com/plotly-nodejs (README)


IDEAS:
Use five.Relay and five.Motor for the soleniods and pump.  That better describes
the functional operation.  It also appears to automatically initialize modes.
Maybe use Relay for the pump too: It is not currently speed controlled, so that
is the correct functionality.  A NO relay being used to switch the pump (moter)
on and off.
