// import external & core librairies
const emailSender = require('../helpers/emailSender');
const iolib = require("socket.io");
const path = require('path');
const fs = require('fs');
// Define path to data directory
const DATA_DIR = path.join(__dirname, "../data/");
// import models
const BoardData = require("../models/boardData.js").BoardData;
const TeacherData = require("../models/Teacher").TeacherData;
//import data files
let boardList = require('../data/boards.json');
// import iceServers
const iceServers = require('../config/iceServers.json');
//const getServers = require('../helpers/iceServers').getServers;

//define variables
let boards = {};
let tmpBoards;
serverList = '';

// Start the socket server
function startIO(app) {
    io = iolib(app);
    io.on("connection", onConnection);
    io.of("/boards").on("connection", connectToRoom);
    return io;
}

const saveFile = (fileType, fileData) => {
    const file = path.join(DATA_DIR, `${fileType}.json`);
    const file_txt = JSON.stringify(fileData);
    fs.writeFileSync(file, file_txt, function onFileSaved(err) {
        if (err) {
            console.trace(new Error(`Unable to save the ${fileType} file:` + err));
        } else {
            console.log(`Successfully saved the ${fileType} file!`);
        }
    });
}

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
        const board = BoardData.load(name);
        boards[name] = board;
        return board;
    }
}
function getTeacher(data){
    try {
        const teacherInfo = require(`../data/teachers/teacher-${data.uid}.json`);
        const teacherObj = new TeacherData(null, null, null, null);
        teacherObj.load(teacherInfo);
        return teacherObj;
    }
    catch(error){
        console.error(error);
        console.log('Creating new teacher');
        const teacher = new TeacherData(data.firstName, data.lastName, data.uid, data.password);
        teacher.save();
        return teacher;
    }
}

////////////////////////////////////////////////
//           TEACHER INTERFACE                //
////////////////////////////////////////////////
const sendBoardList = (socket, teacherId) => {
    let myBoards = [];
    if (teacherId) {
        for (let key in boardList) {
            if (boardList[key].teacher === teacherId) {
                const board = {
                    date: boardList[key].date,
                    time: boardList[key].time,
                    string: boardList[key].string
                };
                myBoards.push(board);
            }
        }
    }
    io.to(`${socket.id}`).emit("setBoardList", {
        myBoards
    });
};

const generateUID = () => {
    var uid = Date.now().toString(36); //Create the uids in chronological order
    uid += (Math.round(Math.random() * 36)).toString(36); //Add a random character at the end
    return uid;
}

const createNewBoard = (teacherData) => {
    const id = generateUID();
    const date = new Date();
    const pin = JSON.stringify(Math.floor(Math.random() * Math.floor(10000)));
    let month = JSON.stringify(date.getMonth() + 1);
    if (month.length === 1) month = '0' + month;
    let day = JSON.stringify(date.getDate());
    if (day.length === 1) day = '0' + day;
    let hours = JSON.stringify(date.getHours());
    if (hours.length === 1) hours = '0' + month;
    let minutes = JSON.stringify(date.getMinutes());
    if (minutes.length === 1) minutes = '0' + minutes;
    const board = {
        id: id,
        pin: pin,
        date: `${day}/${month}`,
        time: `${hours}:${minutes}`,
        string: `id=${id}&&pin=${pin}`,
        usersCounter: 0,
        teacher: teacherData.uid
    };
    return board;

}

function onConnection(socket) {
    console.log(socket.id, "user connected");
    // When the teacher connected, we get a request for his Boards

    socket.on("getMyBoards", data => {
        const teacher = getTeacher(data);
        if (!teacher.password === data.password) {
            socket.emit('error', {
                msg: 'Wrong Password'
            });
        } else {
            sendBoardList(socket, data.uid);
        }


    });
    // If the user wants to create a room

    socket.on("createBoard", data => {
        console.log("create board");
        const board = createNewBoard(data);
        const boardObj = BoardData.load(board.id);
        tmpBoards = boardList;
        if (!tmpBoards.hasOwnProperty(board.id)) tmpBoards[board.id] = board;
        
        saveFile('boards', tmpBoards);
        noFail(sendBoardList(socket, data.uid));
    });
}

