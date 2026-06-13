import { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Download, Share2 } from 'lucide-react';
import styles from './QRCodeDisplay.module.css';

interface QRCodeDisplayProps {
  token: string;
  tableLabel?: string;
  size?: number;
}

export function QRCodeDisplay({ token, tableLabel = 'Столик', size = 256 }: QRCodeDisplayProps) {
  const [copied, setCopied] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/table/${token}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownload = () => {
    if (!svgRef.current) return;
    const svg = svgRef.current;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = size;
      canvas.height = size;
      ctx?.drawImage(img, 0, 0);
      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `qrcode-${token}.png`;
      link.href = pngUrl;
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `QR-код для ${tableLabel}`,
          text: `Отсканируйте QR-код для оплаты счета за ${tableLabel}`,
          url,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className={styles.display}>
      <div className={styles.display__header}>
        <h3 className={styles.display__title}>QR-код для оплаты</h3>
        <p className={styles.display__subtitle}>
          Отсканируйте, чтобы открыть интерфейс гостя
        </p>
      </div>

      <div className={styles.display__code}>
        <div className={styles.display__canvas}>
          <QRCodeSVG
            ref={svgRef}
            value={url}
            size={size}
            level="H"
            includeMargin
            fgColor="#1a1a1a"
            bgColor="#ffffff"
          />
        </div>
        <div className={styles.display__info}>
          <p className={styles.display__label}>{tableLabel}</p>
          <p className={styles.display__url}>{url}</p>
        </div>
      </div>

      <div className={styles.display__actions}>
        <button
          className={`${styles.display__button} ${copied ? styles['display__button--copied'] : ''}`}
          onClick={handleCopy}
        >
          <Copy size={18} />
          {copied ? 'Скопировано!' : 'Скопировать ссылку'}
        </button>
        <button className={styles.display__button} onClick={handleDownload}>
          <Download size={18} />
          Скачать PNG
        </button>
        <button className={styles.display__button} onClick={handleShare}>
          <Share2 size={18} />
          Поделиться
        </button>
      </div>

      <div className={styles.display__instructions}>
        <h4 className={styles.display__instructionsTitle}>Как использовать:</h4>
        <ol className={styles.display__instructionsList}>
          <li>Распечатайте QR-код и разместите на столике</li>
          <li>Гости сканируют камерой Telegram</li>
          <li>Откроется интерфейс выбора позиций и оплаты</li>
          <li>Оплата проходит мгновенно</li>
        </ol>
      </div>
    </div>
  );
}
