# AI Fitness Coach

AI Fitness Coach is a full-stack fitness application that combines workout tracking, AI-powered training recommendations, multimodal nutrition analysis, and browser-based computer vision for exercise rep tracking.

The project was built as a portfolio application to demonstrate practical use of generative AI, multimodal AI, computer vision, authentication, database-backed workflows, and modern full-stack development.

---

## Features

### AI Workout Intelligence

Users can create workout plans, start workout sessions, record sets, weight and repetitions, and receive AI-generated progression guidance.

The recommendation system combines:

- workout history
- exercise targets
- progression features
- target compliance
- deterministic progression rules
- Gemini-generated coaching feedback

Recommendations can include:

- increase load
- maintain load
- reduce load
- collect more data
- suggested weight
- suggested rep target
- confidence
- coaching focus
- explanation and caution

A deterministic baseline is calculated before the AI response is accepted, helping keep recommendations aligned with actual workout performance.

---

### AI Nutrition Analysis

Users can upload a meal image and receive an estimated nutritional breakdown.

The system estimates:

- calories
- protein
- carbohydrates
- fat
- visible food items
- portion sizes
- confidence

If the model cannot confidently identify an important part of the meal, it can ask the user for clarification and analyse the image again using that additional context.

A validation layer also checks the returned values for:

- macro-calorie inconsistencies
- mismatched food-item and meal totals
- unusually extreme values

Nutrition estimates are advisory and are not intended to replace professional dietary guidance.

---

### Computer Vision Form Coach

The Form Coach uses MediaPipe Pose Landmarker directly in the browser to detect body landmarks from the user's webcam.

Supported exercises:

- Bodyweight Squat
- Bicep Curl
- Shoulder Press

The application calculates joint angles and uses exercise-specific movement rules to determine movement phases and count repetitions.

The Form Coach includes:

- live webcam pose detection
- skeleton rendering
- joint-angle calculation
- movement-phase detection
- preparation countdown
- automatic rep counting
- multiple-set workflow

Pose processing runs locally in the browser.


## Tech Stack

### Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS
- Lucide React

### Backend
- Next.js App Router
- Next.js API Routes

### Database & Authentication
- Supabase PostgreSQL
- Supabase Authentication
- Supabase SSR
- Row Level Security

### Artificial Intelligence
- Google Gemini
- Zod
- Structured AI responses
- Multimodal image analysis

### Computer Vision
- MediaPipe Tasks Vision
- Pose Landmarker
- HTML Canvas
- Browser MediaDevices API

---

## Architecture

```text
Browser
│
├── Next.js / React UI
│
├── Supabase Authentication
│
├── MediaPipe Pose Detection
│   └── Runs locally in the browser
│
└── Next.js API Routes
    │
    ├── Workout Recommendation API
    │   ├── Workout history
    │   ├── Feature engineering
    │   ├── Progression rules
    │   └── Gemini coaching
    │
    └── Nutrition Analysis API
        ├── Meal image
        ├── Gemini multimodal analysis
        ├── Structured response validation
        └── Nutrition sanity checks
```
## AI Workout Recommendation Flow
```text
Exercise
   ↓
Load workout history
   ↓
Calculate exercise targets
   ↓
Feature engineering
   ↓Evaluate target compliance
   ↓
Deterministic progression rule
   ↓
Gemini coaching generation
   ↓
Guardrails
   ↓
Structured recommendation

The workout recommendation system combines historical performance with deterministic progression rules before generating AI coaching feedback.
This helps keep the recommendation aligned with the user's actual workout data instead of relying only on generative AI.
```
## AI Nutrition Flow

```text
Meal Image
    ↓
Next.js API
    ↓
Gemini Multimodal Analysis
    ↓
Structured JSON Response
    ↓
Zod Validation
    ↓
Needs clarification?
   ↙             ↘
 Yes             No
 ↓                ↓
Ask user        Nutrition result
 ↓
Re-analyse with
user clarification
 ↓
Nutrition validation

The nutrition feature uses multimodal AI to estimate calories, protein, carbohydrates, fat, food items and visible portions from a meal image.
If an important ingredient is unclear, the system asks the user for clarification before completing the analysis.
```
## Form Coach Flow

```text
Camera
   ↓
Video Frames
   ↓
MediaPipe Pose Landmarker
   ↓
Body Landmarks
   ↓
Joint Angle Calculation
   ↓
Exercise-Specific Movement Rules
   ↓
Movement Phase
   ↓
Rep Counter

The Form Coach processes webcam frames in the browser and uses pose landmarks to calculate joint angles.
Exercise-specific movement states are then used to detect complete repetitions.
Supported exercises currently include:
- Bodyweight Squat
- Bicep Curl
- Shoulder Press
```
## Authentication

Authentication is handled using Supabase.

The application supports:

- account creation
- login
- onboarding
- protected routes
- logout

Protected areas include:

- Dashboard
- Workouts
- AI Nutrition
- Form Coach

Shared authentication logic is used to prevent unauthenticated access to protected application routes.

## Workout Data

The workout system uses four main data structures.

## Workout Plans

Stores reusable workout plans created by the user.

## Workout Plan Exercises

Stores the exercises associated with a workout plan, including:

target sets
target repetitions
rest time
exercise order
## Workout Sessions

Represents an individual workout performed by the user.

## Session Sets

Stores performed set information including:

- exercise name
- set number
- weight
- repetitions
- completion status

Workout history from these sessions is used by the AI progression system to generate future recommendations.

## MVP Scope

The MVP focuses on three main AI capabilities:

1. AI Workout Intelligence
2. AI Nutrition Analysis
3. Computer Vision Form Coach

The project deliberately focuses on these AI-driven workflows rather than attempting to build a complete fitness-tracking platform.

## Current Limitations
- Nutrition analyses are not currently stored as meal history.

- Form Coach sessions are not persisted to the database.

- Form Coach currently supports three exercises.

- Rep detection uses heuristic joint-angle thresholds.

- Computer vision performance can vary depending on lighting, camera angle and body visibility.

- Nutrition values are estimates based on visual analysis.

- Workout exercise identity currently relies primarily on exercise names.

- Automated end-to-end testing is not currently included.

## Future Improvements

Potential future improvements include:

- persistent nutrition history
- nutrition goal tracking
- additional Form Coach exercises
- exercise-specific form feedback
- rep quality scoring
- improved movement phase detection
- workout history visualisation
- progress analytics
- personalised training blocks
- automatic workout generation
- richer long-term AI coaching context
- automated end-to-end testing
- production deployment monitoring

## What This Project Demonstrates

This project demonstrates practical experience with:

- full-stack application development
- authentication and protected routes
- relational database design
- AI API integration
- multimodal AI
- structured AI output
- feature engineering
- deterministic AI guardrails
- computer vision
- pose estimation
- real-time browser inference
- state-based rep counting
- human-in-the-loop AI workflows

## Disclaimer

AI-generated workout and nutrition outputs are estimates and general guidance only.
This application is not intended to diagnose, treat, or replace professional medical, nutrition, or fitness advice.
