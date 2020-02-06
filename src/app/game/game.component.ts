import { Component, OnInit } from '@angular/core';

import { GameService } from '../game.service';

import {
  GAME_STATUS,
  BLOCK
} from "../constants";

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss']
})
export class GameComponent implements OnInit {
  readonly BLOCK = BLOCK;
  readonly GAME_STATUS = GAME_STATUS;
  grid;
  gameStatus;

  constructor(private gameService: GameService) { }

  ngOnInit() {
    this.getGrid();
    this.getGameStatus();
  }

  getGrid() {
    this.gameService.getGrid().subscribe(grid => this.grid = grid);
  }

  getGameStatus() {
    this.gameService.getGameStatus().subscribe(status => this.gameStatus = status);
  }

  gameStart() {
    this.gameService.gameStart();
  }
}
