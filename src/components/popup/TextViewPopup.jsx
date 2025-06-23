import React from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import styles from './TextViewPopup.module.css';

const TextViewPopup = ({ textContent, fileName, onClose }) => {
  return (
    <Modal show={true} onHide={onClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{fileName}</Modal.Title>
      </Modal.Header>
      <Modal.Body className={styles.textModalBody}>
        <pre className={styles.textContent}>
          {textContent || '내용을 불러오는 중 오류가 발생했습니다.'}
        </pre>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={onClose}>
          닫기
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default TextViewPopup;