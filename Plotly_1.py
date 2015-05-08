import plotly.plotly as py #plotly library
from plotly.graph_objs import Scatter, Layout, Figure #plotly graph objects
import time #timer functions
import smbus

username = 'Kipper123'
api_key = '0gb0qrvchc'
stream_token = '4npov9wfaz'

bus = smbus.SMBus(1)

# Address of the Arduino

address = 0x04

# Initialize Plotly object

py.sign_in(username, api_key)

# Initialize the graph (not streaming yet)

trace1 = Scatter(
    x= [],
    y= [],
    stream = dict(
        token = stream_token,
        maxpoints = 200
        )
    )
layout = Layout(
    title= 'Raspberry Pi Streaming Example'
    )

fig = Figure(data = [trace1], layout=layout)

print py.plot(fig, filename = 'Raspberry Pi Streaming Example'
              )

i = 0

stream = py.Stream(stream_token)
stream.open()

def writeNumber(value):
    bus.write_byte(address, value)
    return -1

def readNumber():
    number = bus.read_byte(address)
    return number

# The main loop

while True:
    var = input("Enter 1 - 9:")

    if not var:
        continue

    writeNumber(var)
    print ("RPi: Hi Arduino, I sent you ", var)
    #sleep one second
    time.sleep(1)

    number = readNumber()
    print ("Arduino: Hey, RPi, I received a digit ", number)
    print

# Write the data to plotly

stream.write({'x': i, 'y': number})
i += 1
time.sleep(2)
