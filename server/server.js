const fs = require('fs');
const path = require('path');

const express = require('express');
const app = express();
const server = require('http').Server(app);
const sockets = require('./socket');
const port = process.env.PORT || 8888;
const initDeleteLoop = require('../helpers/boardsDeleter').startDeleter;
// Define path to data directory
const DATA_DIR = path.join(__dirname, "../data/");
let boardList = require('../data/boards.json');

// Allow for cross origins
app.use((req,res,next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

///////////////////////////////////////////////
///////   INITIATE SERVER           //////////
//////////////////////////////////////////////
const saveBoardsFile = (fileData) => {
    const file = path.join(DATA_DIR, `boards.json`);
    const file_txt = JSON.stringify(fileData);
    fs.writeFileSync(file, file_txt, function onFileSaved(err) {
        if (err) {
            console.trace(new Error(`Unable to save the boards file:` + err));
        } else {
            console.log(`Successfully saved the boards file!`);
        }
    });
}
const init = () => {
    // On server start, set all boards' userscounters to 0
    console.log('initializing...')
    let tmpBoardList = {};
    for (let key in boardList) {
        let tmpBoard = boardList[key];
        tmpBoard.usersCounter = 0;
        tmpBoardList[key] = tmpBoard;
    }
    saveBoardsFile(tmpBoardList);
    // Start the hourly loop to delete old boards
    initDeleteLoop();
}
init();




const io = sockets.start(server);


server.listen(port, () => console.log('listening on port ' + port));