////////////////////////////////////////////////
//           ONCE CONNECTED TO A ROOM         //
////////////////////////////////////////////////
function saveHistory(boardName, message) {
    const id = message.id;
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

const joinBoard = (socket, data) => {
    socket.join(data.id);
    const tmpBoards = boardList;
    tmpBoards[data.id].usersCounter++;
    saveFile('boards', tmpBoards);
    socket["board"] = data.id;
    console.log(socket["board"], "connected", socket.id);
    io.of("/boards")
        .to(`${socket.id}`)
        .emit("joinSuccess", {
            iceServers: iceServers
        });
}

function connectToRoom(socket) {
    console.log("user in boards");

    socket.on("join", data => {
        let error = false;
        const board = boardList[data.id];
        //console.log(data, boardList);
        if (board != undefined) {
            if (board.pin === data.pin) {
                if (board.usersCounter < 2) {
                    joinBoard(socket, data);
                } else {
                    error = "Déja 2 utilisateurs présents sur ce tableau";
                }
            } else {
                error = "Mot de passe erroné";
            }
        } else {
            error = "Le tableau n'existe pas";
        }
        if (error) {
            console.log(error);
            io.of("/boards")
                .to(`${socket.id}`)
                .emit("joinFail", error);
        }
    });

    socket.on('inviteGuest', (data) => {
        
        const board = boardList[data.boardId];
        const guest = data.email;
        if (board) {
            const emailSent = emailSender.sendEmail(guest, board.string);
            console.log(emailSent);
            io.of('/boards').to(`${socket.id}`).emit('message', {
                msg: emailSent
            });
        }
    });



    ////////////////////////////////////////////////////
    /////// THE WHITEBOARD FUNCTIONALITIES    //////////
    ///////////////////////////////////////////////////
    socket.on("getboard", noFail(function onGetBoard(boardName) {
        getBoard(boardName).then(board => {
            //Send all the board's data as soon as it's loaded
            socket.emit("broadcast", {
                _children: board.getAll()
            });
        });
    }));

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
        console.log(socket['board'], " disconnected ", socket.id);
        const board = boardList[socket['board']];
        if (board) {
            tmpBoards = boardList;
            //console.log(tmpBoards);
            tmpBoards[socket['board']].usersCounter--;
            saveFile('boards', tmpBoards);
            io.of('/boards').to(socket['board']).emit('PEER_DISCONNECTED');
            //console.log(boardList);
        }

    });



    ////////////////////////////////////////////////////
    ///////      WEBRTC FUNCTIONALITIES       //////////
    ///////////////////////////////////////////////////

    /* INIT message type */
    socket.on('RTC_MESSAGE', data => {
        //console.log('RTC MESSAGE: ', data.msg);
        socket.to(socket['board']).emit('RTC_MESSAGE', data);
    })

    socket.on('OFFER_WEB_RTC', offer => {
        //console.log('OFFER_WEB_RTC');
        socket.to(socket['board']).emit('OFFER_WEB_RTC', offer);
    });

    socket.on('CANDIDATE_WEB_RTC', candidate => {
        //console.log('CANDIDATE_WEB_RTC ');
        socket.to(socket['board']).emit('CANDIDATE_WEB_RTC', candidate);
    });

    socket.on('RESPONSE_WEB_RTC', res => {
        //console.log('RESPONSE_WEB_RTC');
        socket.to(socket['board']).emit('RESPONSE_WEB_RTC', res);
    });

    ////////////////////////////////////////////////////
    ///////           FILE TRANSFER          //////////
    ///////////////////////////////////////////////////

    socket.on('fileTransferRequest', file => {
        //console.log(file);
        socket.to(socket['board']).emit('fileTransferRequest', file);
    });

    socket.on('fileTransferAccepted', () => {
        socket.to(socket['board']).emit('fileTransferAccepted');
    });


    socket.on('fileSendStart', file => {
        //console.log(file);
        socket.to(socket['board']).emit('fileSendStart', file);
    });

    socket.on('fileSendResult', file => {
        //console.log(file);
        socket.to(socket['board']).emit('fileSendResult', file);
    });

    socket.on('message', data => {
        //console.log(data.msg);
        socket.to(socket['board']).emit('message', data);
    })


}

exports.start = startIO;



