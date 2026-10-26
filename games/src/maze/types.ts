export type Point = readonly [number, number];
export type Wall = { from: Point; to: Point };
export interface QuizPanel {
  cell: string;
  edge: 'top';
  symbol: '〇' | '✕';
  color: string;
}

export interface MazePlan {
  id: string;
  name: string;
  columns: number;
  rows: number;
  cellSize: number;
  wallHeight: number;
  entry: string;
  exit: string;
  source: string;
  sourceSha256: string;
  addedWalls: string[];
  walls: Wall[];
  quizPanels: QuizPanel[];
  solution: string[];
}
