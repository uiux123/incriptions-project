import { useEffect, useState, type ChangeEvent, type DragEvent } from 'react'
import { getSymbolModelInfoOnApi, getWorkspaceInsightsOnApi, predictSymbolOnApi, type SymbolModelInfo, type SymbolPrediction } from './api'
import './App.css'

type Screen = 'Home' | 'Character Recognition' | 'Recognition Result' | 'Recognition Examples' | 'Three-Input Analysis' | 'Dataset' | 'About'

const navigation: Array<{ label: Screen; icon: string }> = [
  { label: 'Home', icon: '⌂' },
  { label: 'Character Recognition', icon: '⌗' },
  { label: 'Recognition Examples', icon: '▣' },
  { label: 'Three-Input Analysis', icon: '◫' },
  { label: 'Dataset', icon: '▤' },
  { label: 'About', icon: 'ⓘ' },
]

const processSteps = [
  { title: 'Inscription', subtitle: 'Historical image input', icon: '01' },
  { title: 'Preparation', subtitle: 'Image preprocessing', icon: '02' },
  { title: 'Recognition', subtitle: 'Ancient characters', icon: '03' },
  { title: 'Interpretation', subtitle: 'Mapping and language analysis', icon: '04' },
  { title: 'Final Evidence', subtitle: 'Ranked suggestions', icon: '05' },
]

const examples = [
  { name: 'Example 1', input: 'ඉ', output: 'ඉ', confidence: 92.3, tone: 'green' },
  { name: 'Example 2', input: 'ක', output: 'ක', confidence: 78.6, tone: 'gold' },
  { name: 'Example 3', input: 'ඝ', output: 'ඝ', confidence: 88.1, tone: 'green' },
]

function percent(value: number) {
  return `${(value * 100).toFixed(1)}%`
}

