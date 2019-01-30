const iolib = require("socket.io");
const roomModel = require("../models/Room");
const Room = roomModel.Room;
const teacherModel = require("../models/Teacher");
const Teacher = teacherModel.Teacher;
const emailSender = require('../controllers/emailSender');
const boardController = require("../controllers/boardController");
BoardData = require("./boardData.js").BoardData;
let rooms = {};
let roomList = [];
let teachers = {};
let teacherList = [];
let newLine = null;
var MAX_EMIT_COUNT = 64; // Maximum number of draw operations before getting banned
var MAX_EMIT_COUNT_PERIOD = 5000; // Duration (in ms) after which the emit count is reset

// Map from name to *promises* of BoardData
var boards = {};


// Start the socket server
function startIO(app) {
    io = iolib(app);
    io.on("connection", onConnection);
    io.of("/rooms").on("connection", connectToRoom);
    return io;
}

const sendRoomList = (socket, userName) => {
    const roomNames = teachers[userName].rooms;
    let myRooms = [];
    for (name of roomNames) {
        const room = {
            name: rooms[name].name,
            string: rooms[name].string
        };
        myRooms.push(room);
    }
    io.to(`${socket.id}`).emit("setRoomList", {
        myRooms
    });
};

const generateId = () => {
    const date = JSON.stringify(new Date());
    const random = JSON.stringify(Math.floor(Math.random() * Math.floor(1000)));
    const id = date + random;
    return id;
};

const createTeacher = (socket, data) => {
    const newTeacher = new Teacher(data.firstName, data.lastName);
    teachers[newTeacher.name] = newTeacher;
    io.of("/rooms")
        .to(socket["room"])
        .emit("teacherCreated", data);
};

const sendRoomLines = (socket, lines) => {
    let i = 0;
    for (line of lines) {
        io.of("/rooms")
            .to(`${socket.id}`)
            .emit(line.type, line.data);
        io.of("/rooms")
            .to(`${socket.id}`)
            .emit("copyCanvas", {
                transfer: true
            });
        i++;
    }
};

function noFail(fn) {
    return function noFailWrapped(arg) {
        try {
            return fn(arg);
        } catch (e) {
            console.trace(e);
        }
    }
}

/** Returns a promise to a BoardData with the given name*/
function getBoard(name) {
    if (boards.hasOwnProperty(name)) {
        return boards[name];
    } else {
        var board = BoardData.load(name);
        boards[name] = board;
        return board;
    }
}

function saveHistory(boardName, message) {
    var id = message.id;
    getBoard(boardName).then(board => {
        switch (message.type) {
            case "delete":
                if (id) board.delete(id);
                break;
            case "update":
                delete message.type;
                if (id) board.update(id, message);
                break;
            case "child":
                board.addChild(message.parent, message);
                break;
            default: //Add data
                if (!id) throw new Error("Invalid message: ", message);
                board.set(id, message);
        }
    });
}

function generateUID(prefix, suffix) {
    var uid = Date.now().toString(36); //Create the uids in chronological order
    uid += (Math.round(Math.random() * 36)).toString(36); //Add a random character at the end
    if (prefix) uid = prefix + uid;
    if (suffix) uid = uid + suffix;
    return uid;
}

////////////////////////////////////////////////
//           TEACHER INTERFACE                //
////////////////////////////////////////////////
function onConnection(socket) {
    console.log(socket.id, "user connected");
    // To create a new teacher
    socket.on("newTeacher", data => {
        console.log("newTeach", data);
        createTeacher(socket, data);
    });

    // ROOM FUNCTIONS
    // When the teacher connected, we get a request for his rooms
    socket.on("getRooms", data => {
        console.log("getRooms", data);
        const userName = data.firstName + data.lastName;
        if (teachers[userName]) {
            sendRoomList(socket, userName);
        } else {
            createTeacher(socket, data);
        }
    });

    // If the user wants to create a room
    socket.on("createRoom", data => {
        console.log("create");
        const userName = data.firstName + data.lastName;
        const roomId = generateId();
        const newRoom = new Room(roomId);
        if (!teachers[userName]) createTeacher(socket, data);
        let teacher = teachers[userName];
        teacher.addRoom(roomId);
        rooms[roomId] = newRoom;
        sendRoomList(socket, userName);
    });
}

////////////////////////////////////////////////
//           ONCE CONNECTED TO A ROOM         //
////////////////////////////////////////////////
function connectToRoom(socket) {
    console.log("user in rooms");
    socket.on("join", data => {
        let error = false;
        const room = rooms[data.room];
        if (room != undefined) {
            if (room.pin === data.pin) {
                if (room.usersCounter < 2) {
                    socket.join(data.room);
                    room.addUser();
                    let roomReady;
                    room.usersCounter === 2 ? roomReady = true : roomReady = false;
                    socket["room"] = data.room;
                    console.log(socket["room"], "connected", socket.id);
                    io.of("/rooms")
                        .to(`${socket.id}`)
                        .emit("joinSuccess", {
                            visioStatus: room.visioStatus,
                            roomReady: roomReady
                        });
                } else {
                    error = "too many users";
                }
            } else {
                error = "wrong pin";
            }
        } else {
            error = "room does not exist";
        }
        if (error) {
            console.log(error);
            io.of("/rooms")
                .to(`${socket.id}`)
                .emit("joinFail", error);
        }
    });

    socket.on('inviteGuest', (data) => {
        const room = rooms[socket['room']];
        const guest = data.email;
        if (room) {
            const emailSent = emailSender.sendEmail(guest, room.string);
            io.of('/rooms').to(`${socket.id}`).emit('inviteRes', {
                emailSent
            })
        }
    });

    function joinBoard(name) {
        // Default to the public board
        if (!name) name = "anonymous";

        // Join the board
        socket.join(name);

        return getBoard(name).then(board => {
            board.users.add(socket.id);
            console.log(new Date() + ": " + board.users.size + " users in " + board.name);
            return board;
        });
    }


    ////////////////////////////////////////////////////
    /////// THE WHITEBOARD FUNCTIONALITIES    //////////
    ///////////////////////////////////////////////////
    socket.on("getboard", noFail(function onGetBoard(name) {
        joinBoard(name).then(board => {
            //Send all the board's data as soon as it's loaded
            socket.emit("broadcast", {
                _children: board.getAll()
            });
        });
    }));

    socket.on("joinboard", noFail(joinBoard));

    var lastEmitSecond = Date.now() / MAX_EMIT_COUNT_PERIOD | 0;
    var emitCount = 0;
    socket.on('broadcast', noFail(function onBroadcast(message) {

        var boardName = message.board || "anonymous";
        var data = message.data;

        if (!socket.rooms.hasOwnProperty(boardName)) socket.join(boardName);

        if (!data) {
            console.warn("Received invalid message: %s.", JSON.stringify(message));
            return;
        }

        //Send data to all other users connected on the same board
        socket.to(boardName).emit('broadcast', data);

        // Save the message in the board
        saveHistory(boardName, data);
    }));

    socket.on('disconnecting', function onDisconnecting(reason) {
        Object.keys(socket.rooms).forEach(function disconnectFrom(room) {
            if (boards.hasOwnProperty(room)) {
                boards[room].then(board => {
                    board.users.delete(socket.id);
                    var userCount = board.users.size;
                    console.log(userCount + " users in " + room);
                    if (userCount === 0) {
                        board.save();
                        delete boards[room];
                    }
                });
            }
        });
    });




    // ON DISCONNECT
    // socket.on("disconnect", function () {
    //     console.log("user disconnected");
    //     const room = rooms[socket['room']];

    //     if (room) {
    //         room.removeUser();
    //         console.log(room.usersCounter);
    //         room.visioStatus = 0;
    //         io.of('/rooms').emit('peerLeft');
    //     }
    // });





    ////////////////////////////////////////////////////
    ///////      WEBRTC FUNCTIONALITIES       //////////
    ///////////////////////////////////////////////////

    /* INIT message type */
    socket.on('ASK_WEB_RTC', function (msg) {
        //console.log('ASK_WEB_RTC: ' + msg);
        socket.to(socket['room']).emit('ASK_WEB_RTC', msg);
    });

    socket.on('CANDIDATE_WEB_RTC_INIT', function (msg) {
        //console.log('CANDIDATE_WEB_RTC_INIT: ' + msg);
        socket.to(socket['room']).emit('CANDIDATE_WEB_RTC_INIT', msg);
    });

    /* RECEIVER message type */
    socket.on('CANDIDATE_WEB_RTC_REC', function (msg) {
        //console.log('CANDIDATE_WEB_RTC_REC: ' + msg);
        socket.to(socket['room']).emit('CANDIDATE_WEB_RTC_REC', msg);
    });

    socket.on('RESPONSE_WEB_RTC', function (msg) {
        //console.log('RESPONSE_WEB_RTC: ' + msg);
        socket.to(socket['room']).emit('RESPONSE_WEB_RTC', msg);
    });

}

exports.start = startIO;