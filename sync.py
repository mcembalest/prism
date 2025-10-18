#!/usr/bin/env python3
"""
sync.py - Intelligent bidirectional sync for skill formats

Usage: python sync.py

Automatically syncs data/skills.yaml ↔ data/skills/**/*.md
Detects which format is newer and regenerates the other.
Validates content and errors with clear messages if unsyncable.
"""

import sys
import re
import yaml
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple


def skill_name_to_filename(name: str) -> str:
    """
    Convert skill name to filename.
    Examples:
    - "Git Basics" → "git-basics.md"
    - "CI/CD Observability" → "cicd-observability.md"
    - ".gitignore and LFS" → "gitignore-and-lfs.md"
    """
    # Remove special chars except spaces/hyphens
    cleaned = re.sub(r'[^\w\s-]', '', name)
    # Convert to lowercase, replace spaces with hyphens
    return cleaned.strip().lower().replace(' ', '-').replace('--', '-') + '.md'


def load_yaml(yaml_path: Path) -> List[Dict[str, Any]]:
    """Load skills from YAML file."""
    with open(yaml_path, 'r', encoding='utf-8') as f:
        data = yaml.safe_load(f)

    skills = data.get('skills', [])

    # Fix commands that were parsed as dicts due to unquoted colons
    for skill in skills:
        for task in skill.get('tasks', []):
            if 'commands' in task:
                fixed_commands = []
                for cmd in task['commands']:
                    if isinstance(cmd, dict):
                        # Dict was created by YAML parser due to unquoted colon
                        # Reconstruct the original string
                        key = list(cmd.keys())[0]
                        value = cmd[key]
                        # Reconstruct: "key: value"
                        fixed_cmd = f"{key}: {value}"
                        fixed_commands.append(fixed_cmd)
                    else:
                        fixed_commands.append(cmd)
                task['commands'] = fixed_commands

    return skills


def save_yaml(yaml_path: Path, skills: List[Dict[str, Any]]) -> None:
    """Save skills to YAML file."""

    # Custom representer to use plain (unquoted) style for strings when possible
    class MyDumper(yaml.SafeDumper):
        pass

    def str_representer(dumper, data):
        # Multi-line strings use literal block style
        if '\n' in data:
            return dumper.represent_scalar('tag:yaml.org,2002:str', data, style='|')

        # For strings with single quotes, always use double-quote style
        # This avoids the messy single-quote escaping issue
        if "'" in data:
            return dumper.represent_scalar('tag:yaml.org,2002:str', data, style='"')

        # For other strings, use plain style (no quotes)
        return dumper.represent_scalar('tag:yaml.org,2002:str', data, style='')

    MyDumper.add_representer(str, str_representer)

    with open(yaml_path, 'w', encoding='utf-8') as f:
        yaml.dump(
            {'skills': skills},
            f,
            Dumper=MyDumper,
            default_flow_style=False,
            allow_unicode=True,
            sort_keys=False,
            width=1000  # Prevent line wrapping
        )


def parse_markdown_file(md_path: Path) -> Dict[str, Any]:
    """Parse a single .md file into skill dict."""
    content = md_path.read_text(encoding='utf-8')

    # Split frontmatter and body
    match = re.match(r'^---\s*\n(.*?)\n---\s*\n(.*)$', content, re.DOTALL)
    if not match:
        raise ValueError(f"Missing YAML frontmatter in {md_path}")

    frontmatter = yaml.safe_load(match.group(1))
    body = match.group(2)

    # Validate required fields
    if 'name' not in frontmatter:
        raise ValueError(f"Missing 'name' in frontmatter of {md_path}")
    if 'level' not in frontmatter:
        raise ValueError(f"Missing 'level' in frontmatter of {md_path}")

    # Parse tasks from markdown
    tasks = []
    task_sections = re.split(r'^## Task: (.+)$', body, flags=re.MULTILINE)

    # First section is before any tasks (ignore)
    for i in range(1, len(task_sections), 2):
        if i + 1 >= len(task_sections):
            break

        task_name = task_sections[i].strip()
        task_content = task_sections[i + 1]

        # Parse steps (numbered list with **[Tag]** prefix)
        steps = []
        step_pattern = r'^\d+\.\s+\*\*\[([^\]]+)\]\*\*\s+(.+)$'
        for line in task_content.split('\n'):
            step_match = re.match(step_pattern, line.strip())
            if step_match:
                steps.append({
                    'tag': step_match.group(1),
                    'text': step_match.group(2)
                })

        # Parse commands section
        commands = []
        commands_match = re.search(r'\*\*Commands:\*\*\s*\n((?:\d+\.\s+`.+`\s*\n?)+)', task_content)
        if commands_match:
            cmd_text = commands_match.group(1)
            for cmd_line in cmd_text.split('\n'):
                cmd_match = re.match(r'^\d+\.\s+`(.+)`\s*$', cmd_line.strip())
                if cmd_match:
                    commands.append(cmd_match.group(1))

        task = {
            'name': task_name,
            'steps': steps
        }
        if commands:
            task['commands'] = commands

        tasks.append(task)

    skill = {
        'name': frontmatter['name'],
        'level': frontmatter['level'],
        'prerequisites': frontmatter.get('prerequisites', []),
        'tasks': tasks
    }

    # Preserve _index if present (used for ordering)
    if '_index' in frontmatter:
        skill['_index'] = frontmatter['_index']

    return skill