function App() {
  const [activeScreen, setActiveScreen] = useState<Screen>('Home')
  const [prediction, setPrediction] = useState<SymbolPrediction | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [modelInfo, setModelInfo] = useState<SymbolModelInfo | null>(null)
  const [modelStatus, setModelStatus] = useState<'loading' | 'online' | 'offline'>('loading')
  const [isPredicting, setIsPredicting] = useState(false)
  const [error, setError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [projectCount, setProjectCount] = useState(0)

  useEffect(() => {
    let isCurrent = true
    void getSymbolModelInfoOnApi()
      .then((info) => {
        if (!isCurrent) return
        setModelInfo(info)
        setModelStatus('online')
      })
      .catch(() => {
        if (isCurrent) setModelStatus('offline')
      })
    void getWorkspaceInsightsOnApi()
      .then((insights) => {
        if (isCurrent) setProjectCount(insights.project_count)
      })
      .catch(() => undefined)
    return () => { isCurrent = false }
  }, [])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const openScreen = (screen: Screen) => {
    setActiveScreen(screen)
    setError('')
  }

  const selectFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please choose a PNG, JPG, or JPEG image.')
      return
    }
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setPrediction(null)
    setError('')
    setActiveScreen('Character Recognition')
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) selectFile(file)
    event.target.value = ''
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    const file = event.dataTransfer.files[0]
    if (file) selectFile(file)
  }

  const identifyCharacter = async () => {
    if (!selectedFile) {
      setError('Select a handwritten character image before recognition.')
      return
    }
    setIsPredicting(true)
    setError('')
    try {
      const result = await predictSymbolOnApi(selectedFile)
      setPrediction(result)
      setActiveScreen('Recognition Result')
    } catch {
      setModelStatus('offline')
      setError('The model could not be reached. Start the FastAPI backend on port 8000 and try again.')
    } finally {
      setIsPredicting(false)
    }
  }

  const identifyAnother = () => {
    setSelectedFile(null)
    setPreviewUrl('')
    setPrediction(null)
    setError('')
    setActiveScreen('Character Recognition')
  }

  const statusLabel = modelStatus === 'online' ? 'MODEL ONLINE' : modelStatus === 'loading' ? 'CHECKING MODEL' : 'MODEL OFFLINE'

  return (
    <div className="research-shell">
      <aside className="research-sidebar">
        <button className="research-brand" type="button" onClick={() => openScreen('Home')}>
          <span className="temple-mark">⌂</span>
          <span><strong>Sri Lankan</strong><strong>Ancient Inscription</strong><strong>Translator</strong><small>AI for Epigraphic Research</small></span>
        </button>
        <nav className="research-nav" aria-label="Research navigation">
          {navigation.map((item) => (
            <button
              className={`research-nav-item ${(activeScreen === item.label || (activeScreen === 'Recognition Result' && item.label === 'Character Recognition')) ? 'active' : ''}`}
              key={item.label}
              type="button"
              onClick={() => openScreen(item.label)}
            >
              <span className="research-nav-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-quote">
          <span>Preserving Sri Lanka’s</span>
          <span>Epigraphic Heritage</span>
          <span>with AI</span>
          <i />
        </div>
      </aside>

      <main className="research-main">
        <header className="research-topbar">
          <div className="mobile-research-brand"><span className="temple-mark">⌂</span><strong>Sri Lankan Ancient Inscription Translator</strong></div>
          <div className="topbar-meta"><span>Research Prototype</span><b>|</b><span>v0.1</span></div>
        </header>

        {activeScreen === 'Home' && (
          <HomeView onUpload={handleFileChange} onOpenRecognition={() => openScreen('Character Recognition')} projectCount={projectCount} modelStatus={statusLabel} />
        )}
        {activeScreen === 'Character Recognition' && (
          <RecognitionInputView
            selectedFile={selectedFile}
            previewUrl={previewUrl}
            modelInfo={modelInfo}
            modelStatus={statusLabel}
            isPredicting={isPredicting}
            error={error}
            isDragging={isDragging}
            onFileChange={handleFileChange}
            onDrop={handleDrop}
            onDragOver={(event) => { event.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onIdentify={() => void identifyCharacter()}
            onClear={identifyAnother}
          />
        )}
        {activeScreen === 'Recognition Result' && prediction && (
          <RecognitionResultView prediction={prediction} selectedFile={selectedFile} previewUrl={previewUrl} modelInfo={modelInfo} onIdentifyAnother={identifyAnother} />
        )}
        {activeScreen === 'Recognition Examples' && <ExamplesView onOpenRecognition={() => openScreen('Character Recognition')} />}
        {activeScreen === 'Three-Input Analysis' && <ThreeInputView onUpload={handleFileChange} onOpenRecognition={() => openScreen('Character Recognition')} />}
        {activeScreen === 'Dataset' && <DatasetView modelInfo={modelInfo} modelStatus={statusLabel} />}
        {activeScreen === 'About' && <AboutView modelInfo={modelInfo} />}
      </main>

    </div>
  )
}

type HomeViewProps = {
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void
  onOpenRecognition: () => void
  projectCount: number
  modelStatus: string
}

function HomeView({ onUpload, onOpenRecognition, projectCount, modelStatus }: HomeViewProps) {
  return (
    <div className="research-content home-content">
      <section className="hero-card">
        <p className="section-kicker">DIGITAL EPIGRAPHY RESEARCH PROJECT</p>
        <h1>Sri Lankan Ancient Inscription Translator</h1>
        <p>An AI-assisted system designed to examine multiple representations of the same ancient inscription and support character recognition and historical interpretation.</p>
        <div className="hero-tags"><span>Selected Period: Pruva Bhāṣā</span><span>Current Prototype: Handwritten Character Recognition</span><span>Expert Verification Required</span></div>
      </section>

      <SectionHeading title="Inscription Representations" description="Three forms of the same inscription are intended to provide independent evidence." />
      <div className="representation-grid">
        <RepresentationCard number="I" title="Direct Stone Image" status="PLANNED" description="Original image captured directly from the ancient inscription engraved on the stone surface." />
        <RepresentationCard number="II" title="Human-Drawn / Eye Copy" status="AVAILABLE" description="A handwritten or traced representation produced by observing the original inscription." available onUpload={onUpload} />
        <RepresentationCard number="III" title="Estampage / Scan" status="PLANNED" description="A digitised representation created from an estampage of the same original inscription." />
      </div>

      <SectionHeading title="Proposed Interpretation Process" description="High-level progression from inscription evidence to suggested interpretation." />
      <ProcessStrip />

      <div className="home-status-row">
        <div><span className="status-dot online" /><strong>{modelStatus}</strong><span>HOG + Random Forest character classifier</span></div>
        <div><span>Research workspace projects</span><strong>{projectCount || '—'}</strong></div>
        <button type="button" onClick={onOpenRecognition}>Open recognition workspace <span>→</span></button>
      </div>
    </div>
  )
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return <div className="section-heading"><h2>{title}</h2><p>{description}</p><div className="ornament"><i /><b>◆</b><i /></div></div>
}

function RepresentationCard({ number, title, status, description, available = false, onUpload }: { number: string; title: string; status: string; description: string; available?: boolean; onUpload?: (event: ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <article className={`representation-card ${available ? 'available' : ''}`}>
      <div className="representation-top"><span className="roman-number">{number}</span><span className="representation-status">{status}</span></div>
      <h3>{title}</h3>
      <p>{description}</p>
      {available && onUpload ? (
        <label className="representation-upload"><span className="upload-glyph">⇧</span><strong>Select Ancient Character Image</strong><small>PNG, JPG or JPEG</small><input type="file" accept="image/png,image/jpeg,image/jpg" onChange={onUpload} /></label>
      ) : <div className="planned-slot"><strong>{title}</strong><small>Planned for a future development stage</small></div>}
    </article>
  )
}

function ProcessStrip() {
  return <div className="process-strip">{processSteps.map((step, index) => <div className="process-step" key={step.title}><span>{step.icon}</span><strong>{step.title}</strong><small>{step.subtitle}</small>{index < processSteps.length - 1 && <b className="process-arrow">→</b>}</div>)}</div>
}

type RecognitionInputViewProps = {
  selectedFile: File | null
  previewUrl: string
  modelInfo: SymbolModelInfo | null
  modelStatus: string
  isPredicting: boolean
  error: string
  isDragging: boolean
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void
  onDrop: (event: DragEvent<HTMLDivElement>) => void
  onDragOver: (event: DragEvent<HTMLDivElement>) => void
  onDragLeave: () => void
  onIdentify: () => void
  onClear: () => void
}

function RecognitionInputView({ selectedFile, previewUrl, modelInfo, modelStatus, isPredicting, error, isDragging, onFileChange, onDrop, onDragOver, onDragLeave, onIdentify, onClear }: RecognitionInputViewProps) {
  return (
    <div className="research-content recognition-content">
      <PageTitle title="01 — Handwritten Character Input" subtitle="Select a handwritten ancient-character image for recognition." />
      <div className="recognition-grid">
        <section className="research-card upload-card">
          <CardTitle icon="⇧" title="Ancient Character Image" description="Upload a handwritten character (PNG, JPG or JPEG)." />
          <div className={`drop-zone ${isDragging ? 'dragging' : ''}`} onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}>
            {previewUrl ? <img src={previewUrl} className="uploaded-preview" alt="Selected handwritten character" /> : <><span className="drop-icon">⇧</span><strong>Drop an image here</strong><span>or</span></>}
            <label className="browse-button">{previewUrl ? 'Change Image' : 'Browse Image'}<input type="file" accept="image/png,image/jpeg,image/jpg" onChange={onFileChange} /></label>
            {selectedFile ? <div className="file-detail"><span>File name: {selectedFile.name}</span><span>Size: {(selectedFile.size / 1024).toFixed(1)} KB</span></div> : <small className="drop-help">Use a clear image containing one handwritten symbol.</small>}
          </div>
        </section>

        <section className="research-card preview-card">
          <CardTitle icon="◉" title="Input Preview" description="The selected handwritten character is shown below." />
          <div className="large-preview">{previewUrl ? <img src={previewUrl} alt="Input preview" /> : <div className="empty-preview"><span>◎</span><small>No image selected</small></div>}</div>
          <div className="image-meta"><div><span>Input Type</span><strong>Handwritten / Eye Copy</strong></div><div><span>Image Format</span><strong>{selectedFile?.type.replace('image/', '').toUpperCase() || '—'}</strong></div><div><span>Image Size</span><strong>{selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB upload` : '—'}</strong></div><div><span>Status</span><strong className={modelStatus === 'MODEL ONLINE' ? 'ready-text' : 'warning-text'}>{modelStatus === 'MODEL ONLINE' ? 'Ready for Recognition' : modelStatus}</strong></div></div>
        </section>
      </div>
      <div className="recognition-action-bar"><div><strong>Character Recognition</strong><span>{modelInfo ? `${modelInfo.n_estimators}-tree Random Forest · ${modelInfo.classes.length} Sinhala classes` : 'Connect the Python model to continue.'}</span></div><button className="gold-button" type="button" disabled={!selectedFile || isPredicting} onClick={onIdentify}>{isPredicting ? 'Reading Character…' : '✦ Identify Character'}</button></div>
      {error && <div className="inline-error" role="alert">{error}</div>}
      <p className="research-note">The classifier ranks visual similarity. Historical translation and epigraphic conclusions require expert verification.</p>
      <button className="back-link" type="button" onClick={onClear}>← Clear selected image</button>
    </div>
  )
}

function PageTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return <div className="page-title"><h1>{title}</h1><p>{subtitle}</p></div>
}

function CardTitle({ icon, title, description }: { icon: string; title: string; description: string }) {
  return <div className="card-title"><span>{icon}</span><div><h2>{title}</h2><p>{description}</p></div></div>
}

function RecognitionResultView({ prediction, selectedFile, previewUrl, modelInfo, onIdentifyAnother }: { prediction: SymbolPrediction; selectedFile: File | null; previewUrl: string; modelInfo: SymbolModelInfo | null; onIdentifyAnother: () => void }) {
  return (
    <div className="research-content result-content">
      <PageTitle title="02 — Character Recognition Result" subtitle="The uploaded handwritten character has been analysed using the current recognition model." />
      <div className="result-grid">
        <section className="research-card input-result-card"><CardTitle icon="◉" title="Input Character Image" description="Handwritten ancient-character provided by the user." /><div className="result-image-wrap">{previewUrl ? <img src={previewUrl} alt="Uploaded handwritten character" /> : <span>No preview</span>}</div><div className="result-meta"><span>File Name <b>{selectedFile?.name || '—'}</b></span><span>Input Type <b>Handwritten / Eye Copy</b></span><span>Image Format <b>{selectedFile?.type.replace('image/', '').toUpperCase() || '—'}</b></span><span>Image Size <b>{modelInfo ? `${modelInfo.image_size} × ${modelInfo.image_size} model input` : '—'}</b></span></div></section>
        <section className="research-card output-result-card"><CardTitle icon="⚙" title="Recognition Output" description="Predicted character and confidence score from the current model." /><div className="prediction-highlight"><div className="predicted-glyph">{prediction.symbol}</div><div className="confidence-copy"><span>PREDICTED ANCIENT CHARACTER</span><strong>{percent(prediction.confidence)}</strong><div className="confidence-meter"><i style={{ width: `${prediction.confidence * 100}%` }} /></div><small>{prediction.confidence >= 0.75 ? 'High visual similarity' : 'Moderate visual similarity'} · ranked by model confidence</small></div></div><div className="candidate-heading"><span>TOP CANDIDATE PREDICTIONS</span><span>Confidence</span></div><div className="candidate-table">{prediction.candidates.map((candidate, index) => <div className="candidate-row" key={`${candidate.symbol}-${index}`}><span>{index + 1}</span><strong>{candidate.symbol}</strong><b>{percent(candidate.confidence)}</b><small>{index === 0 ? 'Most likely match' : index === 1 ? 'Visually similar' : 'Possible variant'}</small></div>)}</div></section>
      </div>
      <div className="result-complete-bar"><div><span>⌕</span><div><strong>Recognition Complete</strong><small>The handwritten character has been successfully analysed using the current model.</small></div></div><button className="gold-button" type="button" onClick={onIdentifyAnother}>↻ Identify Another Character</button></div>
      <p className="research-note">This is a prototype visual classification result, not a confirmed historical translation.</p>
    </div>
  )
}

function ExamplesView({ onOpenRecognition }: { onOpenRecognition: () => void }) {
  return <div className="research-content examples-content"><PageTitle title="03 — Recognition Examples" subtitle="Examples of handwritten ancient-character recognition using the current prototype model." /><div className="examples-grid">{examples.map((example) => <article className="example-card" key={example.name}><div className="example-card-head"><h2>{example.name}</h2><span className={example.tone}>{example.confidence > 85 ? 'High Confidence' : 'Moderate Confidence'}</span></div><div className="example-columns"><div><small>Input Image (Handwritten)</small><div className="example-image"><span>{example.input}</span></div></div><div><small>Predicted Character</small><div className="example-image predicted"><span>{example.output}</span></div></div></div><div className="example-confidence"><span>Confidence Score</span><strong>{example.confidence}%</strong></div><div className="example-meter"><i style={{ width: `${example.confidence}%` }} /></div><div className="example-meta"><span>Input Type <b>Handwritten / Eye Copy</b></span><span>Prediction Rank <b>1 / 5</b></span></div></article>)}</div><div className="recognition-action-bar compact"><div><strong>Multiple Character Recognition</strong><span>Try the model with a new handwritten character image.</span></div><button className="gold-button" type="button" onClick={onOpenRecognition}>✦ Try More Examples</button></div></div>
}

function ThreeInputView({ onUpload, onOpenRecognition }: { onUpload: (event: ChangeEvent<HTMLInputElement>) => void; onOpenRecognition: () => void }) {
  return <div className="research-content"><PageTitle title="04 — Three-Input Analysis" subtitle="Compare independent representations of the same inscription before interpretation." /><div className="analysis-grid"><RepresentationCard number="I" title="Direct Stone Image" status="PLANNED" description="Original evidence from the stone surface." /><RepresentationCard number="II" title="Human-Drawn / Eye Copy" status="AVAILABLE" description="The active prototype input for character recognition." available onUpload={onUpload} /><RepresentationCard number="III" title="Estampage / Scan" status="PLANNED" description="A digitised impression for future comparison." /></div><div className="analysis-callout"><strong>Recommended next step</strong><p>Upload the handwritten or eye-copy representation first. The recognition result can then be compared with the original stone image and estampage when those inputs are available.</p><button className="gold-button" type="button" onClick={onOpenRecognition}>Open Character Recognition</button></div></div>
}

function DatasetView({ modelInfo, modelStatus }: { modelInfo: SymbolModelInfo | null; modelStatus: string }) {
  return <div className="research-content"><PageTitle title="05 — Dataset & Model" subtitle="Labels and technical metadata used by the current handwritten-symbol classifier." /><div className="dataset-layout"><section className="research-card dataset-card"><CardTitle icon="▤" title="Recognised Symbol Classes" description="Nine Sinhala character labels are available in the bundled model." /><div className="class-grid">{(modelInfo?.classes || ['අ', 'ඉ', 'උ', 'එ', 'ඔ', 'ක', 'ඝ', 'ඡ', 'ට']).map((symbol, index) => <div key={symbol}><span>{String(index + 1).padStart(2, '0')}</span><strong>{symbol}</strong></div>)}</div></section><section className="research-card metadata-card"><CardTitle icon="⚙" title="Model Metadata" description="Loaded from hog_random_forest_model.pkl." /><div className="metadata-list"><span>Connection status <b className={modelStatus === 'MODEL ONLINE' ? 'ready-text' : 'warning-text'}>{modelStatus}</b></span><span>Estimator <b>{modelInfo ? `${modelInfo.n_estimators}-tree Random Forest` : '—'}</b></span><span>Model input <b>{modelInfo ? `${modelInfo.image_size} × ${modelInfo.image_size} px` : '—'}</b></span><span>Feature extraction <b>HOG</b></span><span>Endpoint <b>/api/symbols/predict</b></span></div></section></div><p className="research-note">The model identifies visual classes only. A representative labelled evaluation set is required before reporting production accuracy.</p></div>
}

function AboutView({ modelInfo }: { modelInfo: SymbolModelInfo | null }) {
  return <div className="research-content about-content"><PageTitle title="06 — About the Prototype" subtitle="A research interface for preserving, comparing, and interpreting Sri Lankan inscription evidence." /><section className="about-card"><div className="about-seal">AI</div><div><h2>Digital Epigraphy Research Project</h2><p>The Sri Lankan Ancient Inscription Translator brings together image evidence, human-drawn copies, and machine-assisted character recognition in one reviewable workspace.</p><p>The current Python backend loads a HOG feature extractor and Random Forest classifier for {modelInfo?.classes.length || 9} Sinhala handwritten character classes. Every prediction should be reviewed by an epigraphist or language specialist.</p></div></section></div>
}

export default App
