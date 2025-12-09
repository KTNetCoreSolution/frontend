import * as XLSX from "xlsx";

/**
 * Tabulator 테이블 데이터를 엑셀 파일로 다운로드하는 함수
 * @param {Object} tableInstance - Tabulator 테이블 인스턴스 (Tabulator 객체)
 * @param {string} tableStatus - 테이블 상태 ("initializing", "ready", "error")
 * @param {string} [fileName="table_data.xlsx"] - 다운로드될 엑셀 파일 이름 (기본값: table_data.xlsx)
 * @param {string} [sheetName="Sheet1"] - 엑셀 시트 이름 (기본값: Sheet1)
 * @param {boolean} [includeHiddenColumns=false] - 숨겨진 컬럼 포함 여부 (기본값: false)
 */
export const handleDownloadExcel = (
  tableInstance,
  tableStatus,
  fileName = "table_data.xlsx",
  sheetName = "Sheet1",
  includeHiddenColumns = false
) => {
  // 테이블 인스턴스와 상태 검증
  if (!tableInstance || tableStatus !== "ready") {
    console.error("Table instance not ready:", tableInstance, tableStatus);
    return;
  }

  try {
    // 테이블에서 현재 데이터 가져오기
    const data = tableInstance.getData();
    if (!data || data.length === 0) {
      console.warn("No data available to download");
      return;
    }

    // 테이블의 컬럼 정의 가져오기
    const columns = tableInstance.getColumns();
    // 표시된 컬럼만 필터링 또는 모든 컬럼 사용
    const filteredColumns = includeHiddenColumns
      ? columns
      : columns.filter(col => col.isVisible());
    // 컬럼 제목 배열 생성
    const headers = filteredColumns.map(col => col.getDefinition().title);
    // 필드명 배열 생성
    const fields = filteredColumns.map(col => col.getField());

    // 엑셀용 2D 배열 생성
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
    console.error("Excel download failed:", err);
  }
};

/**
 * Tabulator 테이블 데이터를 엑셀 파일로 다운로드하는 함수(숨겨진 필드 사용)
 * @param {Object} tableInstance - Tabulator 테이블 인스턴스 (Tabulator 객체)
 * @param {string} tableStatus - 테이블 상태 ("initializing", "ready", "error")
 * @param {string} [fileName="table_data.xlsx"] - 다운로드될 엑셀 파일 이름 (기본값: table_data.xlsx)
 * @param {Array} visibleColumns - 엑셀에 포함할 숨겨진 필드명
 * @param {string} [sheetName="Sheet1"] - 엑셀 시트 이름 (기본값: Sheet1)
 */
export const handleDownloadExcel2 = (
  tableInstance,
  tableStatus,
  fileName = "table_data.xlsx",
  visibleColumns = [],
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
    
    visibleColumns.forEach((Column) => {
      const isVisible = Column.includes('|Y');
      const columnName = Column.split('|')[0];
      
      if (isVisible) {
        tableInstance.showColumn(columnName);
      } else {
        tableInstance.hideColumn(columnName);
      } 
    });

    // 테이블의 컬럼 정의 가져오기
    const columns = tableInstance.getColumns().filter(col => col.isVisible());
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
  } finally {    
    visibleColumns.forEach((Column) => {
      const isVisible = Column.includes('|Y');
      const columnName = Column.split('|')[0];

      if (isVisible) {
        tableInstance.hideColumn(columnName);
      } else {
        tableInstance.showColumn(columnName);
      }       
    });
  }
};

/**
 * 컬럼별 소수점 제어 + 숨긴 컬럼 포함 옵션
 */
export const handleDownloadExcelWithCustomDecimals = (
  tableInstance,
  tableStatus,
  fileName = "table_data.xlsx",
  sheetName = "Sheet1",
  intColumns = [],
  oneDecimalColumns = [],
  twoDecimalColumns = [],
  includeHiddenColumns = false
) => {
  if (!tableInstance || tableStatus !== "ready") {
    console.error("Table instance not ready:", tableInstance, tableStatus);
    return;
  }

  try {
    const data = tableInstance.getData();
    if (!data || data.length === 0) {
      console.warn("No data available to download");
      return;
    }

    // 보이는 컬럼만 또는 모두 선택
    const columns = includeHiddenColumns
      ? tableInstance.getColumns()
      : tableInstance.getColumns().filter(col => col.isVisible());

    const headers = columns.map(col => col.getDefinition().title || '');
    const fields = columns.map(col => col.getField());

    // 숫자 컬럼 맵핑
    const decimalMap = {};
    intColumns.forEach(f => decimalMap[f] = 0);
    oneDecimalColumns.forEach(f => decimalMap[f] = 1);
    twoDecimalColumns.forEach(f => decimalMap[f] = 2);
    const numberFields = new Set([...intColumns, ...oneDecimalColumns, ...twoDecimalColumns]);

    // 헤더 행
    const headerRow = headers.map(h => ({ v: h, t: 's' })); // 무조건 텍스트

    // 데이터 행들 (aoa 형식으로 직접 구성)
    const dataRows = data.map(row => {
      return fields.map(field => {
        let value = row[field] ?? '';
        let cell = { v: value };

        // 숫자 컬럼 처리
        if (numberFields.has(field)) {
          const num = parseFloat(value);
          if (!isNaN(num) && value !== '' && value !== null) {
            const decimals = decimalMap[field] || 0;
            cell.t = 'n';
            cell.z = decimals > 0 ? `0.${'0'.repeat(decimals)}` : '0';
            cell.v = Number(num.toFixed(decimals));
          } else {
            cell.t = 's';
            cell.v = String(value);
          }
        } else {
          cell.t = 's';
          cell.v = String(value);
        }
        return cell;
      });
    });

    // 최종 aoa 데이터: [헤더, ...데이터]
    const aoa = [headerRow, ...dataRows];

    // 워크시트 생성
    const worksheet = XLSX.utils.aoa_to_sheet(aoa);

    // 컬럼 너비 설정
    worksheet['!cols'] = headers.map(h => ({
      wch: Math.max(h.length, 12)
    }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, fileName);

  } catch (err) {
    console.error("Excel download failed:", err);
  }
};