def load_markdown_dir(md_dir: Path) -> List[Dict[str, Any]]:
    """Load all skills from markdown directory."""
    skills = []
    for md_file in sorted(md_dir.rglob('*.md')):
        try:
            skill = parse_markdown_file(md_file)
            skills.append(skill)
        except Exception as e:
            print(f"❌ ERROR parsing {md_file}: {e}")
            sys.exit(1)
    return skills


def skill_to_markdown(skill: Dict[str, Any]) -> str:
    """Convert skill dict to markdown string."""
    # Build frontmatter
    md = "---\n"
    md += f"name: {skill['name']}\n"
    md += f"level: {skill['level']}\n"

    # Preserve order if present
    if '_index' in skill:
        md += f"_index: {skill['_index']}\n"

    prerequisites = skill.get('prerequisites', [])
    if prerequisites:
        md += "prerequisites:\n"
        for prereq in prerequisites:
            md += f"  - {prereq}\n"
    else:
        md += "prerequisites: []\n"

    md += "---\n\n"

    # Add skill name as title
    md += f"# {skill['name']}\n\n"

    # Add tasks
    for task in skill['tasks']:
        md += f"## Task: {task['name']}\n\n"

        # Add steps
        for i, step in enumerate(task['steps'], 1):
            md += f"{i}. **[{step['tag']}]** {step['text']}\n"

        # Add commands if present
        if task.get('commands'):
            md += "\n**Commands:**\n"
            for i, cmd in enumerate(task['commands'], 1):
                md += f"{i}. `{cmd}`\n"

        md += "\n"

    return md


def save_markdown_file(skill: Dict[str, Any], md_dir: Path) -> Path:
    """Save a skill as a markdown file in the appropriate level directory."""
    level = skill['level'].lower()
    level_dir = md_dir / level
    level_dir.mkdir(parents=True, exist_ok=True)

    filename = skill_name_to_filename(skill['name'])
    filepath = level_dir / filename

    md_content = skill_to_markdown(skill)
    filepath.write_text(md_content, encoding='utf-8')

    return filepath


def validate(yaml_skills: List[Dict[str, Any]], md_skills: List[Dict[str, Any]]) -> List[str]:
    """
    Validate both formats are semantically identical.
    Returns list of error messages (empty if valid).
    """
    errors = []

    # Check 1: Same skill names
    yaml_names = {s['name'] for s in yaml_skills}
    md_names = {s['name'] for s in md_skills}

    if yaml_names != md_names:
        missing_in_md = yaml_names - md_names
        missing_in_yaml = md_names - yaml_names
        if missing_in_md:
            errors.append(f"Skills in YAML but not markdown: {', '.join(missing_in_md)}")
        if missing_in_yaml:
            errors.append(f"Skills in markdown but not YAML: {', '.join(missing_in_yaml)}")
        return errors  # Can't continue validation if skill sets don't match

    # Check 2: Validate levels
    valid_levels = {'Basic', 'Intermediate', 'Advanced'}
    for skill in md_skills:
        if skill['level'] not in valid_levels:
            errors.append(f"{skill['name']}: Invalid level '{skill['level']}' (must be Basic, Intermediate, or Advanced)")

    # Check 3: Validate prerequisites exist
    all_skills = {s['name'] for s in md_skills}
    for skill in md_skills:
        for prereq in skill.get('prerequisites', []):
            if prereq not in all_skills:
                # Try to suggest similar names
                similar = [s for s in all_skills if prereq.lower() in s.lower() or s.lower() in prereq.lower()]
                error_msg = f"{skill['name']}: Prerequisite '{prereq}' not found"
                if similar:
                    error_msg += f" (did you mean '{similar[0]}'?)"
                errors.append(error_msg)

    # Check 4: Validate command references
    for skill in md_skills:
        for task in skill['tasks']:
            commands = task.get('commands', [])
            for step in task['steps']:
                # Find all (N) references in step text
                refs = re.findall(r'\((\d+)\)', step['text'])
                for ref in refs:
                    idx = int(ref) - 1
                    if idx >= len(commands):
                        errors.append(
                            f"{skill['name']}/{task['name']}: "
                            f"Step references command ({ref}) but only {len(commands)} commands defined"
                        )

    # Check 5: For each skill, compare content between YAML and markdown
    for skill_name in yaml_names:
        yaml_skill = next(s for s in yaml_skills if s['name'] == skill_name)
        md_skill = next(s for s in md_skills if s['name'] == skill_name)

        # Compare metadata
        if yaml_skill['level'] != md_skill['level']:
            errors.append(f"{skill_name}: Level mismatch (YAML: {yaml_skill['level']}, MD: {md_skill['level']})")

        yaml_prereqs = set(yaml_skill.get('prerequisites', []))
        md_prereqs = set(md_skill.get('prerequisites', []))
        if yaml_prereqs != md_prereqs:
            errors.append(f"{skill_name}: Prerequisites mismatch")

        # Compare task count
        if len(yaml_skill['tasks']) != len(md_skill['tasks']):
            errors.append(f"{skill_name}: Task count mismatch (YAML: {len(yaml_skill['tasks'])}, MD: {len(md_skill['tasks'])})")
            continue  # Can't compare individual tasks if counts differ

        # Compare each task
        for y_task, m_task in zip(yaml_skill['tasks'], md_skill['tasks']):
            if y_task['name'] != m_task['name']:
                errors.append(f"{skill_name}: Task name mismatch (YAML: '{y_task['name']}', MD: '{m_task['name']}')")
            if len(y_task['steps']) != len(m_task['steps']):
                errors.append(f"{skill_name}/{y_task['name']}: Step count mismatch")

    return errors


