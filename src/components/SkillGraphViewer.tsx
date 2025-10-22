import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import type { SkillTask, GroupedSkill, Command } from '@/types/skills'
import './SkillGraphViewer.css'

const levelOrder: { [key: string]: number } = { 'Basic': 0, 'Intermediate': 1, 'Advanced': 2 }

export function SkillGraphViewer() {
    const [skillGraphData, setSkillGraphData] = useState<SkillTask[]>([])
    const [selectedSkill, setSelectedSkill] = useState<GroupedSkill | null>(null)
    const [selectedTask, setSelectedTask] = useState<SkillTask | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedLevel, setSelectedLevel] = useState('All Levels')
    const [showLevelDropdown, setShowLevelDropdown] = useState(false)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Load data from Tauri
    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        try {
            const jsonString = await invoke<string>('get_skills_data')
            const data = JSON.parse(jsonString)

            // Parse the grouped skills format
            let skills: SkillTask[] = []
            if (data.skills && Array.isArray(data.skills)) {
                // Flatten the grouped format
                data.skills.forEach((skillGroup: any) => {
                    const skillName = skillGroup.name || skillGroup.skill || ''
                    const level = skillGroup.level || ''
                    const basePrereq = Array.isArray(skillGroup.prerequisites) ? skillGroup.prerequisites : []

                    if (skillGroup.tasks && Array.isArray(skillGroup.tasks)) {
                        skillGroup.tasks.forEach((task: any) => {
                            const taskPrereq = Array.isArray(task.prerequisites) ? task.prerequisites : []
                            skills.push({
                                skill: skillName,
                                level: level,
                                prerequisites: [...basePrereq, ...taskPrereq],
                                task: task.name || task.task || '',
                                steps: Array.isArray(task.steps) ? task.steps : [],
                                commands: task.commands || []
                            })
                        })
                    }
                })
            }

            // Sort by level and skill name
            skills.sort((a, b) => {
                const levelDiff = levelOrder[a.level] - levelOrder[b.level]
                if (levelDiff !== 0) return levelDiff
                return a.skill.localeCompare(b.skill)
            })

            setSkillGraphData(skills)
            setLoading(false)
        } catch (err) {
            setError(`Error loading data: ${err}`)
            setLoading(false)
        }
    }

    // Group skills by name
    function getGroupedSkills(skills: SkillTask[]): GroupedSkill[] {
        const skillsMap = new Map<string, GroupedSkill>()

        skills.forEach(row => {
            if (!skillsMap.has(row.skill)) {
                skillsMap.set(row.skill, {
                    name: row.skill,
                    level: row.level,
                    tasks: []
                })
            }
            skillsMap.get(row.skill)!.tasks.push(row)
        })

        return Array.from(skillsMap.values())
    }

    // Filter skills
    function getFilteredSkills(): GroupedSkill[] {
        let skills = getGroupedSkills(skillGraphData)

        if (searchTerm) {
            skills = skills.filter(skill =>
                skill.name.toLowerCase().includes(searchTerm.toLowerCase())
            )
        }

        if (selectedLevel !== 'All Levels') {
            skills = skills.filter(skill => skill.level === selectedLevel)
        }

        return skills
    }

    // Group by level
    function groupByLevel(skills: GroupedSkill[]): { [key: string]: GroupedSkill[] } {
        const groups: { [key: string]: GroupedSkill[] } = {
            'Basic': [],
            'Intermediate': [],
            'Advanced': []
        }

        skills.forEach(skill => {
            if (groups[skill.level]) {
                groups[skill.level].push(skill)
            }
        })

        return groups
    }

    // Normalize commands
    function normalizeCommands(task: SkillTask): Command[] {
        const src = Array.isArray(task.commands) ? task.commands : []
        return src.map((c, i) => {
            if (typeof c === 'string') {
                return { id: i + 1, code: c }
            }
            const code = c.code ?? c.cmd ?? c.text ?? ''
            const id = c.id ?? (i + 1)
            return { id, code, label: c.label || null, tag: c.tag || null }
        })
    }

    // Copy to clipboard
    function copyToClipboard(text: string) {
        navigator.clipboard.writeText(text)
    }

    // Format step text with backtick code and command references
    function formatStepText(tag: string | null | undefined, rawText: string, commands: Command[]) {
        const parts: JSX.Element[] = []
        let lastIndex = 0

        // Replace command references like (1), (2), (3)
        const cmdRegex = /\((\d+)\)/g
        let match

        while ((match = cmdRegex.exec(rawText)) !== null) {
            const beforeText = rawText.slice(lastIndex, match.index)
            if (beforeText) {
                parts.push(<span key={`text-${lastIndex}`}>{processBackticks(beforeText, tag)}</span>)
            }

            const cmdNum = parseInt(match[1]) - 1
            if (cmdNum >= 0 && cmdNum < commands.length) {
                const cmd = commands[cmdNum]
                parts.push(
                    <span key={`cmd-${match.index}`} className="inline-command">
                        <code className="inline-code">{cmd.code}</code>
                        <button
                            className="inline-copy-btn"
                            onClick={() => copyToClipboard(cmd.code)}
                            title="Copy command"
                        >
                            <CopyIcon />
                        </button>
                    </span>
                )
            } else {
                parts.push(<span key={`match-${match.index}`}>{match[0]}</span>)
            }

            lastIndex = match.index + match[0].length
        }

        const remaining = rawText.slice(lastIndex)
        if (remaining) {
            parts.push(<span key={`text-${lastIndex}`}>{processBackticks(remaining, tag)}</span>)
        }

        return <>{parts}</>
    }

    // Process backticks for inline code
    function processBackticks(text: string, tag: string | null | undefined): (string | JSX.Element)[] {
        const parts: (string | JSX.Element)[] = []
        const regex = /`([^`]+)`/g
        let lastIndex = 0
        let match: RegExpExecArray | null

        while ((match = regex.exec(text)) !== null) {
            if (match.index > lastIndex) {
                parts.push(text.slice(lastIndex, match.index))
            }

            const codeText = match[1]
            const matchIndex = match.index
            const matchLength = match[0].length
            const cssClass = tag && tag.toLowerCase() === 'terminal' ? 'terminal-command' : ''
            parts.push(
                <span key={`code-${matchIndex}`} className={cssClass || undefined}>
                    <code>{codeText}</code>
                    <button
                        className="copy-button"
                        onClick={() => copyToClipboard(codeText)}
                        title="Copy"
                    >
                        <CopyIcon />
                    </button>
                </span>
            )

            lastIndex = matchIndex + matchLength
        }

        if (lastIndex < text.length) {
            parts.push(text.slice(lastIndex))
        }

        return parts
    }

    const filteredSkills = getFilteredSkills()
    const levelGroups = groupByLevel(filteredSkills)

    if (loading) {
        return <div className="loading">Loading skills...</div>
    }

    if (error) {
        return <div className="error">{error}</div>
    }

    return (
        <div className="skill-graph-container">
            {/* Header */}
            <header className="header">
                <h1>Skill Graph Explorer</h1>
            </header>

            {/* Main Content */}
            <div className="main-content">
                {/* Left Panel: Skills */}
                <div className="panel skills-panel">
                    <div className="panel-header">
                        <h2>Skills</h2>
                        <div className="filter-controls">
                            <div className="level-filter-dropdown">
                                <button
                                    className="level-filter-button"
                                    onClick={() => setShowLevelDropdown(!showLevelDropdown)}
                                >
                                    <span className={`level-badge ${selectedLevel === 'All Levels' ? 'all' : selectedLevel.toLowerCase()}`}>
                                        {selectedLevel}
                                    </span>
                                </button>
                                {showLevelDropdown && (
                                    <div className="level-filter-options show">
                                        {['All Levels', 'Basic', 'Intermediate', 'Advanced'].map(level => (
                                            <div
                                                key={level}
                                                className="level-filter-option"
                                                onClick={() => {
                                                    setSelectedLevel(level)
                                                    setShowLevelDropdown(false)
                                                }}
                                            >
                                                <span className={`level-badge ${level === 'All Levels' ? 'all' : level.toLowerCase()}`}>
                                                    {level}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <input
                                type="text"
                                placeholder="Search skills..."
                                className="search-input"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="panel-content">
                        {Object.entries(levelGroups).map(([level, skills]) =>
                            skills.length > 0 && (
                                <div key={level} className="level-group">
                                    <div className="level-header">
                                        <span className={`level-badge ${level.toLowerCase()}`}>{level}</span>
                                        <span>{skills.length} skills</span>
                                    </div>
                                    {skills.map(skill => (
                                        <div
                                            key={skill.name}
                                            className={`skill-item ${selectedSkill?.name === skill.name ? 'selected' : ''}`}
                                            onClick={() => {
                                                setSelectedSkill(skill)
                                                setSelectedTask(null)
                                            }}
                                        >
                                            <div className="skill-name">{skill.name}</div>
                                            <div className="skill-meta">
                                                <span className="task-count">{skill.tasks.length} tasks</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        )}
                    </div>
                </div>

                {/* Middle Panel: Tasks */}
                <div className="panel tasks-panel">
                    <div className="panel-header">
                        <h2>Tasks</h2>
                        <div className="breadcrumb">
                            {selectedSkill ? selectedSkill.name : 'Select a skill'}
                        </div>
                    </div>
                    <div className="panel-content">
                        {!selectedSkill ? (
                            <div className="empty-state">
                                <p>Select a skill to view tasks</p>
                            </div>
                        ) : (
                            selectedSkill.tasks.map((task, index) => (
                                <div
                                    key={index}
                                    className={`task-item ${selectedTask?.task === task.task ? 'selected' : ''}`}
                                    onClick={() => setSelectedTask(task)}
                                >
                                    <div className="task-title">{task.task}</div>
                                    <div className="task-meta">
                                        <span className="step-count">{task.steps.length} steps</span>
                                        {task.prerequisites.length > 0 && (
                                            <span className="prerequisite-tag">
                                                Requires: {task.prerequisites.join(', ')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Panel: Steps */}
                <div className="panel steps-panel">
                    <div className="panel-header">
                        <h2>Execution Steps</h2>
                        <div className="breadcrumb">
                            {selectedTask ? selectedTask.task : 'Select a task'}
                        </div>
                    </div>
                    <div className="panel-content">
                        {!selectedTask ? (
                            <div className="empty-state">
                                <p>Select a task to view execution steps</p>
                            </div>
                        ) : (
                            <>
                                <div className="task-details">
                                    <h3>{selectedTask.task}</h3>
                                    <div className="task-description">
                                        Complete this task by following the {selectedTask.steps.length} steps below.
                                    </div>
                                    <div className="detail-meta">
                                        <div className="detail-item">
                                            <span className="detail-label">Skill:</span>
                                            <span>{selectedTask.skill}</span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="detail-label">Level:</span>
                                            <span className={`level-badge ${selectedTask.level.toLowerCase()}`}>
                                                {selectedTask.level}
                                            </span>
                                        </div>
                                        {selectedTask.prerequisites.length > 0 && (
                                            <div className="detail-item">
                                                <span className="detail-label">Prerequisites:</span>
                                                <span>{selectedTask.prerequisites.join(', ')}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="steps-list">
                                    {selectedTask.steps.map((step, index) => {
                                        const commands = normalizeCommands(selectedTask)
                                        return (
                                            <div key={index} className="step-item">
                                                <div className="step-number">{index + 1}</div>
                                                <div className="step-content">
                                                    {step.tag && <div className="step-tag">{step.tag}</div>}
                                                    <div className="step-text">
                                                        {formatStepText(step.tag, step.text, commands)}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

function CopyIcon() {
    return (
        <svg className="copy-icon" viewBox="0 0 24 24">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
    )
}
