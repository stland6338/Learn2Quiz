# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Learn2Quiz is an early-stage learning/quiz application project. The repository is currently minimal, containing only basic configuration files and no source code yet.

## Current Architecture

The project is in its initial setup phase with:
- Git repository initialized (first commit: 5468ebb)
- MCP server configuration for Claude Code integration
- Python language environment configured

## Development Setup

This project uses:
- **MCP Integration**: Serena MCP server for enhanced Claude Code functionality
- **Version Control**: Git
- **Intended Language**: Python (based on project configuration)

## Future Development Notes

Since this is a new project, the following will need to be established:
1. Choose and configure the tech stack (web framework, database, etc.)
2. Set up package management (requirements.txt, pyproject.toml, etc.)
3. Configure development tools (linting, formatting, testing)
4. Establish project structure and architecture

## Development Commands

### Backend Setup and Running
```bash
# Install dependencies
pip install -r requirements.txt

# Run the development server
cd backend
python run.py

# Or using uvicorn directly
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup and Running
```bash
# Install dependencies
cd frontend
npm install

# Run the development server
npm run dev

# Build for production
npm run build
```

### Database Operations
```bash
# The app creates SQLite database automatically on first run
# Database file: learn2quiz.db (in backend directory)
```

### Testing
```bash
# Run tests (when implemented)
cd backend
pytest
```

### Git Operations
```bash
git status                    # Check repository status
git add . && git commit -m "" # Stage and commit changes
git push                      # Push changes to remote
```

## Architecture Overview

### Backend (FastAPI)
- **FastAPI**: REST API framework
- **SQLAlchemy**: ORM for database operations  
- **SQLite**: Default database (configurable)
- **JWT**: Authentication tokens
- **SM-2 Algorithm**: Spaced repetition scheduling

### Frontend (React + TypeScript)
- **React 18**: UI framework
- **TypeScript**: Type-safe JavaScript
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **React Router**: Client-side routing
- **Axios**: HTTP client for API calls

### Key Components
- **Card Generator**: Automatic quiz generation from text
- **SM-2 Service**: Manages review scheduling and difficulty
- **Authentication**: JWT-based user management
- **Database Models**: User, Note, Card, ReviewState, Quiz, etc.

### API Endpoints
- `POST /api/v1/register` - User registration
- `POST /api/v1/login` - User login
- `POST /api/v1/notes` - Create note
- `POST /api/v1/cards/generate` - Generate cards from note
- `GET /api/v1/daily-quiz` - Get daily quiz
- `POST /api/v1/submit-quiz` - Submit quiz answers