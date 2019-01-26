

class Teacher {
    constructor(firstName, lastName, password){
        this.password = password;
        this.name = firstName + lastName;
        this.firstName = firstName;
        this.lastName = lastName;
        this.rooms = [];
    }

    addRoom(roomName){  
        this.rooms.push(roomName);
    }
    
    removeRoom(roomName){
        const roomToRemove = this.rooms.getIndex(roomName);
        this.rooms.splice(roomToRemove);
    }
};

exports.Teacher = Teacher;