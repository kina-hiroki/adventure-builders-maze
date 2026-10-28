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
  solutionVia?: string[]; // 正解ルートが順に通る区画。省略時は入口から出口への最短経路。
  solutionCenters?: Record<string, Point>; // 広がった通路などに合わせる描画上の通過位置。
  solution: string[];
}
