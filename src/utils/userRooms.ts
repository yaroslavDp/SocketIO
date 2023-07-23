interface userRoom {
	id: string,
	username: string | string[] | undefined,
	room: string
}
const usersRoom: Array<userRoom> = [];
const winnersRoom = {};

export function userJoin(id: string, username: string | string[] | undefined, room: string) {
    const user = { id, username, room };
  
    usersRoom.push(user);
  
    return user;
  }
  
export function getCurrentUser(id: string) {
    return usersRoom.find(user => user.id === id);
  }

export function userLeave(id: string) {
    const index = usersRoom.findIndex(user => user.id === id);
  
    if (index !== -1) {
      return usersRoom.splice(index, 1)[0];
    }
  }
  
export function getRoomUsers(room: string) {
    return usersRoom.filter(user => user.room === room);
}

export function getUsers() {
  return usersRoom;
}

export function recordWinners(room: string, username:string | string[] | undefined){
  if (!winnersRoom[room]) {
    winnersRoom[room] = [];
  }
  winnersRoom[room].push(username);
}

export function getWinnerPlayers(room: string) {
  
  const winnerPlayers = winnersRoom[room];
  if (!winnerPlayers || winnerPlayers.length === 0) {
    return null;
  }

  return winnerPlayers;
}