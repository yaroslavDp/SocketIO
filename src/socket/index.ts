import { Server } from 'socket.io';
import { MAXIMUM_USERS_FOR_ONE_ROOM, SECONDS_TIMER_BEFORE_START_GAME, SECONDS_FOR_GAME } from './config';
import data from '../data';
import { userJoin, getRoomUsers, getUsers, getCurrentUser, userLeave, recordWinners, getWinnerPlayers } from '../utils/userRooms';
const activeUsers = new Set();
const activeRooms: Array<string> = [];


export default (io: Server) => {
	io.on('connection', socket => {
		const username = socket.handshake.query.username;

		if(activeUsers.has(username)){
			socket.emit('USERNAME_TAKEN')
			socket.disconnect()
			return;
		}
		activeUsers.add(username);

		if(activeRooms.length !== 0){
			const users = getUsers();
			socket.emit('ADD_ROOMS', { activeRooms, users })
		}

		socket.on('TOGGLE_READY', (ready: boolean) => {
			const user = getCurrentUser(socket.id);
			if(!user){
				return;
			}
			io.in(user.room).emit('TOGGLE_READY_DONE', {username: user?.username, ready})
		});

		socket.on('START_GAME', async () => {
			const user = getCurrentUser(socket.id);
			if(!user){
				return;
			}
			io.in(user.room).emit('REVEAL_TIMER', {timer: SECONDS_TIMER_BEFORE_START_GAME})


		})
		socket.on('GET_TEXT', () => {
			const user = getCurrentUser(socket.id);
			if(!user){
				return;
			}
			const id = Math.floor(Math.random() * data.texts.length) + 1;
			io.in(user.room).emit('PASS_TEXT_ID', {id, timer: SECONDS_FOR_GAME});
		})

		socket.on('UPDATE_PROGRESS', (percentage: number) => {
			const user = getCurrentUser(socket.id);
			if(!user){
				return;
			}
			io.in(user.room).emit('SHOW_PROGRESS', {username: user.username, progress: percentage})
		});

		socket.on('FINISHED_GAME', (isFinished: boolean) => {
			const user = getCurrentUser(socket.id);
			if(!user){
				return;
			}
			if(!isFinished){
				recordWinners(user.room, user.username);
			} else {
				const winners = getWinnerPlayers(user.room);
				io.in(user.room).emit('SHOW__WiNNERS', {winners});
			}

		});
		socket.on('CREATE_ROOM', (roomId: string) => {
			if (!roomId || activeRooms.includes(roomId)) {
				socket.emit('ROOM_CREATION_FAILED');
				return;
			}
			const user = userJoin(socket.id, username, roomId);
			socket.join(user.room);
			activeRooms.push(roomId);
			const users = getUsers();
			const usersInRoom = getRoomUsers(user.room);
			io.to(user.id).emit('JOIN_ROOM_DONE', {user, usersInRoom})
			io.emit('ADD_ROOMS', { activeRooms, users })
		});

		socket.on('JOIN_ROOM', (roomId) => {
			const checkNumUsers = getRoomUsers(roomId).length;
			if(checkNumUsers === MAXIMUM_USERS_FOR_ONE_ROOM){
				io.to(socket.id).emit('JOIN_ROOM_FAILED')
			}
			const user = userJoin(socket.id, username, roomId);
			socket.join(user.room);
			const numberOfUsers = getRoomUsers(user.room).length;
			const usersInRoom = getRoomUsers(user.room);
			io.to(user.id).emit('JOIN_ROOM_DONE', {user, usersInRoom})
			socket.to(user.room).emit('JOINED_USER', {user})
			socket.broadcast.emit('UPDATE_ROOMS', {name: roomId, numberOfUsers})
		});

		socket.on('EXIT_ROOM', () => {
			const currUser = getCurrentUser(socket.id);
			if(!currUser){
				return;
			}
			userLeave(currUser.id);
			socket.leave(currUser.room);
			const numberOfUsers = getRoomUsers(currUser.room).length;
			io.to(currUser.id).emit('EXIT_ROOM_DONE')
			socket.to(currUser.room).emit('LEFT_USER', {user: currUser})
			io.emit('UPDATE_ROOMS', {name: currUser.room, numberOfUsers})

		});
		socket.on('disconnect', () => {
			activeUsers.delete(username);
		});
	});
};
