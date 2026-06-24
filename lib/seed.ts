import type { Column, Row, SheetData } from "./types";

export const COLUMNS: Column[] = [
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

type SeedRow = Omit<Row, "id">;

const SEED_ROWS: SeedRow[] = [
  { brand: "VOVA", contentType: "릴스", draftDate: "6월 1", uploadDate: "6월 4", status: "업로드완료", paymentStatus: "미입금", product: "보조배터리" },
  { brand: "폴리오", contentType: "릴스", draftDate: "5월 26", uploadDate: "6월 5", status: "업로드완료", paymentStatus: "미입금", product: "어깨 마사지기" },
  { brand: "달리프", contentType: "릴스", draftDate: "", uploadDate: "6월 6", status: "업로드완료", paymentStatus: "미입금", product: "헤어젤" },
  { brand: "끌리메", contentType: "릴스", draftDate: "6월 3", uploadDate: "6월 8", status: "업로드완료", paymentStatus: "미입금", product: "디바이스" },
  { brand: "위글리", contentType: "릴스", draftDate: "6월 11", uploadDate: "6월 13", status: "업로드완료", paymentStatus: "미입금", product: "클렌징 디바이스" },
  { brand: "니아르", contentType: "릴스", draftDate: "", uploadDate: "6월 12", status: "업로드완료", paymentStatus: "미입금", product: "붓기캔디" },
  { brand: "햄킹(사진)", contentType: "피드", draftDate: "6월 5", uploadDate: "6월 10", status: "업로드완료", paymentStatus: "미입금", product: "하이볼" },
  { brand: "메라블", contentType: "릴스", draftDate: "6월 10", uploadDate: "6월 12", status: "업로드완료", paymentStatus: "미입금", product: "모공 앰플 + 크림" },
  { brand: "피지오겔", contentType: "릴스", draftDate: "", uploadDate: "", status: "미촬영", paymentStatus: "미입금", product: "로지테카 세럼" },
  { brand: "프란츠", contentType: "릴스", draftDate: "6월 9", uploadDate: "6월 11", status: "업로드완료", paymentStatus: "미입금", product: "선팟" },
  { brand: "햄킹(릴스)", contentType: "릴스", draftDate: "", uploadDate: "6월 20", status: "미촬영", paymentStatus: "미입금", product: "하이볼" },
  { brand: "메디테라피", contentType: "릴스", draftDate: "6월 21", uploadDate: "6월 25", status: "미촬영", paymentStatus: "미입금", product: "아하바하롱롱패드" },
  { brand: "티르티르", contentType: "피드", draftDate: "", uploadDate: "6월 19", status: "미촬영", paymentStatus: "미입금", product: "쿠션 세트" },
  { brand: "브링그린", contentType: "릴스", draftDate: "6월 18", uploadDate: "6월 20", status: "편집완료", paymentStatus: "미입금", product: "티트리 수딩젤+패드" },
  { brand: "이옴", contentType: "릴스", draftDate: "6월 25", uploadDate: "6월 26", status: "미촬영", paymentStatus: "미입금", product: "트러블 패치 마스크" },
  { brand: "이니스프리", contentType: "릴스", draftDate: "6월 22", uploadDate: "6월 29", status: "미촬영", paymentStatus: "미입금", product: "레티놀 세럼" },
  { brand: "더마토리", contentType: "릴스", draftDate: "", uploadDate: "7월 1", status: "미촬영", paymentStatus: "미입금", product: "담곰이 에디션 3종" },
  { brand: "네시픽", contentType: "릴스", draftDate: "", uploadDate: "6월 29", status: "미촬영", paymentStatus: "미입금", product: "짜서쓰는 클렌징밤" },
];

function makeId(i: number): string {
  return `seed-${i}-${i.toString(36)}`;
}

export function buildSeedData(): SheetData {
  const rows: Row[] = SEED_ROWS.map((r, i) => {
    const row: Row = { id: makeId(i) };
    for (const col of COLUMNS) {
      const v = r[col.key];
      row[col.key] = v === undefined ? null : v;
    }
    return row;
  });
  return { columns: COLUMNS, rows };
}
