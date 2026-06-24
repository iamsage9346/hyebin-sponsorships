export type ColumnType = "text" | "number" | "date" | "select";

export type TagColor =
  | "pink"
  | "khaki"
  | "red"
  | "yellow"
  | "green"
  | "gray";

export interface SelectOption {
  value: string;
  color: TagColor;
}

export interface Column {
  key: string;
  label: string;
  type: ColumnType;
  options?: SelectOption[];
  width: number;
}

export type CellValue = string | number | null;

export interface Row {
  id: string;
  [key: string]: CellValue;
}

export interface SheetData {
  columns: Column[];
  rows: Row[];
}

/** 이름이 있는 하나의 시트 */
export interface Sheet extends SheetData {
  id: string;
  name: string;
  /** 행 id별 높이(px). 없으면 기본 높이 */
  rowHeights?: Record<string, number>;
}

/** 여러 시트를 담는 워크스페이스 */
export interface Workspace {
  sheets: Sheet[];
  activeId: string;
}

/** 컬럼별 필터 상태 */
export interface FilterState {
  /** select 컬럼: 선택된 옵션 값들 (비어있으면 전체) */
  selected: Record<string, string[]>;
  /** text/date 컬럼: 포함 검색어 */
  search: Record<string, string>;
  /** number 컬럼: 최소/최대 범위 */
  range: Record<string, { min: number | null; max: number | null }>;
}

export interface SortState {
  key: string;
  dir: "asc" | "desc";
}
