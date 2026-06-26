import type { Row, Sheet, Workspace } from "./types";
import { COLUMNS, TOTAL_ROWS } from "./seed";
import { cloneColumns } from "./storage";

type MockRow = Omit<Row, "id">;

// 데모(admin)용 가짜 데이터 — 실제 협찬 정보가 아님.
const MOCK_ROWS: MockRow[] = [
  { brand: "샘플뷰티", contentType: "릴스", adFee: 500000, draftDate: "2026.06.02", uploadDate: "2026.06.04", status: "업로드완료", paymentStatus: "입금완료", product: "샘플 세럼" },
  { brand: "테스트랩", contentType: "피드", adFee: 300000, draftDate: "2026.06.05", uploadDate: "2026.06.07", status: "업로드완료", paymentStatus: "미입금", product: "데모 토너" },
  { brand: "목업코스메틱", contentType: "릴스", adFee: 700000, draftDate: "2026.06.10", uploadDate: "2026.06.12", status: "업로드완료", paymentStatus: "입금완료", product: "예시 크림" },
  { brand: "프리뷰푸드", contentType: "릴스", adFee: 250000, draftDate: "", uploadDate: "2026.06.15", status: "편집완료", paymentStatus: "미입금", product: "데모 간식" },
  { brand: "데모리빙", contentType: "피드", adFee: 400000, draftDate: "2026.06.18", uploadDate: "2026.06.20", status: "미촬영", paymentStatus: "미입금", product: "샘플 디퓨저" },
  { brand: "예시패션", contentType: "릴스", adFee: 600000, draftDate: "2026.06.22", uploadDate: "2026.06.25", status: "미촬영", paymentStatus: "미입금", product: "목업 가디건" },
  { brand: "테스트테크", contentType: "릴스", adFee: 900000, draftDate: "2026.06.28", uploadDate: "2026.07.01", status: "미촬영", paymentStatus: "미입금", product: "데모 이어폰" },
  { brand: "샘플카페", contentType: "피드", adFee: 200000, draftDate: "", uploadDate: "2026.07.03", status: "미촬영", paymentStatus: "미입금", product: "예시 원두" },
  { brand: "목업뷰티", contentType: "릴스", adFee: 550000, draftDate: "2026.07.05", uploadDate: "2026.07.08", status: "미촬영", paymentStatus: "미입금", product: "데모 마스크팩" },
  { brand: "프리뷰핏", contentType: "릴스", adFee: 350000, draftDate: "", uploadDate: "2026.07.10", status: "미촬영", paymentStatus: "미입금", product: "샘플 단백질바" },
];

function blankRow(id: string): Row {
  const row: Row = { id };
  for (const col of COLUMNS) row[col.key] = null;
  return row;
}

/** admin(데모) 모드용 mock 워크스페이스 */
export function buildMockWorkspace(): Workspace {
  const rows: Row[] = [];
  for (let i = 0; i < TOTAL_ROWS; i++) {
    const m = MOCK_ROWS[i];
    const row = blankRow(`mock-${i}`);
    if (m) for (const col of COLUMNS) {
      if (m[col.key] !== undefined) row[col.key] = m[col.key]!;
    }
    rows.push(row);
  }
  const sheet: Sheet = {
    id: "mock-sheet",
    name: "데모 (mock)",
    columns: cloneColumns(COLUMNS),
    rows,
  };
  return { sheets: [sheet], activeId: sheet.id };
}
