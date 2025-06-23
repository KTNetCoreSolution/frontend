import React from 'react';

const MobileCarReservation = () => {
  return (
    <div className="container-fluid p-0">
      <header className="bg-primary text-white p-3">
        <h1 className="h5 mb-0">차량예약</h1>
      </header>
      <div className="p-3">
        <div className="card">
          <div className="card-body">
            <h5 className="card-title">차량 예약</h5>
            <p className="card-text">여기에 차량 예약 콘텐츠가 표시됩니다.</p>
            <ul className="list-group list-group-flush">
              <li className="list-group-item">예약 ID: CR001</li>
              <li className="list-group-item">차량: 세단 C</li>
              <li className="list-group-item">예약 날짜: 2025-05-21</li>
              <li className="list-group-item">상태: 예약됨</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileCarReservation;