import { showMessageModal, showInputModal, showResultsModal } from "./views/modal.mjs";
import { appendRoomElement, updateNumberOfUsersInRoom } from "./views/room.mjs";
import { appendUserElement, removeUserElement, changeReadyStatus, setProgress } from "./views/user.mjs";
import { addClass, removeClass } from "./helpers/domHelper.mjs";

const username = sessionStorage.getItem('username');

if (!username) {
	window.location.replace('/login');
}

const socket = io('http://localhost:3002/', { query: { username } });

const addRoomBtn = document.getElementById('add-room-btn');
const roomsContainer = document.querySelector('#rooms-wrapper');
const quitRoomBtn = document.querySelector('#quit-room-btn');
const readyBtn = document.querySelector('#ready-btn');
const startGameTimer = document.querySelector('#timer');
const textContainer = document.querySelector('#text-container');
const timerContainer = document.querySelector('#game-timer');
const gameTimerSeconds = document.querySelector('#game-timer-seconds');

addRoomBtn.addEventListener('click', () => {
	let roomName = '';
	showInputModal({
		title: 'Add Room Name',
		onChange: (value) => {
			roomName = value
		},
		onSubmit: () => {
			socket.emit('CREATE_ROOM', roomName);
		}
	})
});

quitRoomBtn.addEventListener('click', () => {
	socket.emit('EXIT_ROOM')
});

readyBtn.addEventListener('click', () => {
	if (readyBtn.innerText === 'READY') {
		readyBtn.innerText = 'UNREADY'
		socket.emit('TOGGLE_READY', true)
	} else {
		readyBtn.innerText = 'READY'
		socket.emit('TOGGLE_READY', false)
	}
})




const returnToLogin = () => {
	window.location.replace('/login')
}

const addRooms = ({activeRooms, users}) => {
	roomsContainer.innerHTML = '';
	activeRooms.forEach(room => {
		appendRoomElement({
			name: room,
			numberOfUsers: users.filter(user => user.room === room).length,
			onJoin: () => {
				socket.emit("JOIN_ROOM", room)
			}
		})
	});
}

const joinedRoom = ({user, usersInRoom}) => {
	const activeUser = user;
	const roomsPage = document.getElementById('rooms-page');
	addClass(roomsPage, 'display-none');
	const gamePage = document.getElementById('game-page');
	removeClass(gamePage, 'display-none');

	const roomName = document.getElementById('room-name');
	roomName.innerText = user.room;

	const usersContainer = document.querySelector('#users-wrapper');
	usersContainer.innerHTML = '';

	usersInRoom.forEach((user) => {
		appendUserElement({
			username: user.username,
			ready: false,
			isCurrentUser: user.id === activeUser.id
		})
	})


}
const toggleReady = ({username, ready}) => {
	changeReadyStatus({username, ready})
	const readyStatusAllTrue = document.querySelectorAll(".ready-status[data-ready='true']");
	const readyStatusAll = document.querySelectorAll(".ready-status");
	const status = readyStatusAll.length === readyStatusAllTrue.length;
	if(status){
		socket.emit('START_GAME')
	}
}

const exitRoom = () => {
	const gamePage = document.getElementById('game-page');
	addClass(gamePage, 'display-none');
	const roomsPage = document.getElementById('rooms-page');
	removeClass(roomsPage, 'display-none');
}
const joinedUser = ({user}) => {
	appendUserElement({username: user.username, ready: false})
}
const leftUser = ({user}) => {
	removeUserElement(user.username);
}
const revealTimer = ({timer}) => {
	addClass(readyBtn, 'display-none')
	removeClass(startGameTimer, 'display-none')
	addClass(quitRoomBtn, 'display-none');
	startGameTimer.innerText = '';
	let timeleft = timer;
	const countDownInterval = setInterval(function(){
		timeleft--;
		startGameTimer.innerText = timeleft;
		if (timeleft <= 0) {
			clearInterval(countDownInterval);
			addClass(startGameTimer, 'display-none')
			socket.emit('GET_TEXT')
		}
	}, 1000)
}
const getText = async ({id, timer}) => {
	const response = await fetch(`http://localhost:3002/game/texts/${id}`);
	const content = await response.json();
	const text = content.data;
	let timeleft = timer;
	removeClass(textContainer, 'display-none');
	removeClass(timerContainer, 'display-none');
	textContainer.innerText = '';
	gameTimerSeconds.innerText = '';
	text.split('').forEach(character => {
		const characterSpan = document.createElement('span')
		characterSpan.innerText = character
		characterSpan.classList.add("span");
		textContainer.appendChild(characterSpan)
	})

	const spans = document.querySelectorAll(".span");

	const countDownInterval = setInterval(function(){
		timeleft--;
		gameTimerSeconds.innerText = timeleft;
		if (timeleft <= 0) {
			clearInterval(countDownInterval);
		}
	}, 1000)

	function typing(e) {
		const typed = e.key;
		console.log(typed);
		for (let i = 0; i < spans.length; i++) {
			if (spans[i].innerHTML === typed) { 
				if (spans[i].classList.contains("correct")) { 
					continue;
				} else if (spans[i].classList.contains("correct") === false && spans[i-1] === undefined || spans[i-1].classList.contains("correct") !== false ) { 
					spans[i].classList.add("correct");
					break;
				}
			}
		}
		let correct = 0;
  		for (let j = 0; j < spans.length; j++) { 
  			if (spans[j].className === "span correct") {
  				correct++;
  			}
		}
		const percentage = (correct / spans.length) * 100;
		socket.emit('UPDATE_PROGRESS', percentage)

		if(correct === spans.length){
			console.log('DONE!')
			document.removeEventListener("keydown", typing);
			const finishedPlayers = document.querySelectorAll('.finished');
			const userNames = document.querySelectorAll('.username');
			console.log(finishedPlayers.length);
			console.log(userNames.length);
			const finishedGame = finishedPlayers.length === userNames.length;
			socket.emit('FINISHED_GAME', finishedGame)
		}
	
	}
	document.addEventListener("keydown", typing, false);

}

const showProgress = ({username, progress}) => {
	setProgress({username, progress})
}

const showWinners = ({winners}) => {
	showResultsModal(winners);
}
socket.on('USERNAME_TAKEN', () => {
	const message = 'Username is already taken!';
	sessionStorage.removeItem('username');
	showMessageModal({message, onClose: returnToLogin})
})

socket.on('ROOM_CREATION_FAILED', () => {
	const message = 'Invalid room name or room already exists!'
	showMessageModal({message})
})

socket.on('JOIN_ROOM_FAILED', () => {
	const message = 'Number of joined users is already 5;'
	showMessageModal({message})
})

socket.on('JOIN_ROOM_DONE', joinedRoom);
socket.on('EXIT_ROOM_DONE', exitRoom);
socket.on('JOINED_USER', joinedUser);
socket.on('LEFT_USER', leftUser);
socket.on('ADD_ROOMS', addRooms);
socket.on('UPDATE_ROOMS', updateNumberOfUsersInRoom);
socket.on('TOGGLE_READY_DONE', toggleReady)
socket.on('REVEAL_TIMER', revealTimer);
socket.on('PASS_TEXT_ID', getText);
socket.on('SHOW_PROGRESS', showProgress);
socket.on('SHOW_WINNERS', showWinners);