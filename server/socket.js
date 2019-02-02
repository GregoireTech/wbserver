
// import external & core librairies
const emailSender = require('../controllers/emailSender');
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
const boardList = require('../data/boards.json');
//define variables
let boards = {};
let tmpTeachers, tmpBoards;

// Start the socket server
function startIO(app) {
    io = iolib(app);
    io.on("connection", onConnection);
    io.of("/boards").on("connection", connectToRoom);
    return io;
}


const saveTeachers = (tmpTeachers) => {
    console.log(tmpTeachers);
    const teachersFile = path.join(DATA_DIR, "teachers.json");
    const teachers_txt = JSON.stringify(tmpTeachers);
    console.log(teachers_txt);
    fs.writeFileSync(teachersFile, teachers_txt, { flag: 'w'} , function onTeachersSaved(err) {
        if (err) {
            console.trace(new Error("Unable to save the teachers to file:" + err));
        } else {
            console.log("Successfully saved teachers to file");
        }
    });
}

const saveBoards = (tmpBoards) => {
    const boardsFile = path.join(DATA_DIR, "boards.json");
    const boards_txt = JSON.stringify(tmpBoards);
    fs.writeFileSync(boardsFile, boards_txt, function onBoardsSaved(err) {
        if (err) {
            console.trace(new Error("Unable to save the boards to file:" + err));
        } else {
            console.log("Successfully saved boards to file");
        }
    });
}
const saveTeacher = (tmpTeacher) => {
    const teacherFile = path.join(DATA_DIR, `teachers/teacher-${tmpTeacher.uid}.json`);
    const teacher_txt = JSON.stringify(tmpTeacher);
    fs.writeFileSync(teacherFile, teacher_txt, function onTeacherSaved(err) {
        if (err) {
            console.trace(new Error("Unable to save the Teacher to file:" + err));
        } else {
            console.log("Successfully saved Teacher to file");
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

////////////////////////////////////////////////
//        LOOP TO DELETE OLD BOARDS           //
////////////////////////////////////////////////
const deleteOldBoards = (boardsToDelete) => {
    boardsToDelete.forEach(oldBoard => {

        //Disconnect all users from the board before removing it

        // Remove the board from the teacher's board list
        const tmpTeacher = require(path.join(DATA_DIR, `teachers/teacher-${oldBoard.teacher}.json`));
        let tmpHisboards = [];
        tmpTeacher.boards.forEach(hisBoard => {
            if (hisBoard.id !== oldBoard.id){
                tmpHisboards.push(hisBoard);
            } 
        });
        tmpTeacher.boards = tmpHisboards;
        // Save the new teacher object with updated board list
        saveTeacher(tmpTeacher);

        // Remove the board data file
        fs.unlinkSync(path.join(DATA_DIR, `boards/board-${oldBoard.id}.json`), function onDeleteFileSuccess(){
            console.log('file deleted : ', `board-${oldBoard.id}.json` );
        }, function onDeleteFileFail(err){
            console.log('error deleting file ', `board-${oldBoard.id}.json. Error : `, err );
        });
    });
}

const defineBoardsToDelete = () => {
    const tmpBoards = require('../data/boards.json');
    let boardsToDelete = [];
    let newBoards = {};
    // Define current date & time
    const now = new Date();
    const curMonth = now.getMonth() + 1;
    const curDate = now.getDate();
    const curHours = now.getHours();

    //loop through boards
    for (let key in tmpBoards){
        const month = tmpBoards[key].date.split('/')[1];
        const date = tmpBoards[key].date.split('/')[0];
        const hours = tmpBoards[key].time.split(':')[0];

        if(date < curDate && hours < curHours || month < curMonth && hours < curHours){
            // if board older than 24h, add it to list of boards to delete
            boardsToDelete.push(tmpBoards[key]);
        } else {
            // otherwise add to the new boardList
            newBoards[key] = tmpBoards[key];
        }
    }

    
    // delete the old boards
    deleteOldBoards(boardsToDelete);
    //save the new boards list
    saveBoards(newBoards);

    // set time out to iterate process in 1h
    setTimeout(defineBoardsToDelete, 20000);
}

defineBoardsToDelete();



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
        const teacherObj = new TeacherData(null, null, null,null);
        teacherObj.load(teacherInfo);
        return teacherObj;
    } else {
        console.log('create teacher');
        const teacher = new TeacherData(data.firstName, data.lastName, data.uid, data.password);
        tmpTeachers = teachers;
        tmpTeachers.push(data.uid);
        teacher.save();
        noFail(saveTeachers(tmpTeachers));
        console.log('savedTeachers');

        return teacher;
    }
}

////////////////////////////////////////////////
//           TEACHER INTERFACE                //
////////////////////////////////////////////////
const sendBoardList = (socket, teacher) => {
    let myBoards = [];
    if(teacher){
        console.log('send boards', teacher);
        const boards = teacher.boards;
        console.log(boards);
        for (let i = 0; i < boards.length; i++ ) {
            const board = {
                date: boards[i].date,
                time: boards[i].time,
                string: boards[i].string
            };
            myBoards.push(board);
        }
    }
    console.log(myBoards);
    io.to(`${socket.id}`).emit("setBoardList", {
        myBoards
    });
};

const generateUID = () => {
    var uid = Date.now().toString(36); //Create the uids in chronological order
    uid += (Math.round(Math.random() * 36)).toString(36); //Add a random character at the end
    return uid;
} 

const createNewBoard = () => {
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
        id : id,
        pin : pin,
        date: `${day}/${month}`,
        time: `${hours}:${minutes}`,
        string: `id=${id}&&pin=${pin}`,
        usersCounter: 0
    };
    return board;

}

function onConnection(socket) {
    console.log(socket.id, "user connected");
    // When the teacher connected, we get a request for his Boards

    socket.on("getMyBoards", data => {
        const teacher = getTeacher(data);
        if (!teacher.password === data.password){
            socket.emit('error', {msg: 'Wrong Password'});
        } else {
            sendBoardList(socket, teacher);
        }


    });
    // If the user wants to create a room

    socket.on("createBoard", data => {
        console.log("create board");
        const board = createNewBoard();
        const boardObj = BoardData.load(board.id);
        const teacher = getTeacher(data);
        teacher.addBoard(board);
        teacher.save();
        tmpBoards = boardList;
        if(!tmpBoards.hasOwnProperty(board.id)) tmpBoards[board.id] = board;
        saveBoards(tmpBoards);
        noFail(sendBoardList(socket, teacher));
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

function connectToRoom(socket) {
    console.log("user in boards");

    const joinBoard = (socket, data) => {
        socket.join(data.id);
        const tmpBoards = boardList;
        tmpBoards[data.id].usersCounter++;
        saveBoards(tmpBoards);
        const board = boardList[data.id];
        let boardReady;
        board.usersCounter === 2 ? boardReady = true : boardReady = false;
        socket["board"] = data.id;
        console.log(socket["board"], "connected", socket.id);
        io.of("/boards")
            .to(`${socket.id}`)
            .emit("joinSuccess", {
                boardReady: boardReady
            });
    }





    socket.on("join", data => {
        let error = false;
        const board = boardList[data.id];
        console.log(data, boardList);
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
        const room = rooms[socket['room']];
        const guest = data.email;
        if (room) {
            const emailSent = emailSender.sendEmail(guest, room.string);
            io.of('/boards').to(`${socket.id}`).emit('inviteRes', {
                emailSent
            })
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
            console.log(tmpBoards);
            tmpBoards[socket['board']].usersCounter--;
            saveBoards(tmpBoards);
            io.of('/boards').emit('peerLeft');
            console.log(boardList);
        }
        //Object.keys(socket.rooms).forEach(function disconnectFrom(room) {
            // if (boards.hasOwnProperty(room)) {
            //     boards[room].then(board => {
            //         board.users.delete(socket.id);
            //         var userCount = board.users.size;
            //         console.log(userCount + " users in " + room);
            //         if (userCount === 0) {
            //             board.save();
            //             delete boards[room];
            //         }
            //     });
            // }
        //});
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