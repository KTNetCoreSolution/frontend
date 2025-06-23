/**
 * Tabulator 트리 데이터를 재귀적으로 순회하며 특정 데이터를 업데이트하는 함수
 * @param {Array} data - 트리 데이터 배열 (부모 및 자식 계층 포함)
 * @param {String} seqKey - 대상 노드를 식별하기 위한 seq 속성 이름
 * @param {String} targetSeq - 업데이트할 행의 seq 값 (기준 값)
 * @param {String} selectKey - 업데이트할 대상 속성(컬럼) 이름
 * @param {String|Number} newSelectValue - 업데이트할 select 필드의 새로운 값
 * @returns {Array} - 업데이트된 트리 데이터 배열
 */
export const updateChildrenRecursive = (data, seqKey, targetSeq, selectKey, newSelectValue) => {
    return data.map(row => {
        const updatedRow = {
            ...row,
            [selectKey]: row[seqKey] === targetSeq ? newSelectValue : "N", // 클릭된 데이터만 지정된 값으로 변경, 나머지는 "N"
        };

        if (row._children) {
            updatedRow._children = updateChildrenRecursive(row._children, seqKey, targetSeq, selectKey, newSelectValue);
        }

        return updatedRow;
    });
};
