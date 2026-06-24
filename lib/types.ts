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

/** 컬럼별 필터 상태 */
export interface FilterState {
  /** select 컬럼: 선택된 옵션 값들 (비어있으면 전체) */
  selected: Record<string, string[]>;
  /** text/number/date 컬럼: 포함 검색어 */
  search: Record<string, string>;
}

export interface SortState {
  key: string;
  dir: "asc" | "desc";
}
