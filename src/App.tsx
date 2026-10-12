import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { createProjectOnApi, getWorkspaceInsightsOnApi, listProjectsOnApi, predictSymbolOnApi, type ApiProject, type SymbolPrediction } from './api'
import './App.css'

type NavItem = {
  label: string
  icon: string
  badge?: string
}

type Project = {
  name: string
  status: 'On track' | 'In review' | 'Planning'
  progress: number
  tone: 'lilac' | 'yellow' | 'mint'
}

type WorkspaceSummary = {
  completionRate: number
  completedTasks: number
  totalTasks: number
}

const navItems: NavItem[] = [
  { label: 'Overview', icon: '⌂' },
  { label: 'Projects', icon: '▦', badge: '8' },
  { label: 'Reports', icon: '◒' },
  { label: 'Team', icon: '♧' },
]

const stats = [
  { label: 'Active projects', value: '08', change: '+12.5%', note: 'vs last month', tone: 'purple', icon: '✦' },
  { label: 'Tasks completed', value: '124', change: '+8.2%', note: 'vs last month', tone: 'blue', icon: '✓' },
  { label: 'Hours tracked', value: '286.5', change: '+4.6%', note: 'vs last month', tone: 'orange', icon: '◷' },
  { label: 'Team members', value: '16', change: '+2', note: 'new this month', tone: 'green', icon: '♧' },
]

const initialActivity = [
  { initials: 'MC', name: 'Maya Chen', action: 'completed the homepage wireframes', project: 'Website redesign', time: '12 min ago', color: 'coral' },
  { initials: 'JR', name: 'Jon Rivera', action: 'commented on the launch checklist', project: 'Spring launch', time: '43 min ago', color: 'blue' },
  { initials: 'AK', name: 'Aisha Khan', action: 'uploaded 6 new assets', project: 'Brand refresh', time: '2 hours ago', color: 'purple' },
  { initials: 'TS', name: 'Theo Scott', action: 'moved a task to review', project: 'Mobile app', time: '4 hours ago', color: 'green' },
]

const initialProjects: Project[] = [
  { name: 'Website redesign', status: 'On track', progress: 78, tone: 'lilac' },
  { name: 'Spring launch', status: 'In review', progress: 54, tone: 'yellow' },
  { name: 'Mobile app', status: 'On track', progress: 36, tone: 'mint' },
]

const projectTones: Project['tone'][] = ['lilac', 'yellow', 'mint']

function mapApiProject(project: ApiProject, index: number): Project {
  return {
    name: project.name,
    status: project.status === 'active' ? 'On track' : project.status === 'paused' ? 'In review' : project.status === 'completed' ? 'On track' : 'Planning',
    progress: project.progress,
    tone: projectTones[index % projectTones.length],
  }
}

function prepareDrawingCanvas(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d')
  if (!context) return
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.strokeStyle = '#242238'
  context.lineWidth = 18
  context.lineCap = 'round'
  context.lineJoin = 'round'
}