def yaml_to_md(yaml_path: Path, md_dir: Path) -> None:
    """Convert YAML to markdown files."""
    skills = load_yaml(yaml_path)

    # Clear existing markdown files
    for level in ['basic', 'intermediate', 'advanced']:
        level_dir = md_dir / level
        if level_dir.exists():
            for md_file in level_dir.glob('*.md'):
                md_file.unlink()

    # Generate markdown files with index to preserve order
    for index, skill in enumerate(skills):
        skill['_index'] = index
        save_markdown_file(skill, md_dir)

    print(f"   • Processed {len(skills)} skills")


def md_to_yaml(md_dir: Path, yaml_path: Path) -> None:
    """Convert markdown files to YAML."""
    skills = load_markdown_dir(md_dir)

    # Sort by _index if any skill has it (to preserve original order)
    # Otherwise sort by level and name
    has_index = any('_index' in skill for skill in skills)

    if has_index:
        skills.sort(key=lambda s: s.get('_index', 9999))
        # Remove _index from final output
        for skill in skills:
            skill.pop('_index', None)
    else:
        # Fallback: sort by level and name
        level_order = {'Basic': 0, 'Intermediate': 1, 'Advanced': 2}
        skills.sort(key=lambda s: (level_order.get(s['level'], 99), s['name']))

    save_yaml(yaml_path, skills)

    print(f"   • Processed {len(skills)} skills")
    print(f"   • Generated {yaml_path}")


def main():
    yaml_path = Path('data/skills.yaml')
    md_dir = Path('data/skills')

    # 1. Determine state
    yaml_exists = yaml_path.exists()
    md_exists = md_dir.exists() and any(md_dir.rglob('*.md'))

    if not yaml_exists and not md_exists:
        print("❌ ERROR: No skill data found")
        print("   Create either data/skills.yaml or data/skills/**/*.md")
        sys.exit(1)

    if not yaml_exists:
        print("📝 YAML missing, generating from markdown...")
        md_to_yaml(md_dir, yaml_path)
        print("✅ Generated data/skills.yaml")
        return

    if not md_exists:
        print("📝 Markdown missing, generating from YAML...")
        yaml_to_md(yaml_path, md_dir)
        print("✅ Generated markdown files in data/skills/")
        return

    # 2. Both exist - check which is newer
    yaml_mtime = yaml_path.stat().st_mtime
    md_files = list(md_dir.rglob('*.md'))
    if not md_files:
        print("📝 Markdown directory empty, generating from YAML...")
        yaml_to_md(yaml_path, md_dir)
        print("✅ Generated markdown files in data/skills/")
        return

    md_mtime = max(f.stat().st_mtime for f in md_files)

    # Small time delta to account for filesystem precision
    time_delta = abs(yaml_mtime - md_mtime)

    if time_delta < 1:  # Within 1 second - consider them synced
        # Same timestamp - validate they're in sync
        print("🔍 Validating sync...")
        yaml_skills = load_yaml(yaml_path)
        md_skills = load_markdown_dir(md_dir)

        errors = validate(yaml_skills, md_skills)
        if errors:
            print("❌ SYNC ERROR: Content validation failed\n")
            for error in errors:
                print(f"   • {error}")
            print("\n   Fix these errors and re-run sync.py")
            sys.exit(1)

        print(f"   • Checked {len(yaml_skills)} skills")
        print("   • No differences found")
        print("✅ Already in sync")
    elif yaml_mtime > md_mtime:
        print("📝 YAML is newer, updating markdown...")
        yaml_to_md(yaml_path, md_dir)
        print("✅ Markdown files updated")
    else:  # md_mtime > yaml_mtime
        print("📝 Markdown is newer, updating YAML...")
        md_to_yaml(md_dir, yaml_path)
        print("✅ YAML updated")


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f"❌ ERROR: {e}")
        sys.exit(1)
