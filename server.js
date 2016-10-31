'use strict';

var os = require('os');
var nodeStatic = require('node-static');
var http = require('http');
var socketIO = require('socket.io');

var fileServer = new (nodeStatic.Server)();

var port = process.env.PORT || 8080;
var app = http.createServer(function (req, res) {
  fileServer.serve(req, res);
}).listen(port);

var io = socketIO.listen(app);
var roomsStates = {};

io.sockets.on('connection', function (socket) {
  // convenience function to log server messages on the client
  function log() {
    var array = ['Message from server:'];
    array.push.apply(array, arguments);
    socket.emit('log', array);
  }

  socket.on('roomMessage', function (roomMessage) {
    log('Client said for room:', roomMessage.room, ', message:', roomMessage.message);
    io.sockets.in(roomMessage.room).emit('message', roomMessage.message);
  });

  socket.on('create or join', function (roomName) {
    log('Received request to create or join room ' + roomName);
    var roomClientsCount = getRoomClientsCount();

    if (roomClientsCount === 0) {
      socket.join(roomName);
      log('Client ID ' + socket.id + ' created room ' + roomName);
      socket.emit('created', roomName, socket.id);

    } else if (roomClientsCount === 1) {
      log('Client ID ' + socket.id + ' joined room ' + roomName);
      io.sockets.in(roomName).emit('join', roomName);
      socket.join(roomName);
      socket.emit('joined', roomName, socket.id);
      io.sockets.in(roomName).emit('ready');
    } else { // max two clients
      socket.emit('full', roomName);
    }

    log('Room ' + roomName + ' now has ' + getRoomClientsCount() + ' client(s)');

    function getRoomClientsCount() {
      var room = socket.adapter.rooms[roomName];
      return room ? room.length : 0;
    }
  });



  socket.on('disconnect', function () {

  });

  socket.on('ipaddr', function () {
    var ifaces = os.networkInterfaces();
    for (var dev in ifaces) {
      ifaces[dev].forEach(function (details) {
        if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
          socket.emit('ipaddr', details.address);
        }
      });
    }
  });

});
