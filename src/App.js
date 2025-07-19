import { useEffect, useRef, useState } from "react";
import "./App.css";

const noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function getNoteFromFreq(freq) {
  const A4 = 440;
  const noteNumber = 12 * (Math.log(freq / A4) / Math.log(2));
  return Math.round(noteNumber) + 69;
}

function noteName(noteNumber) {
  const note = noteNumber % 12;
  const octave = Math.floor(noteNumber / 12) - 1;
  return noteStrings[note] + octave;
}

function autoCorrelate(buf, sampleRate) {
  let SIZE = buf.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return -1;

  let r1 = 0, r2 = SIZE - 1;
  for (let i = 0; i < SIZE / 2; i++) if (Math.abs(buf[i]) < 0.2) { r1 = i; break; }
  for (let i = 1; i < SIZE / 2; i++) if (Math.abs(buf[SIZE - i]) < 0.2) { r2 = SIZE - i; break; }

  buf = buf.slice(r1, r2);
  SIZE = buf.length;

  let c = new Array(SIZE).fill(0);
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE - i; j++) {
      c[i] = c[i] + buf[j] * buf[j + i];
    }
  }

  let d = 0;
  while (c[d] > c[d + 1]) d++;
  let maxval = -1, maxpos = -1;
  for (let i = d; i < SIZE; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }

  let T0 = maxpos;
  return sampleRate / T0;
}

function getCentsColor(freq, noteNum) {
  const targetFreq = 440 * Math.pow(2, (noteNum - 69) / 12);
  const cents = 1200 * Math.log2(freq / targetFreq);
  const absCents = Math.min(Math.abs(cents), 50);
  const percent = 1 - absCents / 50;
  const hue = percent * 120;
  return `hsl(${hue}, 100%, 50%)`;
}

function App() {
  const [freq, setFreq] = useState(0);
  const [note, setNote] = useState("-");
  const [rotation, setRotation] = useState(0);
  const analyserRef = useRef(null);
  const bufferRef = useRef(null);
  const [circleColor, setCircleColor] = useState("red");

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;
      bufferRef.current = new Float32Array(analyser.fftSize);
      source.connect(analyser);

      const update = () => {
        analyser.getFloatTimeDomainData(bufferRef.current);
        const f = autoCorrelate(bufferRef.current, audioCtx.sampleRate);
        if (f !== -1) {
          const noteNum = getNoteFromFreq(f);
          const name = noteName(noteNum);
          setFreq(f.toFixed(1));
          setNote(name);
          const noteNumberFloat = 69 + 12 * Math.log2(f / 440);
          const angle = ((noteNumberFloat % 12) / 12) * 360;
          setRotation(angle);
        
          const color = getCentsColor(f, noteNum);
          setCircleColor(color);
        } else {
          setFreq("-");
          setNote("-");
        }
        requestAnimationFrame(update);
      };

      update();
    });
  }, []);

  return (
    <div className="app">
      <h1>Tuner</h1>
      <p>Frequency: <strong>{freq}</strong> Hz</p>
      <p>Note: <strong>{note}</strong></p>
      <div className="circle-container">
      <div
        className="circle"
        style={{
          transform: `rotate(${rotation}deg)`,
          backgroundColor: circleColor
        }}
      >
        <div className="needle"></div>
      </div>
      {Array.from({ length: 60 }).map((_, i) => {
        const angle =  Math.PI;
        const radiusOuter = 1;
        const radiusInner = i % 5 === 0 ? 170 :212;

        const x1 = 2120 + radiusInner * Math.sin(angle);
        const y1 = 2120 - radiusInner * Math.cos(angle);
        const x2 = 2120 + radiusOuter * Math.sin(angle);
        const y2 = 2120 - radiusOuter * Math.cos(angle);

        return (
          <div
            key={i}
            className="tick"
            style={{
              left: `${x1}px`,
              top: `${y1}px`,
              width: `${Math.hypot(x2 - x1, y2 - y1)}px`,
              transform: `rotate(${(i * 6)}deg)`,
              transformOrigin: "0 0"
            }}
          ></div>
        );
      })}
      {noteStrings.map((n, i) => {
        const angle = (i / 12) * 2 * Math.PI;
        const radius = 170; 
        const x = 211 + radius * Math.sin(angle); 
        const y = 211 - radius * Math.cos(angle);
        return (
          <div
            key={n}
            className="note-label"
            style={{ left: `${x}px`, top: `${y}px` }}
          >
            {n}
          </div>
        );
      })}
      </div>
    </div>
  );
}

export default App;