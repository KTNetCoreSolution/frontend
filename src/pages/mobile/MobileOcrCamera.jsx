import { useState, useEffect, useRef } from 'react';
/* tesseract.js 카메라 라이브러리 사용 시 npm install tesseract.js@6.0.1 로 설치 후 사용할 것
import { createWorker } from 'tesseract.js';

const MobileOcrCamera = ({ onSuccess, onClose }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const canvasContextRef = useRef(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [opencvLoaded, setOpencvLoaded] = useState(false);

  useEffect(() => {
    // OpenCV가 이미 로드되어 있으면 바로 사용 (중복 로드 방지)
    if (window.cv && cv.getBuildInformation) {
      setOpencvLoaded(true);
      return;
    }

    // 아직 로드되지 않았다면 한 번만 로드
    const script = document.createElement('script');
    script.src = 'https://docs.opencv.org/5.x/opencv.js';
    script.async = true;
    script.onload = () => {
      cv['onRuntimeInitialized'] = () => {
        console.log('OpenCV.js 로드 완료');
        setOpencvLoaded(true);
      };
    };
    script.onerror = () => {
      setErrorMessage('OpenCV 로드 실패');
    };
    document.body.appendChild(script);

    // 카메라 실행
    navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'environment' } 
    }).then(stream => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    }).catch(() => {
      setErrorMessage('카메라에 접근할 수 없습니다.');
    });

    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (canvasRef.current && !canvasContextRef.current) {
      canvasContextRef.current = canvasRef.current.getContext('2d', {
        willReadFrequently: true,
        alpha: false,
      });
    }
  }, []);

  const captureAndRecognize = async () => {
    if (!opencvLoaded || !window.cv || !canvasContextRef.current) {
      setErrorMessage('준비 중입니다...');
      return;
    }

    setIsCapturing(true);
    setErrorMessage('');

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvasContextRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      let src = cv.imread(canvas);
      let gray = new cv.Mat();
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
      cv.threshold(gray, gray, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
      cv.imshow(canvas, gray);
      src.delete(); gray.delete();

      const worker = await createWorker('eng');
      const { data: { text } } = await worker.recognize(canvas, {}, {
        tessedit_char_whitelist: '0123456789',
        tessedit_pageseg_mode: '7',
      });
      await worker.terminate();

      const numbers = text.replace(/\D/g, '').trim();
      if (numbers && numbers.length >= 3) {
        onSuccess(numbers);
      } else {
        setErrorMessage('인식 실패\n계기판을 밝고 선명하게 찍어주세요');
      }
    } catch (err) {
      console.error('OCR 오류:', err);
      setErrorMessage('처리 중 오류가 발생했습니다');
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="container-fluid p-0 vh-100 vw-100 d-flex flex-column">
      <header className="header d-flex align-items-center justify-content-between px-3 text-white" 
        style={{ backgroundColor: '#00c4b4', height: '56px' }}>
        <h1 className="h5 mb-0 fw-bold">계기판 촬영</h1>
        <button className="btn text-white p-0" onClick={onClose}>
          <i className="bi bi-x-lg fs-3"></i>
        </button>
      </header>

      <video
        ref={videoRef}
        className="w-100"
        style={{
          width: '100vw',
          height: '72vh',
          objectFit: 'cover',
          background: '#000',
          display: 'block',
          margin: 0,
          padding: 0
        }}
        playsInline
        muted
        autoPlay
      />

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {errorMessage && (
        <div className="bg-danger text-white text-center p-4">
          {errorMessage.split('\n').map((line, i) => <div key={i}>{line}</div>)}
        </div>
      )}

      <div
        style={{
          padding: '24px 20px',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 34px) + 30px)',
        }}
      >
        <button
          className="btn btn-primary w-100 py-4 rounded-pill fw-bold fs-4 shadow-lg text-white"
          style={{ backgroundColor: '#00c4b4', border: 'none' }}
          onClick={captureAndRecognize}
          disabled={isCapturing}
        >
          {isCapturing ? '인식 중...' : '사진 찍고 자동 인식'}
        </button>
      </div>
    </div>
  );
};
*/
export default MobileOcrCamera;