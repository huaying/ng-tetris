import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import {
  NUM_ROW,
  NUM_COLUMN,
  EMPTY,
  SHADOW,
  DIR,
  DEG,
  PIECE,
  LOOP_TIME,
  GAME_STATUS
} from "./constants";

function randomItems(items) {
  return items[Math.floor(Math.random() * items.length)];
}

@Injectable({
  providedIn: 'root'
})
export class GameService {
  grid;
  gridSubject;
  status;
  statusSubject;
  timer;
  piece;
  piecePos;
  pieceDeg;

  constructor() { 
    this.status = GAME_STATUS.INIT,
    this.statusSubject = new BehaviorSubject(this.status);
    this.timer = null;
    this.grid = Array(NUM_ROW).fill(null).map(r => Array(NUM_COLUMN).fill(EMPTY));
    this.gridSubject = new BehaviorSubject(this.grid);
    this.initState();
    window.addEventListener("keydown", this.controller);
  }

  getGrid = () => {
    return this.gridSubject;
  }

  getGameStatus = () => {
    return this.statusSubject;
  }

  gameStart() {
    this.initState();
    this.status = GAME_STATUS.PLAYING;
    this.statusSubject.next(this.status);
    window.clearInterval(this.timer);
    this.timer = setInterval(this.gameLoop, LOOP_TIME);
    this.placeNewPiece();
  };

  private gameEnd = () => {
    this.status = GAME_STATUS.GAMEOVER;
    this.statusSubject.next(this.status);
    window.clearInterval(this.timer);
  };

  private initState = () => {
    this.grid = Array(NUM_ROW).fill(null).map(r => Array(NUM_COLUMN).fill(EMPTY));
    this.gridSubject.next(this.grid);
    this.piece = null;
    this.piecePos = null;
    this.pieceDeg = null;
  }

  private controller = e => {
    const { status, piece, piecePos, pieceDeg } = this;
    if (status !== GAME_STATUS.PLAYING) return;

    const DIRMap = {
      37: DIR.LEFT,
      39: DIR.RIGHT,
      40: DIR.DOWN
    };

    // Key Left, Right: move
    const direction = DIRMap[e.keyCode];
    if (direction)
      if (!this.pieceEnded(piece, piecePos, pieceDeg, direction)) {
        this.updatePiece(piece, piecePos, pieceDeg, direction);
      }

    // Key Up: rorate
    if (e.keyCode === 38) {
      this.rotatePiece(piece, piecePos, pieceDeg);
    }

    // Key Space: drop
    if (e.keyCode === 32) {
      this.dropPiece(piece, piecePos, pieceDeg);
      this.gameLoop();
      window.clearInterval(this.timer);
      this.timer = setInterval(this.gameLoop, LOOP_TIME);
    }
  }

  private gameLoop = () => {
    if (this.pieceEnded(this.piece, this.piecePos, this.pieceDeg, DIR.DOWN)) {
      this.lineCleanCheck();
      this.placeNewPiece();
    } else {
      this.updatePiece(this.piece, this.piecePos, this.pieceDeg, DIR.DOWN);
    }
  };

  private getDropDist = (piece, position, degree) => {
    const positions = this.getPiecePositions(piece, position, degree);
    let dist = 0;
    let next = 0;

    const shouldEnded = ([i, j]) => {
      return (
        i + next >= NUM_ROW ||
        (!positions.map(p => p.toString()).includes([i + next, j].toString()) &&
          !this.cellEmpty(this.grid[i + next][j]))
      );
    };

    while (true) {
      next = dist + 1;
      const end = positions.some(shouldEnded);
      if (!end) dist += 1;
      else break;
    }
    return dist;
  };

  private dropPiece = (piece, position, degree) => {
    const dist = this.getDropDist(piece, position, degree);
    this.updatePiece(piece, position, degree, [dist, 0]);
  };

  private rotatePiece = (piece, position, degree, cb = () => {}) => {
    const newGrid = [...this.grid];
    const nextDeg = (degree + 1) % Object.keys(DEG).length;
    const positions = this.getPiecePositions(piece, position, degree);
    const [newPosition, newPositions] = this.getTunedPositions(
      piece,
      position,
      nextDeg
    );

    if (
      !newPositions.some(
        ([i, j]) =>
          !positions.map(p => p.toString()).includes([i, j].toString()) &&
          !this.cellEmpty(newGrid[i][j])
      )
    ) {
      positions.forEach(([i, j]) => (newGrid[i][j] = EMPTY));
      newPositions.forEach(([i, j]) => (newGrid[i][j] = piece));
    
      this.piecePos = newPosition;
      this.pieceDeg = nextDeg;
      this.grid = newGrid;
      this.updateShadow(this.piece, this.piecePos, this.pieceDeg);
    } 
    cb();
  };

