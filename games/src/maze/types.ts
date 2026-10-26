export type Point = readonly [number, number];
export type Wall = { from: Point; to: Point };
export interface QuizWall {
  cell: string;
  edge: 'top';
  span?: readonly [number, number]; // 上辺内の位置（0〜1）。省略時は上辺全体。
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
  quizWalls: QuizWall[];
  solution: string[];
}
