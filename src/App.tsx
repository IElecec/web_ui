import {useState, useEffect} from 'react';
import Video from './Video'

export default function App() {
    const [frameNumber, setFrameNumber] = useState(15);
    const [displayMode,setDisplayMode] = useState(true);
    const [boneMap, setBoneMap] = useState<Record<string, number>>({});
    const [selectedBone, setSelectedBone] = useState<string>("");
    const [rotX, setRotX] = useState(0);
    const [rotY, setRotY] = useState(0);
    const [rotZ, setRotZ] = useState(0);
    const [tempFrame, setTempFrame] = useState(frameNumber);
    const [interpolatedNumber, setInterpolatedNumber] = useState(frameNumber);

    const [fps, setFPS] = useState<number>(15);      // ⚡ 当前应用的FPS
    const [tempFPS, setTempFPS] = useState<number>(15); // ⚡ 输入框里的临时值

    const [rotating, setRotating] = useState(false); // ✅ 新增加载状态
    const [interpolating, setInterpolating] = useState(false); // ✅ 新增加载状态
    const [rotated, setRotated] = useState(false); // ✅ 新增加载状态
    const [interpolated, setInterpolated] = useState(false); // ✅ 新增加载状态

    const [baseFolder, setBaseFolder] = useState<string>("");
    const folder = baseFolder + (displayMode ? 'skin' : 'bone');
    // const assetPath = `/${folder}`;
    const assetPath = 'test';

    // ---- 修改FPS函数 ----
    const applyFPS = () => {
        setFPS(tempFPS);
    };

    // 加载骨骼列表
    useEffect(() => {
        async function fetchBoneMap() {
            try {
                const res = await fetch("http://10.19.125.200:9000/bone_map.json");
                const data = await res.json();
                setBoneMap(data);
                // 默认选择第一个骨骼
                const firstBone = Object.keys(data)[0];
                if (firstBone) setSelectedBone(firstBone);
            } catch (err) {
                console.error("Failed to fetch bone map:", err);
            }
        }
        fetchBoneMap();
    }, []);


    async function applyRotation() {
        setRotating(true);
        try {
            const res = await fetch("http://10.19.125.200:9000/rotate_bone", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    bone_name: selectedBone,
                    x: rotX,  
                    y: rotY,
                    z: rotZ,
                    frame_number: 2 
                })
            });
            const data = await res.json();
            console.log("Rotation applied:", data);
            
            setRotated(true);
            // setBaseFolder("rotated/");
        } catch (err) {
            console.error("Failed to apply rotation:", err);
        } finally {
            setRotating(false); // ✅ 请求结束，关闭 loading
        }
    }

    async function applyInterpolation() {
        setInterpolating(true);
        try {
            const res = await fetch("http://10.19.125.200:9000/interpolate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    frame_number: tempFrame
                })
            });
            const data = await res.json();
            console.log("Interpolation applied:", data);
            setInterpolatedNumber(tempFrame);
            setInterpolated(true);
            // setBaseFolder("inter/");
        } catch (err) {
            console.error("Failed to apply interpolation:", err);
        } finally {
            setInterpolating(false); // ✅ 请求结束，关闭 loading
        }
    }

    async function activateInterpolation() {
        setBaseFolder("inter/");
        setFrameNumber(interpolatedNumber);
    }
    async function activateRotation() {
        setBaseFolder("rotated/");
        setFrameNumber(2);
    }

    return (
        <>
            <Video src={assetPath} frameLength={frameNumber} fps={fps} />
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
                {/* 🔹 标题 */}
                <div style={{ fontWeight: 'bold', marginBottom: '12px', fontSize: '14px' }}>
                    🎛 Control Panel
                </div>

                {/* 🔹 Display Mode */}
                <div style={{ marginBottom: '10px' }}>
                    <div style={{ marginBottom: '4px', fontSize: '12px' }}>Display</div>
                    <button
                        onClick={() => setDisplayMode(!displayMode)}
                        style={{
                            width: '100%',
                            padding: '6px',
                            background: '#007bff',
                            border: 'none',
                            borderRadius: '5px',
                            color: 'white',
                            cursor: 'pointer'
                        }}
                    >
                        {displayMode ? "Skin" : "Bone"}
                    </button>
                </div>

                {/* 🔹 Bone Selection */}
                <div style={{ marginBottom: '10px' }}>
                    <div style={{ marginBottom: '4px', fontSize: '12px' }}>Bone</div>
                    <select
                        value={selectedBone}
                        onChange={e => setSelectedBone(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '5px',
                            borderRadius: '4px'
                        }}
                    >
                        {Object.keys(boneMap).map(boneName => (
                            <option key={boneName} value={boneName}>
                                {boneName}
                            </option>
                        ))}
                    </select>
                </div>

                {/* 🔹 Rotation */}
                <div style={{ marginBottom: '10px' }}>
                    <div style={{ marginBottom: '4px', fontSize: '12px' }}>Rotation (deg)</div>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'space-between' }}>
                        {[
                            { label: 'X', value: rotX, set: setRotX },
                            { label: 'Y', value: rotY, set: setRotY },
                            { label: 'Z', value: rotZ, set: setRotZ }
                        ].map((item) => (
                            <div key={item.label} style={{ textAlign: 'center', flex: 1 }}>
                                <div style={{ fontSize: '11px', marginBottom: '2px' }}>{item.label}</div>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={item.value}
                                    onChange={e => item.set(Number(e.target.value))}
                                    style={{ width: '80%', padding: '4px', borderRadius: '4px' }}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* 🔹 Apply Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                    <button
                        onClick={applyRotation}
                        disabled={rotating}
                        style={{
                            width: '100%',
                            padding: '8px',
                            background: rotating ? '#666' : '#28a745',
                            border: 'none',
                            borderRadius: '5px',
                            color: 'white',
                            cursor: 'pointer'
                        }}
                    >
                    {rotating ? "Rotating..." : "Apply Rotation"}
                    </button>
                        <button
                        onClick={activateRotation}
                        disabled={!rotated}
                        style={{
                            width: '100%',
                            padding: '8px',
                            background: !rotated ? '#666' : '#28a745',
                            border: 'none',
                            borderRadius: '5px',
                            color: 'white',
                            cursor: 'pointer'
                        }}
                    >
                    {rotated ? "Show Rotation Result" : "No Rotation Result"}
                    </button>
                </div>

                {/* 🔹 Frame */}
                <div style={{ marginBottom: '10px' }}>
                    <div style={{ marginBottom: '4px', fontSize: '12px' }}>Frame (after Interpolation)</div>
                    <input
                        type="number"
                        value={tempFrame}
                        onChange={(e) => setTempFrame(Number(e.target.value))}
                        style={{ width: '95%', padding: '4px', borderRadius: '4px' }}
                    />
                </div>

                {/* 🔹 Apply Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                    <button
                        onClick={applyInterpolation}
                        disabled={interpolating}
                        style={{
                            width: '100%',
                            padding: '8px',
                            background: interpolating ? '#666' : '#28a745',
                            border: 'none',
                            borderRadius: '5px',
                            color: 'white',
                            cursor: 'pointer'
                        }}
                    >
                        {interpolating ? "Interpolating..." : "Apply Interpolation"}
                    </button>
                    <button
                        onClick={activateInterpolation}
                        disabled={!interpolated}
                        style={{
                            width: '100%',
                            padding: '8px',
                            background: !interpolated ? '#666' : '#28a745',
                            border: 'none',
                            borderRadius: '5px',
                            color: 'white',
                            cursor: 'pointer'
                        }}
                    >
                        {interpolated ? "Show Interpolation Result" : "No Interpolation Result"}
                    </button>
                </div>

                {/* 🔹 FPS Adjustment */}
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