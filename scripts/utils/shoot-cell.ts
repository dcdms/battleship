export function shootCell(socket: WebSocket, index: number) {
  const message = {
    event: 'cell.shot',
    data: { index },
  }

  socket.send(JSON.stringify(message))
}
