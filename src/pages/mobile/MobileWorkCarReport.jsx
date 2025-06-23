import React from 'react';

const MobileWorkCarReport = () => {
  return (
    <div className="container-fluid p-0">
      <header className="bg-primary text-white p-3">
        <h1 className="h5 mb-0">고소차 작업일보</h1>
      </header>
      <div className="p-3">
        <div className="card">
          <div className="card-body">
            <h5 className="card-title">고소차 작업일보</h5>
            <p className="card-text">여기에 고소차 작업일보 콘텐츠가 표시됩니다.</p>
            <ul className="list-group list-group-flush">
              <li className="list-group-item">보고서 ID: WCR001</li>
              <li className="list-group-item">작업 날짜: 2025-05-20</li>
              <li className="list-group-item">장비: 고소차 B</li>
              <li className="list-group-item">작업 시간: 4시간</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileWorkCarReport;