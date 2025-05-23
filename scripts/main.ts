import { API_BASE_URL } from '@/constants'
import { renderBlankBoard } from '@/utils/render-blank-board'

type BlankBoard = ('EMPTY' | 'SHIP')[]

type WebSocketMessage =
  | {
      event: 'room.entered'
      data: {
        board: BlankBoard
        has_opponent: boolean
        has_turn: boolean
      }
    }
  | {
      event: 'opponent.entered'
    }
  | {
      event: 'opponent.left'
      data: { board: BlankBoard }
    }
  | {
      event: 'opponent.cell.shot.result'
      data: {
        index: number
        has_ship: boolean
        won: boolean
      }
    }
  | {
      event: 'cell.shot.result'
      data: {
        index: number
        lost: boolean
      }
    }
  | {
      event: 'restarted'
      data: { board: BlankBoard }
    }

const elements = {
  message: document.querySelector('[data-message]')!,
  boards: {
    own: {
      root: document.querySelector('[data-board]:first-child')!,
      cells: document.querySelectorAll(
        '[data-board]:first-child [data-board-cell]',
      )!,
    },
    opponent: {
      root: document.querySelector('[data-board]:last-child')!,
      cells: document.querySelectorAll(
        '[data-board]:last-child [data-board-cell]',
      )!,
    },
  },
  dialog: {
    root: document.querySelector('[data-dialog]')!,
    message: document.querySelector('[data-dialog-message]')!,
    restart: document.querySelector('[data-dialog-restart]')!,
  },
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

  elements.dialog.restart.addEventListener('click', () => {
    socket.send(JSON.stringify({ event: 'restart', data: {} }))
  })

  elements.boards.opponent.cells.forEach((cell, index) => {
    cell.addEventListener('click', () => {
      socket.send(
        JSON.stringify({
          event: 'cell.shot',
          data: { index },
        }),
      )
    })
  })

  socket.addEventListener('message', (msg: MessageEvent<string>) => {
    const message: WebSocketMessage = JSON.parse(msg.data)

    if (message.event === 'room.entered') {
      elements.message.innerHTML = message.data.has_opponent
        ? message.data.has_turn
          ? 'YOUR TURN'
          : 'OPPONENT TURN'
        : 'SEND THIS LINK TO A FRIEND'

      renderBlankBoard(message.data.board, elements.boards.own.cells)

      if (!message.data.has_opponent || !message.data.has_turn) {
        elements.boards.opponent.cells.forEach((cell) => {
          cell.setAttribute('disabled', '')
        })
      }
    }

    if (message.event === 'opponent.entered') {
      elements.message.innerHTML = 'YOUR TURN'

      elements.boards.opponent.cells.forEach((cell) => {
        cell.removeAttribute('disabled')
      })
    }

    if (message.event === 'opponent.left') {
      elements.message.innerHTML = 'SEND THIS LINK TO A FRIEND'

      renderBlankBoard(message.data.board, elements.boards.own.cells)

      elements.boards.opponent.cells.forEach((cell) => {
        cell.setAttribute('disabled', '')
        cell.removeAttribute('data-shot')
        cell.removeAttribute('data-has-ship')
      })

      elements.dialog.root.setAttribute('data-state', 'closed')
      document.body.removeAttribute('data-scroll-locked')
    }

    if (message.event === 'cell.shot.result') {
      const cell = elements.boards.own.cells[message.data.index]

      cell.setAttribute('data-shot', 'true')

      if (cell.getAttribute('data-has-ship') !== 'true') {
        elements.message.innerHTML = 'YOUR TURN'

        elements.boards.opponent.cells.forEach((cell) => {
          cell.removeAttribute('disabled')
        })

        return
      }

      if (message.data.lost) {
        document.body.setAttribute('data-scroll-locked', '')

        elements.dialog.root.setAttribute('data-state', 'open')
        elements.dialog.message.innerHTML = 'YOU LOST!'
      }
    }

    if (message.event === 'opponent.cell.shot.result') {
      const cell = elements.boards.opponent.cells[message.data.index]
      cell.setAttribute('data-shot', 'true')

      if (!message.data.has_ship) {
        elements.message.innerHTML = 'OPPONENT TURN'

        elements.boards.opponent.cells.forEach((cell) => {
          cell.setAttribute('disabled', '')
        })

        return
      }

      cell.setAttribute('data-has-ship', 'true')

      if (message.data.won) {
        document.body.setAttribute('data-scroll-locked', '')

        elements.dialog.root.setAttribute('data-state', 'open')
        elements.dialog.message.innerHTML = 'YOU WON!'
      }
    }

    if (message.event === 'restarted') {
      document.body.removeAttribute('data-scroll-locked')
      elements.dialog.root.setAttribute('data-state', 'closed')

      renderBlankBoard(message.data.board, elements.boards.own.cells)

      elements.boards.opponent.cells.forEach((cell) => {
        cell.removeAttribute('data-shot')
        cell.removeAttribute('data-has-ship')
      })
    }
  })
}

init()
