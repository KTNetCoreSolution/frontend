import React from "react";
import styles from "./TableSearch.module.css";

const TableTitle = ({ rowCount }) => {
  return (
    <div className='tableTitleRow'>
      <div className='tableTitle'>
        <span className='resultText'>결과 (</span>
        <span className='rowCountText'>{rowCount} Rows</span>
        <span className='resultText'>)</span>
      </div>
    </div>
  );
};

export default TableTitle;