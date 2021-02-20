import Piece from './Piece'
import { wPawn, bPawn } from '../../static/pieceIcons'

const wPawnInitial = [48, 49, 50, 51, 52, 53, 54, 55]
const bPawnInitial = [8, 9, 10, 11, 12, 13, 14, 15]

export default class Pawn extends Piece {
  constructor(player: string) {
    const pieceProps = {
      player: player,
      icon: player === 'white' ? wPawn : bPawn,
    }
    super(pieceProps)
  }

  isMovePossible(src: number, dest: number, isDestEnemyOccupied: boolean) {
    const p = this.player === 'white' ? 1 : -1
    const pawnInitial = this.player === 'white' ? wPawnInitial : bPawnInitial
    if (
      (dest === src - (8 * p) && !isDestEnemyOccupied) ||
      (dest === src - (16 * p) && pawnInitial.includes(src) && !isDestEnemyOccupied)
    ) {
      return true
    } else if (
      isDestEnemyOccupied &&
      (dest === src - (9 * p) || dest === src - (7 * p))
    ) {
      return true
    }

    return false
  }

  getSrcToDestPath(src: number, dest: number) {
    if (dest === src - 16) {
      return [src - 8]
    } else if (dest === src + 16) {
      return [src + 8]
    }
    return []
  }
}