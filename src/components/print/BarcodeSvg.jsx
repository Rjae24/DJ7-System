import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

/**
 * Componente reutilizable para renderizar código de barras en formato SVG vectorial
 */
export default function BarcodeSvg({
  value,
  format = 'CODE128',
  width = 1.5,
  height = 35,
  displayValue = true,
  fontSize = 11,
  font = 'Courier New, monospace',
  textMargin = 2,
  margin = 0,
  className = '',
  style = {},
}) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, String(value).trim(), {
          format,
          width,
          height,
          displayValue,
          fontSize,
          font,
          textMargin,
          margin,
          background: 'transparent',
          lineColor: '#000000',
        });
      } catch (err) {
        console.warn('Error al generar código de barras para:', value, err);
      }
    }
  }, [value, format, width, height, displayValue, fontSize, font, textMargin, margin]);

  if (!value) {
    return <span style={{ fontSize: '10px', color: '#888' }}>Sin código</span>;
  }

  return (
    <svg
      ref={svgRef}
      className={className}
      style={{
        maxWidth: '100%',
        height: 'auto',
        display: 'block',
        margin: '0 auto',
        ...style,
      }}
    />
  );
}
