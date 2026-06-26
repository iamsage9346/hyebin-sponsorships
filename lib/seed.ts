import type { Column, Row, SheetData } from "./types";

/** 기본으로 열어두는 행·열 개수 (스프레드시트처럼 스크롤) */
export const TOTAL_ROWS = 50;
export const TOTAL_COLS = 50;

const NAMED_COLUMNS: Column[] = [
  { key: "adDate", label: "광고 날짜", type: "date", width: 110 },
  { key: "brand", label: "브랜드", type: "text", width: 130 },
  {
    key: "contentType",
    label: "콘텐츠 종류",
    type: "select",
    width: 110,
    options: [
      { value: "릴스", color: "pink" },
      { value: "피드", color: "khaki" },
    ],
  },
  { key: "adFee", label: "광고비", type: "number", width: 110 },
  { key: "draftDate", label: "초안전달", type: "date", width: 100 },
  { key: "uploadDate", label: "업로드", type: "date", width: 100 },
  { key: "paymentDate", label: "입금일", type: "date", width: 100 },
  {
    key: "status",
    label: "진행상태",
    type: "select",
    width: 110,
    options: [
      { value: "미촬영", color: "red" },
      { value: "편집완료", color: "yellow" },
      { value: "업로드완료", color: "green" },
    ],
  },
  {
    key: "paymentStatus",
    label: "입금상태",
    type: "select",
    width: 100,
    options: [
      { value: "미입금", color: "red" },
      { value: "입금완료", color: "green" },
    ],
  },
  { key: "product", label: "상품명", type: "text", width: 180 },
  { key: "note", label: "비고", type: "text", width: 160 },
];

/** 스프레드시트 컬럼 문자 (A, B, ... Z, AA ...) */
function colLetter(index: number): string {
  let n = index + 1;
  let s = "";
  while (n > 0) {
    n--;
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }
  return s;
}

/** 이름이 정해진 컬럼 뒤에 빈 텍스트 컬럼을 채워 총 TOTAL_COLS개로 만든다 */
const EXTRA_COLUMNS: Column[] = Array.from(
  { length: Math.max(0, TOTAL_COLS - NAMED_COLUMNS.length) },
  (_, i): Column => {
    const index = NAMED_COLUMNS.length + i;
    return { key: `c${index}`, label: colLetter(index), type: "text", width: 90 };
  },
);

export const COLUMNS: Column[] = [...NAMED_COLUMNS, ...EXTRA_COLUMNS];

type SeedRow = Omit<Row, "id">;

const SEED_ROWS: SeedRow[] = [
  { brand: "VOVA", contentType: "릴스", draftDate: "2026.06.01", uploadDate: "2026.06.04", status: "업로드완료", paymentStatus: "미입금", product: "보조배터리" },
  { brand: "폴리오", contentType: "릴스", draftDate: "2026.05.26", uploadDate: "2026.06.05", status: "업로드완료", paymentStatus: "미입금", product: "어깨 마사지기" },
  { brand: "달리프", contentType: "릴스", draftDate: "", uploadDate: "2026.06.06", status: "업로드완료", paymentStatus: "미입금", product: "헤어젤" },
  { brand: "끌리메", contentType: "릴스", draftDate: "2026.06.03", uploadDate: "2026.06.08", status: "업로드완료", paymentStatus: "미입금", product: "디바이스" },
  { brand: "위글리", contentType: "릴스", draftDate: "2026.06.11", uploadDate: "2026.06.13", status: "업로드완료", paymentStatus: "미입금", product: "클렌징 디바이스" },
  { brand: "니아르", contentType: "릴스", draftDate: "", uploadDate: "2026.06.12", status: "업로드완료", paymentStatus: "미입금", product: "붓기캔디" },
  { brand: "햄킹(사진)", contentType: "피드", draftDate: "2026.06.05", uploadDate: "2026.06.10", status: "업로드완료", paymentStatus: "미입금", product: "하이볼" },
  { brand: "메라블", contentType: "릴스", draftDate: "2026.06.10", uploadDate: "2026.06.12", status: "업로드완료", paymentStatus: "미입금", product: "모공 앰플 + 크림" },
  { brand: "피지오겔", contentType: "릴스", draftDate: "", uploadDate: "", status: "미촬영", paymentStatus: "미입금", product: "로지테카 세럼" },
  { brand: "프란츠", contentType: "릴스", draftDate: "2026.06.09", uploadDate: "2026.06.11", status: "업로드완료", paymentStatus: "미입금", product: "선팟" },
  { brand: "햄킹(릴스)", contentType: "릴스", draftDate: "", uploadDate: "2026.06.20", status: "미촬영", paymentStatus: "미입금", product: "하이볼" },
  { brand: "메디테라피", contentType: "릴스", draftDate: "2026.06.21", uploadDate: "2026.06.25", status: "미촬영", paymentStatus: "미입금", product: "아하바하롱롱패드" },
  { brand: "티르티르", contentType: "피드", draftDate: "", uploadDate: "2026.06.19", status: "미촬영", paymentStatus: "미입금", product: "쿠션 세트" },
  { brand: "브링그린", contentType: "릴스", draftDate: "2026.06.18", uploadDate: "2026.06.20", status: "편집완료", paymentStatus: "미입금", product: "티트리 수딩젤+패드" },
  { brand: "이옴", contentType: "릴스", draftDate: "2026.06.25", uploadDate: "2026.06.26", status: "미촬영", paymentStatus: "미입금", product: "트러블 패치 마스크" },
  { brand: "이니스프리", contentType: "릴스", draftDate: "2026.06.22", uploadDate: "2026.06.29", status: "미촬영", paymentStatus: "미입금", product: "레티놀 세럼" },
  { brand: "더마토리", contentType: "릴스", draftDate: "", uploadDate: "2026.07.01", status: "미촬영", paymentStatus: "미입금", product: "담곰이 에디션 3종" },
  { brand: "네시픽", contentType: "릴스", draftDate: "", uploadDate: "2026.06.29", status: "미촬영", paymentStatus: "미입금", product: "짜서쓰는 클렌징밤" },
];

function makeId(i: number): string {
  return `seed-${i}-${i.toString(36)}`;
}

/** 모든 컬럼 키를 가진 빈 행 */
function blankRow(id: string): Row {
  const row: Row = { id };
  for (const col of COLUMNS) row[col.key] = null;
  return row;
}

export function buildSeedData(): SheetData {
  const rows: Row[] = [];
  for (let i = 0; i < TOTAL_ROWS; i++) {
    const seed = SEED_ROWS[i];
    const row = blankRow(makeId(i));
    if (seed) {
      for (const col of COLUMNS) {
        const v = seed[col.key];
        if (v !== undefined) row[col.key] = v;
      }
    }
    rows.push(row);
  }
  return { columns: COLUMNS, rows };
}
