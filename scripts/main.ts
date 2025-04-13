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
  | {
      event: 'opponent.left'
      data: { board: ('EMPTY' | 'HITTED' | 'SHIP' | 'HITTED_SHIP')[] }
    }
  | {
      event: 'opponent.cell.hitted'
      data: {
        index: number
        has_ship: boolean
        won: boolean
      }
    }
  | {
      event: 'cell.hitted'
      data: {
        index: number
        lost: boolean
      }
    }

interface CellChosenEvent {
  event: 'cell.chosen'
  data: { index: number }
}

let cellListener: AbortController

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

        cellListener = new AbortController()

        cells.forEach((cell, index) => {
          cell.addEventListener('click', () => chooseCell(socket, index), {
            signal: cellListener.signal,
          })
        })
      }
    }

    if (message.event === 'opponent.entered') {
      const messageElement = document.querySelector('[data-message]')

      if (messageElement) {
        messageElement.innerHTML = 'YOUR TURN'
      }

      const board = document.querySelector('[data-board]:last-child')

      board?.setAttribute('data-disabled', 'false')

      const cells = document.querySelectorAll(
        '[data-board]:last-child [data-board-cell]',
      )

      cellListener = new AbortController()

      cells.forEach((cell, index) => {
        cell.addEventListener('click', () => chooseCell(socket, index), {
          signal: cellListener.signal,
        })
      })
    }

    if (message.event === 'opponent.left') {
      const messageElement = document.querySelector('[data-message]')

      if (messageElement) {
        messageElement.innerHTML = 'SEND THIS LINK TO A FRIEND'
      }

      const cells = document.querySelectorAll(
        '[data-board]:first-child [data-board-cell]',
      )

      for (const [index, cell] of message.data.board.entries()) {
        const element = cells[index]

        element.setAttribute('data-hitted', 'false')
        element.setAttribute('data-has-ship', String(cell === 'SHIP'))
      }

      const opponentBoard = document.querySelector('[data-board]:last-child')

      opponentBoard?.setAttribute('data-disabled', 'true')

      const opponentCells = document.querySelectorAll(
        '[data-board]:last-child [data-board-cell]',
      )

      opponentCells.forEach((cell) => {
        cellListener.abort()

        cell.removeAttribute('data-hitted')
        cell.removeAttribute('data-has-ship')
      })
    }

    if (message.event === 'cell.hitted') {
      const cell = document.querySelector(
        '[data-board]:first-child [data-board-cell]:nth-child(' +
          (message.data.index + 1) +
          ')',
      )

      cell?.setAttribute('data-hitted', 'true')

      if (message.data.lost) {
        alert('YOU LOST!')
      }
    }

    if (message.event === 'opponent.cell.hitted') {
      const cell = document.querySelector(
        '[data-board]:last-child [data-board-cell]:nth-child(' +
          (message.data.index + 1) +
          ')',
      )

      cell?.setAttribute('data-hitted', 'true')

      if (message.data.has_ship) {
        cell?.setAttribute('data-has-ship', 'true')

        if (message.data.won) {
          alert('YOU WON!')
        }
      }
    }
  })
}

function chooseCell(socket: WebSocket, index: number) {
  const message: CellChosenEvent = {
    event: 'cell.chosen',
    data: { index },
  }

  socket.send(JSON.stringify(message))
}

init()
