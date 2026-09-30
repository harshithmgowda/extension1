# 🧠 ChatNotes — Turn ChatGPT Conversations into Beautiful Notes

<p align="center">
  <img src="assets/icons/icon-128.png" alt="ChatNotes Logo" width="96" height="96" />
</p>

<p align="center">
  <strong>Export ChatGPT conversations into publication-ready PDF, DOCX, Markdown, and HTML notes.</strong><br>
  <em>100% Client-Side • Zero AI APIs • Zero Tracking • Free & Open Source</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Manifest-V3-indigo?style=flat-square" alt="Manifest V3">
  <img src="https://img.shields.io/badge/Chrome-Compatible-blue?style=flat-square" alt="Chrome Compatible">
  <img src="https://img.shields.io/badge/AI%20API-None%20(100%25%20Local)-emerald?style=flat-square" alt="No AI API">
  <img src="https://img.shields.io/badge/License-MIT-purple?style=flat-square" alt="License MIT">
  <img src="https://img.shields.io/badge/Privacy-First-teal?style=flat-square" alt="Privacy First">
</p>

---

## 🌟 Why ChatNotes?

Most ChatGPT export tools either capture blurry screenshot images or require external AI API keys and third-party servers. 

**ChatNotes is different:**
- 🛡️ **100% Local & Client-Side**: No backend, no accounts, no OpenAI/Claude/Gemini API keys.
- 📐 **Semantic Document Reconstruction**: Rebuilds conversations as true structured documents with headings, lists, code blocks, tables, and quotes.
- 🎨 **Multiple Themes & Templates**: Academic, Minimal, Developer, Premium, Notebook, and Dark mode.
- 📦 **4 Universal Formats**: Export instantly to **PDF**, **DOCX (MS Word)**, **Markdown (.md)**, and self-contained **HTML**.

---

## 🚀 Manual Installation Guide (Load Unpacked)

Because ChatNotes is 100% open source, you can install and run it directly in Google Chrome (or any Chromium browser like Brave, Edge, or Arc) in less than 60 seconds without needing the Chrome Web Store.

### Step 1: Download the Repository

Choose **Option A** or **Option B**:

#### Option A: Download ZIP (Easiest)
1. Click the green **Code** button at the top-right of this GitHub repository page.
2. Select **Download ZIP**.
3. Locate the downloaded file (`chatnotes.zip` or `extension.zip`) and **extract/unzip** it into a permanent folder on your computer (e.g., `Documents/ChatNotes` or `Desktop/ChatNotes`).

#### Option B: Clone via Git (Developers)
```bash
git clone https://github.com/harshithmgowda/extension1.git
cd extension1
```

---

### Step 2: Open Chrome Extensions Page

1. Open **Google Chrome**.
2. Type `chrome://extensions` in the address bar and press **Enter**.  
   *(Alternative: Click the three dots menu at top right &rarr; **Extensions** &rarr; **Manage Extensions**).*

---

### Step 3: Enable Developer Mode

In the top-right corner of the `chrome://extensions` page, toggle the switch for **"Developer mode"** to **ON**.

```
  ┌────────────────────────────────────────────────────────┐
  │ Extensions                       [Developer mode: ON]  │
  └────────────────────────────────────────────────────────┘
```

---

### Step 4: Load Unpacked Extension

1. In the top-left corner of the page, click the button labeled **"Load unpacked"**.
2. A file selection window will open.
3. Browse to and select the folder where the repository files are located (the folder that directly contains `manifest.json`).
4. Click **Select Folder**.

> 💡 **Important:** Make sure you select the folder containing `manifest.json`, not a parent directory.

---

### Step 5: Pin the Extension for Quick Access

1. In the Chrome toolbar (next to your address bar), click the **Extensions icon** (shaped like a puzzle piece 🧩).
2. Look for **ChatNotes — Turn ChatGPT to Beautiful Notes**.
3. Click the **Pin 📌** icon next to it so it stays visible in your toolbar.

---

## 📖 How to Use

1. Navigate to any conversation on **[chatgpt.com](https://chatgpt.com)**.
2. Click the **ChatNotes 🧠** icon in your Chrome toolbar.
3. ChatNotes will automatically detect your conversation.
4. Click **Extract Conversation** to format and preview your notes.
5. Choose your template and export to **PDF**, **DOCX**, **Markdown**, or **HTML**!

---

## 🔄 How to Update to the Latest Version

Whenever this repository receives new updates or bug fixes:

1. **Pull the latest changes** via git (`git pull`) OR re-download and unzip the newest release.
2. Go back to `chrome://extensions`.
3. Locate the **ChatNotes** card.
4. Click the **Reload icon (↻)** in the bottom-right corner of the ChatNotes card.  
   *Chrome will instantly reload the extension with the latest code!*

---

## 📁 Repository Structure

```
chatnotes/
├── manifest.json              # Manifest V3 extension configuration
├── popup/
│   ├── popup.html             # Sleek toolbar popup interface
│   ├── popup.css              # Dark slate theme styling & animations
│   └── popup.js               # Tab detection & popup controller
├── content/
│   └── chatgpt-extractor.js   # Content script for resilient DOM extraction
├── background/
│   └── service-worker.js      # Background messaging & tab lifecycle coordinator
├── preview/
│   ├── preview.html           # Full-screen note preview & editor workspace
│   ├── preview.css            # Preview application styles
│   └── preview.js             # Live preview controls, settings & export triggers
├── core/
│   ├── parser.js              # Converts raw DOM elements into Structured Document Model
│   ├── formatter.js           # Deterministic Study Notes / Compact formatting rules
│   └── storage.js             # Local storage persistence helper
├── export/
│   ├── markdown.js            # Markdown generator
│   ├── html.js                # Self-contained HTML generator
│   ├── pdf.js                 # Multi-page PDF generator
│   └── docx.js                # Native Word .docx generator
├── templates/
│   ├── academic.css           # 📘 Academic & study paper template
│   ├── minimal.css            # ✨ Minimalist modern template
│   ├── developer.css          # 💻 Code-first developer template
│   ├── premium.css            # 🌟 Executive rounded-card template
│   ├── notebook.css           # 📓 Lined paper notebook template
│   └── dark.css               # 🌙 High-contrast dark theme template
├── assets/
│   └── icons/                 # Crisp extension icons (16px, 48px, 128px)
├── LICENSE                    # MIT Open Source License
└── README.md                  # Documentation & installation guide
```

---

## 🛡️ Privacy & Permissions

ChatNotes strictly follows the principle of least privilege:
- **`activeTab`**: Used only to read the title and DOM structure of the active ChatGPT tab when you open the popup.
- **`storage`**: Used to save your design preferences (chosen font, template, margins) locally in your browser.
- **Zero Network Calls**: ChatNotes does not send telemetry, analytics, or conversation content anywhere. All processing is 100% offline.

---

## 🤝 Contributing

Contributions, bug reports, and suggestions are welcome!
1. Fork this repository.
2. Create your feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'Add some amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

---

## 📜 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.
