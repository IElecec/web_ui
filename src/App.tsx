import {useState, useEffect} from 'react';
import Video from './Video'
import { GaussianVideoConfig } from './GaussianVideoConfig';

export default function App() {
    const [currentConfigId, setCurrentConfigId] = useState('none');

    const currentConfig = GaussianVideoConfig[currentConfigId];

    const originalFrameNumber = currentConfig.frameNumber;
    const frameStart = currentConfig.frameStart;
    const assetPath = currentConfig.assetPath;

    const [frameNumber, setFrameNumber] = useState(originalFrameNumber);

    const [tempFrame, setTempFrame] = useState(1);

    const [fps, setFPS] = useState<number>(15);
    const [tempFPS, setTempFPS] = useState<number>(15);

    const [interpolated, setInterpolated] = useState(false);

    const [keyFrameA, setKeyFrameA] = useState<number>(0);
    const [keyFrameB, setKeyFrameB] = useState<number>(0);

    const [tempKeyFrameA, setTempKeyFrameA] = useState<number>(keyFrameA);
    const [tempKeyFrameB, setTempKeyFrameB] = useState<number>(keyFrameB);

    const [baseFolder, setBaseFolder] = useState<string>("");    

    const applyFPS = () => {
        setFPS(tempFPS);
    };

    useEffect(() => {
        setFrameNumber(originalFrameNumber);
        setTempFrame(1);
        setInterpolated(false);
        setKeyFrameA(0);
        setKeyFrameB(0);
        setTempKeyFrameA(keyFrameA);
        setTempKeyFrameB(keyFrameB);
    }, [currentConfigId, originalFrameNumber]);

    async function applyInterpolation() {
        if (!interpolated) {
            setFrameNumber(tempFrame);
            setKeyFrameA(tempKeyFrameA);
            setKeyFrameB(tempKeyFrameB);
            setInterpolated(true);

            console.log(`Applying interpolation.`);
            console.log(`keyFrameA=${tempKeyFrameA}, keyFrameB=${tempKeyFrameB}`);
        }
        else {
            setFrameNumber(originalFrameNumber);
            setInterpolated(false);
        }
    }

    return (
        <>
            <Video
                src={assetPath}
                frameStart={frameStart}
                frameLength={frameNumber}
                fps={fps}
                interpolated={interpolated}
                keyFrameA={keyFrameA}
                keyFrameB={keyFrameB}
            />

            <div
                style={{
                    position: 'absolute',
                    top: 20,
                    left: 20,
                    zIndex: 1000,
                    background: 'rgba(0,0,0,0.6)',
                    padding: '12px',
                    borderRadius: '10px',
                    color: 'white',
                    fontSize: '13px',
                    width: '220px'
                }}
            >
                <div style={{ fontWeight: 'bold', marginBottom: '12px', fontSize: '14px' }}>
                    🎛 Control Panel
                </div>

                <div style={{ marginBottom: '10px' }}>
                    <div style={{ marginBottom: '4px', fontSize: '12px' }}>Resource</div>
                    <select
                        value={currentConfigId}
                        onChange={(e) => setCurrentConfigId(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '6px',
                            borderRadius: '4px',
                            boxSizing: 'border-box'
                        }}
                    >
                        {Object.values(GaussianVideoConfig).map((config) => (
                            <option key={config.id} value={config.id}>
                                {config.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div style={{ marginBottom: '10px' }}>
                    <div style={{ marginBottom: '4px', fontSize: '12px' }}>Frame (after Interpolation)</div>
                    <input
                        type="number"
                        value={tempFrame}
                        onChange={(e) => setTempFrame(Number(e.target.value))}
                        style={{ width: '95%', padding: '4px', borderRadius: '4px' }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ marginBottom: '4px', fontSize: '12px' }}>Key Frame A</div>
                        <input
                        type="number"
                        value={tempKeyFrameA}
                        onChange={(e) => setTempKeyFrameA(Number(e.target.value))}
                        style={{ width: '100%', padding: '4px', borderRadius: '4px', boxSizing: 'border-box' }}
                        />
                    </div>

                    <div style={{ flex: 1 }}>
                        <div style={{ marginBottom: '4px', fontSize: '12px' }}>Key Frame B</div>
                        <input
                        type="number"
                        value={tempKeyFrameB}
                        onChange={(e) => setTempKeyFrameB(Number(e.target.value))}
                        style={{ width: '100%', padding: '4px', borderRadius: '4px', boxSizing: 'border-box' }}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                    <button
                        onClick={applyInterpolation}
                        style={{
                            width: '100%',
                            padding: '8px',
                            background: interpolated ? '#666' : '#28a745',
                            border: 'none',
                            borderRadius: '5px',
                            color: 'white',
                            cursor: 'pointer'
                        }}
                    >
                        {interpolated ? "Return" : "Interpolate"}
                    </button>
                </div>

                <div style={{ marginBottom: '6px' }}>
                    <div style={{ marginBottom: '4px', fontSize: '12px' }}>FPS</div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        <input
                            type="number"
                            value={tempFPS}
                            onChange={e => setTempFPS(Number(e.target.value))}
                            style={{ flex: 1, padding: '4px', borderRadius: '4px', width: '80%' }}
                        />
                        <button
                            onClick={applyFPS}
                            style={{
                                padding: '4px 6px',
                                background: '#28a745',
                                border: 'none',
                                borderRadius: '4px',
                                color: 'white',
                                cursor: 'pointer'
                            }}
                        >
                            Apply
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}