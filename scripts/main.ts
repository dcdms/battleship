const API_BASE_URL = 'http://localhost:3000'

type WebSocketMessage =
  | {
      event: 'room.entered'
      data: {
        board: ('EMPTY' | 'HITTED' | 'SHIP' | 'HITTED_SHIP')[]
        has_opponent: boolean
        has_turn: boolean
      }
    }
  | {
      event: 'opponent.entered'
    }
  | { event: 'opponent.left' }
  | {
      event: 'opponent.cell.hitted'
      data: {
        index: number
        hitted_ship: boolean
      }
    }
  | {
      event: 'cell.chosen'
      data: {
        index: number
      }
    }

async function init() {
  const params = new URLSearchParams(window.location.search)
  let room_id = Number(params.get('room_id')) ?? null

  if (!room_id) {
    const response = await fetch(API_BASE_URL + '/rooms', { method: 'POST' })
    const data: { room_id: number } = await response.json()

    room_id = data.room_id

    params.append('room_id', String(data.room_id))
    window.history.replaceState({}, '', window.location.pathname + '?' + params)
  }

  const socket = new WebSocket(API_BASE_URL + '/rooms/' + room_id)

  socket.addEventListener('message', (msg: MessageEvent<string>) => {
    const message: WebSocketMessage = JSON.parse(msg.data)

    if (message.event === 'room.entered') {
      const messageElement = document.querySelector('[data-message]')

      if (messageElement) {
        messageElement.innerHTML = message.data.has_opponent
          ? message.data.has_turn
            ? 'YOUR TURN'
            : 'OPPONENT TURN'
          : 'SEND THIS LINK TO A FRIEND'
      }

      const cells = document.querySelectorAll(
        '[data-board]:first-child [data-board-cell]',
      )

      for (const [index, cell] of message.data.board.entries()) {
        if (cell === 'SHIP') {
          const element = cells[index]
          element.setAttribute('data-has-ship', 'true')
        }
      }

      if (message.data.has_opponent) {
        const board = document.querySelector('[data-board]:last-child')
        board?.setAttribute('data-disabled', 'false')

        const cells = document.querySelectorAll(
          '[data-board]:last-child [data-board-cell]',
        )

        cells.forEach((cell, index) => {
          cell.addEventListener('click', () => {
            const message = {
              event: 'cell.chosen',
              data: { index },
            }

            socket.send(JSON.stringify(message))
          })
        })
      }
    }

    if (message.event === 'opponent.entered') {
      const board = document.querySelector('[data-board]:last-child')

      const messageElement = document.querySelector('[data-message]')

      if (messageElement) {
        messageElement.innerHTML = 'YOUR TURN'
      }

      board?.setAttribute('data-disabled', 'false')
    }

    if (message.event === 'opponent.left') {
      const board = document.querySelector('[data-board]:last-child')

      const messageElement = document.querySelector('[data-message]')

      if (messageElement) {
        messageElement.innerHTML = 'YOUR TURN'
      }      

      board?.setAttribute('data-disabled', 'true')
    }
  })
}

init()
