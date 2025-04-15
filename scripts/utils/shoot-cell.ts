export function shootCell(socket: WebSocket, index: number) {
  const message = {
    event: 'cell.chosen',
    data: { index },
  }

  socket.send(JSON.stringify(message))
}