function App() {
  const [activeNav, setActiveNav] = useState('Overview')
  const [notice, setNotice] = useState('')
  const [projects, setProjects] = useState<Project[]>(() => {
    const savedProjects = window.localStorage.getItem('atlas-projects')

    if (!savedProjects) return initialProjects

    try {
      const parsedProjects: unknown = JSON.parse(savedProjects)
      return Array.isArray(parsedProjects) ? parsedProjects as Project[] : initialProjects
    } catch {
      return initialProjects
    }
  })
  const [activity, setActivity] = useState(initialActivity)
  const [workspaceSummary, setWorkspaceSummary] = useState<WorkspaceSummary>({ completionRate: 72, completedTasks: 18, totalTasks: 25 })
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [projectError, setProjectError] = useState('')
  const [isSavingProject, setIsSavingProject] = useState(false)
  const [symbolPrediction, setSymbolPrediction] = useState<SymbolPrediction | null>(null)
  const [isPredictingSymbol, setIsPredictingSymbol] = useState(false)
  const [hasDrawing, setHasDrawing] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    window.localStorage.setItem('atlas-projects', JSON.stringify(projects))
  }, [projects])

  useEffect(() => {
    if (canvasRef.current) prepareDrawingCanvas(canvasRef.current)
  }, [])

  useEffect(() => {
    let isCurrent = true

    const syncDashboard = async () => {
      try {
        const [apiProjects, apiInsights] = await Promise.all([listProjectsOnApi(), getWorkspaceInsightsOnApi()])
        if (!isCurrent) return
        if (apiProjects.length > 0) setProjects(apiProjects.map(mapApiProject))
        if (apiInsights.task_count > 0) {
          setWorkspaceSummary({
            completionRate: apiInsights.completion_rate,
            completedTasks: apiInsights.completed_task_count,
            totalTasks: apiInsights.task_count,
          })
        }
      } catch {
        // Offline mode keeps the local dashboard data visible.
      }
    }

    void syncDashboard()
    return () => { isCurrent = false }
  }, [])

  const showNotice = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2600)
  }

  const openProjectModal = () => {
    setProjectName('')
    setProjectError('')
    setIsProjectModalOpen(true)
  }

  const createProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const name = projectName.trim()

    if (!name) {
      setProjectError('Give your project a name to continue.')
      return
    }

    setIsSavingProject(true)
    let createdProject: Project = { name, status: 'Planning', progress: 0, tone: 'lilac' }

    try {
      const apiProject = await createProjectOnApi(name)
      createdProject = mapApiProject(apiProject, 0)
    } catch {
      // The dashboard remains usable when the API is not running locally.
    }

    setProjects((currentProjects) => [createdProject, ...currentProjects])
    setActivity((currentActivity) => [
      { initials: 'AM', name: 'Alex Morgan', action: 'created a new project', project: name, time: 'just now', color: 'purple' },
      ...currentActivity,
    ].slice(0, 4))
    setIsProjectModalOpen(false)
    setIsSavingProject(false)
    setActiveNav('Projects')
    showNotice(`${name} was created`)
  }

  const predictSymbolFile = async (file: File) => {
    setIsPredictingSymbol(true)
    try {
      setSymbolPrediction(await predictSymbolOnApi(file))
    } catch {
      showNotice('Start the API to identify handwritten symbols')
    } finally {
      setIsPredictingSymbol(false)
    }
  }

  const recognizeSymbol = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) void predictSymbolFile(file)
    event.target.value = ''
  }

  const drawingPoint = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget
    const bounds = canvas.getBoundingClientRect()
    return {
      x: (event.clientX - bounds.left) * (canvas.width / bounds.width),
      y: (event.clientY - bounds.top) * (canvas.height / bounds.height),
    }
  }

  const beginDrawing = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget
    const context = canvas.getContext('2d')
    if (!context) return
    canvas.setPointerCapture(event.pointerId)
    const point = drawingPoint(event)
    context.beginPath()
    context.moveTo(point.x, point.y)
    setHasDrawing(true)
  }

  const drawSymbol = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
    const context = event.currentTarget.getContext('2d')
    if (!context) return
    const point = drawingPoint(event)
    context.lineTo(point.x, point.y)
    context.stroke()
  }

  const clearDrawing = () => {
    if (canvasRef.current) prepareDrawingCanvas(canvasRef.current)
    setHasDrawing(false)
    setSymbolPrediction(null)
  }

  const recognizeDrawing = async () => {
    if (!canvasRef.current || !hasDrawing) {
      showNotice('Draw a symbol before identifying it')
      return
    }
    const blob = await new Promise<Blob | null>((resolve) => canvasRef.current?.toBlob(resolve, 'image/png'))
    if (blob) await predictSymbolFile(new File([blob], 'handwritten-symbol.png', { type: 'image/png' }))
  }

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">A</div>
          <div>
            <strong>atlas</strong>
            <span>WORKSPACE</span>
          </div>
        </div>

        <div className="workspace-switcher">
          <div className="workspace-avatar">N</div>
          <div className="workspace-copy">
            <span>Workspace</span>
            <strong>Northstar Studio</strong>
          </div>
          <span className="chevron">⌄</span>
        </div>

        <nav className="primary-nav" aria-label="Primary navigation">
          <span className="nav-label">MENU</span>
          {navItems.map((item) => (
            <button
              className={`nav-item ${activeNav === item.label ? 'active' : ''}`}
              key={item.label}
              onClick={() => setActiveNav(item.label)}
              type="button"
            >
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
              {item.badge && <span className="nav-badge">{item.badge}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item" type="button" onClick={() => showNotice('Settings are coming soon')}>
            <span className="nav-icon" aria-hidden="true">⚙</span>
            <span>Settings</span>
          </button>
          <div className="profile-card">
            <div className="profile-avatar">AM</div>
            <div className="profile-copy">
              <strong>Alex Morgan</strong>
              <span>Admin</span>
            </div>
            <button className="more-button" type="button" aria-label="Open profile menu" onClick={() => showNotice('Profile menu opened')}>•••</button>
          </div>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="topbar">
          <div className="mobile-brand"><div className="brand-mark">A</div><strong>atlas</strong></div>
          <div className="topbar-actions">
            <button className="icon-button" type="button" aria-label="Search" onClick={() => showNotice('Search is ready for your next query')}>⌕</button>
            <button className="icon-button notification-button" type="button" aria-label="Notifications" onClick={() => showNotice('You have 3 new notifications')}>
              ♧<span className="notification-dot" />
            </button>
            <div className="topbar-avatar">AM</div>
          </div>
        </header>

        <div className="content-wrap">
          <div className="page-heading">
            <div>
              <p className="eyebrow">Monday, October 12, 2026</p>
              <h1>Good morning, Alex <span aria-hidden="true">✦</span></h1>
              <p className="heading-copy">Here’s what’s happening across your workspace today.</p>
            </div>
            <button className="primary-button" type="button" onClick={openProjectModal}>
              <span aria-hidden="true">+</span> New project
            </button>
          </div>

          <section className="stats-grid" aria-label="Workspace summary">
            {stats.map((stat) => (
              <article className="stat-card" key={stat.label}>
                <div className={`stat-icon ${stat.tone}`}>{stat.icon}</div>
                <div className="stat-details">
                  <p>{stat.label}</p>
                  <div className="stat-value-row">
                    <strong>{stat.label === 'Active projects' ? String(projects.length).padStart(2, '0') : stat.label === 'Tasks completed' && workspaceSummary.totalTasks > 0 ? String(workspaceSummary.completedTasks) : stat.value}</strong>
                    <span className="stat-change">{stat.change}</span>
                  </div>
                  <span className="stat-note">{stat.note}</span>
                </div>
                <span className="sparkline" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></span>
              </article>
            ))}
          </section>

          <section className="dashboard-grid">
            <article className="panel activity-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Keep up with your team</p>
                  <h2>Recent activity</h2>
                </div>
                <button className="text-button" type="button" onClick={() => showNotice('Showing all activity')}>View all <span aria-hidden="true">→</span></button>
              </div>
              <div className="activity-list">
                {activity.map((item) => (
                  <div className="activity-item" key={`${item.name}-${item.time}`}>
                    <div className={`activity-avatar ${item.color}`}>{item.initials}</div>
                    <div className="activity-copy">
                      <p><strong>{item.name}</strong> {item.action}</p>
                      <span>{item.project}</span>
                    </div>
                    <time>{item.time}</time>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel progress-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Your focus this week</p>
                  <h2>Weekly progress</h2>
                </div>
                <button className="more-button" type="button" aria-label="More progress options" onClick={() => showNotice('Progress options opened')}>•••</button>
              </div>
              <div className="progress-body">
                <div className="progress-ring" style={{ background: `conic-gradient(var(--purple) 0 ${workspaceSummary.completionRate}%, #eeebfa ${workspaceSummary.completionRate}% 100%)` }} aria-label={`${workspaceSummary.completionRate} percent complete`}><div><strong>{workspaceSummary.completionRate}%</strong><span>complete</span></div></div>
                <div className="progress-summary">
                  <strong>Great momentum!</strong>
                  <p>You’re ahead of your usual pace. Keep the focus going.</p>
                  <div className="progress-legend"><span><i className="legend-dot done" />Completed <b>{workspaceSummary.completedTasks}</b></span><span><i className="legend-dot left" />Remaining <b>{Math.max(workspaceSummary.totalTasks - workspaceSummary.completedTasks, 0)}</b></span></div>
                </div>
              </div>
              <div className="progress-footer"><span>Weekly target</span><strong>25 tasks</strong></div>
            </article>
          </section>

          <section className="bottom-grid">
            <article className="panel projects-panel">
              <div className="panel-heading">
                <div><p className="eyebrow">Across your workspace</p><h2>Project pulse</h2></div>
                <button className="text-button" type="button" onClick={() => setActiveNav('Projects')}>See projects <span aria-hidden="true">→</span></button>
              </div>
              {projects.map((project) => (
                <div className="project-row" key={project.name}>
                  <div className="project-name"><span className={`project-dot ${project.tone}`} />{project.name}</div>
                  <span className={`project-status ${project.status === 'In review' ? 'review' : project.status === 'Planning' ? 'planning' : 'on-track'}`}>{project.status}</span>
                  <div className="mini-progress"><span style={{ width: `${project.progress}%` }} /></div>
                  <strong>{project.progress}%</strong>
                </div>
              ))}
            </article>
            <article className="panel invite-panel">
              <div className="invite-art" aria-hidden="true"><span>✦</span><span>+</span><span>•</span></div>
              <div><p className="eyebrow">Grow together</p><h2>Bring your team along</h2><p>Invite teammates to collaborate and get more done, together.</p></div>
              <button className="secondary-button" type="button" onClick={() => showNotice('Invite link copied')}>Invite teammates <span aria-hidden="true">→</span></button>
            </article>
          </section>

          <section className="panel recognition-panel">
            <div className="recognition-copy">
              <p className="eyebrow">Powered by your Python model</p>
              <h2>Identify a handwritten symbol</h2>
              <p>Upload a clear image of one Sinhala symbol and Atlas will rank the closest matches.</p>
            </div>
            <div className="drawing-recognizer">
              <canvas ref={canvasRef} className="drawing-canvas" width="192" height="192" aria-label="Draw a handwritten symbol" onPointerDown={beginDrawing} onPointerMove={drawSymbol} onPointerUp={() => setHasDrawing(true)} onPointerCancel={() => setHasDrawing(true)} />
              <div className="drawing-tools"><button className="clear-drawing" type="button" onClick={clearDrawing}>Clear</button><button className="identify-button" type="button" disabled={isPredictingSymbol} onClick={() => void recognizeDrawing}>{isPredictingSymbol ? 'Reading…' : 'Identify drawing'}</button></div>
            </div>
            <label className="upload-button">
              <input type="file" accept="image/*" onChange={recognizeSymbol} />
              <span aria-hidden="true">↥</span> {isPredictingSymbol ? 'Reading symbol…' : 'Upload image'}
            </label>
            {symbolPrediction && (
              <div className="recognition-result" role="status">
                <div className="recognized-symbol">{symbolPrediction.symbol}</div>
                <div><span className="eyebrow">Best match · {Math.round(symbolPrediction.confidence * 100)}% confidence</span><strong>Top alternatives</strong><div className="candidate-list">{symbolPrediction.candidates.map((candidate) => <span key={candidate.symbol}>{candidate.symbol} <b>{Math.round(candidate.confidence * 100)}%</b></span>)}</div></div>
              </div>
            )}
          </section>
        </div>
      </main>

      {isProjectModalOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setIsProjectModalOpen(false)}>
          <div className="project-modal" role="dialog" aria-modal="true" aria-labelledby="new-project-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div><p className="eyebrow">Start something new</p><h2 id="new-project-title">Create a project</h2></div>
              <button className="modal-close" type="button" aria-label="Close dialog" onClick={() => setIsProjectModalOpen(false)}>×</button>
            </div>
            <form onSubmit={createProject}>
              <label className="form-label" htmlFor="project-name">Project name</label>
              <input className={`project-input ${projectError ? 'has-error' : ''}`} id="project-name" autoFocus value={projectName} onChange={(event) => { setProjectName(event.target.value); setProjectError('') }} placeholder="e.g. Q4 campaign" />
              {projectError && <p className="form-error" role="alert">{projectError}</p>}
              <p className="form-help">You can add tasks, teammates, and a deadline after creating it.</p>
              <div className="modal-actions"><button className="cancel-button" type="button" onClick={() => setIsProjectModalOpen(false)} disabled={isSavingProject}>Cancel</button><button className="primary-button" type="submit" disabled={isSavingProject}>{isSavingProject ? 'Saving…' : 'Create project'}</button></div>
            </form>
          </div>
        </div>
      )}
      {notice && <div className="toast" role="status">{notice}</div>}
    </div>
  )
}

export default App
