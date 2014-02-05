// todo: make all function async for future proofing

var func = require('./inc.js');

//
// Room Class
// @arg roomId  Unique Identifier of room
//
function Room(roomId) {
    this.id = roomId;
    this.clients = [];
    this.clientSockets = {};
}

Room.prototype.sendMessage =
    function RoomSendMessage(to, type, message, cb) {
        var self = this;
        if (!self.hasClient(to)) {
            return cb('Invalid receipient', false);
        } else {
            this.clientSockets[to].emit(type, message);
            cb(null, true);
            // todo: proper callback bound to emit
        }
    };

Room.prototype.clientSendMessage =
    // (async)
    // Send Messages from a client
    function RoomClientSendMessage(from, to, message, cb) {
        var self = this;

        if (!self.hasClient(from) || !self.hasClient(to)) {
            cb('Invalid sender / receipient', false);
        } else {
            self.sendMessage(to,
                             'client-sendmessage',
                             {
                                 from: from,
                                 message: message
                             },
                             cb);
        }
    };

Room.prototype.hasClient =
    function RoomHasClient(clientId) {
        return this.clients.indexOf(clientId) >= 0;
    };
Room.prototype.addClient =
    // Add Client to Room
    // @arg clientId Unique Id of client
    // @arg socket The socket.io object of the new client
    function RoomAddClient(clientId, socket) {
        var self = this;

        self.broadcast('join-room', clientId, function() {});
        self.clients.push(clientId);
        self.clientSockets[clientId] = socket;
        return true;
    };

Room.prototype.removeClient =
    // Remove client from room
    // @arg clientId Unique Id of client
    // @return false if client does not exists, and an integer if it does indicating number of clients left
    function RoomRemoveClient(clientId) {
        var index = this.clients.indexOf(clientId);
        if (index === -1) {
            return false;
        }

        this.clients.splice(index, 1);
        delete this.clientSockets[clientId];

        return this.clients.length;
    };

Room.prototype.broadcast =
    // (async)
    // Broadcast message to room
    // @arg type Type of message
    // @arg message Message to send
    // @arg cb Callback function
    function RoomBroadcast(type, message, cb) {
        var self = this;
        self.clients.forEach(function(node) {
            self.sendMessage(node, 'room-broadcast', { type: type, message: message }, function() {});
        });

        // todo: proper callback
        cb(null, true);
    };

Room.prototype.getClients =
    function RoomGetClients() {
        var tr = [];
        this.clients.forEach(function(client) {
            tr.push(client);
        });
        return tr;
    };

//
// Rooms Manager
//
function Rooms() {
    this.rooms = {};
    this.clientsRoomMap = {};

    return this;
}

Rooms.prototype.create =
    function RoomsCreateRoom(socket) {
        var self = this;
        var uniqid = false, clientId = false;

        do {
            uniqid = func.uniqid('mp-room-');
        } while(self.rooms[uniqid]);

        clientId = func.uniqid('mp-client-', true);

        self.rooms[uniqid] = new Room(uniqid);
        self.rooms[uniqid].addClient(clientId, socket);

        self.clientsRoomMap[clientId] = uniqid;

        return {
            "roomId": uniqid,
            "clientId": clientId
        };
    };

Rooms.prototype.hasRoom =
    function RoomsHasRoom(room) {
        var self = this;
        for (var rooms in self.rooms) {
            if (self.rooms.hasOwnProperty(rooms) && rooms === room) {
                return true;
            }
        }
        return false;
    };

Rooms.prototype.getClientRoom =
    function RoomsGetClientRoom(clientId) {
        var self = this;

        if (!self.clientsRoomMap[clientId]) {
            throw(new Error("Client Id does not exist"));
        }
        return self.clientsRoomMap[clientId];
    };

Rooms.prototype.removeClient =
    // Remove a given client from the room management
    // @arg clientId Identifier of client
    function RoomsRemoveClient(clientId) {
        var self = this;

        if (!self.clientsRoomMap[clientId]) {
            throw(new Error("Client Id does not exist"));
        }

        var roomId = self.getClientRoom(clientId);
        var clientsLeft = self.rooms[roomId].removeClient(clientId);

        delete self.clientsRoomMap[clientId];

        self.rooms[roomId].broadcast('leave-room', clientId, function() {});

        if (clientsLeft === false) {
            return false;
        } else if (clientsLeft === 0) {
            // GC
            delete self.rooms[roomId];
        }
    };

Rooms.prototype.getRooms =
    function RoomsGetRooms() {
        var self = this;
        var tr = [];

        for (var rooms in self.rooms) {
            if (self.rooms.hasOwnProperty(rooms)) {
                tr.push(rooms);
            }
        }

        return rooms;
    };

Rooms.prototype.getClients =
    function RoomsGetClient(room) {
        var self = this;

        if (self.hasRoom(room)) {
            return self.rooms[room].getClients();
        } else {
            throw(new Error('Room does not exists'));
        }
    };

Rooms.prototype.addClient =
    function RoomsAddClient(room, socket) {
        var self = this;
        var clientId = false;

        if (self.hasRoom(room)) {
            clientId = func.uniqid('mp-client-', true);
            self.rooms[room].addClient(clientId, socket);
            self.clientsRoomMap[clientId] = room;
            return clientId;
        } else {
            throw(new Error('Room does not exists'));
        }
    };

/*Rooms.prototype.broadcast =
    // (Async)
    // Broadcast a message to a particular room
    // @arg room Name of room
    // @arg message Message to broadcast
    // @arg cb Callback function
    function RoomsBroadcast(room, message, cb) {
        var self = this;

        if (self.hasRoom(room)) {
            self.rooms[room].broadcast(message, cb);
        } else {
            cb('Room does not exists', false);
        }
    };*/

Rooms.prototype.sendMessage =
    function RoomsSendMessage(room, from, to, message, cb) {
        var self = this;

        if (self.hasRoom(room)) {
            self.rooms[room].clientSendMessage(from, to, message, cb);
        } else {
            cb('Room does not exists', false);
        }
    };

module.exports = Rooms;
