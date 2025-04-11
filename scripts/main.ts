const API_BASE_URL = 'http://localhost:3000'

const INCREMENTS_BY_DIRECTION = {
  up: -10,
  right: 1,
  down: 10,
  left: -1,
}

type WebSocketMessage =
  | {
      event: 'room.entered'
      data: {
        has_opponent: boolean
        ships: {
          starts_at: number
          direction: 'up' | 'right' | 'down' | 'left'
          length: 1 | 2 | 3 | 4
        }[]
      }
    }
  | {
      event: 'opponent.entered'
    }
  | { event: 'opponent.left' }

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
      const cells = document.querySelectorAll('[data-board-cell]')

      for (const ship of message.data.ships) {
        const start = cells[ship.starts_at]

        start.setAttribute('data-filled', 'true')

        let offset = 0

        while (offset < ship.length) {
          const increment = INCREMENTS_BY_DIRECTION[ship.direction]
          const next = cells[ship.starts_at + offset * increment]

          next.setAttribute('data-filled', 'true')
          offset++
        }
      }

      if (message.data.has_opponent) {
        const board = document.querySelector('[data-board]:last-child')
        board?.setAttribute('data-disabled', 'false')
      }
    }

    if (message.event === 'opponent.entered') {
      const board = document.querySelector('[data-board]:last-child')
      board?.setAttribute('data-disabled', 'false')
    }

    if (message.event === 'opponent.left') {
      const board = document.querySelector('[data-board]:last-child')
      board?.setAttribute('data-disabled', 'true')
    }
  })
}

init()
