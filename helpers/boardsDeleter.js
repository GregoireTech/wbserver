const fs = require('fs');
const path = require('path');
// Define path to data directory
const DATA_DIR = path.join(__dirname, "../data/");


const saveFile = (fileData) => {
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


////////////////////////////////////////////////
//        LOOP TO DELETE OLD BOARDS           //
////////////////////////////////////////////////
const deleteOldBoards = (boardsToDelete) => {
    console.log('deleting old boards : ', boardsToDelete);
    boardsToDelete.forEach(oldBoard => {
        // Remove the board data file
        try {
            fs.unlinkSync(path.join(DATA_DIR, `boards/board-${oldBoard.id}.json`));
            console.log('file deleted : ', `board-${oldBoard.id}.json`);
        }
        catch(error) {
            console.error(error);
            // expected output: ReferenceError: nonExistentFunction is not defined
            // Note - error messages will vary depending on browser
        }
    });
}

const defineBoardsToDelete = () => {
    console.log('defining boards to delete');
    const tmpBoards = require('../data/boards.json');
    let boardsToDelete = [];
    let newBoardList = {};
    // Define current date & time
    const now = new Date();
    const diff24 = 24*3600*1000; // 24 hours in milliseconds
    //loop through boards
    for (let key in tmpBoards) {
        // Get the board's time components
        let monthString = tmpBoards[key].date.split('/')[1];
        let dateString = tmpBoards[key].date.split('/')[0];
        let hoursString = tmpBoards[key].time.split(':')[0];
        let minutesString = tmpBoards[key].time.split(':')[1];
        // Remove the eventual formatting
        if(monthString[0] === '0') monthString = monthString[1];
        if(dateString[0] === '0') dateString = dateString[1];
        if(hoursString[0] === '0') hoursString = hoursString[1];
        if(minutesString[0] === '0') minutesString = minutesString[1];
        // Translate time components to numbers
        const month = JSON.parse(monthString);
        const date = JSON.parse(dateString);
        const hours = JSON.parse(hoursString);
        const minutes = JSON.parse(minutesString);
        // Define the board's creation date from its components
        const boardDate = new Date();
        boardDate.setDate(date);
        boardDate.setMonth(month-1);
        boardDate.setHours(hours);
        boardDate.setMinutes(minutes);
        // Handle the case of year change
        if(boardDate.getMonth() > now.getMonth()) boardDate.setFullYear(now.getFullYear() -1);
        // Compare the board's creation time with now
        if ((now.valueOf() - boardDate.valueOf()) > diff24) {
            // if board older than 24h, add it to list of boards to delete
            boardsToDelete.push(tmpBoards[key]);
        } else {
            // otherwise add to the new boardList
            newBoardList[key] = tmpBoards[key];
        }
    }
    // delete the old boards
    deleteOldBoards(boardsToDelete);
    //save the new boards list
    console.log('saving new board list');
    saveFile(newBoardList);
    // set time out to iterate process in 1h
    setTimeout(defineBoardsToDelete, 3600000);
}

exports.startDeleter = defineBoardsToDelete;
