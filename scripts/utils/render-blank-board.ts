export function renderBlankBoard(
  board: ('EMPTY' | 'SHIP')[],
  cells: NodeListOf<Element>,
) {
  for (const [index, content] of board.entries()) {
    const cell = cells[index]

    cell.setAttribute('data-shot', 'false')
    cell.setAttribute('data-has-ship', String(content === 'SHIP'))
  }
}
