# VisionGrid - HDMI Matrix & Splicing Controller

**VisionGrid** is a professional desktop application designed for managing HDMI matrix switches and video splicing processors. Built with the robustness of Electron and the flexibility of React, it provides a seamless interface for controlling complex video wall setups and signal routing.

![App Screenshot](.erb/img/erb-banner.svg) *<!-- Replace with actual screenshot -->*

## � Key Features

*   **Matrix Switching**: Effortlessly route input video sources to any output display. Support for drag-and-drop or click-to-select interfaces.
*   **Video Wall Splicing**: Configure video walls with customizable row and column layouts (e.g., 2x2, 3x3, 4x5). Easily create and manage splicing groups.
*   **Scene Management**: Save complex switching and splicing configurations as "Scenes" and recall them instantly.
*   **Multi-Protocol Control**: detailed support for controlling hardware via **UDP**, **TCP**, and **Serial Port (RS232)**.
*   **Hardware Settings**:
    *   Power Control (Custom ON/OFF commands).
    *   Resolution Management.
    *   OSD (On-Screen Display) and Buzzer toggles.
*   **User-Friendly Interface**: Modern UI built with Ant Design and Tailwind CSS for a responsive and intuitive experience.

## 🛠 Tech Stack

*   **Core**: [Electron](https://www.electronjs.org/), [React](https://reactjs.org/), [TypeScript](https://www.typescriptlang.org/)
*   **UI Framework**: [Ant Design](https://ant.design/)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
*   **State Management**: React Hooks & Local Storage (Custom Store)
*   **Build Tool**: Webpack

## 📦 Installation

Ensure you have [Node.js](https://nodejs.org/) installed.

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/vision-grid.git
    cd vision-grid
    ```

2.  **Install dependencies**
    ```bash
    npm install
    # or
    yarn install
    ```

## 💻 Usage

### Development
Start the application in development mode:
```bash
npm start
```

### Production Build
Package the application for your local OS (macOS, Windows, or Linux):
```bash
npm run package
```

## 📖 Application Guide

### Connection Setup
1.  Navigate to the **Connection** page.
2.  Choose your control protocol: **UDP**, **TCP**, or **Serial**.
3.  Enter the target IP/Port or select the correct Serial Port.
4.  The app will auto-connect or allow manual connection.

### Matrix Control
1.  Go to the **Input/Output** page.
2.  Select an Input channel.
3.  Select one or multiple Output channels to route the signal.

### Splicing (Video Wall)
1.  Go to the **Splicing** page.
2.  Set your screen layout (Rows x Cols).
3.  Select a group of output screens.
4.  Click **"Splice"** to merge them into a single logical display.
5.  Click **"Cancel Splice"** to revert to independent displays.

### Power Control
1.  Open **Command Settings** in the Splicing page.
2.  Define your custom **Power ON** and **Power OFF** command strings (e.g., HEX codes or text commands).
3.  Use the toolbar buttons to send power commands to the connected hardware.

## 🤝 Contributing

Contributions are welcome! Please fork the repository and submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

---
*Built with [Electron React Boilerplate](https://github.com/electron-react-boilerplate/electron-react-boilerplate)*
