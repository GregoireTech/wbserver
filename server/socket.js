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
const teachers = require('../data/teachers.json');
let boardList = require('../data/boards.json');
// import iceServers
const iceServers = require('../config/iceServers.json');
//const getServers = require('../helpers/iceServers').getServers;

//define variables
let boards = {};
let tmpTeachers, tmpBoards;
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

function getTeacher(data) {
    if (teachers.includes(data.uid)) {
        console.log('getting teacher')
        const teacherInfo = require(`../data/teachers/teacher-${data.uid}.json`);
        const teacherObj = new TeacherData(null, null, null, null);
        teacherObj.load(teacherInfo);
        return teacherObj;
    } else {
        console.log('create teacher');
        const teacher = new TeacherData(data.firstName, data.lastName, data.uid, data.password);
        tmpTeachers = teachers;
        tmpTeachers.push(data.uid);
        teacher.save();
        noFail(saveFile('teachers', tmpTeachers));
        console.log('savedTeachers');

        return teacher;
    }
}

////////////////////////////////////////////////
//        LOOP TO DELETE OLD BOARDS           //
////////////////////////////////////////////////
const deleteOldBoards = (boardsToDelete) => {
    console.log('deleting old boards : ', boardsToDelete);
    boardsToDelete.forEach(oldBoard => {
        // Remove the board data file
        fs.unlinkSync(path.join(DATA_DIR, `boards/board-${oldBoard.id}.json`), function onDeleteFileSuccess() {
            console.log('file deleted : ', `board-${oldBoard.id}.json`);
        }, function onDeleteFileFail(err) {
            console.log('error deleting file ', `board-${oldBoard.id}.json. Error : `, err);
        });
    });
}

const defineBoardsToDelete = () => {
    console.log('defining boards to delete');
    const tmpBoards = require('../data/boards.json');
    let boardsToDelete = [];
    let newBoardList = {};
    // Define current date & time
    const now = new Date();
    const curMonth = now.getMonth() + 1;
    const curDate = now.getDate();
    if (curMonth === 1 && curDate === 1) curMonth = 13; // Handles the 1st of January
    const curHours = now.getHours();

    //loop through boards
    for (let key in tmpBoards) {
        const month = tmpBoards[key].date.split('/')[1];
        const date = tmpBoards[key].date.split('/')[0];
        const hours = tmpBoards[key].time.split(':')[0];

        if (date < curDate && hours < curHours && tmpBoards[key].usersCounter === 0 ||
            month < curMonth && hours < curHours && tmpBoards[key].usersCounter === 0) {
            // if board older than 24h, add it to list of boards to delete
            boardsToDelete.push(tmpBoards[key]);
        } else {
            // otherwise add to the new boardList
            newBoardList[key] = tmpBoards[key];
        }
    }
    // Block any one from joining the rooms to be deleted before deleting room files
    boardList = newBoardList;
    // delete the old boards
    deleteOldBoards(boardsToDelete);
    //save the new boards list
    console.log('saving new board list');
    saveFile('boards', newBoardList);
    // set time out to iterate process in 1h
    setTimeout(defineBoardsToDelete, 3600000);
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
        // const teacher = getTeacher(data);
        // teacher.addBoard(board);
        // teacher.save();
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
    const board = boardList[data.id];
    let boardReady;
    board.usersCounter === 2 ? boardReady = true : boardReady = false;
    socket["board"] = data.id;
    console.log(socket["board"], "connected", socket.id, 'initiator : ', boardReady);
    io.of("/boards")
        .to(`${socket.id}`)
        .emit("joinSuccess", {
            boardReady: boardReady,
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

    ///////////////////////////////////////////////
    ///////   INITIATE SERVER           //////////
    //////////////////////////////////////////////
    const init = () => {
        // On server start, set all boards' userscounters to 0
        let tmpBoardList = {};
        for (let key in boardList){
            let tmpBoard = boardList[key];
            tmpBoard.usersCounter = 0;
            tmpBoardList[key] = tmpBoard;
        }
        saveFile('boards', tmpBoardList);
        // Start the hourly loop to delete old boards
        defineBoardsToDelete();
    }
    init();
}

exports.start = startIO;



