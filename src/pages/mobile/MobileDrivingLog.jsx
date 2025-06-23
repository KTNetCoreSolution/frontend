import React from 'react';

const MobileDrivingLog = () => {
  return (
    <div className="container-fluid p-0">
      <header className="bg-primary text-white p-3">
        <h1 className="h5 mb-0">운행일지</h1>
      </header>
      <div className="p-3">
        <div className="card">
          <div className="card-body">
            <h5 className="card-title">운행일지 조회</h5>
            <p className="card-text">여기에 운행일지 관련 콘텐츠가 표시됩니다.</p>
            <ul className="list-group list-group-flush">
              <li className="list-group-item">운행 ID: DL001</li>
              <li className="list-group-item">날짜: 2025-05-20</li>
              <li className="list-group-item">차량: 트럭 A</li>
              <li className="list-group-item">거리: 150km</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileDrivingLog;