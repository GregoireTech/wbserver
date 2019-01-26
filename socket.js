const iolib = require("socket.io");
const roomModel = require("./models/Room");
const Room = roomModel.Room;
const teacherModel = require("./models/Teacher");
const Teacher = teacherModel.Teacher;
const boardController = require("./controllers/boardController");
let rooms = {};
let roomList = [];
let teachers = {};
let teacherList = [];

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
        if (i === 0) console.log(line.type, "   ", line.data);
            io.of("/rooms")
            .to(`${socket.id}`)
            .emit("lineTest", line.data);
        i++;
    }
    console.log(i + "lines sent to: " + socket.id);
};

const noFail = callback => {
  if (callback) {
    callback();
  } else return;
};

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
        console.log(data);
        if (rooms[data.room] != undefined) {
            if (rooms[data.room].pin === data.pin) {
                if (rooms[data.room].usersCounter < 2) {
                socket.join(data.room);
                socket["room"] = data.room;
                console.log(socket["room"], "connected", socket.id);
                io.of("/rooms")
                    .to(`${socket.id}`)
                    .emit("joinSuccess");
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
            console.log("room does not exist");
            io.of("/rooms")
                .to(`${socket.id}`)
                .emit("joinFail", error);
        }
    });

    socket.on("getRoomLines", () => {
        const room = rooms[socket["room"]];
        noFail(sendRoomLines(socket, room.lines));
    });

    // THE WHITEBOARD FUNCTIONALITIES
    socket.on("drawing", function(data) {
        if (socket["room"] !== undefined) {
            socket.to(socket["room"]).emit("drawing", data);
            console.log(data);
        }
    });

    socket.on("rectangle", function(data) {
        if (socket["room"] !== undefined) {
            socket.to(socket["room"]).emit("rectangle", data);
            console.log(data);
        }
    });

    socket.on("linedraw", function(data) {
        if (socket["room"] !== undefined) {
            socket.to(socket["room"]).emit("linedraw", data);
            console.log(data);
        }
    });

    socket.on("circledraw", function(data) {
        if (socket["room"] !== undefined) {
            socket.to(socket["room"]).emit("circledraw", data);
            console.log(data);
        }
    });

    socket.on("ellipsedraw", function(data) {
        if (socket["room"] !== undefined) {
            socket.to(socket["room"]).emit("ellipsedraw", data);
            console.log(data);
        }
    });

    socket.on("textdraw", function(data) {
        if (socket["room"] !== undefined) {
            socket.to(socket["room"]).emit("textdraw", data);
            console.log(data);
        }
    });

    socket.on("copyCanvas", function(data) {
        if (socket["room"] !== undefined) {
            socket.to(socket["room"]).emit("copyCanvas", data);
            console.log(data);
        }
    });

    socket.on("Clearboard", function(data) {
        if (socket["room"] !== undefined) {
            socket.to(socket["room"]).emit("Clearboard", data);
            console.log('copy', data);
        }
    });

    // ON DISCONNECT
    socket.on("disconnect", function() {
        console.log("user disconnected");
    });
}

exports.start = startIO;
