// External modules
import React, { Component } from 'react';
import queryString from 'query-string';
// Config
import endpoints from '../../assets/config/endpoints.js';
// Scripts
import boardScript from '../../assets/scripts/board/board';
import webRTC from '../../assets/scripts/webRTC';
// React components
import Tools from '../../components/tools/tools';
import Controls from '../../components/controls/controls';
import Invite from '../../components/modal/modal';
import Backdrop from '../../components/backdrop/backdrop';
import Board from '../../components/board/board';
// Stylesheet
import './Room.css';

class Room extends Component {

    state = {
        loaded: true,
        boardId: null,
        pin: null,
        socket: null,
        guest: null,
        modal: false,
        initiator: null
    }
    
    componentDidMount() {
        // get URL Params
        const params = queryString.parse(window.location.search);
        const boardId = params.id;
        const pin = params.pin;
        //Connect to room
        const io = require('socket.io-client');
        const socket = io(`${endpoints.prod}boards`);
        
        // Send join request
        if (socket && boardId) {
            // Setup actions if join succeeds OK
            socket.on('joinSuccess', (data) => {
                console.log('joinSuccess');
                this.setState({
                    boardId: boardId,
                    pin: pin,
                    loaded: true,
                    socket: socket
                });
                boardScript(socket, this.state.boardId);
                webRTC(socket, data.boardReady, data.iceServers);
            });
            // Setup actions if join fails
            socket.on('joinFail', error => {
                alert(error);
            });
            console.log('sending join request');
            socket.emit('join', {id: boardId, pin: pin});
        };
    };
    
    componentDidUpdate() {
        if (this.state.loaded && this.state.socket) {
            const socket = this.state.socket;
            socket.on('reconnect', () => {
                socket.emit('joinboard', {room: this.state.boardId, pin: this.state.pin})
            });
        };
    };


    sendInvite(){
        const guest = this.state.guest;
        console.log(guest);
        const socket = this.state.socket;
        if(guest && socket){
        socket.emit('inviteGuest', {email: guest});
        socket.on('inviteRes', (res) => {
            console.log('email response:', res);
        });
        } else { 
            alert('Il y a eu une erreur, merci de réessayer');
        }
        this.setState({modal: false});
    };

    guestInputChanged(e){
        const email = e.target.value;
        this.setState({guest: email});
    }

    toggleModal(){
        const previous = this.state.modal;
        this.setState({
            modal: !previous
        });
    }


    render() {

        let board = null;
        const boardContainer = document.getElementById('boardContainer');
        if (boardContainer){
            board = <Board width='1' height='1' />
        }
        return (
            <div className='globalContainer' id='globalContainer'>
                <Backdrop click={this.toggleModal.bind(this)} show={this.state.modal} />
                <Invite 
                    show={this.state.modal}
                    inputChanged={this.guestInputChanged.bind(this)} 
                    inputValue={this.state.guest}
                    closeModal={this.toggleModal.bind(this)}
                    sendInvite={this.sendInvite.bind(this)}
                    valid={this.state.validEmail}
                />
                <Tools />
                <div id="boardContainer">
                    {board}
                </div>
                <Controls 
                    teacher={this.teacher} 
                    student={this.student} 
                    openModal={this.toggleModal.bind(this)}
                />
            </div>
        );
    };
};

export default Room;
