export type CellStatus = 'empty' | 'hit' | 'miss' | 'ship';

export interface Cell {
  x: number;
  y: number;
  status: CellStatus;
}