import * as XLSX from "xlsx";

/**
 * Tabulator 테이블 데이터를 엑셀 파일로 다운로드하는 함수
 * @param {Object} tableInstance - Tabulator 테이블 인스턴스 (Tabulator 객체)
 * @param {string} tableStatus - 테이블 상태 ("initializing", "ready", "error")
 * @param {string} [fileName="table_data.xlsx"] - 다운로드될 엑셀 파일 이름 (기본값: table_data.xlsx)
 * @param {string} [sheetName="Sheet1"] - 엑셀 시트 이름 (기본값: Sheet1)
 */
export const handleDownloadExcel = (
  tableInstance,
  tableStatus,
  fileName = "table_data.xlsx",
  sheetName = "Sheet1"
) => {
  // 테이블 인스턴스와 상태 검증
  // tableInstance가 없거나 상태가 "ready"가 아니면 실행 중단
  if (!tableInstance || tableStatus !== "ready") {
    console.error("Table instance not ready:", tableInstance, tableStatus);
    return;
  }

  try {
    // 테이블에서 현재 데이터 가져오기
    const data = tableInstance.getData();
    // 데이터가 없거나 빈 배열이면 경고 후 중단
    if (!data || data.length === 0) {
      console.warn("No data available to download");
      return;
    }

    // 테이블의 컬럼 정의 가져오기
    const columns = tableInstance.getColumns();
    // 컬럼 제목 배열 생성 (예: ["ID", "이름", "나이", "상태"])
    const headers = columns.map(col => col.getDefinition().title);
    // 필드명 배열 생성 (예: ["id", "name", "age", "status"])
    const fields = columns.map(col => col.getField());

    // 엑셀용 2D 배열 생성
    // 첫 번째 행은 헤더(컬럼 제목), 이후 행은 데이터
    const aoaData = [
      headers, // 헤더 행 추가
      ...data.map(row => fields.map(field => row[field])), // 데이터 행 변환
    ];

    // 2D 배열을 워크시트로 변환
    const worksheet = XLSX.utils.aoa_to_sheet(aoaData);
    // 새 워크북 생성
    const workbook = XLSX.utils.book_new();
    // 워크시트를 워크북에 추가
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    // 엑셀 파일로 다운로드
    XLSX.writeFile(workbook, fileName);
  } catch (err) {
    // 다운로드 중 예외 발생 시 에러 로깅
    console.error("Excel download failed:", err);
  }
};