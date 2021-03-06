import React from 'react'
import Board from './Board'
import Infobar from './Infobar'
import Chess from './Chess'
import Tracker from './Tracker'
import { getFenPosition } from './Chess'
import { Grid } from '@material-ui/core'
import FlipBoardButton from './FlipBoardButton'
import { startPos } from '../static/positions'

/**
 * Wrapper for the Board / Infobar. Handles the chessState and click-to-move.
 */
export default function Game(): JSX.Element {
  /**
   * chessState: State of the current chess instance
   * squares - 1D array of pieces that represents board
   * kingPos - [whiteKingPos, blackKingPos]
   * player - current player's turn
   * sourceSelection - pos of currently selected square
   * status - flavor text
   * lastMove - 1D array that shows last move played [sourcePos, destPos]
   * castling - [whiteLong, whiteShort, blackLong, blackShort]
   */

  const [chessState, setChessState] = React.useState(getFenPosition(startPos))
  const [boardFlipped, flipBoard] = React.useState(false)

  /**
   * movesState:
   * moveNameList - List of strings for each move played
   * moveList - List of chessStates for the state at each move played
   * selectedMove - Move currently being displayed on the board
   */
  const [movesState, setMovesState] = React.useState(
    new Tracker({
      moveNameList: new Array<string>(),
      moveList: new Array<Chess>(chessState),
      selectedMove: 0,
    }),
  )

  /**
   * lineState:
   * line - array of strings for each move in the line
   * title - displayed title in infobar
   */
  const [lineState, setLine] = React.useState<
    { line: string[]; title: string } | undefined
  >(undefined)

  /**
   * customLinesState:
   * stores the user's currently cached custom lines
   */
  const [customLinesState, setCustomLines] = React.useState<
    Array<{ line: string[]; title: string }>
  >(new Array<{ line: string[]; title: string }>())

  const handleSave = (line: string[], title: string) => {
    const newCustomLines = customLinesState.slice()
    newCustomLines.push({ line: line, title: title })
    setCustomLines(newCustomLines)
  }

  const currLine = lineState?.line

  const handleLine = (
    lineState: { line: string[]; title: string },
    startFen: string,
  ) => {
    const newChess = getFenPosition(startFen)
    setChessState(newChess)
    setLine(lineState)
    setMovesState(
      new Tracker({
        moveNameList: new Array<string>(),
        moveList: new Array<Chess>(newChess),
        selectedMove: 0,
      }),
    )
  }

  const handleUndo = () => {
    const currLen = movesState.moveNameList.length
    const newSelection = currLen === 0 ? 0 : currLen - 1
    setMovesState(
      new Tracker({
        moveNameList: movesState.getMoveNameList(currLen - 1),
        selectedMove: newSelection,
        moveList: movesState.getMoveList(currLen),
      }),
    )
    setChessState(movesState.getMoveList()[newSelection])
  }

  const handleSelection = (index: number) => {
    setMovesState(
      new Tracker({
        ...movesState,
        selectedMove: index,
      }),
    )
    setChessState(movesState.getMoveList()[index])
  }

  const handleFlip = () => {
    flipBoard(!boardFlipped)
  }

  /**
   * Handles move to move logic
   * @param i
   */
  const handleMove = React.useCallback(
    (i: number, src = -1) => {
      const squares = chessState.getSquares()
      const whiteTurn = chessState.isWhiteTurn()
      // Check if drag n drop:
      const sourceSelection = src === -1 ? chessState.sourceSelection : src

      if (sourceSelection === -1) {
        // No piece currently selected
        if (
          squares[i] === undefined ||
          squares[i]?.player !== chessState.player
        ) {
          setChessState(
            new Chess({
              ...chessState,
              status:
                'Invalid selection. Choose player ' +
                chessState.player +
                ' pieces.',
            }),
          )
        } else {
          setChessState(
            new Chess({
              ...chessState,
              status: 'Choose destination for the selected piece',
              sourceSelection: i,
            }),
          )
        }
      } else if (sourceSelection > -1) {
        // Piece is already selected
        if (
          squares[i] !== undefined &&
          squares[i]?.player === chessState.player
        ) {
          // Select a different piece
          setChessState(
            new Chess({
              ...chessState,
              status: 'Choose destination for the selected piece',
              sourceSelection: i,
            }),
          )
        } else {
          // Attempt to move piece to destination
          const isDestEnemyOccupied = squares[i] ? true : false
          const currPiece = squares[sourceSelection]
          // currPiece should never be undefined, since sourceSelection is a valid piece
          const isMovePossible = currPiece?.isMovePossible(
            sourceSelection,
            i,
            isDestEnemyOccupied,
          )

          const srcToDestPath = currPiece?.getSrcToDestPath(sourceSelection, i)
          const enPassant = chessState.isEnPassant(
            currPiece,
            sourceSelection,
            i,
          )
          const castles = chessState.isCastles(currPiece, i)

          if (
            srcToDestPath !== undefined &&
            (isMovePossible || enPassant || castles) &&
            chessState.isMoveLegal(srcToDestPath, sourceSelection, i, castles)
          ) {
            // Update fallen pieces with captured piece
            const fallenPieces = chessState.getFallenPieces()
            if (squares[i]) fallenPieces.push(squares[i]!.name)

            const newPlayer = whiteTurn ? 'black' : 'white'
            const captured = squares[i] !== undefined

            // Move piece
            squares[i] = squares[sourceSelection]

            // Update king position
            let newKingPos = chessState.kingPos
            if (squares[sourceSelection]?.name === 'K') {
              newKingPos[0] = i
            } else if (squares[sourceSelection]?.name === 'k') {
              newKingPos[1] = i
            }
            squares[sourceSelection] = undefined

            // Remove captured pawn in case of en passant
            if (enPassant) {
              const modifier = whiteTurn ? 1 : -1
              squares[i + 8 * modifier] = undefined
            }

            const newCastlingStatus = chessState.handleCastles(
              squares,
              castles,
              currPiece,
              sourceSelection,
              i,
            )

            const checkedEnemyKing = chessState.isCheck(
              squares,
              chessState.isWhiteTurn()
                ? chessState.kingPos[1]
                : chessState.kingPos[0],
              chessState.isWhiteTurn() ? 'black' : 'white',
            )

            // Update moveList
            const currMoveName = chessState.getMoveName(
              currPiece!.name,
              captured,
              newCastlingStatus.dir,
              checkedEnemyKing,
              sourceSelection,
              i,
            )

            const moveNameList = movesState.getMoveNameList(
              movesState.selectedMove,
            )
            moveNameList.push(currMoveName)

            // Make sure player has played the next correct move (when currLine !== undefined)
            const currentHalfMove = chessState.isWhiteTurn()
              ? chessState.moveNo * 2 - 2
              : chessState.moveNo * 2 - 1
            if (
              currLine === undefined ||
              currLine![currentHalfMove] === currMoveName
            ) {
              // Update chess state
              const newChessState = new Chess({
                sourceSelection: -1,
                squares: squares,
                player: newPlayer,
                status: '',
                kingPos: newKingPos,
                lastMove: [sourceSelection, i],
                castling: newCastlingStatus.newCastling,
                moveNo: !chessState.isWhiteTurn()
                  ? chessState.moveNo + 1
                  : chessState.moveNo,
                fallenPieces: fallenPieces,
              })
              setChessState(
                (prevChessState) =>
                  new Chess({
                    sourceSelection: -1,
                    squares: squares,
                    player: newPlayer,
                    status: '',
                    kingPos: newKingPos,
                    lastMove: [sourceSelection, i],
                    castling: newCastlingStatus.newCastling,
                    moveNo: !prevChessState.isWhiteTurn()
                      ? prevChessState.moveNo + 1
                      : prevChessState.moveNo,
                    fallenPieces: fallenPieces,
                  }),
              )

              // Update moves state
              const newMoveList = movesState.getMoveList(
                movesState.selectedMove,
              )
              newMoveList.push(newChessState)
              setMovesState(
                (prevMovesState) =>
                  new Tracker({
                    ...prevMovesState,
                    moveNameList: moveNameList,
                    moveList: newMoveList,
                    selectedMove: moveNameList.length,
                  }),
              )
            } else {
              setChessState(
                new Chess({
                  ...chessState,
                  status: 'Incorrect move',
                  sourceSelection: -1,
                }),
              )
            }
          } else {
            // Invalid selection
            setChessState(
              new Chess({
                ...chessState,
                status:
                  'Wrong selection. Choose valid source and destination again.',
                sourceSelection: -1,
              }),
            )
          }
        }
      }
    },
    [chessState, setChessState, movesState, setMovesState, currLine],
  )

  /**
   * Handles drag-n-drop
   * @param i
   */
  const handleDrop = (i: number, src: number) => {
    // console.log(chessState)
    handleMove(i, src)
  }

  /**
   * Handles click-to-move
   * @param i
   */
  const handleClick = (i: number) => {
    // console.log(chessState)
    handleMove(i)
  }

  return (
    <Grid
      container
      direction="row"
      justify="center"
      alignItems="flex-start"
      wrap="nowrap">
      <FlipBoardButton boardFlipped={boardFlipped} onClick={handleFlip} />
      <Board
        chessState={chessState}
        squareClick={handleClick}
        squareDrop={handleDrop}
        boardFlipped={boardFlipped}
      />
      <Infobar
        chessState={chessState}
        movesState={movesState}
        lineState={lineState}
        customLinesState={customLinesState}
        handleLine={handleLine}
        handleSelection={handleSelection}
        handleUndo={handleUndo}
        handleSave={handleSave}
      />
    </Grid>
  )
}
