const login = (props) => {

    const socket = props.socket;

    // socket.on('impossible', err => {
    //     alert(err);
    //     console.log(err);
    // });
    // socket.on('okToJoin', room => {
    //     console.log('joining', room);
    //     props.join(room.roomName);
    //     //this.props.join(room.name);
    // });
    socket.on('setBoardList', data => {
        const newList = data.myBoards;
        props.addBoard(newList);
        //this.setState({roomList: newList});
    });



}

export default login;