  private getTunedPositions = (piece, position, degree) => {
    let positions = null;
    let prev_pos = [];
    while (true) {
      if (prev_pos.toString() === position.toString()) break;
      prev_pos = [...position];
      positions = this.getPiecePositions(piece, position, degree);
      for (let idx = 0; idx < positions.length; idx++) {
        const [i, j] = positions[idx];
        if (i < 0) position = [position[0] + 1, position[1]];
        if (i >= NUM_ROW) position = [position[0] - 1, position[1]];
        if (j < 0) position = [position[0], position[1] + 1];
        if (j >= NUM_COLUMN) position = [position[0], position[1] - 1];
      }
    }
    return [position, positions];
  };

  private pieceEnded = (piece, position, degree, direction) => {
    const [x, y] = direction;
    const positions = this.getPiecePositions(piece, position, degree);
    return positions.some(
      ([i, j]) =>
        i + x < 0 ||
        i + x >= NUM_ROW ||
        j + y < 0 ||
        j + y >= NUM_COLUMN ||
        (!positions
          .map(p => p.toString())
          .includes([i + x, j + y].toString()) &&
          !this.cellEmpty(this.grid[i + x][j + y]))
    );
  }

  private cellEmpty = v => v === EMPTY || v === SHADOW;

  private lineCleanCheck = () => {
    const lines = this.grid.filter(
      line =>
        line.some(cell => !this.cellEmpty(cell)) &&
        !line.every(cell => !this.cellEmpty(cell))
    );

    const newGrid = Array(NUM_ROW)
      .fill(null)
      .map(e => Array(NUM_COLUMN).fill(EMPTY));

    let newGridLineIdx = NUM_ROW - 1;
    lines.reverse().forEach(line => {
      newGrid[newGridLineIdx--] = [...line];
    });

    this.grid = newGrid;
    // notify component cuz we reassign a new grid to this.grid.
    this.gridSubject.next(this.grid);
  };
  
  private placeNewPiece = () => {
    const piece = randomItems(Object.keys(PIECE));
    const shift = Math.floor((NUM_COLUMN - 1) / 2);
    const positions = this.getPiecePositions(piece, [0, shift], DEG.ZERO);
    if (positions.every(([i, j]) => this.cellEmpty(this.grid[i][j]))) {
      this.updatePiece(piece, [0, shift], DEG.ZERO, [0, 0]);
      this.updateShadow(this.piece, this.piecePos, this.pieceDeg);
    } else {
      const newGrid = [...this.grid];
      const backupPosistions = positions.map(([i, j]) => [i - 1, j]);
      if (!backupPosistions.some(([i, j]) => i >= 0 && this.grid[i][j] !== EMPTY)) {
        backupPosistions.forEach(([i, j]) => {
          if (i >= 0) newGrid[i][j] = piece;
        });
      }
      this.grid = newGrid;
      this.gameEnd();
    }
  }

  private getPiecePositions = (piece, position, degree) => {
    return PIECE[piece].shape[degree].map(([i, j]) => [
      i + position[0],
      j + position[1]
    ]);
  };

  private updatePiece = (piece, position, degree, direction) => {
    const [x, y] = direction;
    const newGrid = [...this.grid];
    const positions = this.getPiecePositions(piece, position, degree);

    positions.forEach(([i, j]) => (newGrid[i][j] = EMPTY));
    positions.forEach(([i, j]) => (newGrid[i + x][j + y] = piece));

    this.piece = piece;
    this.pieceDeg = degree;
    this.piecePos = [position[0] + x, position[1] + y];
    this.grid = newGrid;
    this.updateShadow(this.piece, this.piecePos, this.pieceDeg);
  }

  private updateShadow = (piece, position, degree) => {
    const newGrid = [...this.grid];
    const positions = this.getPiecePositions(piece, position, degree);

    newGrid.forEach((row, i) =>
      row.forEach((unit, j) => {
        if (unit === SHADOW) newGrid[i][j] = EMPTY;
      })
    );

    const dist = this.getDropDist(piece, position, degree);
    positions.forEach(([i, j]) => {
      if (
        !positions.map(p => p.toString()).includes([i + dist, j].toString())
      ) {
        newGrid[i + dist][j] = SHADOW;
      }
    });

    this.grid = newGrid;
  };

}
