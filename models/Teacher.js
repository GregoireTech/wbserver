const fs = require('fs');
const path = require("path");
const HISTORY_DIR = path.join(__dirname, "../data/teachers/");

class TeacherData {
    constructor(firstName, lastName, uid, password) {
        this.lastSaveDate = null;
        this.name = firstName + lastName;
        this.firstName = firstName;
        this.lastName = lastName;
        this.uid = uid;
        this.password = password;
        this.boards = [];
        this.file = path.join(HISTORY_DIR, "teacher-" + encodeURIComponent(uid) + ".json");
    }

    addBoard(board) {
        this.boards.push(board);
    }

    removeRoom(boardName) {
        const boardToRemove = this.boards.getIndex(boardName);
        this.boards.splice(boardToRemove);
    }

    load(data){
        this.lastSaveDate = data.lastSaveDate;
        this.name = data.name; 
        this.firstName = data.firstName;
        this.lastName = data.lastName;
        this.uid = data.uid;
        this.password = data.password;
        this.boards = data.boards;
        this.file = data.file;
    }

    formatDataToJSON() {
        const data = {
            "lastSaveDate": this.lastSaveDate,
            "name": this.name,
            "fistName": this.firstName,
            "lastName": this.lastName,
            "uid": this.uid,
            "password": this.password,
            "boards": this.boards,
            "file": this.file
        }
        return data;
    }

    save(){
        this.lastSaveDate = Date.now();
        const file = this.file;
        const data = this.formatDataToJSON();
        const teacher_txt = JSON.stringify(data);
        fs.writeFileSync(file, teacher_txt, function onTeachSaved(err) {
            if (err) {
                console.trace(new Error("Unable to save the teacher: " + err));
            } else {
                console.log("Successfully saved teacher: " + this.name);
            }
        });
    }

};

exports.TeacherData = TeacherData;