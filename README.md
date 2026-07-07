# SYNAPSE

### Cognitive Operating System for Students

SYNAPSE is an AI-powered personalized learning platform built on Microsoft Azure that transforms static study material into an interactive learning experience. It enables students to upload handwritten or typed notes, receive simplified explanations, generate quizzes instantly, track learning progress, and study in multiple languages with voice assistance.

## 🚀 Features

* 📄 Upload handwritten or typed notes
* 🔍 OCR-based text extraction using Azure AI Vision
* 🧠 AI-powered concept simplification with Azure OpenAI
* ❓ Automatic quiz and MCQ generation
* 💬 Interactive AI doubt-solving chatbot
* 🌍 Multilingual learning support (10+ languages)
* 🔊 Text-to-Speech and Speech-to-Text using Azure Speech Services
* 📅 Adaptive study planner based on learning performance
* ⏳ Pomodoro focus timer
* 📈 GitHub-style study activity heatmap
* 🧩 Cognitive tracking using the Ebbinghaus Forgetting Curve

---

## 🛠 Tech Stack

### Frontend

* React.js
* HTML5
* CSS3
* JavaScript

### Backend

* Node.js
* Express.js

### Database

* PostgreSQL
* Prisma ORM

### Microsoft Azure Services

* Azure OpenAI
* Azure AI Vision (OCR)
* Azure Speech Services
* Azure Machine Learning
* Azure Blob Storage

### Libraries

* Recharts
* fluent-ffmpeg

---

## 🏗️ Architecture

```text
Student
    │
    ▼
Upload Notes / Ask Questions
    │
    ▼
Azure AI Vision
(Handwritten OCR)
    │
    ▼
Azure OpenAI
• Concept Simplification
• Summarization
• Quiz Generation
• AI Chat
    │
    ├──────────────┐
    ▼              ▼
Azure Speech    Study Planner
(TTS/STT)       (Azure ML)
    │              │
    └──────┬───────┘
           ▼
      PostgreSQL
(Session & Progress Tracking)
           │
           ▼
        React Dashboard
```

---

## ⚙️ How It Works

1. Upload handwritten or digital notes.
2. Azure AI Vision extracts text from uploaded documents.
3. Azure OpenAI simplifies concepts, answers questions, and generates quizzes.
4. Azure Speech Services enable voice-based learning.
5. Student progress is stored in PostgreSQL.
6. Adaptive recommendations and revision schedules are generated based on learning history.

---

## 📂 Project Structure

```text
SYNAPSE/
├── client/               # React Frontend
├── server/               # Express Backend
├── prisma/               # Database Schema
├── public/
├── src/
├── routes/
├── controllers/
├── services/
├── uploads/
├── package.json
└── README.md
```

---

## ▶️ Installation

```bash
git clone https://github.com/your-username/SYNAPSE.git
cd SYNAPSE
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

---

## 🎯 Future Enhancements

* Real-time collaborative study rooms
* AI-generated flashcards
* Personalized performance analytics
* Mobile application
* Calendar integration
* LMS integration (Moodle, Canvas, Google Classroom)

---

## 👨‍💻 Author

**Hardik Chugh**

MIT Manipal | Computer Science Engineering

---

## 📜 License

This project is intended for educational, research, and portfolio purposes.
