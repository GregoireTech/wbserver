

class Room {
    constructor(name){
        this.name = name;
        this.pin = this.generatePin();
        this.string = `id=${name}&&pin=${this.pin}`
        this.usersCounter = 0;
        this.lines = [];
        this.visioStatus = 0;
    }

    addUser(){   
        this.usersCounter++;
    }

    generatePin(){
        const pin = JSON.stringify(Math.floor(Math.random() * Math.floor(10000)));
        return pin;
    }

    addLine(type, data){
        const newLine = {
            type: type,
            data: data
        }
        this.lines.push(newLine);
    }
    clearAll(){
        this.lines = [];
    }
};

exports.Room = Room;